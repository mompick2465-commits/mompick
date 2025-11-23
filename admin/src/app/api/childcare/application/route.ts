import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST: 간편신청 정보 저장/수정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { childcare_code, childcare_name, monthly_price, available_slots } = body

    if (!childcare_code) {
      return NextResponse.json(
        { error: '어린이집 코드가 필요합니다.' },
        { status: 400 }
      )
    }

    // 기존 데이터 확인
    const { data: existing } = await supabase
      .from('childcare_application_info')
      .select('id')
      .eq('childcare_code', childcare_code)
      .single()

    let result
    if (existing) {
      // 수정
      result = await supabase
        .from('childcare_application_info')
        .update({
          childcare_name,
          monthly_price,
          available_slots,
          updated_at: new Date().toISOString()
        })
        .eq('childcare_code', childcare_code)
    } else {
      // 새로 생성
      result = await supabase
        .from('childcare_application_info')
        .insert({
          childcare_code,
          childcare_name,
          monthly_price,
          available_slots,
          is_active: true
        })
    }

    if (result.error) {
      console.error('간편신청 정보 저장 오류:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '간편신청 정보가 저장되었습니다.'
    })
  } catch (error) {
    console.error('간편신청 정보 저장 오류:', error)
    return NextResponse.json(
      { error: '간편신청 정보 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

