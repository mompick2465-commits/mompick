import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: 특정 어린이집의 간편신청 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params

    const { data, error } = await supabase
      .from('childcare_application_info')
      .select('*')
      .eq('childcare_code', code)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116: 데이터 없음
      console.error('간편신청 정보 조회 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      applicationInfo: data || null
    })
  } catch (error) {
    console.error('간편신청 정보 조회 오류:', error)
    return NextResponse.json(
      { error: '간편신청 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

