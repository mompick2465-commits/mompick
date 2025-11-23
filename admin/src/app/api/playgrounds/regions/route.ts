import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 시도/시군구 코드 매핑 (regionCode를 시도/시군구로 변환하기 위해 사용)
const regionCodeToName: { [key: number]: { sido: string, sgg: string } } = {
  // 서울특별시
  11110: { sido: '서울특별시', sgg: '종로구' },
  11140: { sido: '서울특별시', sgg: '중구' },
  11170: { sido: '서울특별시', sgg: '용산구' },
  11200: { sido: '서울특별시', sgg: '성동구' },
  11215: { sido: '서울특별시', sgg: '광진구' },
  11230: { sido: '서울특별시', sgg: '동대문구' },
  11260: { sido: '서울특별시', sgg: '중랑구' },
  11290: { sido: '서울특별시', sgg: '성북구' },
  11305: { sido: '서울특별시', sgg: '강북구' },
  11320: { sido: '서울특별시', sgg: '도봉구' },
  11350: { sido: '서울특별시', sgg: '노원구' },
  11380: { sido: '서울특별시', sgg: '은평구' },
  11410: { sido: '서울특별시', sgg: '서대문구' },
  11440: { sido: '서울특별시', sgg: '마포구' },
  11470: { sido: '서울특별시', sgg: '양천구' },
  11500: { sido: '서울특별시', sgg: '강서구' },
  11530: { sido: '서울특별시', sgg: '구로구' },
  11545: { sido: '서울특별시', sgg: '금천구' },
  11560: { sido: '서울특별시', sgg: '영등포구' },
  11590: { sido: '서울특별시', sgg: '동작구' },
  11620: { sido: '서울특별시', sgg: '관악구' },
  11650: { sido: '서울특별시', sgg: '서초구' },
  11680: { sido: '서울특별시', sgg: '강남구' },
  11710: { sido: '서울특별시', sgg: '송파구' },
  11740: { sido: '서울특별시', sgg: '강동구' },
  // 부산광역시
  26110: { sido: '부산광역시', sgg: '중구' },
  26140: { sido: '부산광역시', sgg: '서구' },
  26170: { sido: '부산광역시', sgg: '동구' },
  26200: { sido: '부산광역시', sgg: '영도구' },
  26230: { sido: '부산광역시', sgg: '부산진구' },
  26260: { sido: '부산광역시', sgg: '동래구' },
  26290: { sido: '부산광역시', sgg: '남구' },
  26320: { sido: '부산광역시', sgg: '북구' },
  26350: { sido: '부산광역시', sgg: '해운대구' },
  26380: { sido: '부산광역시', sgg: '사하구' },
  26410: { sido: '부산광역시', sgg: '금정구' },
  26440: { sido: '부산광역시', sgg: '강서구' },
  26470: { sido: '부산광역시', sgg: '연제구' },
  26500: { sido: '부산광역시', sgg: '수영구' },
  26530: { sido: '부산광역시', sgg: '사상구' },
  26710: { sido: '부산광역시', sgg: '기장군' },
  // 대구광역시
  27110: { sido: '대구광역시', sgg: '중구' },
  27140: { sido: '대구광역시', sgg: '동구' },
  27170: { sido: '대구광역시', sgg: '서구' },
  27200: { sido: '대구광역시', sgg: '남구' },
  27230: { sido: '대구광역시', sgg: '북구' },
  27260: { sido: '대구광역시', sgg: '수성구' },
  27290: { sido: '대구광역시', sgg: '달서구' },
  27710: { sido: '대구광역시', sgg: '달성군' },
  27720: { sido: '대구광역시', sgg: '군위군' },
  // 인천광역시
  28110: { sido: '인천광역시', sgg: '중구' },
  28140: { sido: '인천광역시', sgg: '동구' },
  28177: { sido: '인천광역시', sgg: '미추홀구' },
  28185: { sido: '인천광역시', sgg: '연수구' },
  28200: { sido: '인천광역시', sgg: '남동구' },
  28237: { sido: '인천광역시', sgg: '부평구' },
  28245: { sido: '인천광역시', sgg: '계양구' },
  28260: { sido: '인천광역시', sgg: '서구' },
  28710: { sido: '인천광역시', sgg: '강화군' },
  28720: { sido: '인천광역시', sgg: '옹진군' },
  // 광주광역시
  29110: { sido: '광주광역시', sgg: '동구' },
  29140: { sido: '광주광역시', sgg: '서구' },
  29155: { sido: '광주광역시', sgg: '남구' },
  29170: { sido: '광주광역시', sgg: '북구' },
  29200: { sido: '광주광역시', sgg: '광산구' },
  // 대전광역시
  30110: { sido: '대전광역시', sgg: '동구' },
  30140: { sido: '대전광역시', sgg: '중구' },
  30170: { sido: '대전광역시', sgg: '서구' },
  30200: { sido: '대전광역시', sgg: '유성구' },
  30230: { sido: '대전광역시', sgg: '대덕구' },
  // 울산광역시
  31110: { sido: '울산광역시', sgg: '중구' },
  31140: { sido: '울산광역시', sgg: '남구' },
  31170: { sido: '울산광역시', sgg: '동구' },
  31200: { sido: '울산광역시', sgg: '북구' },
  31710: { sido: '울산광역시', sgg: '울주군' },
  // 세종특별자치시
  36110: { sido: '세종특별자치시', sgg: '세종특별자치시' },
  // 경기도
  41110: { sido: '경기도', sgg: '수원시' },
  41111: { sido: '경기도', sgg: '수원시 장안구' },
  41113: { sido: '경기도', sgg: '수원시 권선구' },
  41115: { sido: '경기도', sgg: '수원시 팔달구' },
  41117: { sido: '경기도', sgg: '수원시 영통구' },
  41130: { sido: '경기도', sgg: '성남시' },
  41131: { sido: '경기도', sgg: '성남시 수정구' },
  41133: { sido: '경기도', sgg: '성남시 중원구' },
  41135: { sido: '경기도', sgg: '성남시 분당구' },
  41150: { sido: '경기도', sgg: '의정부시' },
  41170: { sido: '경기도', sgg: '안양시' },
  41171: { sido: '경기도', sgg: '안양시 만안구' },
  41173: { sido: '경기도', sgg: '안양시 동안구' },
  41192: { sido: '경기도', sgg: '부천시 원미구' },
  41194: { sido: '경기도', sgg: '부천시 소사구' },
  41196: { sido: '경기도', sgg: '부천시 오정구' },
  41210: { sido: '경기도', sgg: '광명시' },
  41220: { sido: '경기도', sgg: '평택시' },
  41250: { sido: '경기도', sgg: '동두천시' },
  41271: { sido: '경기도', sgg: '안산시 상록구' },
  41273: { sido: '경기도', sgg: '안산시 단원구' },
  41281: { sido: '경기도', sgg: '고양시 덕양구' },
  41285: { sido: '경기도', sgg: '고양시 일산동구' },
  41287: { sido: '경기도', sgg: '고양시 일산서구' },
  41290: { sido: '경기도', sgg: '과천시' },
  41310: { sido: '경기도', sgg: '구리시' },
  41360: { sido: '경기도', sgg: '남양주시' },
  41370: { sido: '경기도', sgg: '오산시' },
  41390: { sido: '경기도', sgg: '시흥시' },
  41410: { sido: '경기도', sgg: '군포시' },
  41430: { sido: '경기도', sgg: '의왕시' },
  41450: { sido: '경기도', sgg: '하남시' },
  41461: { sido: '경기도', sgg: '용인시 처인구' },
  41463: { sido: '경기도', sgg: '용인시 기흥구' },
  41465: { sido: '경기도', sgg: '용인시 수지구' },
  41480: { sido: '경기도', sgg: '파주시' },
  41500: { sido: '경기도', sgg: '이천시' },
  41550: { sido: '경기도', sgg: '안성시' },
  41570: { sido: '경기도', sgg: '김포시' },
  41590: { sido: '경기도', sgg: '화성시' },
  41610: { sido: '경기도', sgg: '광주시' },
  41630: { sido: '경기도', sgg: '양주시' },
  41650: { sido: '경기도', sgg: '포천시' },
  41670: { sido: '경기도', sgg: '여주시' },
  41800: { sido: '경기도', sgg: '연천군' },
  41820: { sido: '경기도', sgg: '가평군' },
  41830: { sido: '경기도', sgg: '양평군' },
  // 강원특별자치도
  51110: { sido: '강원특별자치도', sgg: '춘천시' },
  51130: { sido: '강원특별자치도', sgg: '원주시' },
  51150: { sido: '강원특별자치도', sgg: '강릉시' },
  51170: { sido: '강원특별자치도', sgg: '동해시' },
  51190: { sido: '강원특별자치도', sgg: '태백시' },
  51210: { sido: '강원특별자치도', sgg: '속초시' },
  51230: { sido: '강원특별자치도', sgg: '삼척시' },
  51720: { sido: '강원특별자치도', sgg: '홍천군' },
  51730: { sido: '강원특별자치도', sgg: '횡성군' },
  51750: { sido: '강원특별자치도', sgg: '영월군' },
  51760: { sido: '강원특별자치도', sgg: '평창군' },
  51770: { sido: '강원특별자치도', sgg: '정선군' },
  51780: { sido: '강원특별자치도', sgg: '철원군' },
  51790: { sido: '강원특별자치도', sgg: '화천군' },
  51800: { sido: '강원특별자치도', sgg: '양구군' },
  51810: { sido: '강원특별자치도', sgg: '인제군' },
  51820: { sido: '강원특별자치도', sgg: '고성군' },
  51830: { sido: '강원특별자치도', sgg: '양양군' },
  // 충청북도
  43111: { sido: '충청북도', sgg: '청주시 상당구' },
  43112: { sido: '충청북도', sgg: '청주시 서원구' },
  43113: { sido: '충청북도', sgg: '청주시 흥덕구' },
  43114: { sido: '충청북도', sgg: '청주시 청원구' },
  43130: { sido: '충청북도', sgg: '충주시' },
  43150: { sido: '충청북도', sgg: '제천시' },
  43720: { sido: '충청북도', sgg: '보은군' },
  43730: { sido: '충청북도', sgg: '옥천군' },
  43740: { sido: '충청북도', sgg: '영동군' },
  43745: { sido: '충청북도', sgg: '증평군' },
  43750: { sido: '충청북도', sgg: '진천군' },
  43760: { sido: '충청북도', sgg: '괴산군' },
  43770: { sido: '충청북도', sgg: '음성군' },
  43800: { sido: '충청북도', sgg: '단양군' },
  // 충청남도
  44131: { sido: '충청남도', sgg: '천안시 동남구' },
  44133: { sido: '충청남도', sgg: '천안시 서북구' },
  44150: { sido: '충청남도', sgg: '공주시' },
  44180: { sido: '충청남도', sgg: '보령시' },
  44200: { sido: '충청남도', sgg: '아산시' },
  44210: { sido: '충청남도', sgg: '서산시' },
  44230: { sido: '충청남도', sgg: '논산시' },
  44250: { sido: '충청남도', sgg: '계룡시' },
  44270: { sido: '충청남도', sgg: '당진시' },
  44710: { sido: '충청남도', sgg: '금산군' },
  44760: { sido: '충청남도', sgg: '부여군' },
  44770: { sido: '충청남도', sgg: '서천군' },
  44790: { sido: '충청남도', sgg: '청양군' },
  44800: { sido: '충청남도', sgg: '홍성군' },
  44810: { sido: '충청남도', sgg: '예산군' },
  44825: { sido: '충청남도', sgg: '태안군' },
  // 전북특별자치도
  52111: { sido: '전북특별자치도', sgg: '전주시 완산구' },
  52113: { sido: '전북특별자치도', sgg: '전주시 덕진구' },
  52130: { sido: '전북특별자치도', sgg: '군산시' },
  52140: { sido: '전북특별자치도', sgg: '익산시' },
  52180: { sido: '전북특별자치도', sgg: '정읍시' },
  52190: { sido: '전북특별자치도', sgg: '남원시' },
  52210: { sido: '전북특별자치도', sgg: '김제시' },
  52710: { sido: '전북특별자치도', sgg: '완주군' },
  52720: { sido: '전북특별자치도', sgg: '진안군' },
  52730: { sido: '전북특별자치도', sgg: '무주군' },
  52740: { sido: '전북특별자치도', sgg: '장수군' },
  52750: { sido: '전북특별자치도', sgg: '임실군' },
  52770: { sido: '전북특별자치도', sgg: '순창군' },
  52790: { sido: '전북특별자치도', sgg: '고창군' },
  52800: { sido: '전북특별자치도', sgg: '부안군' },
  // 전라남도
  46110: { sido: '전라남도', sgg: '목포시' },
  46130: { sido: '전라남도', sgg: '여수시' },
  46150: { sido: '전라남도', sgg: '순천시' },
  46170: { sido: '전라남도', sgg: '나주시' },
  46230: { sido: '전라남도', sgg: '광양시' },
  46710: { sido: '전라남도', sgg: '담양군' },
  46720: { sido: '전라남도', sgg: '곡성군' },
  46730: { sido: '전라남도', sgg: '구례군' },
  46770: { sido: '전라남도', sgg: '고흥군' },
  46780: { sido: '전라남도', sgg: '보성군' },
  46790: { sido: '전라남도', sgg: '화순군' },
  46800: { sido: '전라남도', sgg: '장흥군' },
  46810: { sido: '전라남도', sgg: '강진군' },
  46820: { sido: '전라남도', sgg: '해남군' },
  46830: { sido: '전라남도', sgg: '영암군' },
  46840: { sido: '전라남도', sgg: '무안군' },
  46860: { sido: '전라남도', sgg: '함평군' },
  46870: { sido: '전라남도', sgg: '영광군' },
  46880: { sido: '전라남도', sgg: '장성군' },
  46890: { sido: '전라남도', sgg: '완도군' },
  46900: { sido: '전라남도', sgg: '진도군' },
  46910: { sido: '전라남도', sgg: '신안군' },
  // 경상북도
  47111: { sido: '경상북도', sgg: '포항시 남구' },
  47113: { sido: '경상북도', sgg: '포항시 북구' },
  47130: { sido: '경상북도', sgg: '경주시' },
  47150: { sido: '경상북도', sgg: '김천시' },
  47170: { sido: '경상북도', sgg: '안동시' },
  47190: { sido: '경상북도', sgg: '구미시' },
  47210: { sido: '경상북도', sgg: '영주시' },
  47230: { sido: '경상북도', sgg: '영천시' },
  47250: { sido: '경상북도', sgg: '상주시' },
  47280: { sido: '경상북도', sgg: '문경시' },
  47290: { sido: '경상북도', sgg: '경산시' },
  47720: { sido: '경상북도', sgg: '의성군' },
  47730: { sido: '경상북도', sgg: '청송군' },
  47750: { sido: '경상북도', sgg: '영양군' },
  47760: { sido: '경상북도', sgg: '영덕군' },
  47770: { sido: '경상북도', sgg: '청도군' },
  47820: { sido: '경상북도', sgg: '고령군' },
  47830: { sido: '경상북도', sgg: '성주군' },
  47840: { sido: '경상북도', sgg: '칠곡군' },
  47850: { sido: '경상북도', sgg: '예천군' },
  47900: { sido: '경상북도', sgg: '봉화군' },
  47920: { sido: '경상북도', sgg: '울진군' },
  47940: { sido: '경상북도', sgg: '울릉군' },
  // 경상남도
  48121: { sido: '경상남도', sgg: '창원시 의창구' },
  48123: { sido: '경상남도', sgg: '창원시 성산구' },
  48125: { sido: '경상남도', sgg: '창원시 마산합포구' },
  48127: { sido: '경상남도', sgg: '창원시 마산회원구' },
  48129: { sido: '경상남도', sgg: '창원시 진해구' },
  48170: { sido: '경상남도', sgg: '진주시' },
  48220: { sido: '경상남도', sgg: '통영시' },
  48240: { sido: '경상남도', sgg: '사천시' },
  48250: { sido: '경상남도', sgg: '김해시' },
  48270: { sido: '경상남도', sgg: '밀양시' },
  48310: { sido: '경상남도', sgg: '거제시' },
  48330: { sido: '경상남도', sgg: '양산시' },
  48720: { sido: '경상남도', sgg: '의령군' },
  48730: { sido: '경상남도', sgg: '함안군' },
  48740: { sido: '경상남도', sgg: '창녕군' },
  48820: { sido: '경상남도', sgg: '고성군' },
  48840: { sido: '경상남도', sgg: '남해군' },
  48850: { sido: '경상남도', sgg: '하동군' },
  48860: { sido: '경상남도', sgg: '산청군' },
  48870: { sido: '경상남도', sgg: '함양군' },
  48880: { sido: '경상남도', sgg: '거창군' },
  48890: { sido: '경상남도', sgg: '합천군' },
  // 제주특별자치도
  50110: { sido: '제주특별자치도', sgg: '제주시' },
  50130: { sido: '제주특별자치도', sgg: '서귀포시' },
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Supabase 환경변수가 설정되지 않았습니다.',
        regionCodes: {}
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. 먼저 테이블에서 저장된 매핑 확인
    const { data: cachedMappings, error: cacheError } = await supabase
      .from('playground_region_mappings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (cacheError) {
      console.log('⚠️ 테이블 조회 오류 (정상일 수 있음 - 테이블이 없거나 비어있음):', cacheError.message)
    }

    if (!cacheError && cachedMappings && cachedMappings.length > 0) {
      const cachedMapping = cachedMappings[0]
      if (cachedMapping && cachedMapping.region_codes) {
        console.log('✅ 저장된 지역 매핑 사용 (캐시)')
        console.log(`📊 캐시된 데이터: ${cachedMapping.total_sido_count}개 시도, ${cachedMapping.total_sgg_count}개 시군구`)
        return NextResponse.json({
          regionCodes: cachedMapping.region_codes,
          message: '저장된 지역 목록 조회 성공',
          source: 'cache',
          totalSidoCount: cachedMapping.total_sido_count,
          totalSggCount: cachedMapping.total_sgg_count
        })
      }
    }

    console.log('📦 저장된 매핑이 없습니다. 스토리지에서 새로 처리합니다...')

    // regions 폴더 내의 모든 폴더(지역 코드) 목록 가져오기
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
        regionCodes: {}
      }, { status: 500 })
    }

    if (!folders || folders.length === 0) {
      console.log('⚠️ regions 폴더가 비어있습니다.')
      return NextResponse.json({
        regionCodes: {},
        message: 'regions 폴더가 비어있습니다.'
      })
    }

    console.log(`🔍 ${folders.length}개 항목 발견`)
    console.log('📁 첫 10개 항목:', folders.slice(0, 10).map(f => ({ name: f.name, id: f.id, metadata: f.metadata })))

    // 각 폴더의 latest.json 파일을 읽어서 지역 정보 추출
    const regionMap: { [sido: string]: { [sgg: string]: number } } = {}
    const processedSgg = new Set<string>() // 시군구 중복 제거용 (sido_sgg 기준)

    // 모든 항목을 확인하여 latest.json 파일이 있는 경로 찾기
    // 폴더 이름이 숫자로만 이루어진 경우 (지역 코드)
    const regionFolders = folders.filter(f => {
      // latest.json 파일 제외
      if (f.name === 'latest.json') return false
      // 이름이 숫자로만 이루어진 경우 (예: "0000011140" 또는 "11140")
      const name = f.name.trim()
      return /^\d+$/.test(name) || /^\d{10}$/.test(name)
    })

    console.log(`📁 ${regionFolders.length}개 지역 코드 폴더 발견`)

    // 폴더가 없으면 빈 결과 반환
    if (regionFolders.length === 0) {
      console.log('⚠️ 지역 코드 폴더를 찾을 수 없습니다.')
      return NextResponse.json({
        regionCodes: {},
        message: '지역 코드 폴더를 찾을 수 없습니다.'
      })
    }

    // 샘플 파일 하나를 읽어서 구조 확인 (디버깅용)
    if (regionFolders.length > 0) {
      const sampleFolder = regionFolders[0]
      const samplePath = `regions/${sampleFolder.name.trim().padStart(10, '0')}/latest.json`
      try {
        const { data: sampleData, error: sampleError } = await supabase.storage
          .from('playground-cache')
          .download(samplePath)
        
        if (!sampleError && sampleData) {
          const sampleText = await sampleData.text()
          const sampleJson = JSON.parse(sampleText)
          console.log('📄 샘플 파일 구조:', {
            path: samplePath,
            hasMeta: !!sampleJson.meta,
            regionCode: sampleJson.meta?.regionCode,
            regionName: sampleJson.meta?.regionName,
            itemCount: sampleJson.items?.length || 0
          })
        }
      } catch (err) {
        console.error('샘플 파일 읽기 오류:', err)
      }
    }

    // 병렬 처리로 성능 향상 (한 번에 최대 20개씩)
    const batchSize = 20
    for (let i = 0; i < regionFolders.length; i += batchSize) {
      const batch = regionFolders.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async (folder) => {
          let regionCodeStr = folder.name.trim()
          
          // 10자리로 패딩 (필요한 경우)
          if (regionCodeStr.length < 10) {
            regionCodeStr = regionCodeStr.padStart(10, '0')
          }
          
          const cachePath = `regions/${regionCodeStr}/latest.json`

          try {
            // latest.json 파일 다운로드
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('playground-cache')
              .download(cachePath)

            if (downloadError) {
              // 파일이 없으면 스킵 (에러 로그는 너무 많으므로 생략)
              return null
            }

            if (!fileData) {
              return null
            }

            // JSON 파싱
            const text = await fileData.text()
            let jsonData
            try {
              jsonData = JSON.parse(text)
            } catch (parseError) {
              console.error(`JSON 파싱 오류 (${regionCodeStr}):`, parseError)
              return null
            }

            // meta 정보에서 지역 코드와 이름 추출
            const meta = jsonData.meta
            if (!meta) {
              console.warn(`⚠️ meta 정보 없음 (${regionCodeStr})`)
              return null
            }

            if (!meta.regionCode || !meta.regionName) {
              console.warn(`⚠️ regionCode 또는 regionName 없음 (${regionCodeStr}):`, {
                regionCode: meta.regionCode,
                regionName: meta.regionName
              })
              return null
            }

            const regionCode = String(meta.regionCode) // "1111010100" 형식
            const regionName = String(meta.regionName) // "서울특별시 종로구 청운동" 형식

            // 지역 코드 파싱: "1111010100" (10자리)
            // 앞 5자리 "11110"이 시군구 코드 (종로구)
            if (regionCode.length < 5) {
              console.warn(`⚠️ 지역 코드 길이 부족 (${regionCodeStr}): ${regionCode}`)
              return null
            }

            const sggCode = parseInt(regionCode.substring(0, 5), 10) // "11110"
            
            if (isNaN(sggCode)) {
              console.warn(`⚠️ 시군구 코드 파싱 실패 (${regionCodeStr}): ${regionCode.substring(0, 5)}`)
              return null
            }
            
            // regionName 파싱: "서울특별시 종로구 청운동" -> "서울특별시", "종로구"
            const nameParts = regionName.trim().split(/\s+/)
            if (nameParts.length < 2) {
              console.warn(`⚠️ regionName 파싱 실패 (${regionCodeStr}): "${regionName}" (파트 개수: ${nameParts.length})`)
              return null
            }

            const sido = nameParts[0] // "서울특별시"
            const sgg = nameParts[1] // "종로구"

            // 시/군/구 키 생성 (중복 제거용)
            const regionKey = `${sido}_${sgg}`

            // 이미 처리한 시군구는 스킵
            if (processedSgg.has(regionKey)) {
              return null
            }
            processedSgg.add(regionKey)

            return { sido, sgg, sggCode }
          } catch (err) {
            console.error(`파일 처리 오류 (${regionCodeStr}):`, err)
            return null
          }
        })
      )

      // 결과를 regionMap에 추가
      const validResults = results.filter(r => r !== null)
      if (validResults.length > 0) {
        console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1}: ${validResults.length}개 지역 정보 추출 성공`)
      }

      results.forEach((result) => {
        if (result) {
          const { sido, sgg, sggCode } = result
          if (!regionMap[sido]) {
            regionMap[sido] = {}
          }
          // 같은 시군구가 여러 번 나올 수 있으므로, 첫 번째 것만 사용
          if (!regionMap[sido][sgg]) {
            regionMap[sido][sgg] = sggCode
          }
        }
      })
    }

    const tempTotalSgg = Object.values(regionMap).reduce((sum, r) => sum + Object.keys(r).length, 0)
    console.log(`✅ ${Object.keys(regionMap).length}개 시도, 총 ${tempTotalSgg}개 시군구 발견`)
    
    if (tempTotalSgg === 0) {
      console.warn('⚠️ 스토리지에서 지역을 찾을 수 없습니다. 빈 결과를 반환합니다.')
      return NextResponse.json({
        regionCodes: {},
        message: '스토리지에서 지역을 찾을 수 없습니다.'
      })
    }

    // regionCodes 형식으로 변환
    const regionCodes: { [sido: string]: { sidoCode: number, sggCodes: { [sgg: string]: number } } } = {}

    // 시도 코드 매핑
    const sidoCodeMap: { [sido: string]: number } = {
      '서울특별시': 11,
      '부산광역시': 26,
      '대구광역시': 27,
      '인천광역시': 28,
      '광주광역시': 29,
      '대전광역시': 30,
      '울산광역시': 31,
      '세종특별자치시': 36,
      '경기도': 41,
      '강원특별자치도': 51,
      '충청북도': 43,
      '충청남도': 44,
      '전북특별자치도': 52,
      '전라남도': 46,
      '경상북도': 47,
      '경상남도': 48,
      '제주특별자치도': 50,
    }

    for (const [sido, sggMap] of Object.entries(regionMap)) {
      const sidoCode = sidoCodeMap[sido] || 0
      regionCodes[sido] = {
        sidoCode,
        sggCodes: sggMap
      }
    }

    const totalSido = Object.keys(regionCodes).length
    const totalSgg = Object.values(regionCodes).reduce((sum, r) => sum + Object.keys(r.sggCodes).length, 0)
    
    console.log(`✅ 스토리지에서 ${totalSido}개 시도, 총 ${totalSgg}개 시군구 발견`)

    // 3. 처리된 결과를 테이블에 저장
    console.log('='.repeat(50))
    console.log('💾 [저장 시작] 테이블에 지역 매핑 저장 시도...')
    console.log('💾 저장할 데이터 크기:', JSON.stringify(regionCodes).length, 'bytes')
    console.log('💾 시도 개수:', totalSido, ', 시군구 개수:', totalSgg)
    
    let savedToDatabase = false
    let saveError: any = null
    
    try {
      // 테이블 존재 확인
      console.log('🔍 [1단계] 테이블 접근 확인 중...')
      const { data: tableCheck, error: tableCheckError } = await supabase
        .from('playground_region_mappings')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        console.error('❌ [1단계 실패] 테이블 접근 오류:', tableCheckError.message)
        console.error('❌ 에러 코드:', tableCheckError.code)
        console.error('❌ 에러 상세:', JSON.stringify(tableCheckError, null, 2))
        console.error('❌ 테이블이 존재하지 않거나 접근 권한이 없을 수 있습니다.')
        throw tableCheckError
      } else {
        console.log('✅ [1단계 성공] 테이블 접근 가능')
      }
      
      // 데이터 저장
      console.log('🔍 [2단계] 데이터 저장 중...')
      const { data: insertData, error: insertError } = await supabase
        .from('playground_region_mappings')
        .insert({
          region_codes: regionCodes,
          total_sido_count: totalSido,
          total_sgg_count: totalSgg
        })
        .select()

      if (insertError) {
        console.error('❌ [2단계 실패] 지역 매핑 저장 실패!')
        console.error('❌ 에러 코드:', insertError.code)
        console.error('❌ 에러 메시지:', insertError.message)
        console.error('❌ 에러 상세:', JSON.stringify(insertError, null, 2))
        console.error('❌ 에러 힌트:', insertError.hint)
        throw insertError
      } else {
        console.log('✅ [2단계 성공] 지역 매핑을 테이블에 저장했습니다!')
        if (insertData && insertData.length > 0) {
          console.log('✅ 저장된 레코드 ID:', insertData[0].id)
          console.log(`✅ 저장된 데이터: ${insertData[0].total_sido_count}개 시도, ${insertData[0].total_sgg_count}개 시군구`)
          savedToDatabase = true
        } else {
          console.log('⚠️ 저장은 성공했지만 반환된 데이터가 없습니다.')
        }
      }
      console.log('='.repeat(50))
    } catch (error) {
      console.error('='.repeat(50))
      console.error('❌ [저장 실패] 저장 중 예외 발생!')
      console.error('❌ 예외 타입:', error?.constructor?.name)
      console.error('❌ 예외 메시지:', error instanceof Error ? error.message : String(error))
      console.error('❌ 예외 상세:', error instanceof Error ? error.stack : JSON.stringify(error, null, 2))
      console.error('='.repeat(50))
      saveError = error
      savedToDatabase = false
    }

    return NextResponse.json({
      regionCodes,
      message: savedToDatabase 
        ? '스토리지에서 지역 목록 조회 성공 (DB에 저장 완료)' 
        : '스토리지에서 지역 목록 조회 성공 (DB 저장 실패)',
      source: 'storage',
      totalSidoCount: totalSido,
      totalSggCount: totalSgg,
      savedToDatabase,
      saveError: saveError ? (saveError instanceof Error ? saveError.message : String(saveError)) : null
    })
  } catch (error) {
    console.error('지역 코드 API 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.',
      regionCodes: {}
    }, { status: 500 })
  }
}

