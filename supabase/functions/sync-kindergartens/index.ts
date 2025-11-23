// Supabase Edge Function: 유치원 데이터 동기화
// @ts-ignore - Deno 환경에서 실행됨
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Deno 타입 선언 (로컬 개발용)
// @ts-ignore
declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KindergartenInfo {
  kinderCode: string
  officeedu: string
  subofficeedu: string
  kindername: string
  establish: string
  rppnname: string
  ldgrname: string
  edate: string
  odate: string
  addr: string
  telno: string
  faxno: string
  hpaddr: string
  opertime: string
  clcnt3: number
  clcnt4: number
  clcnt5: number
  mixclcnt: number
  shclcnt: number
  prmstfcnt: number
  ag3fpcnt: number
  ag4fpcnt: number
  ag5fpcnt: number
  mixfpcnt: number
  spcnfpcnt: number
  ppcnt3: number
  ppcnt4: number
  ppcnt5: number
  mixppcnt: number
  shppcnt: number
  pbnttmng: string
  rpstYn: string
  lttdcdnt: number
  lngtcdnt: number
}

interface CacheEnvelope {
  meta: {
    sido: string
    sgg: string
    sidoCode: string
    sggCode: string
    lastSyncedAt: string
    itemCount: number
    apiVersion: string
  }
  data: KindergartenInfo[]
}

interface ApiResponse {
  pageCnt: number
  currentPage: number
  sidoList: string
  sggList: string
  timing: number | null
  status: string
  kinderInfo: KindergartenInfo[]
}

