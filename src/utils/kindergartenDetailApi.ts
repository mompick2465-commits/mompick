// 유치원 상세 정보 API 연동 함수들

import { 
  GeneralInfoResponse,
  BuildingInfoResponse,
  TeacherInfoResponse,
  MealInfoResponse,
  TransportationInfoResponse,
  SafetyInfoResponse,
  InsuranceInfoResponse,
  AfterSchoolInfoResponse,
  KindergartenDetailSummary,
  BasicInfo,
  TeacherInfo,
  MealInfo,
  TransportationInfo,
  SafetyInfo,
  InsuranceInfo,
  OperationInfo
} from '../types/kindergartenDetail'
import { detailCacheManager } from './kindergartenDetailCache'

const API_BASE_URL = 'https://e-childschoolinfo.moe.go.kr/api/notice'
const API_KEY = process.env.REACT_APP_KINDERGARTEN_API_KEY

// Supabase Edge Function을 활용하여 유치원 정보 조회
const fetchWithProxy = async (kindercode: string, sidoCode?: number, sggCode?: number) => {
  if (!API_KEY) {
    throw new Error('API 키가 설정되지 않았습니다. REACT_APP_KINDERGARTEN_API_KEY 환경변수를 확인해주세요.')
  }
  
  try {
    const { supabase } = await import('../lib/supabase')

    // 1) supabase-js invoke 우선 시도
    try {
      const { data, error } = await supabase.functions.invoke('kindergarten-detail', {
        body: { 
          kindercode,
          ...(sidoCode && sggCode ? { sidoCode, sggCode } : {})
        }
      })

      console.log('📊 invoke 응답:', { data, error })

      if (error) {
        console.error('❌ invoke 오류:', error)
        throw new Error(`Edge Function 오류: ${error.message}`)
      }

      if (!data) {
        throw new Error('Edge Function 응답이 비어있습니다')
      }

      if (data.success !== true) {
        console.error('❌ Edge Function 실패 응답:', data)
        throw new Error(data.error || 'Edge Function 실행 실패')
      }

      if (!data.data) {
        throw new Error('Edge Function 응답에 데이터가 없습니다')
      }

      console.log('✅ Edge Function 응답 성공 (invoke)')
      return data.data
    } catch (invokeError) {
      console.warn('⚠️ invoke 실패, 직접 호출 재시도:', invokeError)

      // 2) Authorization 헤더 포함한 직접 호출
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
      const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase 환경 변수가 설정되지 않았습니다')
      }

      const functionUrl = `${supabaseUrl}/functions/v1/kindergarten-detail`
      console.log('📡 직접 호출 URL:', functionUrl)
      console.log('🔑 Authorization 헤더 포함하여 호출...')

            const res = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey
              },
              body: JSON.stringify({ 
                kindercode,
                ...(sidoCode && sggCode ? { sidoCode, sggCode } : {})
              })
            })

      console.log('📊 직접 호출 응답 상태:', res.status, res.statusText)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ 직접 호출 실패:', errorText)
        throw new Error(`직접 호출 실패: ${res.status} ${res.statusText} - ${errorText}`)
      }

      const json = await res.json()
      console.log('📊 직접 호출 응답 데이터:', json)

      if (!json) {
        throw new Error('직접 호출 응답이 비어있습니다')
      }

      if (json.success !== true) {
        console.error('❌ Edge Function 실패 응답:', json)
        throw new Error(json.error || 'Edge Function 실행 실패')
      }

      if (!json.data) {
        throw new Error('Edge Function 응답에 데이터가 없습니다')
      }

      console.log('✅ Edge Function 응답 성공 (직접 호출)')
      return json.data
    }

  } catch (error) {
    console.error('❌ Edge Function 호출 실패:', error)
    throw error
  }
}

// 기본 정보 조회 - 개별 유치원 상세 정보
export const fetchGeneralInfo = async (kindercode: string, sidoCode?: number, sggCode?: number): Promise<GeneralInfoResponse> => {
  // 로그 제거 (fetchKindergartenDetail에서 이미 로그 출력)
  if (sidoCode && sggCode) {
    console.log('📍 지역 정보 포함:', { sidoCode, sggCode })
  }
  
  try {
    const data = await fetchWithProxy(kindercode, sidoCode, sggCode)
    return data.basic
  } catch (error) {
    console.log('개별 유치원 조회 실패:', error)
    throw error
  }
}

// 유치원 코드에서 지역 정보 추출 (대구광역시 동부교육지원청 우선)
const extractRegionFromKindercode = (kindercode: string): { sidoCode: number; sggCode: number } | null => {
  // 대구광역시 동부교육지원청 (시도코드: 27, 시군구코드: 27140) 우선 시도
  // 사용자가 제공한 예시에서 이 지역에서 유치원 목록을 확인했음
  if (kindercode.includes('1ecec08c') || kindercode.includes('1ecec08d')) {
    return { sidoCode: 27, sggCode: 27140 }
  }
  
  // 다른 패턴들도 추가할 수 있음
  return null
}

