// Supabase Edge Function: 개별 유치원 상세 정보 조회
// @ts-ignore - Deno 환경에서 실행됨
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Deno 타입 선언 (로컬 개발용)
// @ts-ignore
declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KindergartenDetailInfo {
  kinderCode: string
  kindername: string
  establish: string
  addr: string
  telno: string
  hpaddr: string
  prmstfcnt: string
  ag3fpcnt: string
  ag4fpcnt: string
  ag5fpcnt: string
  [key: string]: any
}

interface ApiResponse {
  status: string
  kinderInfo: KindergartenDetailInfo[]
}

// 서울 시군구 코드 매핑 (교육부 API용)
const seoulDistrictToCodes: Record<string, { sidoCode: number; sggCode: number }> = {
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
  '성북구': { sidoCode: 11, sggCode: 11320 },
  '송파구': { sidoCode: 11, sggCode: 11710 },
  '양천구': { sidoCode: 11, sggCode: 11470 },
  '영등포구': { sidoCode: 11, sggCode: 11560 },
  '용산구': { sidoCode: 11, sggCode: 11170 },
  '은평구': { sidoCode: 11, sggCode: 11380 },
  '종로구': { sidoCode: 11, sggCode: 11110 },
  '중구': { sidoCode: 11, sggCode: 11140 },
  '중랑구': { sidoCode: 11, sggCode: 11260 },
}

function extractSeoulDistrictFromAddress(address: string | undefined): string | null {
  if (!address) return null
  // 예: "서울특별시 강남구 역삼동 ..." 형태에서 "강남구" 추출
  const seoulIdx = address.indexOf('서울')
  if (seoulIdx === -1) return null
  // '구'로 끝나는 토큰 찾기
  const tokens = address.slice(seoulIdx).split(/\s+/)
  for (const token of tokens) {
    if (token.endsWith('구') && seoulDistrictToCodes[token]) {
      return token
    }
  }
  return null
}