// 전체 지역 코드 매핑 (모든 시도/시군구 포함)
const regionCodes: Record<string, Record<string, {sidoCode: number, sggCode: number}>> = {
  '서울특별시': {
    '강남구': { sidoCode: 11, sggCode: 11680 },
    '강동구': { sidoCode: 11, sggCode: 11740 },
    '강북구': { sidoCode: 11, sggCode: 11305 },
    '강서구': { sidoCode: 11, sggCode: 11500 },
    '관악구': { sidoCode: 11, sggCode: 11620 },
    '광진구': { sidoCode: 11, sggCode: 11215 },
    '구로구': { sidoCode: 11, sggCode: 11530 },
    '금천구': { sidoCode: 11, sggCode: 11545 },
    '노원구': { sidoCode: 11, sggCode: 11350 },
    '도봉구': { sidoCode: 11, sggCode: 11320 },
    '동대문구': { sidoCode: 11, sggCode: 11230 },
    '동작구': { sidoCode: 11, sggCode: 11590 },
    '마포구': { sidoCode: 11, sggCode: 11440 },
    '서대문구': { sidoCode: 11, sggCode: 11410 },
    '서초구': { sidoCode: 11, sggCode: 11650 },
    '성동구': { sidoCode: 11, sggCode: 11200 },
    '성북구': { sidoCode: 11, sggCode: 11290 },
    '송파구': { sidoCode: 11, sggCode: 11710 },
    '양천구': { sidoCode: 11, sggCode: 11470 },
    '영등포구': { sidoCode: 11, sggCode: 11560 },
    '용산구': { sidoCode: 11, sggCode: 11170 },
    '은평구': { sidoCode: 11, sggCode: 11380 },
    '종로구': { sidoCode: 11, sggCode: 11110 },
    '중구': { sidoCode: 11, sggCode: 11140 },
    '중랑구': { sidoCode: 11, sggCode: 11260 }
  },
  '부산광역시': {
    '강서구': { sidoCode: 26, sggCode: 26440 },
    '금정구': { sidoCode: 26, sggCode: 26410 },
    '남구': { sidoCode: 26, sggCode: 26290 },
    '동구': { sidoCode: 26, sggCode: 26170 },
    '동래구': { sidoCode: 26, sggCode: 26260 },
    '부산진구': { sidoCode: 26, sggCode: 26230 },
    '북구': { sidoCode: 26, sggCode: 26320 },
    '사상구': { sidoCode: 26, sggCode: 26530 },
    '사하구': { sidoCode: 26, sggCode: 26380 },
    '서구': { sidoCode: 26, sggCode: 26140 },
    '수영구': { sidoCode: 26, sggCode: 26500 },
    '연제구': { sidoCode: 26, sggCode: 26470 },
    '영도구': { sidoCode: 26, sggCode: 26200 },
    '중구': { sidoCode: 26, sggCode: 26110 },
    '해운대구': { sidoCode: 26, sggCode: 26350 },
    '기장군': { sidoCode: 26, sggCode: 26710 }
  },
  '대구광역시': {
    '남구': { sidoCode: 27, sggCode: 27200 },
    '달서구': { sidoCode: 27, sggCode: 27290 },
    '달성군': { sidoCode: 27, sggCode: 27710 },
    '동구': { sidoCode: 27, sggCode: 27140 },
    '북구': { sidoCode: 27, sggCode: 27230 },
    '서구': { sidoCode: 27, sggCode: 27170 },
    '수성구': { sidoCode: 27, sggCode: 27260 },
    '중구': { sidoCode: 27, sggCode: 27110 },
    '군위군': { sidoCode: 27, sggCode: 27720 }
  },
  '인천광역시': {
    '계양구': { sidoCode: 28, sggCode: 28245 },
    '남구': { sidoCode: 28, sggCode: 28177 },
    '남동구': { sidoCode: 28, sggCode: 28200 },
    '동구': { sidoCode: 28, sggCode: 28140 },
    '부평구': { sidoCode: 28, sggCode: 28237 },
    '서구': { sidoCode: 28, sggCode: 28260 },
    '연수구': { sidoCode: 28, sggCode: 28185 },
    '옹진군': { sidoCode: 28, sggCode: 28720 },
    '중구': { sidoCode: 28, sggCode: 28110 },
    '강화군': { sidoCode: 28, sggCode: 28710 }
  },
  '광주광역시': {
    '광산구': { sidoCode: 29, sggCode: 29200 },
    '남구': { sidoCode: 29, sggCode: 29155 },
    '동구': { sidoCode: 29, sggCode: 29110 },
    '북구': { sidoCode: 29, sggCode: 29170 },
    '서구': { sidoCode: 29, sggCode: 29140 }
  },
  '대전광역시': {
    '대덕구': { sidoCode: 30, sggCode: 30230 },
    '동구': { sidoCode: 30, sggCode: 30110 },
    '서구': { sidoCode: 30, sggCode: 30170 },
    '유성구': { sidoCode: 30, sggCode: 30200 },
    '중구': { sidoCode: 30, sggCode: 30140 }
  },
  '울산광역시': {
    '남구': { sidoCode: 31, sggCode: 31140 },
    '동구': { sidoCode: 31, sggCode: 31170 },
    '북구': { sidoCode: 31, sggCode: 31200 },
    '울주군': { sidoCode: 31, sggCode: 31710 },
    '중구': { sidoCode: 31, sggCode: 31110 }
  },
  '세종특별자치시': {
    '세종특별자치시': { sidoCode: 36, sggCode: 36110 }
  },
  '경기도': {
    '수원시': { sidoCode: 41, sggCode: 41110 },
    '수원시 장안구': { sidoCode: 41, sggCode: 41111 },
    '수원시 권선구': { sidoCode: 41, sggCode: 41113 },
    '수원시 팔달구': { sidoCode: 41, sggCode: 41115 },
    '수원시 영통구': { sidoCode: 41, sggCode: 41117 },
    '성남시': { sidoCode: 41, sggCode: 41130 },
    '성남시 수정구': { sidoCode: 41, sggCode: 41131 },
    '성남시 중원구': { sidoCode: 41, sggCode: 41133 },
    '성남시 분당구': { sidoCode: 41, sggCode: 41135 },
    '의정부시': { sidoCode: 41, sggCode: 41150 },
    '안양시': { sidoCode: 41, sggCode: 41170 },
    '안양시 만안구': { sidoCode: 41, sggCode: 41171 },
    '안양시 동안구': { sidoCode: 41, sggCode: 41173 },
    '부천시': { sidoCode: 41, sggCode: 41190 },
    '부천시 원미구': { sidoCode: 41, sggCode: 41192 },
    '부천시 소사구': { sidoCode: 41, sggCode: 41194 },
    '부천시 오정구': { sidoCode: 41, sggCode: 41196 },
    '광명시': { sidoCode: 41, sggCode: 41210 },
    '평택시': { sidoCode: 41, sggCode: 41220 },
    '과천시': { sidoCode: 41, sggCode: 41290 },
    '오산시': { sidoCode: 41, sggCode: 41370 },
    '시흥시': { sidoCode: 41, sggCode: 41390 },
    '군포시': { sidoCode: 41, sggCode: 41410 },
    '의왕시': { sidoCode: 41, sggCode: 41430 },
    '하남시': { sidoCode: 41, sggCode: 41450 },
    '용인시': { sidoCode: 41, sggCode: 41460 },
    '용인시 처인구': { sidoCode: 41, sggCode: 41461 },
    '용인시 기흥구': { sidoCode: 41, sggCode: 41463 },
    '용인시 수지구': { sidoCode: 41, sggCode: 41465 },
    '파주시': { sidoCode: 41, sggCode: 41480 },
    '이천시': { sidoCode: 41, sggCode: 41500 },
    '안성시': { sidoCode: 41, sggCode: 41550 },
    '김포시': { sidoCode: 41, sggCode: 41570 },
    '화성시': { sidoCode: 41, sggCode: 41590 },
    '광주시': { sidoCode: 41, sggCode: 41610 },
    '여주시': { sidoCode: 41, sggCode: 41630 },
    '양평군': { sidoCode: 41, sggCode: 41830 },
    '고양시': { sidoCode: 41, sggCode: 41280 },
    '고양시 덕양구': { sidoCode: 41, sggCode: 41281 },
    '고양시 일산동구': { sidoCode: 41, sggCode: 41285 },
    '고양시 일산서구': { sidoCode: 41, sggCode: 41287 },
    '동두천시': { sidoCode: 41, sggCode: 41250 },
    '가평군': { sidoCode: 41, sggCode: 41820 },
    '연천군': { sidoCode: 41, sggCode: 41800 },
    '남양주시': { sidoCode: 41, sggCode: 41360 },
    '양주시': { sidoCode: 41, sggCode: 41650 },
    '안산시': { sidoCode: 41, sggCode: 41270 },
    '안산시 상록구': { sidoCode: 41, sggCode: 41271 },
    '안산시 단원구': { sidoCode: 41, sggCode: 41273 },
    '구리시': { sidoCode: 41, sggCode: 41310 },
    '포천시': { sidoCode: 41, sggCode: 41650 }
  },
  '강원특별자치도': {
    '춘천시': { sidoCode: 51, sggCode: 51110 },
    '원주시': { sidoCode: 51, sggCode: 51130 },
    '강릉시': { sidoCode: 51, sggCode: 51150 },
    '동해시': { sidoCode: 51, sggCode: 51170 },
    '태백시': { sidoCode: 51, sggCode: 51190 },
    '속초시': { sidoCode: 51, sggCode: 51210 },
    '삼척시': { sidoCode: 51, sggCode: 51230 },
    '홍천군': { sidoCode: 51, sggCode: 51720 },
    '횡성군': { sidoCode: 51, sggCode: 51730 },
    '영월군': { sidoCode: 51, sggCode: 51750 },
    '평창군': { sidoCode: 51, sggCode: 51760 },
    '정선군': { sidoCode: 51, sggCode: 51770 },
    '철원군': { sidoCode: 51, sggCode: 51780 },
    '화천군': { sidoCode: 51, sggCode: 51790 },
    '양구군': { sidoCode: 51, sggCode: 51800 },
    '인제군': { sidoCode: 51, sggCode: 51810 },
    '고성군': { sidoCode: 51, sggCode: 51820 },
    '양양군': { sidoCode: 51, sggCode: 51830 }
  },
  '충청북도': {
    '청주시': { sidoCode: 43, sggCode: 43111 },
    '청주시 상당구': { sidoCode: 43, sggCode: 43111 },
    '청주시 서원구': { sidoCode: 43, sggCode: 43112 },
    '청주시 흥덕구': { sidoCode: 43, sggCode: 43113 },
    '청주시 청원구': { sidoCode: 43, sggCode: 43114 },
    '충주시': { sidoCode: 43, sggCode: 43130 },
    '제천시': { sidoCode: 43, sggCode: 43150 },
    '보은군': { sidoCode: 43, sggCode: 43720 },
    '옥천군': { sidoCode: 43, sggCode: 43730 },
    '영동군': { sidoCode: 43, sggCode: 43740 },
    '증평군': { sidoCode: 43, sggCode: 43745 },
    '진천군': { sidoCode: 43, sggCode: 43750 },
    '괴산군': { sidoCode: 43, sggCode: 43760 },
    '음성군': { sidoCode: 43, sggCode: 43770 },
    '단양군': { sidoCode: 43, sggCode: 43800 }
  },
  '충청남도': {
    '천안시': { sidoCode: 44, sggCode: 44131 },
    '천안시 동남구': { sidoCode: 44, sggCode: 44131 },
    '천안시 서북구': { sidoCode: 44, sggCode: 44133 },
    '공주시': { sidoCode: 44, sggCode: 44150 },
    '보령시': { sidoCode: 44, sggCode: 44180 },
    '아산시': { sidoCode: 44, sggCode: 44200 },
    '서산시': { sidoCode: 44, sggCode: 44210 },
    '논산시': { sidoCode: 44, sggCode: 44230 },
    '계룡시': { sidoCode: 44, sggCode: 44250 },
    '당진시': { sidoCode: 44, sggCode: 44270 },
    '금산군': { sidoCode: 44, sggCode: 44710 },
    '부여군': { sidoCode: 44, sggCode: 44760 },
    '서천군': { sidoCode: 44, sggCode: 44770 },
    '청양군': { sidoCode: 44, sggCode: 44790 },
    '홍성군': { sidoCode: 44, sggCode: 44800 },
    '예산군': { sidoCode: 44, sggCode: 44810 },
    '태안군': { sidoCode: 44, sggCode: 44825 }
  },
  '전북특별자치도': {
    '전주시': { sidoCode: 52, sggCode: 52111 },
    '전주시 완산구': { sidoCode: 52, sggCode: 52111 },
    '전주시 덕진구': { sidoCode: 52, sggCode: 52113 },
    '군산시': { sidoCode: 52, sggCode: 52130 },
    '익산시': { sidoCode: 52, sggCode: 52140 },
    '정읍시': { sidoCode: 52, sggCode: 52180 },
    '남원시': { sidoCode: 52, sggCode: 52190 },
    '김제시': { sidoCode: 52, sggCode: 52210 },
    '완주군': { sidoCode: 52, sggCode: 52710 },
    '진안군': { sidoCode: 52, sggCode: 52720 },
    '무주군': { sidoCode: 52, sggCode: 52730 },
    '장수군': { sidoCode: 52, sggCode: 52740 },
    '임실군': { sidoCode: 52, sggCode: 52750 },
    '순창군': { sidoCode: 52, sggCode: 52770 },
    '고창군': { sidoCode: 52, sggCode: 52790 },
    '부안군': { sidoCode: 52, sggCode: 52800 }
  },
  '전라남도': {
    '목포시': { sidoCode: 46, sggCode: 46110 },
    '여수시': { sidoCode: 46, sggCode: 46130 },
    '순천시': { sidoCode: 46, sggCode: 46150 },
    '나주시': { sidoCode: 46, sggCode: 46170 },
    '광양시': { sidoCode: 46, sggCode: 46230 },
    '담양군': { sidoCode: 46, sggCode: 46710 },
    '곡성군': { sidoCode: 46, sggCode: 46720 },
    '구례군': { sidoCode: 46, sggCode: 46730 },
    '고흥군': { sidoCode: 46, sggCode: 46770 },
    '보성군': { sidoCode: 46, sggCode: 46780 },
    '화순군': { sidoCode: 46, sggCode: 46790 },
    '장흥군': { sidoCode: 46, sggCode: 46800 },
    '강진군': { sidoCode: 46, sggCode: 46810 },
    '해남군': { sidoCode: 46, sggCode: 46820 },
    '영암군': { sidoCode: 46, sggCode: 46830 },
    '무안군': { sidoCode: 46, sggCode: 46840 },
    '함평군': { sidoCode: 46, sggCode: 46860 },
    '영광군': { sidoCode: 46, sggCode: 46870 },
    '장성군': { sidoCode: 46, sggCode: 46880 },
    '완도군': { sidoCode: 46, sggCode: 46890 },
    '진도군': { sidoCode: 46, sggCode: 46900 },
    '신안군': { sidoCode: 46, sggCode: 46910 }
  },
  '경상북도': {
    '포항시': { sidoCode: 47, sggCode: 47110 },
    '포항시 남구': { sidoCode: 47, sggCode: 47111 },
    '포항시 북구': { sidoCode: 47, sggCode: 47113 },
    '경주시': { sidoCode: 47, sggCode: 47130 },
    '김천시': { sidoCode: 47, sggCode: 47150 },
    '안동시': { sidoCode: 47, sggCode: 47170 },
    '구미시': { sidoCode: 47, sggCode: 47190 },
    '영주시': { sidoCode: 47, sggCode: 47210 },
    '영천시': { sidoCode: 47, sggCode: 47230 },
    '상주시': { sidoCode: 47, sggCode: 47250 },
    '문경시': { sidoCode: 47, sggCode: 47280 },
    '경산시': { sidoCode: 47, sggCode: 47290 },
    '군위군': { sidoCode: 47, sggCode: 47720 },
    '의성군': { sidoCode: 47, sggCode: 47730 },
    '청송군': { sidoCode: 47, sggCode: 47750 },
    '영양군': { sidoCode: 47, sggCode: 47760 },
    '영덕군': { sidoCode: 47, sggCode: 47770 },
    '청도군': { sidoCode: 47, sggCode: 47820 },
    '고령군': { sidoCode: 47, sggCode: 47830 },
    '성주군': { sidoCode: 47, sggCode: 47840 },
    '칠곡군': { sidoCode: 47, sggCode: 47850 },
    '예천군': { sidoCode: 47, sggCode: 47900 },
    '봉화군': { sidoCode: 47, sggCode: 47920 },
    '울진군': { sidoCode: 47, sggCode: 47930 },
    '울릉군': { sidoCode: 47, sggCode: 47940 }
  },
  '경상남도': {
    '창원시': { sidoCode: 48, sggCode: 48120 },
    '창원시 의창구': { sidoCode: 48, sggCode: 48121 },
    '창원시 성산구': { sidoCode: 48, sggCode: 48123 },
    '창원시 마산합포구': { sidoCode: 48, sggCode: 48125 },
    '창원시 마산회원구': { sidoCode: 48, sggCode: 48127 },
    '창원시 진해구': { sidoCode: 48, sggCode: 48129 },
    '진주시': { sidoCode: 48, sggCode: 48170 },
    '통영시': { sidoCode: 48, sggCode: 48220 },
    '사천시': { sidoCode: 48, sggCode: 48240 },
    '김해시': { sidoCode: 48, sggCode: 48250 },
    '밀양시': { sidoCode: 48, sggCode: 48270 },
    '거제시': { sidoCode: 48, sggCode: 48310 },
    '양산시': { sidoCode: 48, sggCode: 48330 },
    '의령군': { sidoCode: 48, sggCode: 48720 },
    '함안군': { sidoCode: 48, sggCode: 48730 },
    '창녕군': { sidoCode: 48, sggCode: 48740 },
    '고성군': { sidoCode: 48, sggCode: 48820 },
    '남해군': { sidoCode: 48, sggCode: 48840 },
    '하동군': { sidoCode: 48, sggCode: 48850 },
    '산청군': { sidoCode: 48, sggCode: 48860 },
    '함양군': { sidoCode: 48, sggCode: 48870 },
    '거창군': { sidoCode: 48, sggCode: 48880 },
    '합천군': { sidoCode: 48, sggCode: 48890 }
  },
  '제주특별자치도': {
    '제주시': { sidoCode: 50, sggCode: 50110 },
    '서귀포시': { sidoCode: 50, sggCode: 50130 }
  }
}

