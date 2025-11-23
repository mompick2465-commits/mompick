import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { childcare_code, meals } = body

    if (!childcare_code || !meals || !Array.isArray(meals)) {
      return NextResponse.json({
        error: '어린이집 코드와 급식 정보가 필요합니다.'
      }, { status: 400 })
    }

    console.log(`📅 급식 정보 저장 - ${childcare_code}: ${meals.length}개 날짜`)

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

    // 각 날짜별 급식 정보 저장 (upsert)
    const results = await Promise.all(
      meals.map(async (meal) => {
        const { data, error } = await supabase
          .from('childcare_meals')
          .upsert({
            childcare_code,
            meal_date: meal.meal_date,
            meal_images: meal.meal_images || [],
            menu_description: meal.menu_description || null,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'childcare_code,meal_date'
          })
          .select()

        if (error) {
          console.error(`급식 저장 오류 (${meal.meal_date}):`, error)
          return { success: false, date: meal.meal_date, error: error.message }
        }

        console.log(`✅ 급식 저장 성공: ${meal.meal_date}`)
        return { success: true, date: meal.meal_date }
      })
    )

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `${successCount}개 날짜 저장 성공${failCount > 0 ? `, ${failCount}개 실패` : ''}`,
      results
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

