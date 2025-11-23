import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 시도/시군구 코드 매핑 (regions API와 동일)
const regionCodes = {
  '서울특별시': { sidoCode: 11, sggCodes: { 
    '중구': 11140, '종로구': 11110, '용산구': 11170, '성동구': 11200, '광진구': 11215, 
    '동대문구': 11230, '중랑구': 11260, '성북구': 11290, '강북구': 11305, '도봉구': 11320, 
    '노원구': 11350, '은평구': 11380, '서대문구': 11410, '마포구': 11440, '양천구': 11470, 
    '강서구': 11500, '구로구': 11530, '금천구': 11545, '영등포구': 11560, '동작구': 11590, 
    '관악구': 11620, '서초구': 11650, '강남구': 11680, '송파구': 11710, '강동구': 11740 
  } },
  '부산광역시': { sidoCode: 26, sggCodes: { 
    '중구': 26110, '서구': 26140, '동구': 26170, '영도구': 26200, '부산진구': 26230, 
    '동래구': 26260, '남구': 26290, '북구': 26320, '해운대구': 26350, '사하구': 26380, 
    '금정구': 26410, '강서구': 26440, '연제구': 26470, '수영구': 26500, '사상구': 26530, 
    '기장군': 26710 
  } },
  '대구광역시': { sidoCode: 27, sggCodes: { 
    '중구': 27110, '동구': 27140, '서구': 27170, '남구': 27200, '북구': 27230, 
    '수성구': 27260, '달서구': 27290, '달성군': 27710, '군위군': 27720 
  } },
  '인천광역시': { sidoCode: 28, sggCodes: { 
    '중구': 28110, '동구': 28140, '미추홀구': 28177, '연수구': 28185, '남동구': 28200, 
    '부평구': 28237, '계양구': 28245, '서구': 28260, '강화군': 28710, '옹진군': 28720 
  } },
  '광주광역시': { sidoCode: 29, sggCodes: { 
    '동구': 29110, '서구': 29140, '남구': 29155, '북구': 29170, '광산구': 29200 
  } },
  '대전광역시': { sidoCode: 30, sggCodes: { 
    '동구': 30110, '중구': 30140, '서구': 30170, '유성구': 30200, '대덕구': 30230 
  } },
  '울산광역시': { sidoCode: 31, sggCodes: { 
    '중구': 31110, '남구': 31140, '동구': 31170, '북구': 31200, '울주군': 31710 
  } },
  '세종특별자치시': { sidoCode: 36, sggCodes: { 
    '세종특별자치시': 36110 
  } },
  '경기도': { sidoCode: 41, sggCodes: { 
    '수원시': 41110, '성남시': 41130, '의정부시': 41150, '안양시': 41170,
    '부천시 원미구': 41192, '부천시 소사구': 41194, '부천시 오정구': 41196,
    '광명시': 41210, '평택시': 41220, '동두천시': 41250,
    '안산시 상록구': 41271, '안산시 단원구': 41273,
    '고양시 덕양구': 41281, '고양시 일산동구': 41285, '고양시 일산서구': 41287,
    '과천시': 41290, '구리시': 41310, '남양주시': 41360, '오산시': 41370,
    '시흥시': 41390, '군포시': 41410, '의왕시': 41430, '하남시': 41450,
    '용인시 처인구': 41461, '용인시 기흥구': 41463, '용인시 수지구': 41465,
    '파주시': 41480, '이천시': 41500, '안성시': 41550, '김포시': 41570,
    '화성시': 41590, '광주시': 41610, '양주시': 41630, '포천시': 41650,
    '여주시': 41670, '연천군': 41800, '가평군': 41820, '양평군': 41830
  } }
  // ... 나머지 지역 코드는 생략 (필요시 추가)
} as const