// API 호출 함수
async function fetchKindergartenData(
  sidoCode: number,
  sggCode: number,
  pageCnt: number = 100,
  currentPage: number = 1
): Promise<ApiResponse> {
  const API_KEY = Deno.env.get('REACT_APP_KINDERGARTEN_API_KEY') || 'your_api_key_here'
  const baseUrl = 'https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do'
  
  const params = new URLSearchParams({
    key: API_KEY,
    pageCnt: pageCnt.toString(),
    currentPage: currentPage.toString(),
    sidoCode: sidoCode.toString(),
    sggCode: sggCode.toString()
  })
  
  const response = await fetch(`${baseUrl}?${params}`)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return await response.json()
}

// 모든 페이지 수집
async function fetchAllPages(sido: string, sgg: string): Promise<KindergartenInfo[]> {
  const regionData = regionCodes[sido]?.[sgg]
  if (!regionData) {
    throw new Error(`지원하지 않는 지역: ${sido}/${sgg}`)
  }

  const { sidoCode, sggCode } = regionData
  let page = 1
  const pageSize = 100
  const allData: KindergartenInfo[] = []

  console.log(`🔄 ${sido}/${sgg} 데이터 수집 시작`)

  while (true) {
    try {
      const response = await fetchKindergartenData(sidoCode, sggCode, pageSize, page)
      
      if (response.status !== 'SUCCESS' || !response.kinderInfo?.length) {
        break
      }

      allData.push(...response.kinderInfo)
      console.log(`📄 페이지 ${page} 완료: ${response.kinderInfo.length}개 데이터`)

      // 마지막 페이지인지 확인
      if (response.kinderInfo.length < pageSize) {
        break
      }

      page++

      // 무한 루프 방지
      if (page > 50) {
        console.warn(`⚠️ 최대 페이지 수 도달: ${sido}/${sgg}`)
        break
      }

      // API 호출 간격 조절 (서버 부하 방지)
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`페이지 ${page} 로딩 실패:`, error)
      throw error
    }
  }

  console.log(`✅ ${sido}/${sgg} 수집 완료: 총 ${allData.length}개 데이터`)
  return allData
}