// 건물 현황 조회
export const fetchBuildingInfo = async (kindercode: string): Promise<BuildingInfoResponse | null> => {
  const data = await fetchWithProxy(kindercode)
  return data.building
}

// 교실 면적 현황 조회
export const fetchClassAreaInfo = async (kindercode: string): Promise<any> => {
  // Storage에서 제공하지 않는 데이터이므로 null 반환
  return null
}

// 교직원 현황 조회
export const fetchTeacherInfo = async (kindercode: string): Promise<TeacherInfoResponse | null> => {
  const data = await fetchWithProxy(kindercode)
  return data.teacher
}

// 급식 운영 현황 조회
export const fetchMealInfo = async (kindercode: string): Promise<MealInfoResponse | null> => {
  const data = await fetchWithProxy(kindercode)
  return data.meal
}

// 통학차량 현황 조회
export const fetchTransportationInfo = async (kindercode: string): Promise<TransportationInfoResponse | null> => {
  const data = await fetchWithProxy(kindercode)
  return data.transportation
}

// 근속연수 현황 조회
export const fetchWorkExperienceInfo = async (kindercode: string): Promise<any> => {
  // Edge Function에서 제공하지 않는 데이터이므로 null 반환
  return null
}

// 환경위생 관리 현황 조회
export const fetchEnvironmentHygieneInfo = async (kindercode: string): Promise<SafetyInfoResponse | null> => {
  // Edge Function에서 제공하지 않는 데이터이므로 null 반환
  return null
}

// 안전점검·교육 실시 현황 조회
export const fetchSafetyEducationInfo = async (kindercode: string): Promise<SafetyInfoResponse | null> => {
  // Edge Function에서 제공하지 않는 데이터이므로 null 반환
  return null
}

// 공제회 가입 현황 조회
export const fetchDeductionSocietyInfo = async (kindercode: string): Promise<InsuranceInfoResponse | null> => {
  // Edge Function에서 제공하지 않는 데이터이므로 null 반환
  return null
}

// 보험별 가입 현황 조회
export const fetchInsuranceInfo = async (kindercode: string): Promise<InsuranceInfoResponse | null> => {
  // Edge Function에서 제공하지 않는 데이터이므로 null 반환
  return null
}

// 방과후 과정 편성 운영 현황 조회
export const fetchAfterSchoolInfo = async (kindercode: string): Promise<AfterSchoolInfoResponse | null> => {
  // Edge Function에서 제공하지 않는 데이터이므로 null 반환
  return null
}

// 수업일수 현황 조회
export const fetchLessonDaysInfo = async (kindercode: string): Promise<any> => {
  // Edge Function에서 제공하지 않는 데이터이므로 null 반환
  return null
}

// 설립유형 한글 변환
const getEstablishmentType = (establish: string) => {
  const types: { [key: string]: string } = {
    '1': '국공립',
    '2': '사립',
    '3': '법인',
    '4': '민간',
    '5': '직장',
    '6': '가정',
    '7': '부모협동',
    '8': '사회복지법인',
    '9': '기타'
  }
  return types[establish] || establish
}

// 중복 호출 방지를 위한 Map
const pendingRequests = new Map<string, Promise<KindergartenDetailSummary | null>>()

