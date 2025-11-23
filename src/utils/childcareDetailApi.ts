/**
 * 어린이집 상세정보 API 연동 유틸리티
 * 보육정보포털 API를 사용하여 어린이집별 기본정보를 조회합니다.
 */

// 어린이집 상세 정보 인터페이스
export interface ChildcareDetailInfo {
  sidoname: string          // 시도명
  sigunguname: string       // 시군구명
  stcode: string           // 어린이집코드
  crname: string           // 어린이집명
  crtypename: string       // 어린이집유형
  crstatusname: string     // 운영현황
  zipcode: string          // 우편번호
  craddr: string           // 상세주소
  crtelno: string          // 전화번호
  crfaxno: string          // 팩스번호
  crhome: string           // 홈페이지주소
  nrtrroomcnt: number      // 보육실수
  nrtrroomsize: number     // 보육실 면적
  plgrdco: number          // 놀이터수
  cctvinstlcnt: number     // CCTV총설치수
  chcrtescnt: number       // 보육교직원수
  crcapat: number          // 정원
  crchcnt: number          // 현원
  la: string               // 시설 위도
  lo: string               // 시설 경도
  crcargbname: string      // 통학차량운영여부
  crcnfmdt: string         // 인가일자
  crpausebegindt: string   // 휴지시작일자
  crpauseenddt: string     // 휴지종료일자
  crabldt: string          // 폐지일자
  datastdrdt: string       // 데이터기준일자
  crspec: string           // 제공서비스
  
  // 반수 정보
  class_cnt_00: number     // 반수-만0세
  class_cnt_01: number     // 반수-만1세
  class_cnt_02: number     // 반수-만2세
  class_cnt_03: number     // 반수-만3세
  class_cnt_04: number     // 반수-만4세
  class_cnt_05: number     // 반수-만5세
  class_cnt_m2: number     // 반수-영아혼합(만0~2세)
  class_cnt_m5: number     // 반수-유아혼합(만3~5세)
  class_cnt_sp: number     // 반수-특수장애
  class_cnt_tot: number    // 반수-총계
  
  // 아동수 정보
  child_cnt_00: number     // 아동수-만0세
  child_cnt_01: number     // 아동수-만1세
  child_cnt_02: number     // 아동수-만2세
  child_cnt_03: number     // 아동수-만3세
  child_cnt_04: number     // 아동수-만4세
  child_cnt_05: number     // 아동수-만5세
  child_cnt_m2: number     // 아동수-영아혼합(만0~2세)
  child_cnt_m5: number     // 아동수-유아혼합(만3~5세)
  child_cnt_sp: number     // 아동수-특수장애
  child_cnt_tot: number    // 아동수-총계
  
  // 근속년수 정보
  em_cnt_0y: number        // 근속년수-1년미만
  em_cnt_1y: number        // 근속년수-1년이상~2년미만
  em_cnt_2y: number        // 근속년수-2년이상~4년미만
  em_cnt_4y: number        // 근속년수-4년이상~6년미만
  em_cnt_6y: number        // 근속년수-6년이상
  
  // 교직원현황
  em_cnt_a1: number        // 교직원현황-원장
  em_cnt_a2: number        // 교직원현황-보육교사
  em_cnt_a3: number        // 교직원현황-특수교사
  em_cnt_a4: number        // 교직원현황-치료교사
  em_cnt_a5: number        // 교직원현황-영양사
  em_cnt_a6: number        // 교직원현황-간호사
  em_cnt_a10: number       // 교직원현황-간호조무사
  em_cnt_a7: number        // 교직원현황-조리원
  em_cnt_a8: number        // 교직원현황-사무직원
  em_cnt_tot: number       // 교직원현황-총계
  
  crrepname: string        // 대표자명
  
  // 입소대기아동수
  ew_cnt_00: number        // 입소대기아동수 0세
  ew_cnt_01: number        // 입소대기아동수 1세
  ew_cnt_02: number        // 입소대기아동수 2세
  ew_cnt_03: number        // 입소대기아동수 3세
  ew_cnt_04: number        // 입소대기아동수 4세
  ew_cnt_05: number        // 입소대기아동수 5세
  ew_cnt_m6: number        // 입소대기아동수 6세이상
  ew_cnt_tot: number       // 입소대기아동수-총계
}