async function fetchListAndFilterByKinderCode(
  endpoint: string,
  kindercode: string,
  sidoCode: number,
  sggCode: number,
  timing?: string
): Promise<any | null> {
  const API_KEY = Deno.env.get('REACT_APP_KINDERGARTEN_API_KEY') || 'c5aef787ac5a4473a74264b4b5bfce74'
  const baseUrl = `https://e-childschoolinfo.moe.go.kr/api/notice/${endpoint}.do`
  const params = new URLSearchParams({
    key: API_KEY,
    pageCnt: '1000',
    currentPage: '1',
    sidoCode: String(sidoCode),
    sggCode: String(sggCode),
  })
  if (timing) params.set('timing', timing)

  try {
    const url = `${baseUrl}?${params}`
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[${endpoint}] 응답 코드:`, response.status)
      return null
    }
    const json = await response.json()
    const list = Array.isArray(json?.kinderInfo) ? json.kinderInfo : []
    const found = list.find((item: any) => item.kinderCode === kindercode)
    return found ? { status: 'SUCCESS', kinderInfo: [found] } : null
  } catch (error) {
    console.warn(`[${endpoint}] 조회 실패:`, error)
    return null
  }
}

// 특정 지역에서 유치원 정보 조회
async function fetchKindergartenDetailByRegion(kindercode: string, sidoCode: number, sggCode: number): Promise<ApiResponse> {
  const API_KEY = Deno.env.get('REACT_APP_KINDERGARTEN_API_KEY') || 'c5aef787ac5a4473a74264b4b5bfce74'
  
  console.log(`🔍 특정 지역에서 유치원 검색: ${kindercode} (${sidoCode}-${sggCode})`)
  
  try {
    // basicInfo2.do 엔드포인트 사용
    const basicInfoUrl = `https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do`
    const basicParams = new URLSearchParams({
      key: API_KEY,
      sidoCode: String(sidoCode),
      sggCode: String(sggCode),
      pageCnt: '1000',
      currentPage: '1'
    })
    
    const response = await fetch(`${basicInfoUrl}?${basicParams}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest'
      },
      method: 'GET'
    })
    
    if (!response.ok) {
      console.error(`❌ API 호출 실패: ${response.status}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data && data.status === 'SUCCESS' && data.kinderInfo && Array.isArray(data.kinderInfo)) {
      // 해당 유치원 코드 찾기
      const foundKindergarten = data.kinderInfo.find((item: any) => item.kinderCode === kindercode)
      
      if (foundKindergarten) {
        console.log(`✅ 유치원 발견: ${foundKindergarten.kindername}`)
        return {
          status: 'SUCCESS',
          kinderInfo: [foundKindergarten]
        }
      }
    }
    
    throw new Error(`유치원 코드 ${kindercode}에 해당하는 정보를 찾을 수 없습니다.`)
  } catch (error) {
    console.error(`❌ 지역별 유치원 검색 오류:`, error)
    throw error
  }
}

// 교육부 API 호출 함수 - 여러 엔드포인트 통합 사용
async function fetchKindergartenDetail(kindercode: string): Promise<ApiResponse> {
  const API_KEY = Deno.env.get('REACT_APP_KINDERGARTEN_API_KEY') || 'c5aef787ac5a4473a74264b4b5bfce74'
  
  console.log(`🔍 교육부 API 호출 시작: ${kindercode}`)
  
  // 모든 지역 코드를 시도하여 유치원 정보 찾기
  const allRegions = [
    // 서울특별시
    { sidoCode: 11, sggCode: 11110, name: '종로구' },
    { sidoCode: 11, sggCode: 11140, name: '중구' },
    { sidoCode: 11, sggCode: 11170, name: '용산구' },
    { sidoCode: 11, sggCode: 11200, name: '성동구' },
    { sidoCode: 11, sggCode: 11215, name: '광진구' },
    { sidoCode: 11, sggCode: 11230, name: '동대문구' },
    { sidoCode: 11, sggCode: 11260, name: '중랑구' },
    { sidoCode: 11, sggCode: 11305, name: '강북구' },
    { sidoCode: 11, sggCode: 11320, name: '성북구' },
    { sidoCode: 11, sggCode: 11350, name: '노원구' },
    { sidoCode: 11, sggCode: 11380, name: '은평구' },
    { sidoCode: 11, sggCode: 11410, name: '서대문구' },
    { sidoCode: 11, sggCode: 11440, name: '마포구' },
    { sidoCode: 11, sggCode: 11470, name: '양천구' },
    { sidoCode: 11, sggCode: 11500, name: '강서구' },
    { sidoCode: 11, sggCode: 11530, name: '구로구' },
    { sidoCode: 11, sggCode: 11545, name: '금천구' },
    { sidoCode: 11, sggCode: 11560, name: '영등포구' },
    { sidoCode: 11, sggCode: 11590, name: '동작구' },
    { sidoCode: 11, sggCode: 11620, name: '관악구' },
    { sidoCode: 11, sggCode: 11650, name: '서초구' },
    { sidoCode: 11, sggCode: 11680, name: '강남구' },
    { sidoCode: 11, sggCode: 11710, name: '송파구' },
    { sidoCode: 11, sggCode: 11740, name: '강동구' },
    // 부산광역시
    { sidoCode: 26, sggCode: 26110, name: '중구' },
    { sidoCode: 26, sggCode: 26140, name: '서구' },
    { sidoCode: 26, sggCode: 26170, name: '동구' },
    { sidoCode: 26, sggCode: 26200, name: '영도구' },
    { sidoCode: 26, sggCode: 26230, name: '부산진구' },
    { sidoCode: 26, sggCode: 26260, name: '동래구' },
    { sidoCode: 26, sggCode: 26290, name: '남구' },
    { sidoCode: 26, sggCode: 26320, name: '북구' },
    { sidoCode: 26, sggCode: 26350, name: '해운대구' },
    { sidoCode: 26, sggCode: 26380, name: '사하구' },
    { sidoCode: 26, sggCode: 26410, name: '금정구' },
    { sidoCode: 26, sggCode: 26440, name: '강서구' },
    { sidoCode: 26, sggCode: 26470, name: '연제구' },
    { sidoCode: 26, sggCode: 26500, name: '수영구' },
    { sidoCode: 26, sggCode: 26530, name: '사상구' },
    { sidoCode: 26, sggCode: 26710, name: '기장군' },
    // 대구광역시
    { sidoCode: 27, sggCode: 27110, name: '중구' },
    { sidoCode: 27, sggCode: 27140, name: '동구' },
    { sidoCode: 27, sggCode: 27170, name: '서구' },
    { sidoCode: 27, sggCode: 27200, name: '남구' },
    { sidoCode: 27, sggCode: 27230, name: '북구' },
    { sidoCode: 27, sggCode: 27260, name: '수성구' },
    { sidoCode: 27, sggCode: 27290, name: '달서구' },
    { sidoCode: 27, sggCode: 27710, name: '달성군' },
    // 인천광역시
    { sidoCode: 28, sggCode: 28110, name: '중구' },
    { sidoCode: 28, sggCode: 28140, name: '동구' },
    { sidoCode: 28, sggCode: 28177, name: '미추홀구' },
    { sidoCode: 28, sggCode: 28185, name: '연수구' },
    { sidoCode: 28, sggCode: 28200, name: '남동구' },
    { sidoCode: 28, sggCode: 28237, name: '부평구' },
    { sidoCode: 28, sggCode: 28245, name: '계양구' },
    { sidoCode: 28, sggCode: 28260, name: '서구' },
    { sidoCode: 28, sggCode: 28710, name: '강화군' },
    { sidoCode: 28, sggCode: 28720, name: '옹진군' },
    // 광주광역시
    { sidoCode: 29, sggCode: 29110, name: '동구' },
    { sidoCode: 29, sggCode: 29140, name: '서구' },
    { sidoCode: 29, sggCode: 29155, name: '남구' },
    { sidoCode: 29, sggCode: 29170, name: '북구' },
    { sidoCode: 29, sggCode: 29200, name: '광산구' },
    // 대전광역시
    { sidoCode: 30, sggCode: 30110, name: '동구' },
    { sidoCode: 30, sggCode: 30140, name: '중구' },
    { sidoCode: 30, sggCode: 30170, name: '서구' },
    { sidoCode: 30, sggCode: 30200, name: '유성구' },
    { sidoCode: 30, sggCode: 30230, name: '대덕구' },
    // 울산광역시
    { sidoCode: 31, sggCode: 31110, name: '중구' },
    { sidoCode: 31, sggCode: 31140, name: '남구' },
    { sidoCode: 31, sggCode: 31170, name: '동구' },
    { sidoCode: 31, sggCode: 31200, name: '북구' },
    { sidoCode: 31, sggCode: 31710, name: '울주군' }
  ]
  
  // 각 지역에서 유치원 정보 찾기
  for (const region of allRegions) {
    console.log(`🔍 ${region.name} (${region.sidoCode}-${region.sggCode}) 검색 중...`)
    
    try {
      // basicInfo2.do 엔드포인트 사용 (유치원 지도 페이지와 동일)
      const basicInfoUrl = `https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do`
      const basicParams = new URLSearchParams({
        key: API_KEY,
        sidoCode: String(region.sidoCode),
        sggCode: String(region.sggCode),
        pageCnt: '1000',
        currentPage: '1'
      })
      
      const response = await fetch(`${basicInfoUrl}?${basicParams}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        },
        method: 'GET'
      })
      
      if (!response.ok) {
        console.warn(`⚠️ ${region.name} API 호출 실패: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
      if (data && data.status === 'SUCCESS' && data.kinderInfo && Array.isArray(data.kinderInfo)) {
        // 해당 유치원 코드 찾기 (정확한 매칭)
        const foundKindergarten = data.kinderInfo.find((item: any) => item.kindercode === kindercode)
        
        if (foundKindergarten) {
          console.log(`✅ 유치원 발견: ${foundKindergarten.kindername} (${region.name})`)
          return {
            status: 'SUCCESS',
            kinderInfo: [foundKindergarten]
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ ${region.name} 검색 중 오류:`, error)
      continue
    }
  }
  
  throw new Error(`유치원 코드 ${kindercode}에 해당하는 정보를 찾을 수 없습니다.`)
}

