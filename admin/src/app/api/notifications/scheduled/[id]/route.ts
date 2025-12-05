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

// 예약 알림 취소
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // scheduled_notifications 테이블에서 상태를 cancelled로 변경
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('예약 알림 취소 오류:', error)
      
      // 테이블이 없는 경우
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: '예약 알림 테이블이 존재하지 않습니다.'
        }, { status: 404 })
      }

      // 레코드가 없는 경우
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: '예약 알림을 찾을 수 없습니다.'
        }, { status: 404 })
      }

      return NextResponse.json({ 
        error: '예약 알림 취소 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ 
        error: '예약 알림을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: '예약 알림이 취소되었습니다.'
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