// 유치원 상세 정보 통합 조회 (캐시 우선)
export const fetchKindergartenDetail = async (kindercode: string, sidoCode?: number, sggCode?: number): Promise<KindergartenDetailSummary | null> => {
  // 중복 호출 방지: 이미 진행 중인 요청이 있으면 그것을 반환
  const requestKey = `${kindercode}-${sidoCode || 'null'}-${sggCode || 'null'}`
  if (pendingRequests.has(requestKey)) {
    console.log('🔄 이미 진행 중인 요청이 있습니다. 대기 중...', kindercode)
    return await pendingRequests.get(requestKey)!
  }

  const requestPromise = (async () => {
  try {
    console.log('유치원 상세 정보 조회 시도:', kindercode)
    
    // 지역 정보가 제공되지 않은 경우 유치원 코드에서 추출 시도
    let finalSidoCode = sidoCode
    let finalSggCode = sggCode
    
    if (!finalSidoCode || !finalSggCode) {
      const extractedRegion = extractRegionFromKindercode(kindercode)
      if (extractedRegion) {
        finalSidoCode = extractedRegion.sidoCode
        finalSggCode = extractedRegion.sggCode
        console.log('📍 유치원 코드에서 지역 정보 추출:', { sidoCode: finalSidoCode, sggCode: finalSggCode })
      }
    }
    
    if (finalSidoCode && finalSggCode) {
      console.log('📍 지역 정보 포함:', { sidoCode: finalSidoCode, sggCode: finalSggCode })
    }
    
    // 1. 캐시에서 먼저 조회
    const cachedData = await detailCacheManager.getCachedDetail(kindercode)
    if (cachedData) {
      console.log('✅ 캐시에서 상세 정보 로드:', kindercode)
      
      // 캐시 데이터에 커스텀 정보 추가 (테이블에서 조회)
      try {
        const { supabase } = await import('../lib/supabase')
        const { data: customData } = await supabase
          .from('kindergarten_custom_info')
          .select('building_images, meal_images')
          .eq('kinder_code', kindercode)
          .eq('is_active', true)
          .maybeSingle()
        
        if (customData) {
          cachedData.customInfo = {
            building_images: customData.building_images || [],
            meal_images: customData.meal_images || []
          }
          console.log('✅ 커스텀 정보 추가:', cachedData.customInfo)
        } else {
          console.log('📦 커스텀 정보 없음')
        }
      } catch (customError) {
        console.log('커스텀 정보 조회 오류:', customError)
      }
      
      return cachedData
    }
    
    console.log('📡 캐시 없음, API 호출 시작:', kindercode)
    
    // 2. API 호출 시도
    try {
      const generalInfo = await fetchGeneralInfo(kindercode, finalSidoCode, finalSggCode)
      console.log('API 응답 데이터:', generalInfo)
      console.log('API 응답 구조 분석:')
      console.log('- status:', generalInfo?.status)
      console.log('- kinderInfo 타입:', typeof generalInfo?.kinderInfo)
      console.log('- kinderInfo 길이:', generalInfo?.kinderInfo?.length)
      console.log('- 전체 응답 키:', Object.keys(generalInfo || {}))
      
      // API 응답 구조 확인 및 파싱 (지도 페이지와 동일한 방식)
      if (generalInfo && generalInfo.kinderInfo && Array.isArray(generalInfo.kinderInfo)) {
        console.log('API에서 받은 유치원 수:', generalInfo.kinderInfo.length)
        
        // 특정 kindercode에 해당하는 유치원 찾기
        const targetKindergarten = generalInfo.kinderInfo.find((kg: any) => kg.kindercode === kindercode)
        
        if (!targetKindergarten) {
          console.warn(`해당 kindercode(${kindercode})에 대한 유치원 정보를 찾을 수 없습니다.`)
          console.log('사용 가능한 kindercode들:', generalInfo.kinderInfo.map((kg: any) => kg.kindercode).slice(0, 5))
          return null
        }
        
        const basic = targetKindergarten
        console.log('찾은 유치원 기본 정보:', basic)
        
        // 일반현황 출력항목 기준으로 수정
        const capacity = parseInt(basic.prmstfcnt) || 0 // 인가총정원수
        const enrolled = (parseInt((basic as any).ppcnt3) || 0) + (parseInt((basic as any).ppcnt4) || 0) + (parseInt((basic as any).ppcnt5) || 0) + (parseInt((basic as any).mixppcnt) || 0) + (parseInt((basic as any).shppcnt) || 0) // 실제 원아수
        const classCount = (parseInt((basic as any).clcnt3) || 0) + (parseInt((basic as any).clcnt4) || 0) + (parseInt((basic as any).clcnt5) || 0) + (parseInt((basic as any).mixclcnt) || 0) + (parseInt((basic as any).shclcnt) || 0) // 실제 학급수
        // 교사 수는 추정치로 초기화, 나중에 실제 교사 정보로 업데이트
        let teacherCount = Math.max(1, Math.ceil(enrolled / 15))
        let ratio = `1:${Math.round(enrolled / teacherCount)}`
        
        // Edge Function에서 받아온 상세 정보 파싱
        const comprehensiveData = await fetchWithProxy(kindercode, finalSidoCode, finalSggCode)
        console.log('📊 Edge Function에서 받은 상세 정보:', comprehensiveData)
        
        // 상세 정보 파싱
        let safetyData: { 
          lastCheckDate: string | undefined, 
          issues: number, 
          status: '적합' | '조치' | '미상',
          // 안전점검 현황
          fireAvdYn?: string,
          fireAvdDt?: string,
          gasCkYn?: string,
          gasCkDt?: string,
          fireSafeYn?: string,
          fireSafeDt?: string,
          electCkYn?: string,
          electCkDt?: string,
          plygCkYn?: string,
          plygCkDt?: string,
          plygCkRsCd?: string,
          cctvIstYn?: string,
          cctvIstTotal?: number,
          cctvIstIn?: number,
          cctvIstOut?: number
        } = { lastCheckDate: undefined, issues: 0, status: '미상' }
        let hygieneData: { lastCheckDate: string | undefined, status: '적합' | '조치' | '미상' } = { lastCheckDate: undefined, status: '미상' }
        let mealData: any = { mode: '미상', hasDietitian: false }
        let busData = { 
          inOperation: false, 
          vehicleCount: 0, 
          hasGuardian: false,
          dclrVhcnt: undefined as number | undefined,
          psg9DclrVhcnt: undefined as number | undefined,
          psg12DclrVhcnt: undefined as number | undefined,
          psg15DclrVhcnt: undefined as number | undefined
        }
        let afterSchoolData = { 
          inOperation: false, 
          programs: [] as string[], 
          operatingHours: '',
          // 방과후과정현황
          inorClcnt: undefined as number | undefined,
          pmRrgnClcnt: undefined as number | undefined,
          operTime: undefined as string | undefined,
          inorPtcKpcnt: undefined as number | undefined,
          pmRrgnPtcKpcnt: undefined as number | undefined,
          fxrlThcnt: undefined as number | undefined,
          shcntThcnt: undefined as number | undefined,
          incnt: undefined as number | undefined
        }
        let safetyEducationData = {
          // 안전교육 현황
          pbntSemScCd: undefined as string | undefined,
          safeTpCd1: undefined as string | undefined,
          safeTpCd2: undefined as string | undefined,
          safeTpCd3: undefined as string | undefined,
          safeTpCd4: undefined as string | undefined,
          safeTpCd5: undefined as string | undefined,
          safeTpCd6: undefined as string | undefined,
          safeTpCd7: undefined as string | undefined,
          safeTpCd8: undefined as string | undefined
        }
        
        // 환경위생 정보 파싱 (실제 API 필드 사용)
        if (comprehensiveData.environmentHygiene && comprehensiveData.environmentHygiene.status === 'SUCCESS' && comprehensiveData.environmentHygiene.kinderInfo?.length > 0) {
          const hygieneInfo = comprehensiveData.environmentHygiene.kinderInfo.find((item: any) => item.kindercode === kindercode)
          if (hygieneInfo) {
            // 최신 점검일자 찾기 (실내공기질, 정기소독, 미세먼지, 조도관리 중 가장 최근)
            const dates = [
              hygieneInfo.arql_chk_dt, // 실내공기질 점검일자
              hygieneInfo.fxtm_dsnf_chk_dt, // 정기소독 점검일자
              hygieneInfo.mdst_chk_dt, // 미세먼지 점검일자
              hygieneInfo.ilmn_chk_dt // 조도관리 점검일자
            ].filter(date => date && date !== '-' && date.length === 8)
            
            const latestDate = dates.length > 0 ? dates.sort().reverse()[0] : undefined
            const formattedDate = latestDate ? `${latestDate.slice(0,4)}-${latestDate.slice(4,6)}-${latestDate.slice(6,8)}` : undefined
            
            // 전체 상태 판단 (실내공기질 기준)
            let overallStatus: '적합' | '조치' | '미상' = '미상'
            if (hygieneInfo.arql_chk_rslt_tp_cd === '적합') {
              overallStatus = '적합'
            } else if (hygieneInfo.arql_chk_rslt_tp_cd && hygieneInfo.arql_chk_rslt_tp_cd !== '-') {
              overallStatus = '조치'
            }
            
            hygieneData = {
              lastCheckDate: formattedDate,
              status: overallStatus
            }
          }
        }
        
        // 안전교육 정보 파싱
        if (comprehensiveData.safetyEdu && comprehensiveData.safetyEdu.status === 'SUCCESS' && comprehensiveData.safetyEdu.kinderInfo?.length > 0) {
          const safetyInfo = comprehensiveData.safetyEdu.kinderInfo.find((item: any) => item.kindercode === kindercode)
          if (safetyInfo) {
            safetyData = {
              lastCheckDate: safetyInfo.checkdate,
              issues: safetyInfo.result === '조치' ? 1 : 0,
              status: safetyInfo.result === '적합' ? '적합' : '조치' as '적합' | '조치' | '미상'
            }
          }
        }
        
        // 급식 정보 파싱
        if (comprehensiveData.meal && comprehensiveData.meal.status === 'SUCCESS' && comprehensiveData.meal.kinderInfo?.length > 0) {
          const mealInfo = comprehensiveData.meal.kinderInfo.find((item: any) => item.kindercode === kindercode)
          if (mealInfo) {
            console.log('🍽️ 급식 정보 API 응답:', mealInfo)
            mealData = {
              mode: mealInfo.mealtype === '자체급식' ? '자체' : '위탁' as '자체' | '위탁' | '미상',
              hasDietitian: mealInfo.dietitian === 'Y',
              // 추가 급식 정보
              consEntsNm: mealInfo.cons_ents_nm || '', // 위탁업체명
              ntrtTchrAgmtYn: mealInfo.ntrt_tchr_agmt_yn || '', // 영양교사배치여부
              sngeAgmtNtrtThcnt: parseInt(mealInfo.snge_agmt_ntrt_thcnt) || 0, // 단독배치영양교사수
              cprtAgmtNtrtThcnt: parseInt(mealInfo.cprt_agmt_ntrt_thcnt) || 0, // 공동배치영양교사수
              cprtAgmtIttNm: mealInfo.cprt_agmt_itt_nm || '', // 공동배치기관명
              ckcnt: parseInt(mealInfo.ckcnt) || 0, // 조리사수
              cmcnt: parseInt(mealInfo.cmcnt) || 0, // 조리인력수
              masMsplDclrYn: mealInfo.mas_mspl_dclr_yn || '' // 집단급식소신고여부
            }
          }
        }
        
        // 통학차량 정보 파싱
        if (comprehensiveData.transportation && comprehensiveData.transportation.status === 'SUCCESS' && comprehensiveData.transportation.kinderInfo?.length > 0) {
          const busInfo = comprehensiveData.transportation.kinderInfo.find((item: any) => item.kindercode === kindercode)
          if (busInfo) {
            busData = {
              inOperation: busInfo.vhcl_oprn_yn === 'Y', // 실제 API 필드 사용
              vehicleCount: parseInt(busInfo.opra_vhcnt) || 0, // 실제 운행차량수
              hasGuardian: false, // 동승보호자 정보는 별도 필드가 없음
              dclrVhcnt: busInfo.dclr_vhcnt ? parseInt(busInfo.dclr_vhcnt) : undefined, // 신고차량수
              psg9DclrVhcnt: busInfo.psg9_dclr_vhcnt ? parseInt(busInfo.psg9_dclr_vhcnt) : undefined, // 9인승신고차량수
              psg12DclrVhcnt: busInfo.psg12_dclr_vhcnt ? parseInt(busInfo.psg12_dclr_vhcnt) : undefined, // 12인승신고차량수
              psg15DclrVhcnt: busInfo.psg15_dclr_vhcnt ? parseInt(busInfo.psg15_dclr_vhcnt) : undefined // 15인승신고차량수
            }
            
          }
        }
        
        // 방과후 과정 정보 파싱
        if (comprehensiveData.afterSchool && comprehensiveData.afterSchool.status === 'SUCCESS' && comprehensiveData.afterSchool.kinderInfo?.length > 0) {
          const afterSchoolInfo = comprehensiveData.afterSchool.kinderInfo.find((item: any) => item.kindercode === kindercode)
          if (afterSchoolInfo) {
            // 참여원아수가 0보다 크면 운영 중으로 판단
            const totalParticipants = parseInt(afterSchoolInfo.pm_rrgn_ptcn_kpcnt || '0') + parseInt(afterSchoolInfo.inor_ptcn_kpcnt || '0')
            afterSchoolData = {
              inOperation: totalParticipants > 0,
              programs: ['방과후 과정'], // 실제 프로그램명이 없으므로 기본값
              operatingHours: afterSchoolInfo.oper_time || '정보 없음',
              // 방과후과정현황 데이터 추가
              inorClcnt: parseInt(afterSchoolInfo.inor_clcnt || '0') || undefined,
              pmRrgnClcnt: parseInt(afterSchoolInfo.pm_rrgn_clcnt || '0') || undefined,
              operTime: afterSchoolInfo.oper_time ? afterSchoolInfo.oper_time.replace(/시/g, ':').replace(/분/g, '') : undefined,
              inorPtcKpcnt: parseInt(afterSchoolInfo.inor_ptcn_kpcnt || '0') || undefined,
              pmRrgnPtcKpcnt: parseInt(afterSchoolInfo.pm_rrgn_ptcn_kpcnt || '0') || undefined,
              fxrlThcnt: parseInt(afterSchoolInfo.fxrl_thcnt || '0') || undefined,
              shcntThcnt: parseInt(afterSchoolInfo.shcnt_thcnt || '0') || undefined,
              incnt: parseInt(afterSchoolInfo.incnt || '0') || undefined
            }
          }
        }
        
        // 안전교육 현황 정보 파싱
        console.log('🛡️ 안전교육 현황 API 응답:', comprehensiveData.safetyInstruct)
        if (comprehensiveData.safetyInstruct && comprehensiveData.safetyInstruct.status === 'SUCCESS' && comprehensiveData.safetyInstruct.kinderInfo?.length > 0) {
          console.log('🛡️ 안전교육 현황 데이터 존재:', comprehensiveData.safetyInstruct.kinderInfo)
          const safetyEducationInfo = comprehensiveData.safetyInstruct.kinderInfo.find((item: any) => item.kindercode === kindercode)
          console.log('🛡️ 해당 유치원 안전교육 현황:', safetyEducationInfo)
          if (safetyEducationInfo) {
            safetyEducationData = {
              pbntSemScCd: safetyEducationInfo.pbnt_sem_sc_cd || undefined,
              safeTpCd1: safetyEducationInfo.safe_tp_cd1 || undefined,
              safeTpCd2: safetyEducationInfo.safe_tp_cd2 || undefined,
              safeTpCd3: safetyEducationInfo.safe_tp_cd3 || undefined,
              safeTpCd4: safetyEducationInfo.safe_tp_cd4 || undefined,
              safeTpCd5: safetyEducationInfo.safe_tp_cd5 || undefined,
              safeTpCd6: safetyEducationInfo.safe_tp_cd6 || undefined,
              safeTpCd7: safetyEducationInfo.safe_tp_cd7 || undefined,
              safeTpCd8: safetyEducationInfo.safe_tp_cd8 || undefined
            }
            console.log('🛡️ 파싱된 안전교육 현황 데이터:', safetyEducationData)
          } else {
            console.log('🛡️ 해당 유치원의 안전교육 현황 데이터를 찾을 수 없음')
          }
        } else {
          console.log('🛡️ 안전교육 현황 API 응답이 없거나 실패:', comprehensiveData.safetyInstruct)
        }
        
        // 교사 정보 파싱
        let teachersData: any = {}
        if (comprehensiveData.teacher && comprehensiveData.teacher.status === 'SUCCESS' && comprehensiveData.teacher.kinderInfo?.length > 0) {
          const teacherInfo = comprehensiveData.teacher.kinderInfo.find((item: any) => item.kindercode === kindercode)
          if (teacherInfo) {
            teachersData = {
              principal: parseInt(teacherInfo.drcnt) || 0, // 원장수
              vicePrincipal: parseInt(teacherInfo.adcnt) || 0, // 원감수
              generalTeacher: parseInt(teacherInfo.gnrl_thcnt) || 0, // 일반교사수
              specialTeacher: parseInt(teacherInfo.spcn_thcnt) || 0, // 특수교사수
              healthTeacher: parseInt(teacherInfo.ntcnt) || 0, // 보건교사수
              nutritionTeacher: parseInt(teacherInfo.ntrt_thcnt) || 0, // 영양교사수
              contractTeacher: parseInt(teacherInfo.shcnt_thcnt) || 0, // 기간제교사/강사수
              staff: parseInt(teacherInfo.owcnt) || 0 // 사무직원수
            }
          }
        }
        
        // 근속연수현황 정보 파싱
        if (comprehensiveData.yearOfWork && comprehensiveData.yearOfWork.status === 'SUCCESS' && comprehensiveData.yearOfWork.kinderInfo?.length > 0) {
          const yearOfWorkInfo = comprehensiveData.yearOfWork.kinderInfo.find((item: any) => item.kindercode === kindercode)
          if (yearOfWorkInfo) {
            teachersData = {
              ...teachersData,
              yy1UndrThcnt: parseInt(yearOfWorkInfo.yy1_undr_thcnt) || 0, // 1년미만교사수
              yy1AbvYy2UndrThcnt: parseInt(yearOfWorkInfo.yy1_abv_yy2_undr_thcnt) || 0, // 1년이상2년미만교사수
              yy2AbvYy4UndrThcnt: parseInt(yearOfWorkInfo.yy2_abv_yy4_undr_thcnt) || 0, // 2년이상4년미만교사수
              yy4AbvYy6UndrThcnt: parseInt(yearOfWorkInfo.yy4_abv_yy6_undr_thcnt) || 0, // 4년이상6년미만교사수
              yy6AbvThcnt: parseInt(yearOfWorkInfo.yy6_abv_thcnt) || 0 // 6년이상교사수
            }
          }
        }
        
        // 안전점검 현황 정보 파싱
        if (comprehensiveData.safetyEdu && comprehensiveData.safetyEdu.status === 'SUCCESS' && comprehensiveData.safetyEdu.kinderInfo?.length > 0) {
          const safetyEduInfo = comprehensiveData.safetyEdu.kinderInfo.find((item: any) => item.kindercode === kindercode)
          if (safetyEduInfo) {
            safetyData = {
              ...safetyData,
              fireAvdYn: safetyEduInfo.fire_avd_yn, // 소방대피훈련여부
              fireAvdDt: safetyEduInfo.fire_avd_dt, // 소방대피훈련일자
              gasCkYn: safetyEduInfo.gas_ck_yn, // 가스점검여부
              gasCkDt: safetyEduInfo.gas_ck_dt, // 가스점검일자
              fireSafeYn: safetyEduInfo.fire_safe_yn, // 소방안전점검여부
              fireSafeDt: safetyEduInfo.fire_safe_dt, // 소방안전점검일자
              electCkYn: safetyEduInfo.elect_ck_yn, // 전기설비점검여부
              electCkDt: safetyEduInfo.elect_ck_dt, // 전기설비점검일자
              plygCkYn: safetyEduInfo.plyg_ck_yn, // 놀이시설 안전검사 대상여부
              plygCkDt: safetyEduInfo.plyg_ck_dt, // 놀이시설 안전검사 점검일자
              plygCkRsCd: safetyEduInfo.plyg_ck_rs_cd, // 놀이시설 안전검사 점검결과
              cctvIstYn: safetyEduInfo.cctv_ist_yn, // CCTV 설치여부
              cctvIstTotal: parseInt(safetyEduInfo.cctv_ist_total) || 0, // CCTV 총 설치수
              cctvIstIn: parseInt(safetyEduInfo.cctv_ist_in) || 0, // CCTV 건물 안 설치수
              cctvIstOut: parseInt(safetyEduInfo.cctv_ist_out) || 0 // CCTV 건물 밖 설치수
            }
          }
        }
        
        // 실제 교사 수 계산 (원장, 원감, 사무직원 제외한 교사만)
        const actualTeacherCount = teachersData.generalTeacher + teachersData.specialTeacher + 
                                 teachersData.healthTeacher + teachersData.nutritionTeacher + 
                                 teachersData.contractTeacher
        
        if (actualTeacherCount > 0) {
          teacherCount = actualTeacherCount
          ratio = `1:${Math.round(enrolled / Math.max(1, teacherCount))}`
        }
        
        const detailData: KindergartenDetailSummary = {
          id: kindercode,
          name: basic.kindername || '유치원',
          type: getEstablishmentType(basic.establish) as '공립' | '사립' | '법인' | '국공립',
          address: basic.addr || '주소 정보 없음',
          phone: basic.telno || undefined,
          capacity,
          enrolled,
          classCount,
          teacherCount,
          ratio,
          safety: safetyData,
          hygiene: hygieneData,
          meal: mealData,
          bus: busData,
          afterSchool: afterSchoolData,
          safetyEducation: safetyEducationData,
          teachers: teachersData,
          lastSyncedAt: new Date().toISOString(),
          // 추가 정보
          rppnname: (basic as any).rppnname || '',
          ldgrname: (basic as any).ldgrname || '',
          edate: (basic as any).edate || '',
          odate: (basic as any).odate || ''
        }
        
        // 3. 커스텀 정보 추가 (테이블에서 조회)
        try {
          const { supabase } = await import('../lib/supabase')
          const { data: customData } = await supabase
            .from('kindergarten_custom_info')
            .select('building_images, meal_images')
            .eq('kinder_code', kindercode)
            .eq('is_active', true)
            .maybeSingle()
          
          if (customData) {
            detailData.customInfo = {
              building_images: customData.building_images || [],
              meal_images: customData.meal_images || []
            }
            console.log('✅ 커스텀 정보 추가 (API 로드):', detailData.customInfo)
          }
        } catch (customError) {
          console.log('커스텀 정보 없음:', customError)
        }
        
        // 4. 캐시에 저장 (비동기, 실패해도 데이터는 반환)
        detailCacheManager.saveDetailCache(kindercode, detailData).catch(error => {
          console.warn('캐시 저장 실패:', error)
        })
        
        console.log('✅ API에서 상세 정보 로드 및 캐시 저장:', kindercode)
        return detailData
      } else {
        console.warn('API 응답에 유치원 정보가 없습니다:', generalInfo)
        
        // 다른 유치원 코드로 테스트 (실제 데이터가 있는 코드들)
        const testCodes = [
          '1ecec08c-ffcd-b044-e053-0a32095ab044', // 현재 코드
          'b0005379-c35f-4cdf-8d60-e1c2bd49b158', // 다른 형식 코드
          'b0005379-c35f-4cdf-8d60-e1c2bd49b159', // 다른 형식 코드
          'b0005379-c35f-4cdf-8d60-e1c2bd49b160', // 다른 형식 코드
          '1114010001', // 숫자 형식 코드
          '1114010002', // 숫자 형식 코드
          '1114010003', // 숫자 형식 코드
        ]
        
        console.log('다른 유치원 코드로 테스트 시도...')
        for (const testCode of testCodes) {
          if (testCode !== kindercode) {
            try {
              const testInfo = await fetchGeneralInfo(testCode)
              if (testInfo && testInfo.kinderInfo && Array.isArray(testInfo.kinderInfo) && testInfo.kinderInfo.length > 0) {
                console.log(`✅ 테스트 코드 ${testCode}에서 데이터 발견:`, testInfo.kinderInfo[0])
                break
              }
            } catch (testError) {
              console.log(`테스트 코드 ${testCode} 실패:`, testError)
            }
          }
        }
      }
    } catch (apiError) {
      console.warn('API 호출 실패:', apiError)
    }
    
    // 4. API 실패 시 샘플 데이터 반환 (캐시 저장하지 않음)
    console.log('⚠️ API 실패, 샘플 데이터 사용:', kindercode)
    console.log('현재 유치원 코드가 교육부 API에서 제공되지 않을 수 있습니다.')
    const sampleData: KindergartenDetailSummary = {
      id: kindercode,
      name: `유치원 (${kindercode.slice(-4)})`,
      type: '사립',
      address: '주소 정보를 불러올 수 없습니다',
      capacity: 0,
      enrolled: 0,
      classCount: 0,
      teacherCount: 0,
      ratio: '미상',
      safety: {
        lastCheckDate: undefined,
        issues: 0,
        status: '미상'
      },
      hygiene: {
        lastCheckDate: undefined,
        status: '미상'
      },
      meal: {
        mode: '미상',
        hasDietitian: false
      },
      bus: {
        inOperation: false,
        vehicleCount: 0,
        hasGuardian: false
      },
      afterSchool: {
        inOperation: false,
        programs: [],
        operatingHours: ''
      },
      lastSyncedAt: new Date().toISOString()
    }
    
    return sampleData
    
  } catch (error) {
    console.error('유치원 상세 정보 조회 오류:', error)
    return null
  } finally {
    // 요청 완료 후 Map에서 제거
    pendingRequests.delete(requestKey)
  }
  })()

  // Promise를 Map에 저장하고 반환
  pendingRequests.set(requestKey, requestPromise)
  return await requestPromise
}