// 통합 조회 결과 타입 정의
interface ComprehensiveData {
  basicInfo2: any
  building: any
  classArea: any
  teachersInfo: any
  lessonDay: any
  schoolMeal: any
  schoolBus: any
  yearOfWork: any
  environmentHygiene: any
  safetyEdu: any
  deductionSociety: any
  insurance: any
  afterSchoolPresent: any
  safetyInstruct: any
}

// 여러 API 엔드포인트를 통합하여 유치원 상세 정보 조회
async function fetchComprehensiveKindergartenDetail(kindercode: string, sidoCode: number, sggCode: number): Promise<ComprehensiveData> {
  const API_KEY = Deno.env.get('REACT_APP_KINDERGARTEN_API_KEY') || 'c5aef787ac5a4473a74264b4b5bfce74'
  
  console.log(`🔍 통합 유치원 상세 정보 조회: ${kindercode} (${sidoCode}-${sggCode})`)
  
  // 모든 API 엔드포인트 정의
  const endpoints = [
    { name: 'basicInfo2', url: 'basicInfo2.do', description: '기본현황(신규)' },
    { name: 'building', url: 'building.do', description: '건물현황' },
    { name: 'classArea', url: 'classArea.do', description: '교실면적현황' },
    { name: 'teachersInfo', url: 'teachersInfo.do', description: '직위·자격별 교직원현황' },
    { name: 'lessonDay', url: 'lessonDay.do', description: '수업일수현황' },
    { name: 'schoolMeal', url: 'schoolMeal.do', description: '급식운영현황' },
    { name: 'schoolBus', url: 'schoolBus.do', description: '통학차량현황' },
    { name: 'yearOfWork', url: 'yearOfWork.do', description: '근속연수현황' },
    { name: 'environmentHygiene', url: 'environmentHygiene.do', description: '환경위생 관리현황' },
    { name: 'safetyEdu', url: 'safetyEdu.do', description: '안전점검·교육 실시현황' },
    { name: 'deductionSociety', url: 'deductionSociety.do', description: '공제회 가입현황' },
    { name: 'insurance', url: 'insurance.do', description: '보험별 가입현황' },
    { name: 'afterSchoolPresent', url: 'afterSchoolPresent.do', description: '방과후 과정 편성 운영 현황' },
    { name: 'safetyInstruct', url: 'safetyInstruct.do', description: '안전교육 현황' }
  ]
  
  const results: ComprehensiveData = {
    basicInfo2: null,
    building: null,
    classArea: null,
    teachersInfo: null,
    lessonDay: null,
    schoolMeal: null,
    schoolBus: null,
    yearOfWork: null,
    environmentHygiene: null,
    safetyEdu: null,
    deductionSociety: null,
    insurance: null,
    afterSchoolPresent: null,
    safetyInstruct: null
  }
  
  // 각 엔드포인트에서 데이터 조회
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 ${endpoint.description} 조회 중...`)
      
      const url = `https://e-childschoolinfo.moe.go.kr/api/notice/${endpoint.url}`
      const params = new URLSearchParams({
        key: API_KEY,
        sidoCode: String(sidoCode),
        sggCode: String(sggCode),
        pageCnt: '1000',
        currentPage: '1'
      })
      
      const response = await fetch(`${url}?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        },
        method: 'GET'
      })
      
      if (!response.ok) {
        console.warn(`⚠️ ${endpoint.description} API 호출 실패: ${response.status}`)
        results[endpoint.name] = null
        continue
      }
      
      const data = await response.json()
      
      if (data && data.status === 'SUCCESS' && data.kinderInfo && Array.isArray(data.kinderInfo)) {
        // 해당 유치원 코드 찾기
        const foundData = data.kinderInfo.find((item: any) => item.kindercode === kindercode)
        results[endpoint.name] = foundData ? { status: 'SUCCESS', kinderInfo: [foundData] } : null
        
        if (foundData) {
          console.log(`✅ ${endpoint.description} 데이터 발견`)
          if (endpoint.name === 'safetyInstruct') {
            console.log(`🛡️ 안전교육 현황 상세 데이터:`, foundData)
          }
        } else {
          console.log(`⚠️ ${endpoint.description}에서 해당 유치원 정보 없음`)
          if (endpoint.name === 'safetyInstruct') {
            console.log(`🛡️ 안전교육 현황에서 유치원 ${kindercode} 정보 없음. 전체 데이터:`, data.kinderInfo)
          }
        }
      } else {
        console.warn(`⚠️ ${endpoint.description} 응답 데이터 형식 오류`)
        if (endpoint.name === 'safetyInstruct') {
          console.log(`🛡️ 안전교육 현황 API 응답 오류:`, data)
        }
        results[endpoint.name] = null
      }
    } catch (error) {
      console.warn(`⚠️ ${endpoint.description} 조회 중 오류:`, error)
      results[endpoint.name] = null
    }
  }
  
  return results
}

// 추가 정보 조회 (지역 기준으로 조회 후 필터링)
async function fetchBuildingInfoByRegion(kindercode: string, sidoCode: number, sggCode: number): Promise<any> {
  return await fetchListAndFilterByKinderCode('building', kindercode, sidoCode, sggCode)
}

async function fetchTeacherInfoByRegion(kindercode: string, sidoCode: number, sggCode: number): Promise<any> {
  return await fetchListAndFilterByKinderCode('teachersInfo', kindercode, sidoCode, sggCode)
}

async function fetchMealInfoByRegion(kindercode: string, sidoCode: number, sggCode: number): Promise<any> {
  return await fetchListAndFilterByKinderCode('schoolMeal', kindercode, sidoCode, sggCode)
}

async function fetchTransportationInfoByRegion(kindercode: string, sidoCode: number, sggCode: number): Promise<any> {
  return await fetchListAndFilterByKinderCode('schoolBus', kindercode, sidoCode, sggCode)
}

Deno.serve(async (req) => {
  console.log(`🚀 Edge Function 요청 수신: ${req.method} ${req.url}`)
  
  // CORS 처리
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight 요청 처리')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 요청 데이터 파싱
    let requestData
    try {
      requestData = await req.json()
      console.log('📥 요청 데이터:', requestData)
    } catch (parseError) {
      console.error('❌ JSON 파싱 오류:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: '잘못된 JSON 형식입니다.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { kindercode, sidoCode, sggCode } = requestData

    if (!kindercode) {
      console.error('❌ kindercode 파라미터 누락')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'kindercode 파라미터가 필요합니다.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🎯 유치원 상세 정보 조회 시작: ${kindercode}`)
    if (sidoCode && sggCode) {
      console.log(`📍 지역 정보 제공됨: ${sidoCode}-${sggCode}`)
    }

    // 기본 정보 조회
    let basicInfo
    let comprehensiveData: ComprehensiveData | null = null
    
    try {
      if (sidoCode && sggCode) {
        // 지역 정보가 제공된 경우 통합 조회 사용
        console.log(`📍 지역 정보 제공됨, 통합 조회 시작: ${sidoCode}-${sggCode}`)
        comprehensiveData = await fetchComprehensiveKindergartenDetail(kindercode, sidoCode, sggCode)
        basicInfo = comprehensiveData.basicInfo2
      } else {
        // 지역 정보가 없는 경우 전체 검색
        basicInfo = await fetchKindergartenDetail(kindercode)
      }
      console.log(`📊 기본 정보 조회 성공:`, basicInfo)
    } catch (apiError) {
      console.error(`❌ 교육부 API 호출 실패:`, apiError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `교육부 API 호출 실패: ${apiError instanceof Error ? apiError.message : '알 수 없는 오류'}`,
          kindercode
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    if (!basicInfo || basicInfo.status !== 'SUCCESS' || !basicInfo.kinderInfo?.length) {
      console.warn(`⚠️ 유치원 정보 없음: ${kindercode}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: '유치원 정보를 찾을 수 없습니다.',
          kindercode
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 통합 데이터가 있는 경우 사용, 없으면 기존 방식으로 추가 정보 조회
    let buildingInfo = null
    let teacherInfo = null
    let mealInfo = null
    let transportationInfo = null
    let classAreaInfo = null
    let lessonDayInfo = null
    let yearOfWorkInfo = null
    let environmentHygieneInfo = null
    let safetyEduInfo = null
    let deductionSocietyInfo = null
    let insuranceInfo = null
    let afterSchoolInfo = null
    let safetyInstructInfo = null

    if (comprehensiveData) {
      // 통합 조회 결과 사용
      console.log(`✅ 통합 조회 결과 사용`)
      buildingInfo = comprehensiveData.building
      teacherInfo = comprehensiveData.teachersInfo
      mealInfo = comprehensiveData.schoolMeal
      transportationInfo = comprehensiveData.schoolBus
      classAreaInfo = comprehensiveData.classArea
      lessonDayInfo = comprehensiveData.lessonDay
      yearOfWorkInfo = comprehensiveData.yearOfWork
      environmentHygieneInfo = comprehensiveData.environmentHygiene
      safetyEduInfo = comprehensiveData.safetyEdu
      deductionSocietyInfo = comprehensiveData.deductionSociety
      insuranceInfo = comprehensiveData.insurance
      afterSchoolInfo = comprehensiveData.afterSchoolPresent
      safetyInstructInfo = comprehensiveData.safetyInstruct
    } else {
      // 기존 방식으로 추가 정보 조회 (서울권만)
      const addr = basicInfo.kinderInfo?.[0]?.addr as string | undefined
      console.log(`🏠 주소 정보: ${addr}`)
      const district = extractSeoulDistrictFromAddress(addr || '')
      console.log(`🗺️ 추출된 구: ${district}`)
      
      if (district) {
        const codes = seoulDistrictToCodes[district]
        if (codes) {
          console.log(`📍 지역 코드: ${codes.sidoCode}, ${codes.sggCode}`)
          try {
            ;[buildingInfo, teacherInfo, mealInfo, transportationInfo] = await Promise.all([
              fetchBuildingInfoByRegion(kindercode, codes.sidoCode, codes.sggCode),
              fetchTeacherInfoByRegion(kindercode, codes.sidoCode, codes.sggCode),
              fetchMealInfoByRegion(kindercode, codes.sidoCode, codes.sggCode),
              fetchTransportationInfoByRegion(kindercode, codes.sidoCode, codes.sggCode),
            ])
            console.log(`✅ 추가 정보 조회 완료`)
          } catch (additionalError) {
            console.warn(`⚠️ 추가 정보 조회 실패:`, additionalError)
            // 추가 정보 조회 실패해도 기본 정보는 반환
          }
        }
      }
    }

    const result = {
      success: true,
      kindercode,
      data: {
        basic: basicInfo,
        building: buildingInfo,
        teacher: teacherInfo,
        meal: mealInfo,
        transportation: transportationInfo,
        classArea: classAreaInfo,
        lessonDay: lessonDayInfo,
        yearOfWork: yearOfWorkInfo,
        environmentHygiene: environmentHygieneInfo,
        safetyEdu: safetyEduInfo,
        deductionSociety: deductionSocietyInfo,
        insurance: insuranceInfo,
        afterSchool: afterSchoolInfo,
        safetyInstruct: safetyInstructInfo
      },
      timestamp: new Date().toISOString()
    }

    console.log(`✅ 유치원 상세 정보 조회 완료: ${kindercode}`)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Edge Function 오류:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
