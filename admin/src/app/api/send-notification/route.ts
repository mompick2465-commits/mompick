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

// 긴급 알림 전송 (모든 사용자에게)
export async function POST(request: Request) {
  try {
    const { title, body } = await request.json()

    if (!title || !body) {
      return NextResponse.json({ 
        error: '제목과 내용을 모두 입력해주세요.'
      }, { status: 400 })
    }

    // 모든 사용자 조회
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) {
      console.error('사용자 조회 오류:', profilesError)
      return NextResponse.json({ 
        error: '사용자 조회 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ 
        error: '알림을 받을 사용자가 없습니다.'
      }, { status: 400 })
    }

    // 각 사용자에게 긴급 알림 생성 (type: 'system')
    const notifications = profiles.map((profile: any) => ({
      type: 'system',
      to_user_id: profile.id,
      from_user_id: null, // 시스템에서 발송
      post_id: null,
      comment_id: null,
      payload: {
        title,
        content: body,
        message: body
      },
      is_read: false
    }))

    const { data: insertedData, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (insertError) {
      console.error('알림 생성 오류:', insertError)
      return NextResponse.json({ 
        error: '알림 생성 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // 각 사용자에게 FCM 푸시 알림 전송
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    let successCount = 0
    let failCount = 0

    // 병렬로 FCM 전송 (최대 10개씩 배치 처리)
    const batchSize = 10
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(async (profile: any) => {
          try {
            const { data, error } = await supabaseClient.functions.invoke('send-fcm-push', {
              body: {
                userId: profile.id,
                title,
                body,
                data: {
                  type: 'system',
                  notificationId: insertedData?.find(n => n.to_user_id === profile.id)?.id || ''
                }
              }
            })

            if (error) {
              console.error(`사용자 ${profile.id} FCM 전송 오류:`, error)
              return false
            }

            return true
          } catch (error) {
            console.error(`사용자 ${profile.id} FCM 전송 중 오류:`, error)
            return false
          }
        })
      )

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++
        } else {
          failCount++
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: `${profiles.length}명의 사용자에게 알림이 발송되었습니다. (FCM 성공: ${successCount}, 실패: ${failCount})`,
      notificationCount: insertedData?.length || 0,
      fcmSuccess: successCount,
      fcmFailed: failCount
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

