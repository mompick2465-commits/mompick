import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 개별 알림 전송
export async function POST(request: Request) {
  try {
    const { title, body, phone, email } = await request.json()

    if (!title || !body) {
      return NextResponse.json({ 
        error: '제목과 내용을 모두 입력해주세요.'
      }, { status: 400 })
    }

    if (!phone && !email) {
      return NextResponse.json({ 
        error: '전화번호 또는 이메일 중 하나는 반드시 입력해주세요.'
      }, { status: 400 })
    }

    // 사용자 찾기
    let targetUser: any = null

    // 전화번호로 찾기
    if (phone) {
      // auth.users에서 전화번호로 사용자 찾기
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (!authError && authUsers?.users) {
        const authUser = authUsers.users.find((u: any) => {
          const userPhone = u.phone || u.user_metadata?.phone
          // 전화번호 형식 정규화 (하이픈 제거)
          const normalizedInput = phone.replace(/[-\s]/g, '')
          const normalizedUserPhone = userPhone?.replace(/[-\s]/g, '')
          return normalizedUserPhone === normalizedInput || userPhone === phone
        })

        if (authUser) {
          // profiles 테이블에서 해당 사용자 찾기
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .single()

          if (!profileError && profile) {
            targetUser = { ...profile, authUser }
          }
        }
      }
    }

    // 이메일로 찾기 (전화번호로 못 찾았거나 이메일이 입력된 경우)
    if (!targetUser && email) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .limit(1)

      if (!profilesError && profiles && profiles.length > 0) {
        targetUser = profiles[0]
      }
    }

    if (!targetUser) {
      return NextResponse.json({ 
        error: '입력한 전화번호 또는 이메일과 일치하는 사용자를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 알림 생성
    const notification = {
      type: 'system',
      to_user_id: targetUser.id,
      from_user_id: null,
      post_id: null,
      comment_id: null,
      payload: {
        title,
        content: body,
        message: body
      },
      is_read: false
    }

    const { data: insertedData, error: insertError } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()

    if (insertError) {
      console.error('알림 생성 오류:', insertError)
      return NextResponse.json({ 
        error: '알림 생성 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // 알림 설정 확인
    const { data: notificationSetting } = await supabase
      .from('notification_settings')
      .select('notice')
      .eq('user_id', targetUser.id)
      .single()

    const canReceiveNotice = notificationSetting?.notice !== false

    // FCM 푸시 알림 전송 (알림 설정이 켜진 경우만)
    let fcmSuccess = false
    if (canReceiveNotice) {
      try {
        const { data, error } = await supabase.functions.invoke('send-fcm-push', {
          body: {
            userId: targetUser.id,
            title,
            body,
            data: {
              type: 'notice',
              notificationId: insertedData.id
            }
          }
        })

        if (!error && !data?.skipped) {
          fcmSuccess = true
        }
      } catch (error) {
        console.error('FCM 전송 오류:', error)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `${targetUser.full_name || '사용자'}에게 알림이 발송되었습니다. (앱 알림: 성공, FCM: ${fcmSuccess ? '성공' : canReceiveNotice ? '실패' : '건너뜀'})`,
      user: {
        id: targetUser.id,
        name: targetUser.full_name,
        email: targetUser.email,
        phone: targetUser.authUser?.phone || targetUser.phone
      }
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

