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

// 예약 알림 목록 조회
export async function GET() {
  try {
    // scheduled_notifications 테이블에서 예약 알림 목록 조회
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('scheduled_at', { ascending: true })

    if (error) {
      // 테이블이 없을 수 있으므로 빈 배열 반환
      if (error.code === 'PGRST116') {
        return NextResponse.json({ scheduled: [] })
      }
      console.error('예약 알림 목록 조회 오류:', error)
      return NextResponse.json({ 
        error: '예약 알림 목록 조회 중 오류가 발생했습니다.',
        scheduled: []
      }, { status: 500 })
    }

    return NextResponse.json({ 
      scheduled: data || []
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      scheduled: []
    }, { status: 500 })
  }
}

// 예약 알림 등록
export async function POST(request: Request) {
  try {
    const { title, body, scheduledAt } = await request.json()

    if (!title || !body || !scheduledAt) {
      return NextResponse.json({ 
        error: '제목, 내용, 예약 시간을 모두 입력해주세요.'
      }, { status: 400 })
    }

    // 예약 시간이 과거인지 확인
    const scheduledDateTime = new Date(scheduledAt)
    const now = new Date()
    if (scheduledDateTime <= now) {
      return NextResponse.json({ 
        error: '예약 시간은 현재 시간보다 미래여야 합니다.'
      }, { status: 400 })
    }

    console.log('📅 예약 알림 등록 시작:', {
      title,
      scheduledAt,
      scheduledDateTime: scheduledDateTime.toISOString(),
      now: now.toISOString(),
      timeUntilScheduled: Math.round((scheduledDateTime.getTime() - now.getTime()) / 1000 / 60) + '분 후'
    })

    // scheduled_notifications 테이블에 예약 알림 저장
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        title,
        body,
        scheduled_at: scheduledAt,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 예약 알림 등록 오류:', error)
      
      // 테이블이 없는 경우
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: '예약 알림 테이블이 존재하지 않습니다. 마이그레이션 파일을 실행해주세요.'
        }, { status: 500 })
      }

      return NextResponse.json({ 
        error: `예약 알림 등록 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`
      }, { status: 500 })
    }

    console.log('✅ 예약 알림 등록 완료:', {
      id: data.id,
      title: data.title,
      scheduledAt: data.scheduled_at,
      status: data.status,
      createdAt: data.created_at
    })

    return NextResponse.json({ 
      success: true,
      message: '예약 알림이 등록되었습니다.',
      scheduled: data
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}


