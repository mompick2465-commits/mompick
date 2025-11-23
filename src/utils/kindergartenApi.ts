// 유치원알리미 API 연동 유틸리티

import { supabase } from '../lib/supabase'

export interface KindergartenInfo {
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

export interface ApiResponse {
  pageCnt: number
  currentPage: number
  sidoList: string
  sggList: string
  timing: number | null
  status: string
  kinderInfo: KindergartenInfo[]
}

// 시도/시군구 코드 매핑 (2025년 최신 행정구역 코드 기준)
export const regionCodes = {
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
    '포항시': 47110, '포항시 남구': 47111, '포항시 북구': 47113, '경주시': 47130, 
    '김천시': 47150, '안동시': 47170, '구미시': 47190, '영주시': 47210, '영천시': 47230, 
    '상주시': 47250, '문경시': 47280, '경산시': 47290, '의성군': 47730, '청송군': 47750, 
    '영양군': 47760, '영덕군': 47770, '청도군': 47820, '고령군': 47830, '성주군': 47840, 
    '칠곡군': 47850, '예천군': 47900, '봉화군': 47920, '울진군': 47930, '울릉군': 47940 
  } },
  '경상남도': { sidoCode: 48, sggCodes: { 
    '창원시': 48120, '창원시 의창구': 48121, '창원시 성산구': 48123, '창원시 마산합포구': 48125, 
    '창원시 마산회원구': 48127, '창원시 진해구': 48129, '진주시': 48170, '통영시': 48220, 
    '사천시': 48240, '김해시': 48250, '밀양시': 48270, '거제시': 48310, '양산시': 48330, 
    '의령군': 48720, '함안군': 48730, '창녕군': 48740, '고성군': 48820, '남해군': 48840, 
    '하동군': 48850, '산청군': 48860, '함양군': 48870, '거창군': 48880, '합천군': 48890 
  } },
  '제주특별자치도': { sidoCode: 50, sggCodes: { 
    '제주시': 50110, '서귀포시': 50130 
  } }
}

// API 키 (환경변수에서 가져오기)
const API_KEY = process.env.REACT_APP_KINDERGARTEN_API_KEY

// 유치원 정보 조회 함수 (Edge Function을 통한 호출)
export const fetchKindergartenData = async (
  sidoCode: number,
  sggCode: number,
  pageCnt: number = 10,
  currentPage: number = 1,
  timing?: number,
  signal?: AbortSignal
): Promise<ApiResponse> => {
  if (!API_KEY) {
    throw new Error('API 키가 설정되지 않았습니다. REACT_APP_KINDERGARTEN_API_KEY 환경변수를 확인해주세요.')
  }
  
  try {
    // Supabase Edge Function을 통한 API 호출 (invoke 사용해 CORS 회피)
    const { data, error } = await supabase.functions.invoke('sync-kindergartens', {
      body: {
        action: 'fetch',
        sidoCode,
        sggCode,
        pageCnt,
        currentPage,
      },
      // signal은 invoke에 직접 전달되지 않으므로, 취소 시 상위에서 AbortError로 처리
    })
    
    if (error) {
      throw error
    }
    if (!data) {
      throw new Error('Edge Function 응답이 비어 있습니다')
    }
    if ((data as any).error) {
      throw new Error((data as any).error)
    }
    return data as any
  } catch (error) {
    // AbortError는 무시
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.error('유치원 데이터 조회 오류:', error)
    throw error
  }
}

// 지역명으로 코드 찾기
export const findRegionCodes = (sidoName: string, sggName: string) => {
  const sidoData = regionCodes[sidoName as keyof typeof regionCodes]
  if (!sidoData) {
    throw new Error(`지원하지 않는 시도입니다: ${sidoName}`)
  }
  
  const sggCode = sidoData.sggCodes[sggName as keyof typeof sidoData.sggCodes]
  if (!sggCode) {
    throw new Error(`지원하지 않는 시군구입니다: ${sggName}`)
  }
  
  return {
    sidoCode: sidoData.sidoCode,
    sggCode: sggCode
  }
}

// 거리 계산 함수 (위도, 경도 기반)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // 지구의 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// 현재 위치 기반 근처 유치원 찾기
export const findNearbyKindergartens = async (
  userLat: number,
  userLon: number,
  radiusKm: number = 5,
  signal?: AbortSignal
): Promise<KindergartenInfo[]> => {
  try {
    // 서울시 전체에서 검색 (실제로는 사용자 위치 기반으로 시도/시군구 결정)
    const { sidoCode, sggCode } = findRegionCodes('서울특별시', '강남구')
    
    const response = await fetchKindergartenData(sidoCode, sggCode, 100, 1, undefined, signal)
    
    if (response.status !== 'SUCCESS') {
      throw new Error(`API 오류: ${response.status}`)
    }
    
    // 거리 계산하여 필터링
    const nearbyKindergartens = response.kinderInfo.filter((kindergarten: KindergartenInfo) => {
      if (!kindergarten.lttdcdnt || !kindergarten.lngtcdnt) return false
      
      const distance = calculateDistance(
        userLat,
        userLon,
        kindergarten.lttdcdnt,
        kindergarten.lngtcdnt
      )
      
      return distance <= radiusKm
    })
    
    return nearbyKindergartens
  } catch (error) {
    // AbortError는 무시
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.error('근처 유치원 검색 오류:', error)
    throw error
  }
}