// Storage에 저장
async function saveToStorage(
  supabase: any,
  sido: string,
  sgg: string,
  data: KindergartenInfo[]
): Promise<void> {
  const isoDate = new Date().toISOString().split('T')[0]
  
  // 지역 코드 찾기
  const regionData = regionCodes[sido]?.[sgg]
  if (!regionData) {
    throw new Error(`지원하지 않는 지역: ${sido}/${sgg}`)
  }
  
  const { sidoCode, sggCode } = regionData
  
  // ASCII만 사용하는 코드 기반 경로
  const pathPrefix = `regions/${sidoCode}/${sggCode}`
  
  console.log(`📁 저장 경로: ${pathPrefix} (${sido}/${sgg})`)
  
  const envelope: CacheEnvelope = {
    meta: {
      sido,
      sgg,
      sidoCode: sidoCode.toString(),
      sggCode: sggCode.toString(),
      lastSyncedAt: new Date().toISOString(),
      itemCount: data.length,
      apiVersion: '1.0'
    },
    data
  }

  const jsonData = JSON.stringify(envelope, null, 2)
  const blob = new Blob([jsonData], { type: 'application/json' })

  // 스냅샷 저장 (날짜별)
  const snapshotPath = `${pathPrefix}/${isoDate}.json`
  console.log(`📸 스냅샷 저장: ${snapshotPath}`)
  
  const { error: snapshotError } = await supabase.storage
    .from('kindergarten-cache')
    .upload(snapshotPath, blob, {
      upsert: true,
      cacheControl: '3600',
      contentType: 'application/json'
    })

  if (snapshotError) {
    console.error(`❌ 스냅샷 저장 오류:`, snapshotError)
    throw new Error(`스냅샷 저장 실패: ${snapshotError.message}`)
  }

  // 최신 포인터 저장
  const latestPath = `${pathPrefix}/latest.json`
  console.log(`🔄 최신 파일 저장: ${latestPath}`)
  
  const { error: latestError } = await supabase.storage
    .from('kindergarten-cache')
    .upload(latestPath, blob, {
      upsert: true,
      cacheControl: '60',
      contentType: 'application/json'
    })

  if (latestError) {
    console.error(`❌ 최신 파일 저장 오류:`, latestError)
    throw new Error(`최신 파일 저장 실패: ${latestError.message}`)
  }

  console.log(`💾 Storage 저장 완료: ${sido}/${sgg} (${data.length}개 데이터)`)
}

