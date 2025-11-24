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

// 공지사항 목록 조회
export async function GET() {
  try {
    // notifications 테이블에서 type이 'notice'인 알림들을 조회
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'notice')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('공지사항 조회 오류:', error)
      return NextResponse.json({ 
        error: '데이터 조회 중 오류가 발생했습니다.',
        notices: []
      }, { status: 500 })
    }

    // notice_id별로 그룹화하여 중복 제거
    const noticeMap = new Map<string, any>()
    
    ;(data || []).forEach((notification: any) => {
      const noticeId = notification.payload?.notice_id || notification.id
      if (!noticeMap.has(noticeId)) {
        noticeMap.set(noticeId, {
          id: noticeId,
          notification_id: notification.id, // 실제 알림 ID (수정/삭제용)
          title: notification.payload?.title || '제목 없음',
          content: notification.payload?.content || notification.payload?.message || '',
          created_at: notification.created_at,
          updated_at: notification.updated_at || notification.created_at
        })
      }
    })

    const notices = Array.from(noticeMap.values())

    return NextResponse.json({ 
      notices,
      count: notices.length
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      notices: []
    }, { status: 500 })
  }
}

// 공지사항 작성
export async function POST(request: Request) {
  try {
    const { title, content } = await request.json()

    if (!title || !content) {
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

    // 공지사항 고유 ID 생성 (UUID)
    const noticeId = crypto.randomUUID()

    // 각 사용자에게 공지사항 알림 생성
    const notifications = profiles.map((profile: any) => ({
      type: 'notice',
      to_user_id: profile.id,
      from_user_id: null, // 공지사항은 시스템에서 발송
      post_id: null,
      comment_id: null,
      payload: {
        notice_id: noticeId,
        title,
        content,
        message: content
      },
      is_read: false
    }))

    const { data: insertedData, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (insertError) {
      console.error('공지사항 알림 생성 오류:', insertError)
      return NextResponse.json({ 
        error: '공지사항 알림 생성 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `${profiles.length}명의 사용자에게 공지사항이 발송되었습니다.`,
      count: insertedData?.length || 0
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