// 어린이집 상세정보 요약 (UI에서 사용하기 편한 형태로 변환)
export interface ChildcareDetailSummary {
  code: string
  name: string
  type: string
  status: string
  address: string
  phone: string
  homepage: string
  fax?: string
  region?: {
    sidoName: string
    sggName: string
    zipcode: string
  }
  capacity: number
  enrolled: number
  teacherCount: number
  classCount: number
  cctvCount: number
  establishedDate: string
  dataStandardDate?: string
  pauseBeginDate?: string
  pauseEndDate?: string
  abolishDate?: string
  services: string
  director: string
  
  // 커스텀 정보 (관리자가 추가한 정보)
  customInfo?: {
    building_images?: string[]
    meal_images?: string[]
    detailed_description?: string
    facilities?: string[]
    programs?: string[]
  }
  
  // 시설 정보
  facility: {
    roomCount: number
    roomSize: number
    playgroundCount: number
    cctvCount: number
  }
  
  // 교직원 정보
  staff: {
    director: number
    teacher: number
    specialTeacher: number
    therapist: number
    nutritionist: number
    nurse: number
    nurseAssistant: number
    cook: number
    clerk: number
    total: number
  }
  
  // 근속년수 정보
  experience: {
    under1Year: number
    year1To2: number
    year2To4: number
    year4To6: number
    over6Years: number
  }
  
  // 반별 정보
  classes: {
    age0: number
    age1: number
    age2: number
    age3: number
    age4: number
    age5: number
    mixed0To2: number
    mixed3To5: number
    special: number
    total: number
  }
  
  // 아동수 정보
  children: {
    age0: number
    age1: number
    age2: number
    age3: number
    age4: number
    age5: number
    mixed0To2: number
    mixed3To5: number
    special: number
    total: number
  }
  
  // 대기아동수 정보
  waitingList: {
    age0: number
    age1: number
    age2: number
    age3: number
    age4: number
    age5: number
    over6: number
    total: number
  }
  
  // 통학차량 정보
  transportation: {
    available: boolean
    status: string
  }
  
  // 좌표 정보
  location: {
    lat: number
    lng: number
  }
}

// API 응답 인터페이스
interface ChildcareDetailApiResponse {
  response: {
    item: ChildcareDetailInfo[]
  }
}