Deno.serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase 클라이언트 생성 (서비스 롤 키 사용)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔑 Edge Function 시작 - 서비스 롤 키 사용')

    // 요청 데이터 파싱
    const { sido, sgg, regions, action, sidoCode, sggCode, pageCnt, currentPage } = await req.json()

    // API 호출 요청 처리 (새로운 기능)
    if (action === 'fetch') {
      if (!sidoCode || !sggCode) {
        return new Response(
          JSON.stringify({ error: 'sidoCode와 sggCode가 필요합니다.' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      try {
        const response = await fetchKindergartenData(
          parseInt(sidoCode), 
          parseInt(sggCode), 
          pageCnt || 100, 
          currentPage || 1
        )
        
        return new Response(
          JSON.stringify(response),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } catch (error) {
        console.error('API 호출 오류:', error)
        return new Response(
          JSON.stringify({ 
            error: error instanceof Error ? error.message : 'API 호출 실패' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    if (!sido && !sgg && !regions) {
      return new Response(
        JSON.stringify({ error: 'sido/sgg 또는 regions 파라미터가 필요합니다.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const results: Array<{
      sido: string
      sgg: string
      success: boolean
      dataCount: number
      error?: string
    }> = []

    // 단일 지역 처리
    if (sido && sgg) {
      try {
        const data = await fetchAllPages(sido, sgg)
        await saveToStorage(supabase, sido, sgg, data)
        
        results.push({
          sido,
          sgg,
          success: true,
          dataCount: data.length
        })
      } catch (error) {
        console.error(`단일 지역 처리 실패: ${sido}/${sgg}`, error)
        results.push({
          sido,
          sgg,
          success: false,
          dataCount: 0,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    // 다중 지역 처리
    if (regions && Array.isArray(regions)) {
      for (const region of regions) {
        const { sido: regionSido, sgg: regionSgg } = region
        
        try {
          const data = await fetchAllPages(regionSido, regionSgg)
          await saveToStorage(supabase, regionSido, regionSgg, data)
          
          results.push({
            sido: regionSido,
            sgg: regionSgg,
            success: true,
            dataCount: data.length
          })
        } catch (error) {
          console.error(`다중 지역 처리 실패: ${regionSido}/${regionSgg}`, error)
          results.push({
            sido: regionSido,
            sgg: regionSgg,
            success: false,
            dataCount: 0,
            error: error instanceof Error ? error.message : '알 수 없는 오류'
          })
        }
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalDataCount = results.reduce((sum, r) => sum + r.dataCount, 0)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${successCount}/${results.length}개 지역 동기화 완료`,
        totalDataCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge Function 오류:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