// 기본 정보 파싱
export const parseBasicInfo = (generalInfo: GeneralInfoResponse, buildingInfo?: BuildingInfoResponse): BasicInfo => {
  const basic = generalInfo.kinderInfo[0]
  const building = buildingInfo?.kinderInfo?.[0]
  
  return {
    establishment: basic.kindername,
    establishmentType: getEstablishmentType(basic.establish),
    capacity: parseInt(basic.prmstfcnt) || 0,
    enrolled: (parseInt(basic.ag3fpcnt) || 0) + (parseInt(basic.ag4fpcnt) || 0) + (parseInt(basic.ag5fpcnt) || 0),
    classCount: (parseInt(basic.ag3fpcnt) || 0) + (parseInt(basic.ag4fpcnt) || 0) + (parseInt(basic.ag5fpcnt) || 0),
    address: basic.addr,
    phone: basic.telno,
    website: basic.hpaddr,
    buildingInfo: building ? {
      floors: parseInt(building.floorcnt) || undefined,
      playground: building.playground === 'Y',
      classroomCount: parseInt(building.classroomcnt) || undefined
    } : undefined
  }
}

// 교사 정보 파싱
export const parseTeacherInfo = (teacherInfo: TeacherInfoResponse, generalInfo: GeneralInfoResponse): TeacherInfo => {
  const basic = generalInfo.kinderInfo[0]
  const enrolled = (parseInt(basic.ag3fpcnt) || 0) + (parseInt(basic.ag4fpcnt) || 0) + (parseInt(basic.ag5fpcnt) || 0)
  
  const teacherCount = teacherInfo.kinderInfo.reduce((sum, teacher) => sum + parseInt(teacher.cnt), 0)
  const ratio = `1:${Math.round(enrolled / Math.max(1, teacherCount))}`
  
  return {
    teacherCount,
    studentCount: enrolled,
    ratio,
    teacherDetails: teacherInfo.kinderInfo.map(teacher => ({
      position: teacher.position,
      qualification: teacher.qualification,
      count: parseInt(teacher.cnt)
    }))
  }
}