// Supabase Edge Function을 활용하여 어린이집 상세정보 조회 (유치원과 동일한 방식)
const fetchWithEdgeFunction = async (stcode: string, arcode?: string, opts?: { silent?: boolean }) => {
  try {
    const { supabase } = await import('../lib/supabase')

    if (!opts?.silent) {
      console.log('📤 어린이집 Edge Function 호출 시작')
    }

    // 1) supabase-js invoke 우선 시도
    try {
      const { data, error } = await supabase.functions.invoke('childcare-detail', {
        body: { 
          stcode,
          ...(arcode ? { arcode } : {})
        }
      })

      if (!opts?.silent) {
        console.log('📊 어린이집 invoke 응답:', { data, error })
      }

      if (error) {
        if (!opts?.silent) {
          console.error('❌ 어린이집 invoke 오류:', error)
        }
        throw new Error(`Edge Function 오류: ${error.message}`)
      }

      if (!data) {
        throw new Error('Edge Function 응답이 비어있습니다')
      }

      if (data.success !== true) {
        if (!opts?.silent) {
          console.error('❌ 어린이집 Edge Function 실패 응답:', data)
        }
        throw new Error(data.error || 'Edge Function 실행 실패')
      }

      if (!data.data) {
        throw new Error('Edge Function 응답에 데이터가 없습니다')
      }

      if (!opts?.silent) {
        console.log('✅ 어린이집 Edge Function 응답 성공 (invoke)')
      }
      return data.data
    } catch (invokeError) {
      if (!opts?.silent) {
        console.warn('⚠️ 어린이집 invoke 실패, 직접 호출 재시도:', invokeError)
      }

      // 2) Authorization 헤더 포함한 직접 호출
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
      const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase 환경 변수가 설정되지 않았습니다')
      }

      const functionUrl = `${supabaseUrl}/functions/v1/childcare-detail`
      if (!opts?.silent) {
        console.log('📡 어린이집 직접 호출 URL:', functionUrl)
      }

      const requestBody = { 
        stcode,
        ...(arcode ? { arcode } : {})
      }
      if (!opts?.silent) {
        console.log('📤 어린이집 직접 호출 요청 데이터:', JSON.stringify(requestBody, null, 2))
        console.log('🔍 stcode 값 검증:', {
          stcode: stcode,
          type: typeof stcode,
          length: stcode?.length,
          isEmpty: !stcode || stcode.trim() === '',
          arcode: arcode,
          arcodeType: typeof arcode
        })
      }

      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify(requestBody)
      })

      if (!opts?.silent) {
        console.log('📊 어린이집 직접 호출 응답 상태:', res.status, res.statusText)
      }

      if (!res.ok) {
        const errorText = await res.text()
        if (!opts?.silent) {
          console.error('❌ 어린이집 직접 호출 실패:', errorText)
        }
        throw new Error(`직접 호출 실패: ${res.status} ${res.statusText} - ${errorText}`)
      }

      const responseData = await res.json()

      if (!responseData.success) {
        throw new Error(responseData.error || '어린이집 API 호출 실패')
      }

      if (!opts?.silent) {
        console.log('✅ 어린이집 Edge Function 응답 성공 (직접 호출)')
      }
      return responseData.data
    }
  } catch (error) {
    if (!opts?.silent) {
      console.error('❌ 어린이집 Edge Function 호출 실패:', error)
    }
    throw error
  }
}

// XML을 JSON으로 변환하는 함수 (클라이언트용)
function parseXmlToJson(xmlText: string): any {
  try {
    console.log('XML 파싱 시작 (길이):', xmlText.length)
    
    // 정규식을 사용한 간단한 XML 파싱
    const result: any = {}
    
    // response 태그 찾기
    const responseMatch = xmlText.match(/<response>([\s\S]*?)<\/response>/)
    if (!responseMatch) {
      console.log('response 태그를 찾을 수 없습니다')
      return {}
    }
    
    const responseContent = responseMatch[1]
    console.log('response 내용 길이:', responseContent.length)
    
    // 에러 코드 확인
    const errcodeMatch = responseContent.match(/<errcode>(.*?)<\/errcode>/)
    const errmsgMatch = responseContent.match(/<errmsg>(.*?)<\/errmsg>/)
    
    if (errcodeMatch && errcodeMatch[1] !== '0') {
      console.log('API 에러 코드:', errcodeMatch[1])
      console.log('API 에러 메시지:', errmsgMatch?.[1] || '없음')
      return {
        response: {
          errcode: errcodeMatch[1],
          errmsg: errmsgMatch?.[1] || '알 수 없는 오류'
        }
      }
    }
    
    // item 태그들 찾기
    const itemMatches = responseContent.match(/<item>([\s\S]*?)<\/item>/g)
    if (!itemMatches || itemMatches.length === 0) {
      console.log('item 태그를 찾을 수 없습니다')
      return { response: { item: [] } }
    }
    
    console.log('찾은 item 개수:', itemMatches.length)
    
    const items = itemMatches.map(itemXml => {
      const item: any = {}
      
      // 모든 가능한 필드들 추출
      const fields = [
        'sidoname', 'sigunguname', 'stcode', 'crname', 'crtypename', 'crstatusname',
        'zipcode', 'craddr', 'crtelno', 'crfaxno', 'crhome', 'nrtrroomcnt', 'nrtrroomsize',
        'plgrdco', 'cctvinstlcnt', 'chcrtescnt', 'crcapat', 'crchcnt', 'la', 'lo',
        'crcargbname', 'crcnfmdt', 'crpausebegindt', 'crpauseenddt', 'crabldt', 'datastdrdt', 'crspec',
        'class_cnt_00', 'class_cnt_01', 'class_cnt_02', 'class_cnt_03', 'class_cnt_04', 'class_cnt_05',
        'class_cnt_m2', 'class_cnt_m5', 'class_cnt_sp', 'class_cnt_tot',
        'child_cnt_00', 'child_cnt_01', 'child_cnt_02', 'child_cnt_03', 'child_cnt_04', 'child_cnt_05',
        'child_cnt_m2', 'child_cnt_m5', 'child_cnt_sp', 'child_cnt_tot',
        'em_cnt_0y', 'em_cnt_1y', 'em_cnt_2y', 'em_cnt_4y', 'em_cnt_6y',
        'em_cnt_a1', 'em_cnt_a2', 'em_cnt_a3', 'em_cnt_a4', 'em_cnt_a5', 'em_cnt_a6',
        'em_cnt_a10', 'em_cnt_a7', 'em_cnt_a8', 'em_cnt_tot',
        'crrepname',
        'ew_cnt_00', 'ew_cnt_01', 'ew_cnt_02', 'ew_cnt_03', 'ew_cnt_04', 'ew_cnt_05',
        'ew_cnt_m6', 'ew_cnt_tot'
      ]
      
      fields.forEach(field => {
        const regex = new RegExp(`<${field}>([\\s\\S]*?)<\\/${field}>`)
        const match = itemXml.match(regex)
        if (match) {
          item[field] = match[1].trim()
        }
      })
      
      console.log('파싱된 item 키 개수:', Object.keys(item).length)
      return item
    })
    
    result.response = { item: items }
    console.log('최종 파싱 결과 아이템 수:', items.length)
    
    return result
  } catch (error) {
    console.error('XML 파싱 오류:', error)
    return {}
  }
}

