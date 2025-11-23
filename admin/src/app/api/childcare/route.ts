import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 시도/시군구 코드 매핑
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
    '수원시': 41110, '수원시 장안구': 41111, '수원시 권선구': 41113, '수원시 팔달구': 41115, 
    '수원시 영통구': 41117, '성남시': 41130, '성남시 수정구': 41131, '성남시 중원구': 41133, 
    '성남시 분당구': 41135, '의정부시': 41150, '안양시': 41170, '안양시 만안구': 41171, 
    '안양시 동안구': 41173, '부천시 원미구': 41192, '부천시 소사구': 41194, '부천시 오정구': 41196, 
    '광명시': 41210, '평택시': 41220, '동두천시': 41250, '안산시 상록구': 41271, '안산시 단원구': 41273, 
    '고양시 덕양구': 41281, '고양시 일산동구': 41285, '고양시 일산서구': 41287, '과천시': 41290, 
    '구리시': 41310, '남양주시': 41360, '오산시': 41370, '시흥시': 41390, '군포시': 41410, 
    '의왕시': 41430, '하남시': 41450, '용인시 처인구': 41461, '용인시 기흥구': 41463, 
    '용인시 수지구': 41465, '파주시': 41480, '이천시': 41500, '안성시': 41550, '김포시': 41570, 
    '화성시': 41590, '광주시': 41610, '양주시': 41630, '포천시': 41650, '여주시': 41670, 
    '연천군': 41800, '가평군': 41820, '양평군': 41830 
  } },
  '강원특별자치도': { sidoCode: 51, sggCodes: { 
    '춘천시': 51110, '원주시': 51130, '강릉시': 51150, '동해시': 51170, '태백시': 51190, 
    '속초시': 51210, '삼척시': 51230, '홍천군': 51720, '횡성군': 51730, '영월군': 51750, 
    '평창군': 51760, '정선군': 51770, '철원군': 51780, '화천군': 51790, '양구군': 51800, 
    '인제군': 51810, '고성군': 51820, '양양군': 51830 
  } },
  '충청북도': { sidoCode: 43, sggCodes: { 
    '청주시 상당구': 43111, '청주시 서원구': 43112, '청주시 흥덕구': 43113, '청주시 청원구': 43114, 
    '충주시': 43130, '제천시': 43150, '보은군': 43720, '옥천군': 43730, '영동군': 43740, 
    '증평군': 43745, '진천군': 43750, '괴산군': 43760, '음성군': 43770, '단양군': 43800 
  } },
  '충청남도': { sidoCode: 44, sggCodes: { 
    '천안시 동남구': 44131, '천안시 서북구': 44133, '공주시': 44150, '보령시': 44180, 
    '아산시': 44200, '서산시': 44210, '논산시': 44230, '계룡시': 44250, '당진시': 44270, 
    '금산군': 44710, '부여군': 44760, '서천군': 44770, '청양군': 44790, '홍성군': 44800, 
    '예산군': 44810, '태안군': 44825 
  } },
  '전북특별자치도': { sidoCode: 52, sggCodes: { 
    '전주시 완산구': 52111, '전주시 덕진구': 52113, '군산시': 52130, '익산시': 52140, 
    '정읍시': 52180, '남원시': 52190, '김제시': 52210, '완주군': 52710, '진안군': 52720, 
    '무주군': 52730, '장수군': 52740, '임실군': 52750, '순창군': 52770, '고창군': 52790, 
    '부안군': 52800 
  } },
  '전라남도': { sidoCode: 46, sggCodes: { 
    '목포시': 46110, '여수시': 46130, '순천시': 46150, '나주시': 46170, '광양시': 46230, 
    '담양군': 46710, '곡성군': 46720, '구례군': 46730, '고흥군': 46770, '보성군': 46780, 
    '화순군': 46790, '장흥군': 46800, '강진군': 46810, '해남군': 46820, '영암군': 46830, 
    '무안군': 46840, '함평군': 46860, '영광군': 46870, '장성군': 46880, '완도군': 46890, 
    '진도군': 46900, '신안군': 46910 
  } },
  '경상북도': { sidoCode: 47, sggCodes: { 
    '포항시 남구': 47111, '포항시 북구': 47113, '경주시': 47130, '김천시': 47150, 
    '안동시': 47170, '구미시': 47190, '영주시': 47210, '영천시': 47230, '상주시': 47250, 
    '문경시': 47280, '경산시': 47290, '의성군': 47720, '청송군': 47730, '영양군': 47750, 
    '영덕군': 47760, '청도군': 47770, '고령군': 47820, '성주군': 47830, '칠곡군': 47840, 
    '예천군': 47850, '봉화군': 47900, '울진군': 47920, '울릉군': 47940 
  } },
  '경상남도': { sidoCode: 48, sggCodes: { 
    '창원시 의창구': 48121, '창원시 성산구': 48123, '창원시 마산합포구': 48125, 
    '창원시 마산회원구': 48127, '창원시 진해구': 48129, '진주시': 48170, '통영시': 48220, 
    '사천시': 48240, '김해시': 48250, '밀양시': 48270, '거제시': 48310, '양산시': 48330, 
    '의령군': 48720, '함안군': 48730, '창녕군': 48740, '고성군': 48820, '남해군': 48840, 
    '하동군': 48850, '산청군': 48860, '함양군': 48870, '거창군': 48880, '합천군': 48890 
  } },
  '제주특별자치도': { sidoCode: 50, sggCodes: { 
    '제주시': 50110, '서귀포시': 50130 
  } }
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
    const arcode = sggCode.toString() // 어린이집 API는 arcode 사용

    console.log(`어린이집 조회 - ${sido} (${sidoCode}) > ${sgg} (arcode: ${arcode})`)

    // Supabase Edge Function을 통한 API 호출
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Supabase 환경변수가 설정되지 않았습니다.'
      }, { status: 500 })
    }

    const functionUrl = `${supabaseUrl}/functions/v1/childcare-api`
    
    console.log('📡 어린이집 Edge Function 호출:', functionUrl)
    
    const apiResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        action: 'fetch',
        arcode: arcode
      })
    })

    if (!apiResponse.ok) {
      return NextResponse.json({
        error: `Edge Function 호출 실패: ${apiResponse.status}`
      }, { status: 500 })
    }

    const apiData = await apiResponse.json()
    console.log('📡 Edge Function 응답:', apiData)

    if (apiData.error) {
      return NextResponse.json({
        error: apiData.error
      }, { status: 500 })
    }

    if (!apiData.success || !apiData.data) {
      return NextResponse.json({
        error: 'API 응답 형식이 올바르지 않습니다.'
      }, { status: 500 })
    }

    // API 데이터를 표준 형식으로 변환
    const childcareList = apiData.data.map((item: any) => ({
      crname: item.crname || '',
      crtypename: '민간',
      crstatus: '정상',
      crtelno: item.crtelno || '',
      craddr: item.craddr || '',
      crpostno: '',
      lttdcdnt: '',
      lngtcdnt: '',
      crcapat: item.crcapat ? item.crcapat.toString() : '0',
      crchcnt: '0',
      crspec: '일반보육',
      crspecdt: '',
      crfaclt: '',
      crfacltdt: '',
      crfacltetc: '',
      crtime: '',
      crtimeetc: '',
      crurl: item.crhome || '',
      crfaxno: item.crfaxno || '',
      crceoname: '',
      crceotellno: '',
      sidoname: sido,
      sigunname: sgg,
      dongname: '',
      crcode: item.stcode || '',
      crtype: '',
      sido: sidoCode.toString(),
      sigun: arcode,
      dong: ''
    }))

    console.log(`📡 API 응답: ${childcareList.length}개 어린이집`)

    // Supabase 클라이언트 생성 (리뷰 개수 조회 및 캐시 저장용)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 각 어린이집에 대한 리뷰 개수, 커스텀 정보, 급식 정보, 간편신청 정보 조회
    const childcareCentersWithReviewCount = await Promise.all(
      childcareList.map(async (childcare: any) => {
        // 리뷰 정보
        const { data: reviewData, count: reviewCount } = await supabase
          .from('childcare_reviews')
          .select('rating', { count: 'exact' })
          .eq('childcare_code', childcare.crcode)
          .eq('is_deleted', false)

        // 평균 별점 계산
        let averageRating = 0
        if (reviewData && reviewData.length > 0) {
          const totalRating = reviewData.reduce((sum, review) => sum + review.rating, 0)
          averageRating = totalRating / reviewData.length
        }

        // 커스텀 정보 (건물 사진 개수)
        const { data: customData, error: customError } = await supabase
          .from('childcare_custom_info')
          .select('building_images')
          .eq('facility_code', childcare.crcode)
          .eq('is_active', true)
          .single()

        if (customError && customError.code !== 'PGRST116') {
          console.error(`커스텀 정보 조회 오류 (${childcare.crname}):`, customError)
        }

        // 급식 정보 개수 (날짜 수)
        const { count: mealDatesCount, error: mealError } = await supabase
          .from('childcare_meals')
          .select('*', { count: 'exact', head: true })
          .eq('childcare_code', childcare.crcode)
          .eq('is_active', true)

        if (mealError) {
          console.error(`급식 정보 조회 오류 (${childcare.crname}):`, mealError)
        }

        // 간편신청 정보
        const { data: applicationData, error: applicationError } = await supabase
          .from('childcare_application_info')
          .select('monthly_price, available_slots')
          .eq('childcare_code', childcare.crcode)
          .eq('is_active', true)
          .single()

        if (applicationError && applicationError.code !== 'PGRST116') {
          console.error(`간편신청 정보 조회 오류 (${childcare.crname}):`, applicationError)
        }

        const buildingImageCount = customData?.building_images?.length || 0
        const mealCount = mealDatesCount || 0

        console.log(`📊 ${childcare.crname}: 리뷰 ${reviewCount || 0} (⭐${averageRating.toFixed(1)}), 건물사진 ${buildingImageCount}, 급식 ${mealCount}일, 간편신청 ${applicationData ? `월${applicationData.monthly_price}만원/빈자리${applicationData.available_slots}개` : '미설정'}`)

        return {
          ...childcare,
          reviewCount: reviewCount || 0,
          averageRating: averageRating > 0 ? averageRating.toFixed(1) : null,
          buildingImageCount,
          mealDatesCount: mealCount,
          monthlyPrice: applicationData?.monthly_price || null,
          availableSlots: applicationData?.available_slots || null
        }
      })
    )

    // 캐시 저장
    try {
      const isoDate = new Date().toISOString().split('T')[0]
      const pathPrefix = `regions/${sidoCode}/${sggCode}`
      
      // 캐시 Envelope 생성
      const cacheEnvelope = {
        meta: {
          arcode,
          region: `${sido} ${sgg}`,
          lastSyncedAt: new Date().toISOString(),
          itemCount: childcareCentersWithReviewCount.length,
          apiVersion: '1.0'
        },
        data: childcareCentersWithReviewCount
      }

      const jsonData = JSON.stringify(cacheEnvelope, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })

      // 1. 스냅샷 저장 (날짜별)
      const snapshotPath = `${pathPrefix}/${isoDate}.json`
      console.log(`📸 스냅샷 저장 시작: childcare-cache/${snapshotPath}`)
      
      const { error: snapshotError } = await supabase.storage
        .from('childcare-cache')
        .upload(snapshotPath, blob, {
          upsert: true,
          cacheControl: '3600',
          contentType: 'application/json'
        })

      if (snapshotError) {
        console.error(`❌ 스냅샷 저장 실패:`, snapshotError)
      } else {
        console.log(`✅ 스냅샷 저장 성공: childcare-cache/${snapshotPath}`)
      }

      // 2. latest.json 저장
      const latestPath = `${pathPrefix}/latest.json`
      console.log(`🔄 latest.json 저장 시작: childcare-cache/${latestPath}`)
      
      const { error: latestError } = await supabase.storage
        .from('childcare-cache')
        .upload(latestPath, blob, {
          upsert: true,
          cacheControl: '60',
          contentType: 'application/json'
        })

      if (latestError) {
        console.error(`❌ latest.json 저장 실패:`, latestError)
      } else {
        console.log(`✅ latest.json 저장 성공: childcare-cache/${latestPath}`)
      }

      console.log(`💾 어린이집 캐시 저장 완료: ${sido}/${sgg} (${childcareCentersWithReviewCount.length}개)`)
    } catch (cacheError) {
      console.error('어린이집 캐시 저장 중 오류:', cacheError)
    }

    return NextResponse.json({
      childcareCenters: childcareCentersWithReviewCount,
      count: childcareCentersWithReviewCount.length,
      source: 'api',
      region: { sido, sgg, sidoCode, sggCode, arcode }
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.',
      childcareCenters: []
    }, { status: 500 })
  }
}

