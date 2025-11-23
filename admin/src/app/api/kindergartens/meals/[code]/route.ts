import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: kinderCode } = await params

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Supabase 환경변수가 설정되지 않았습니다.'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 급식 정보 조회
    const { data: meals, error } = await supabase
      .from('kindergarten_meals')
      .select('*')
      .eq('kindergarten_code', kinderCode)
      .eq('is_active', true)
      .order('meal_date', { ascending: false })

    if (error) {
      console.error('급식 정보 조회 오류:', error)
      return NextResponse.json({
        error: '급식 정보 조회 실패'
      }, { status: 500 })
    }

    return NextResponse.json({
      meals: meals || [],
      count: meals?.length || 0
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

