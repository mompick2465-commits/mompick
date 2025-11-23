import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: kinderCode } = await params

    if (!kinderCode) {
      return NextResponse.json({
        error: '유치원 코드가 필요합니다.'
      }, { status: 400 })
    }

    console.log(`유치원 상세 조회 - kinderCode: ${kinderCode}`)

    // Supabase Storage 설정
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

    // 캐시 경로: kindergarten-detail-cache/details/{kinderCode}.json
    const cachePath = `details/${kinderCode}.json`

    let kindergartenDetail = null
    let source = 'api'

    try {
      // 1. 캐시 조회 시도
      const { data: cacheData, error: cacheError } = await supabase.storage
        .from('kindergarten-detail-cache')
        .download(cachePath)

      if (!cacheError && cacheData) {
        const cacheText = await cacheData.text()
        kindergartenDetail = JSON.parse(cacheText)
        source = 'cache'
        console.log(`✅ 캐시에서 로드: ${kinderCode}`)
      }
    } catch (error) {
      console.log('캐시 로드 실패, API 호출로 전환:', error)
    }

    // 2. 캐시가 없으면 API 호출
    if (!kindergartenDetail) {
      const apiKey = process.env.KINDERGARTEN_API_KEY
      if (!apiKey) {
        return NextResponse.json({
          error: 'API 키가 설정되지 않았습니다.'
        }, { status: 500 })
      }

      const apiUrl = `https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo.do?key=${apiKey}&kindercode=${kinderCode}`
      
      console.log('📡 API 호출:', apiUrl)
      
      const apiResponse = await fetch(apiUrl)
      if (!apiResponse.ok) {
        return NextResponse.json({
          error: 'API 호출에 실패했습니다.'
        }, { status: 500 })
      }

      const apiData = await apiResponse.json()
      
      console.log('📡 API 응답 상태:', apiData.status)
      console.log('📡 API 응답 데이터:', apiData)
      
      if (!apiData.kinderInfo || apiData.kinderInfo.length === 0) {
        console.error('❌ 유치원 정보 없음 - API 응답:', JSON.stringify(apiData, null, 2))
        return NextResponse.json({
          error: '유치원 정보를 찾을 수 없습니다.',
          apiResponse: apiData
        }, { status: 404 })
      }

      kindergartenDetail = apiData.kinderInfo[0]
      console.log('✅ 유치원 상세 정보 로드:', kindergartenDetail.kindername)

      // 3. API 결과를 캐시에 저장
      try {
        const cacheContent = JSON.stringify(kindergartenDetail, null, 2)
        const blob = new Blob([cacheContent], { type: 'application/json' })
        
        const { error: uploadError } = await supabase.storage
          .from('kindergarten-detail-cache')
          .upload(cachePath, blob, {
            contentType: 'application/json',
            upsert: true
          })

        if (uploadError) {
          console.error('캐시 저장 실패:', uploadError)
        } else {
          console.log(`💾 캐시 저장 성공: ${kinderCode}`)
        }
      } catch (error) {
        console.error('캐시 저장 중 오류:', error)
      }

      source = 'api'
      console.log(`📡 API에서 로드: ${kinderCode}`)
    }

    // 4. 커스텀 정보 조회 (kindergarten_custom_info 테이블)
    const { data: customInfo, error: customError } = await supabase
      .from('kindergarten_custom_info')
      .select('*')
      .eq('kinder_code', kinderCode)
      .eq('is_active', true)
      .single()

    if (customError && customError.code !== 'PGRST116') { // PGRST116은 "no rows found" 에러
      console.error('커스텀 정보 조회 오류:', customError)
    }

    // 5. 리뷰 정보 조회 (kindergarten_reviews 테이블)
    const { data: reviews, error: reviewsError } = await supabase
      .from('kindergarten_reviews')
      .select(`
        *,
        kindergarten_review_images(*)
      `)
      .eq('kinder_code', kinderCode)
      .order('created_at', { ascending: false })

    if (reviewsError) {
      console.error('리뷰 조회 오류:', reviewsError)
    }

    // 평균 평점 및 리뷰 수 계산
    let averageRating = '0.0'
    let reviewCount = 0
    
    if (reviews && reviews.length > 0) {
      reviewCount = reviews.length
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
      averageRating = (totalRating / reviewCount).toFixed(1)
    }

    return NextResponse.json({
      kindergarten: {
        ...kindergartenDetail,
        customInfo: customInfo || null,
        reviews: reviews || [],
        reviewCount,
        averageRating
      },
      source
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// PATCH: 커스텀 정보로 캐시 업데이트
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: kinderCode } = await params
    const customData = await request.json()

    console.log(`캐시 업데이트 - kinderCode: ${kinderCode}`)

    // Supabase Storage 설정
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

    // 캐시 경로
    const cachePath = `details/${kinderCode}.json`

    // 기존 캐시 로드
    let existingCache = null
    try {
      const { data: cacheData, error: cacheError } = await supabase.storage
        .from('kindergarten-detail-cache')
        .download(cachePath)

      if (!cacheError && cacheData) {
        const cacheText = await cacheData.text()
        existingCache = JSON.parse(cacheText)
      }
    } catch (error) {
      console.log('기존 캐시 없음, 새로 생성합니다.')
    }

    // 커스텀 정보 병합
    const updatedCache = {
      ...existingCache,
      customInfo: customData
    }

    // 캐시 저장
    const cacheContent = JSON.stringify(updatedCache, null, 2)
    const blob = new Blob([cacheContent], { type: 'application/json' })
    
    const { error: uploadError } = await supabase.storage
      .from('kindergarten-detail-cache')
      .upload(cachePath, blob, {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) {
      console.error('캐시 업데이트 실패:', uploadError)
      return NextResponse.json({
        error: '캐시 업데이트에 실패했습니다.'
      }, { status: 500 })
    }

    console.log(`✅ 캐시 업데이트 성공: ${kinderCode}`)

    return NextResponse.json({
      message: '캐시가 업데이트되었습니다.',
      cache: updatedCache
    })

  } catch (error) {
    console.error('캐시 업데이트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