type RegionCodes = typeof regionCodes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sido = searchParams.get('sido')
    const sgg = searchParams.get('sgg')

    if (!sido || !sgg) {
      return NextResponse.json({
        error: '시/도와 시/군/구를 모두 입력해주세요.'
      }, { status: 400 })
    }

    // 지역 코드 찾기
    const sidoData = regionCodes[sido as keyof RegionCodes]
    if (!sidoData) {
      return NextResponse.json({
        error: '유효하지 않은 시/도입니다.'
      }, { status: 400 })
    }

    const sggCode = sidoData.sggCodes[sgg as keyof typeof sidoData.sggCodes]
    if (!sggCode) {
      return NextResponse.json({
        error: '유효하지 않은 시/군/구입니다.'
      }, { status: 400 })
    }

    const sidoCode = sidoData.sidoCode

    console.log(`캐시 조회 - ${sido} (${sidoCode}) > ${sgg} (${sggCode})`)

    // Supabase Storage 캐시 확인
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

    // 캐시 경로: kindergarten-cache/regions/{sidoCode}/{sggCode}.json
    const cachePath = `regions/${sidoCode}/${sggCode}.json`

    console.log('📂 캐시 경로:', cachePath)

    try {
      // 캐시 조회 시도
      const { data: cacheData, error: cacheError } = await supabase.storage
        .from('kindergarten-cache')
        .download(cachePath)

      if (cacheError || !cacheData) {
        console.log('❌ 캐시 없음:', cachePath)
        console.log('❌ 에러 상세:', cacheError)
        
        // 폴더 내부에 파일이 있는지 확인 (regions/{sidoCode}/{sggCode}/ 폴더 확인)
        const folderPath = `regions/${sidoCode}/${sggCode}`
        const { data: files, error: listError } = await supabase.storage
          .from('kindergarten-cache')
          .list(folderPath)
        
        if (!listError && files && files.length > 0) {
          console.log('📁 폴더 내 파일 목록:', files)
          // latest.json 파일 우선, 없으면 가장 최근 날짜 파일 사용
          let jsonFile = files.find(f => f.name === 'latest.json')
          
          if (!jsonFile) {
            // latest.json이 없으면 날짜 파일 중 가장 최근 것 사용
            const dateFiles = files.filter(f => f.name.endsWith('.json') && f.name.match(/\d{4}-\d{2}-\d{2}\.json/))
            if (dateFiles.length > 0) {
              // 날짜순으로 정렬하여 가장 최근 파일 선택
              dateFiles.sort((a, b) => b.name.localeCompare(a.name))
              jsonFile = dateFiles[0]
            }
          }
          
          if (jsonFile) {
            const filePath = `${folderPath}/${jsonFile.name}`
            console.log('📄 JSON 파일 발견:', filePath)
            
            const { data: fileData, error: fileError } = await supabase.storage
              .from('kindergarten-cache')
              .download(filePath)
            
            if (!fileError && fileData) {
              const fileText = await fileData.text()
              const fileJson = JSON.parse(fileText)
              
              // Edge Function 캐시 구조: { meta: {...}, data: [...] } 또는 API 구조: { kinderInfo: [...] }
              const kindergartenList = fileJson.data || fileJson.kinderInfo || []
              
              console.log(`✅ 폴더 내 파일에서 로드: ${kindergartenList.length}개 유치원`)
              console.log('📦 캐시 구조:', fileJson.meta ? 'Edge Function 형식 (data)' : 'API 형식 (kinderInfo)')

              // 리뷰 개수, 커스텀 정보, 급식 정보 조회
              const kindergartensWithReviewCount = await Promise.all(
                kindergartenList.map(async (kindergarten: any) => {
                  const { data: reviewData, count: reviewCount } = await supabase
                    .from('kindergarten_reviews')
                    .select('rating', { count: 'exact' })
                    .eq('kindergarten_code', kindergarten.kindercode)
                    .eq('is_deleted', false)

                  // 평균 별점 계산
                  let averageRating = 0
                  if (reviewData && reviewData.length > 0) {
                    const totalRating = reviewData.reduce((sum, review) => sum + review.rating, 0)
                    averageRating = totalRating / reviewData.length
                  }

                  const { data: customData, error: customError } = await supabase
                    .from('kindergarten_custom_info')
                    .select('building_images')
                    .eq('kinder_code', kindergarten.kindercode)
                    .eq('is_active', true)
                    .single()

                  if (customError && customError.code !== 'PGRST116') {
                    console.error(`커스텀 정보 조회 오류 (${kindergarten.kindername}):`, customError)
                  }

                  const { count: mealDatesCount, error: mealError } = await supabase
                    .from('kindergarten_meals')
                    .select('*', { count: 'exact', head: true })
                    .eq('kindergarten_code', kindergarten.kindercode)
                    .eq('is_active', true)

                  if (mealError) {
                    console.error(`급식 정보 조회 오류 (${kindergarten.kindername}):`, mealError)
                  }

                  // 간편신청 정보
                  const { data: applicationData, error: applicationError } = await supabase
                    .from('kindergarten_application_info')
                    .select('monthly_price, available_slots')
                    .eq('kinder_code', kindergarten.kindercode)
                    .eq('is_active', true)
                    .single()

                  if (applicationError && applicationError.code !== 'PGRST116') {
                    console.error(`간편신청 정보 조회 오류 (${kindergarten.kindername}):`, applicationError)
                  }

                  const buildingImageCount = customData?.building_images?.length || 0
                  const mealCount = mealDatesCount || 0

                  console.log(`📊 ${kindergarten.kindername}: 리뷰 ${reviewCount || 0} (⭐${averageRating.toFixed(1)}), 건물사진 ${buildingImageCount}, 급식 ${mealCount}일, 간편신청 ${applicationData ? `월${applicationData.monthly_price}만원/빈자리${applicationData.available_slots}개` : '미설정'}`)

                  return {
                    ...kindergarten,
                    reviewCount: reviewCount || 0,
                    averageRating: averageRating > 0 ? averageRating.toFixed(1) : null,
                    buildingImageCount,
                    mealDatesCount: mealCount,
                    monthlyPrice: applicationData?.monthly_price || null,
                    availableSlots: applicationData?.available_slots || null
                  }
                })
              )
              
              return NextResponse.json({
                kindergartens: kindergartensWithReviewCount,
                count: kindergartensWithReviewCount.length,
                source: 'cache',
                region: { sido, sgg, sidoCode, sggCode }
              })
            }
          }
        }
        
        return NextResponse.json({
          error: '해당 지역의 캐시가 없습니다.',
          source: 'none',
          kindergartens: [],
          count: 0
        }, { status: 404 })
      }

      const cacheText = await cacheData.text()
      const cacheJson = JSON.parse(cacheText)
      
      // Edge Function 캐시 구조: { meta: {...}, data: [...] } 또는 API 구조: { kinderInfo: [...] }
      const kindergartenList = cacheJson.data || cacheJson.kinderInfo || []
      
      console.log(`✅ 캐시에서 로드: ${kindergartenList.length}개 유치원`)
      console.log('📦 캐시 구조:', cacheJson.meta ? 'Edge Function 형식 (data)' : 'API 형식 (kinderInfo)')

      // 각 유치원에 대한 리뷰 개수, 커스텀 정보, 급식 정보 조회
      const kindergartensWithReviewCount = await Promise.all(
        kindergartenList.map(async (kindergarten: any) => {
          const { data: reviewData, count: reviewCount } = await supabase
            .from('kindergarten_reviews')
            .select('rating', { count: 'exact' })
            .eq('kindergarten_code', kindergarten.kindercode)
            .eq('is_deleted', false)

          // 평균 별점 계산
          let averageRating = 0
          if (reviewData && reviewData.length > 0) {
            const totalRating = reviewData.reduce((sum, review) => sum + review.rating, 0)
            averageRating = totalRating / reviewData.length
          }

          const { data: customData, error: customError } = await supabase
            .from('kindergarten_custom_info')
            .select('building_images')
            .eq('kinder_code', kindergarten.kindercode)
            .eq('is_active', true)
            .single()

          if (customError && customError.code !== 'PGRST116') {
            console.error(`커스텀 정보 조회 오류 (${kindergarten.kindername}):`, customError)
          }

          const { count: mealDatesCount, error: mealError } = await supabase
            .from('kindergarten_meals')
            .select('*', { count: 'exact', head: true })
            .eq('kindergarten_code', kindergarten.kindercode)
            .eq('is_active', true)

          if (mealError) {
            console.error(`급식 정보 조회 오류 (${kindergarten.kindername}):`, mealError)
          }

          // 간편신청 정보
          const { data: applicationData, error: applicationError } = await supabase
            .from('kindergarten_application_info')
            .select('monthly_price, available_slots')
            .eq('kinder_code', kindergarten.kindercode)
            .eq('is_active', true)
            .single()

          if (applicationError && applicationError.code !== 'PGRST116') {
            console.error(`간편신청 정보 조회 오류 (${kindergarten.kindername}):`, applicationError)
          }

          const buildingImageCount = customData?.building_images?.length || 0
          const mealCount = mealDatesCount || 0

          console.log(`📊 ${kindergarten.kindername}: 리뷰 ${reviewCount || 0} (⭐${averageRating.toFixed(1)}), 건물사진 ${buildingImageCount}, 급식 ${mealCount}일, 간편신청 ${applicationData ? `월${applicationData.monthly_price}만원/빈자리${applicationData.available_slots}개` : '미설정'}`)

          return {
            ...kindergarten,
            reviewCount: reviewCount || 0,
            averageRating: averageRating > 0 ? averageRating.toFixed(1) : null,
            buildingImageCount,
            mealDatesCount: mealCount,
            monthlyPrice: applicationData?.monthly_price || null,
            availableSlots: applicationData?.available_slots || null
          }
        })
      )
      
      return NextResponse.json({
        kindergartens: kindergartensWithReviewCount,
        count: kindergartensWithReviewCount.length,
        source: 'cache',
        region: { sido, sgg, sidoCode, sggCode }
      })
    } catch (error) {
      console.error('캐시 로드 오류:', error)
      return NextResponse.json({
        error: '캐시 로드 중 오류가 발생했습니다.',
        source: 'none',
        kindergartens: [],
        count: 0
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.',
      kindergartens: []
    }, { status: 500 })
  }
}