// 급식 정보 파싱
export const parseMealInfo = (mealInfo: MealInfoResponse): MealInfo => {
  const meal = mealInfo.kinderInfo[0]
  
  return {
    mode: meal.mealtype === '자체급식' ? '자체' : '위탁' as '자체' | '위탁' | '미상',
    hasDietitian: meal.dietitian === 'Y'
  }
}

// 통학차량 정보 파싱
export const parseTransportationInfo = (transportationInfo: TransportationInfoResponse): TransportationInfo => {
  const transport = transportationInfo.kinderInfo[0]
  
  return {
    inOperation: transport.busoperation === 'Y',
    vehicleCount: parseInt(transport.buscnt) || 0,
    hasGuardian: transport.guardian === 'Y'
  }
}

// 안전 정보 파싱
export const parseSafetyInfo = (environmentHygieneInfo: SafetyInfoResponse, safetyEducationInfo: SafetyInfoResponse): SafetyInfo => {
  const hygiene = environmentHygieneInfo.kinderInfo[0]
  const education = safetyEducationInfo.kinderInfo[0]
  
  return {
    environmentHygiene: {
      lastCheckDate: hygiene?.checkdate,
      status: hygiene?.result === '적합' ? '적합' : '조치' as '적합' | '조치' | '미상',
      details: hygiene?.details
    },
    safetyCheck: {
      lastCheckDate: hygiene?.checkdate,
      issues: hygiene?.result === '조치' ? 1 : 0,
      details: hygiene?.details
    },
    safetyEducation: {
      lastEducationDate: education?.checkdate,
      frequency: education ? 1 : 0,
      details: education?.details
    }
  }
}

