import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      childcare_code,
      childcare_name,
      building_images,
      meal_images,
      detailed_description,
      facilities,
      programs
    } = body

    if (!childcare_code || !childcare_name) {
      return NextResponse.json({
        error: '어린이집 코드와 이름이 필요합니다.'
      }, { status: 400 })
    }

    console.log(`커스텀 정보 저장 - ${childcare_name} (${childcare_code})`)

    // Supabase 설정
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

    // childcare_custom_info 테이블에 저장 (upsert)
    const { data, error } = await supabase
      .from('childcare_custom_info')
      .upsert({
        facility_code: childcare_code,
        facility_name: childcare_name,
        building_images: building_images || [],
        meal_images: meal_images || [],
        detailed_description: detailed_description || null,
        facilities: facilities || [],
        programs: programs || [],
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'facility_code'
      })
      .select()
      .single()

    if (error) {
      console.error('커스텀 정보 저장 오류:', error)
      return NextResponse.json({
        error: `저장 실패: ${error.message}`
      }, { status: 500 })
    }

    console.log(`✅ 커스텀 정보 저장 성공: ${childcare_code}`)

    return NextResponse.json({
      message: '커스텀 정보가 저장되었습니다.',
      customInfo: data
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