// 어린이집 상세정보 조회 API
// 동시 호출 병합용 in-flight 캐시 + 캐시 로그 스로틀링
const childcareDetailInFlight = new Map<string, Promise<ChildcareDetailSummary | null>>()
const childcareDetailCacheLogTs = new Map<string, number>()

export const fetchChildcareDetail = async (
  stcode: string,
  arcode?: string,
  opts?: { silent?: boolean; cacheOnly?: boolean }
): Promise<ChildcareDetailSummary | null> => {
  // 진행 중인 동일 stcode 요청이 있으면 해당 Promise 재사용
  if (childcareDetailInFlight.has(stcode)) {
    return await childcareDetailInFlight.get(stcode)!
  }

  const task = (async (): Promise<ChildcareDetailSummary | null> => {
    try {
      if (!opts?.silent) console.log('🏢 어린이집 상세정보 로딩:', { stcode, arcode })
      
      // 0) Storage 캐시 확인
      const { childcareDetailCacheManager } = await import('./childcareDetailCache')
      const cached = await childcareDetailCacheManager.getCachedDetail(stcode)
      if (cached) {
        if (!opts?.silent) {
          const prev = childcareDetailCacheLogTs.get(stcode) || 0
          const now = Date.now()
          if (now - prev > 1000) {
            console.log('⚡ 캐시 상세 사용 (어린이집):', stcode)
            childcareDetailCacheLogTs.set(stcode, now)
          }
        }
        return cached
      }

      if (opts?.cacheOnly) {
        return null
      }

      // 1) Edge Function을 통한 API 호출
      const rawData = await fetchWithEdgeFunction(stcode, arcode, opts)
    // 디버그 조건: URL ?debug=1 또는 localStorage.DEBUG_CHILDCARE = 'true' 이면 운영에서도 로그 출력
    const shouldDebug = (() => {
      try {
        // 로컬 호스트에서는 항상 디버그 출력
        const host = typeof window !== 'undefined' ? window.location.hostname : ''
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true

        const sp = new URLSearchParams(window.location.search)
        if (sp.get('debug') === '1' || sp.get('debug') === 'true') return true
        if (typeof window !== 'undefined' && window.localStorage?.getItem('DEBUG_CHILDCARE') === 'true') return true
      } catch {}
      return (typeof process !== 'undefined' && (process as any).env && (process as any).env.NODE_ENV !== 'production')
    })()

    if (shouldDebug) {
      try {
        console.log('🧩 어린이집 API 원본 응답(rawData):', JSON.parse(JSON.stringify(rawData)))
      } catch {
        console.log('🧩 어린이집 API 원본 응답(rawData):', rawData)
      }
    }
    
    // 원본 키를 소문자로 정규화 (대문자 응답 대응: CLASS_CNT_00 등)
    const ld: Record<string, any> = {}
    try {
      Object.keys(rawData || {}).forEach((k) => {
        ld[k.toLowerCase()] = (rawData as any)[k]
      })
    } catch {}

    // 값 가져오기/변환 유틸
    const getVal = (key: string, ...alts: string[]) => {
      const kl = key.toLowerCase()
      if (ld && Object.prototype.hasOwnProperty.call(ld, kl)) return ld[kl]
      for (const alt of alts) {
        const al = alt.toLowerCase()
        if (ld && Object.prototype.hasOwnProperty.call(ld, al)) return ld[al]
      }
      return undefined
    }

    // 숫자/문자 안전 변환 유틸
    const toNum = (v: any): number => {
      if (v === null || v === undefined) return 0
      const s = String(v).trim().replace(/,/g, '')
      if (s === '' || s.toLowerCase() === 'null') return 0
      const n = parseFloat(s)
      return isFinite(n) ? n : 0
    }
    const toStr = (v: any, fallback = ''): string => {
      if (v === null || v === undefined) return fallback
      const s = String(v).trim()
      return s === '' ? fallback : s
    }
    const normalizeUrl = (url: string): string => {
      if (!url) return ''
      let u = url.trim()
      // 흔한 오타 교정 (http;// -> http://, https;// -> https://)
      u = u.replace(/^http;\/\//i, 'http://').replace(/^https;\/\//i, 'https://')
      // 세미콜론-슬래시 조합 교정
      u = u.replace(/^http;\/\//i, 'http://').replace(/^https;\/\//i, 'https://')
      // 스킴이 없으면 https:// 추가
      if (!/^https?:\/\//i.test(u)) {
        u = 'https://' + u.replace(/^\/*/, '')
      }
      return u
    }

    // 개별/총계 보정용 중간 값 계산
    const classCounts = [
      toNum(getVal('class_cnt_00')),
      toNum(getVal('class_cnt_01')),
      toNum(getVal('class_cnt_02')),
      toNum(getVal('class_cnt_03')),
      toNum(getVal('class_cnt_04')),
      toNum(getVal('class_cnt_05')),
      toNum(getVal('class_cnt_m2')),
      toNum(getVal('class_cnt_m5')),
      toNum(getVal('class_cnt_sp'))
    ]
    const classTotal = classCounts.reduce((a, b) => a + b, 0)

    const childCounts = [
      toNum(getVal('child_cnt_00')),
      toNum(getVal('child_cnt_01')),
      toNum(getVal('child_cnt_02')),
      toNum(getVal('child_cnt_03')),
      toNum(getVal('child_cnt_04')),
      toNum(getVal('child_cnt_05')),
      toNum(getVal('child_cnt_m2')),
      toNum(getVal('child_cnt_m5')),
      toNum(getVal('child_cnt_sp'))
    ]
    const childTotal = childCounts.reduce((a, b) => a + b, 0)

    const waitCounts = [
      toNum(getVal('ew_cnt_00')),
      toNum(getVal('ew_cnt_01')),
      toNum(getVal('ew_cnt_02')),
      toNum(getVal('ew_cnt_03')),
      toNum(getVal('ew_cnt_04')),
      toNum(getVal('ew_cnt_05')),
      toNum(getVal('ew_cnt_m6'))
    ]
    const waitTotal = waitCounts.reduce((a, b) => a + b, 0)

    const staffCounts = {
      director: toNum(getVal('em_cnt_a1')),
      teacher: toNum(getVal('em_cnt_a2')),
      specialTeacher: toNum(getVal('em_cnt_a3')),
      therapist: toNum(getVal('em_cnt_a4')),
      nutritionist: toNum(getVal('em_cnt_a5')),
      nurse: toNum(getVal('em_cnt_a6')),
      nurseAssistant: toNum(getVal('em_cnt_a10')),
      cook: toNum(getVal('em_cnt_a7')),
      clerk: toNum(getVal('em_cnt_a8'))
    }
    const staffTotal = Object.values(staffCounts).reduce((a, b) => a + b, 0)

    // UI 친화적 형태로 변환 (보정 포함)
    const summary: ChildcareDetailSummary = {
      code: toStr(getVal('stcode'), stcode),
      name: toStr(getVal('crname'), `어린이집 (${stcode})`),
      type: toStr(getVal('crtypename'), '민간'),
      status: toStr(getVal('crstatusname'), '정상'),
      address: toStr(getVal('craddr'), '정보 없음'),
      phone: toStr(getVal('crtelno'), '정보 없음'),
      homepage: normalizeUrl(toStr(getVal('crhome'), '')),
      capacity: toNum(getVal('crcapat')),
      enrolled: toNum(getVal('crchcnt')),
      teacherCount: toNum(getVal('chcrtescnt')),
      classCount: toNum(getVal('class_cnt_tot')) || classTotal,
      cctvCount: toNum(getVal('cctvinstlcnt')),
      establishedDate: toStr(getVal('crcnfmdt'), ''),
      services: toStr(getVal('crspec'), '일반보육'),
      director: toStr(getVal('crrepname'), '정보 없음'),
      fax: toStr(getVal('crfaxno'), ''),
      region: {
        sidoName: toStr(getVal('sidoname'), ''),
        sggName: toStr(getVal('sigunguname', 'sigunname'), ''),
        zipcode: toStr(getVal('zipcode'), '')
      },
      dataStandardDate: toStr(getVal('datastdrdt'), ''),
      pauseBeginDate: toStr(getVal('crpausebegindt'), ''),
      pauseEndDate: toStr(getVal('crpauseenddt'), ''),
      abolishDate: toStr(getVal('crabldt'), ''),
      
      facility: {
        roomCount: toNum(getVal('nrtrroomcnt')),
        roomSize: toNum(getVal('nrtrroomsize')),
        playgroundCount: toNum(getVal('plgrdco')),
        cctvCount: toNum(getVal('cctvinstlcnt'))
      },
      
      staff: {
        ...staffCounts,
        total: (toNum(getVal('em_cnt_tot')) || staffTotal || toNum(getVal('chcrtescnt')))
      },
      
      experience: {
        under1Year: toNum(getVal('em_cnt_0y')),
        year1To2: toNum(getVal('em_cnt_1y')),
        year2To4: toNum(getVal('em_cnt_2y')),
        year4To6: toNum(getVal('em_cnt_4y')),
        over6Years: toNum(getVal('em_cnt_6y'))
      },
      
      classes: {
        age0: toNum(getVal('class_cnt_00')),
        age1: toNum(getVal('class_cnt_01')),
        age2: toNum(getVal('class_cnt_02')),
        age3: toNum(getVal('class_cnt_03')),
        age4: toNum(getVal('class_cnt_04')),
        age5: toNum(getVal('class_cnt_05')),
        mixed0To2: toNum(getVal('class_cnt_m2')),
        mixed3To5: toNum(getVal('class_cnt_m5')),
        special: toNum(getVal('class_cnt_sp')),
        total: toNum(getVal('class_cnt_tot')) || classTotal
      },
      
      children: {
        age0: toNum(getVal('child_cnt_00')),
        age1: toNum(getVal('child_cnt_01')),
        age2: toNum(getVal('child_cnt_02')),
        age3: toNum(getVal('child_cnt_03')),
        age4: toNum(getVal('child_cnt_04')),
        age5: toNum(getVal('child_cnt_05')),
        mixed0To2: toNum(getVal('child_cnt_m2')),
        mixed3To5: toNum(getVal('child_cnt_m5')),
        special: toNum(getVal('child_cnt_sp')),
        total: toNum(getVal('child_cnt_tot')) || childTotal
      },
      
      waitingList: {
        age0: toNum(getVal('ew_cnt_00')),
        age1: toNum(getVal('ew_cnt_01')),
        age2: toNum(getVal('ew_cnt_02')),
        age3: toNum(getVal('ew_cnt_03')),
        age4: toNum(getVal('ew_cnt_04')),
        age5: toNum(getVal('ew_cnt_05')),
        over6: toNum(getVal('ew_cnt_m6')),
        total: toNum(getVal('ew_cnt_tot')) || waitTotal
      },
      
      transportation: {
        available: toStr(getVal('crcargbname')) === '운영',
        status: toStr(getVal('crcargbname'), '정보 없음')
      },
      
      location: {
        lat: toNum(getVal('la')),
        lng: toNum(getVal('lo'))
      }
    }
    
      if (!opts?.silent) console.log('✅ 어린이집 상세정보 조회 완료:', summary.name)
      // 2) 캐시에 저장 - 비동기, 렌더 비차단
      try {
        void childcareDetailCacheManager.saveDetailCache(stcode, summary)
      } catch {}
      return summary
      
    } catch (error) {
      if (!opts?.silent) {
        console.error('❌ 어린이집 상세정보 조회 실패:', error)
      }
      // 에러 발생시 null 반환 (silent 모드에서는 샘플 데이터 없이)
      if (opts?.silent) {
        return null
      }
      // 일반 모드에서는 샘플 데이터 반환
      return createSampleChildcareDetail(stcode)
    }
  })()

  childcareDetailInFlight.set(stcode, task)
  try {
    const result = await task
    return result
  } finally {
    childcareDetailInFlight.delete(stcode)
  }
}

// 샘플 어린이집 상세정보 생성 (API 실패시 사용)
const createSampleChildcareDetail = (stcode: string): ChildcareDetailSummary => {
  return {
    code: stcode,
    name: `샘플 어린이집 (${stcode})`,
    type: '민간',
    status: '정상',
    address: '정보를 불러올 수 없습니다',
    phone: '정보 없음',
    homepage: '',
    capacity: 50,
    enrolled: 45,
    teacherCount: 8,
    classCount: 6,
    cctvCount: 12,
    establishedDate: '20100301',
    services: '일반보육, 연장보육',
    director: '정보 없음',
    
    facility: {
      roomCount: 6,
      roomSize: 180,
      playgroundCount: 1,
      cctvCount: 12
    },
    
    staff: {
      director: 1,
      teacher: 6,
      specialTeacher: 0,
      therapist: 0,
      nutritionist: 1,
      nurse: 0,
      nurseAssistant: 0,
      cook: 1,
      clerk: 0,
      total: 9
    },
    
    experience: {
      under1Year: 2,
      year1To2: 2,
      year2To4: 3,
      year4To6: 1,
      over6Years: 1
    },
    
    classes: {
      age0: 1,
      age1: 1,
      age2: 1,
      age3: 1,
      age4: 1,
      age5: 1,
      mixed0To2: 0,
      mixed3To5: 0,
      special: 0,
      total: 6
    },
    
    children: {
      age0: 8,
      age1: 8,
      age2: 8,
      age3: 8,
      age4: 7,
      age5: 6,
      mixed0To2: 0,
      mixed3To5: 0,
      special: 0,
      total: 45
    },
    
    waitingList: {
      age0: 3,
      age1: 5,
      age2: 4,
      age3: 2,
      age4: 1,
      age5: 0,
      over6: 0,
      total: 15
    },
    
    transportation: {
      available: true,
      status: '운영'
    },
    
    location: {
      lat: 37.5665,
      lng: 126.9780
    }
  }
}

// 날짜 형식 변환 함수
export const formatChildcareDate = (dateString: string): string => {
  if (!dateString || dateString === '정보 없음') return '정보 없음'
  if (dateString.length === 8 && /^\d{8}$/.test(dateString)) {
    return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`
  }
  return dateString
}