// 보험 정보 파싱
export const parseInsuranceInfo = (deductionSocietyInfo: InsuranceInfoResponse, insuranceInfo: InsuranceInfoResponse): InsuranceInfo => {
  const deduction = deductionSocietyInfo.kinderInfo[0]
  const insurance = insuranceInfo.kinderInfo[0]
  
  return {
    deductionSociety: {
      joined: deduction?.joined === 'Y',
      details: deduction?.details
    },
    insurance: {
      types: insuranceInfo.kinderInfo.map(ins => ({
        name: ins.insurancetype,
        joined: ins.joined === 'Y',
        details: ins.details
      }))
    }
  }
}

// 운영 정보 파싱
export const parseOperationInfo = (afterSchoolInfo: AfterSchoolInfoResponse, lessonDaysInfo?: any): OperationInfo => {
  return {
    lessonDays: {
      totalDays: lessonDaysInfo?.kinderInfo?.[0]?.totalDays,
      details: lessonDaysInfo?.kinderInfo?.[0]?.details
    },
    afterSchool: {
      inOperation: afterSchoolInfo.kinderInfo.length > 0,
      programs: afterSchoolInfo.kinderInfo.map(program => ({
        name: program.programname,
        operatingHours: program.operatingtime,
        details: program.details
      }))
    }
  }
}

// 캐시 관리 유틸리티 함수들
export const getDetailCacheStats = () => detailCacheManager.getDetailCacheStats()
export const clearDetailCache = (kindercode: string) => detailCacheManager.deleteDetailCache(kindercode)
export const cleanupDetailCache = () => detailCacheManager.cleanupOldDetailCache()
export const getDetailCacheMetadata = (kindercode: string) => detailCacheManager.getCacheMetadata(kindercode)
