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

    // 스토리지에서 해당 시/도와 시/군/구에 해당하는 실제 10자리 지역 코드 찾기
    // regions 폴더를 스캔해서 regionName이 일치하는 폴더 찾기
    const { data: folders, error: listError } = await supabase.storage
      .from('playground-cache')
      .list('regions', {
        limit: 10000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (listError) {
      console.error('regions 폴더 목록 조회 오류:', listError)
      return NextResponse.json({
        error: 'regions 폴더 목록 조회 실패',
        playgrounds: []
      }, { status: 500 })
    }

    // 시군구 코드 찾기
    const sidoData = (regionCodes as any)[sido]
    if (!sidoData || !sidoData.sggCodes || !sidoData.sggCodes[sgg]) {
      return NextResponse.json({
        error: `지역 코드를 찾을 수 없습니다: ${sido} ${sgg}`,
        source: 'none',
        playgrounds: [],
        count: 0
      }, { status: 404 })
    }

    const sggCode = sidoData.sggCodes[sgg]
    const sggPrefix = String(sggCode).padStart(5, '0') // 예: "11260"

    console.log(`🔍 구 단위 캐시 로드 시작: ${sido} > ${sgg} (시군구 코드: ${sggCode}, 접두사: ${sggPrefix})`)

    // 폴더 이름이 숫자로만 이루어진 경우만 확인
    const regionFolders = folders?.filter(f => /^\d+$/.test(f.name.trim())) || []

    // 구 단위 코드로 시작하는 모든 동 단위 코드 찾기
    const matchingCodes = regionFolders
      .map(f => f.name.trim().padStart(10, '0'))
      .filter(code => code.startsWith(sggPrefix))

    console.log(`📁 구 단위로 시작하는 지역 코드 ${matchingCodes.length}개 발견`)

    if (matchingCodes.length === 0) {
      console.log(`❌ 구 단위 캐시를 찾을 수 없음: ${sido} ${sgg} (접두사: ${sggPrefix})`)
      return NextResponse.json({
        error: `해당 지역(${sido} ${sgg})의 캐시를 찾을 수 없습니다.`,
        source: 'none',
        playgrounds: [],
        count: 0
      }, { status: 404 })
    }

    // 모든 동 단위 캐시를 병렬로 로드
    const batchSize = 20
    const allPlaygrounds: any[] = []
    const loadedRegionCodes: string[] = []

    for (let i = 0; i < matchingCodes.length; i += batchSize) {
      const batch = matchingCodes.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (regionCode) => {
          const cachePath = `regions/${regionCode}/latest.json`
          
          try {
            const { data: cacheData, error: cacheError } = await supabase.storage
              .from('playground-cache')
              .download(cachePath)

            if (cacheError || !cacheData) {
              return { items: [], code: regionCode, success: false }
            }

            const cacheText = await cacheData.text()
            const cacheJson = JSON.parse(cacheText)
            const items = cacheJson.items || cacheJson.data || []
            
            console.log(`✅ 구 단위 로드: ${regionCode} → ${items.length}개`)
            
            return { items, code: regionCode, success: true }
          } catch (err) {
            console.warn(`⚠️ 구 단위 로드 실패: ${regionCode}`, err)
            return { items: [], code: regionCode, success: false }
          }
        })
      )

      // 성공한 결과만 합치기
      for (const result of batchResults) {
        if (result.success && result.items.length > 0) {
          allPlaygrounds.push(...result.items)
          loadedRegionCodes.push(result.code)
        }
      }
    }

    console.log(`✅ 구 단위 캐시 로드 완료: ${loadedRegionCodes.length}개 동 단위, 총 ${allPlaygrounds.length}개 놀이시설`)

    if (allPlaygrounds.length === 0) {
      return NextResponse.json({
        error: '해당 지역의 캐시가 없습니다.',
        source: 'none',
        playgrounds: [],
        count: 0
      }, { status: 404 })
    }

    // 중복 제거 (pfctSn 기준)
    const uniquePlaygrounds = new Map<string, any>()
    for (const playground of allPlaygrounds) {
      const id = playground.pfctSn || playground.id || ''
      if (id && !uniquePlaygrounds.has(id)) {
        uniquePlaygrounds.set(id, playground)
      }
    }

    const playgroundList = Array.from(uniquePlaygrounds.values())
    console.log(`✅ 중복 제거 후: ${playgroundList.length}개 놀이시설`)

    try {

      // 각 놀이시설에 대한 리뷰 개수, 커스텀 정보 조회
      const playgroundsWithInfo = await Promise.all(
        playgroundList.map(async (playground: any) => {
          const playgroundId = playground.pfctSn || playground.id || ''

          // 리뷰 개수 및 평균 별점
          const { data: reviewData, count: reviewCount } = await supabase
            .from('playground_reviews')
            .select('rating', { count: 'exact' })
            .eq('playground_id', playgroundId)
            .eq('is_deleted', false)

          // 평균 별점 계산
          let averageRating = 0
          if (reviewData && reviewData.length > 0) {
            const totalRating = reviewData.reduce((sum: number, review: any) => sum + review.rating, 0)
            averageRating = totalRating / reviewData.length
          }

          // 커스텀 정보 (건물 사진 개수)
          const { data: customData, error: customError } = await supabase
            .from('playground_custom_info')
            .select('building_images')
            .eq('playground_id', playgroundId)
            .eq('is_active', true)
            .single()

          if (customError && customError.code !== 'PGRST116') {
            console.error(`커스텀 정보 조회 오류 (${playground.pfctNm}):`, customError)
          }

          const buildingImageCount = customData?.building_images?.length || 0

          // 주소 처리 (앱과 동일한 로직)
          const baseAddr = (playground as any).ronaAddr || playground.roadAddr || playground.addr || ''
          const detailAddr = (playground as any).ronaDaddr || (playground as any).dtlAddr || ''
          const zipRaw = (playground as any).zip ? String((playground as any).zip) : ''
          const normalizedZip = zipRaw.replace(/[^\d]/g, '').slice(0, 5)

          const addressParts = [baseAddr, detailAddr]
            .map((part) => (part || '').trim())
            .filter(Boolean)
          const joinedAddress = addressParts.join(' ')

          const displayAddress =
            joinedAddress && normalizedZip
              ? `${joinedAddress} (${normalizedZip})`
              : joinedAddress || '주소 없음'

          console.log(`📊 ${playground.pfctNm}: 리뷰 ${reviewCount || 0} (⭐${averageRating.toFixed(1)}), 건물사진 ${buildingImageCount}, 주소: ${displayAddress}`)

          return {
            ...playground,
            id: playgroundId,
            name: playground.pfctNm || playground.name || '',
            address: displayAddress,
            addr: playground.addr || '',
            roadAddr: playground.roadAddr || '',
            ronaAddr: (playground as any).ronaAddr || '',
            ronaDaddr: (playground as any).ronaDaddr || '',
            dtlAddr: (playground as any).dtlAddr || '',
            zip: normalizedZip || '',
            reviewCount: reviewCount || 0,
            averageRating: averageRating > 0 ? averageRating.toFixed(1) : null,
            buildingImageCount
          }
        })
      )
      
      // 지역 코드에서 시도 코드와 시군구 코드 추출
      const sidoCode = sidoData.sidoCode

      return NextResponse.json({
        playgrounds: playgroundsWithInfo,
        count: playgroundsWithInfo.length,
        source: 'cache',
        region: { 
          sido, 
          sgg, 
          sidoCode, 
          sggCode, 
          regionCodes: loadedRegionCodes,
          regionCode: loadedRegionCodes[0] || null // 첫 번째 코드를 대표로
        }
      })
    } catch (error) {
      console.error('캐시 로드 오류:', error)
      return NextResponse.json({
        error: '캐시 로드 중 오류가 발생했습니다.',
        source: 'none',
        playgrounds: [],
        count: 0
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.',
      playgrounds: []
    }, { status: 500 })
  }
}

