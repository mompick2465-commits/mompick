// 전국어린이집 포털 API 연동 유틸리티
// API 정보: http://api.childcare.go.kr/mediate/rest/cpmsapi021/cpmsapi021/request
// 인증키: 0e5ed5cfc4c24c2fa8e2cd14558a1688

import { getGeocodingWithCache, normalizeAddress } from './geocodingCache'
import { supabase } from '../lib/supabase'

export interface ChildcarePortalApiResponse {
  stcode: string
  crname: string
  crtelno: string
  crfaxno: string
  craddr: string
  crhome: string
  crcapat: number
}

export interface ChildcareInfo {
  // 기본 정보
  crname: string // 어린이집명
  crtypename: string // 어린이집 유형명
  crstatus: string // 운영상태
  crtelno: string // 전화번호
  craddr: string // 주소
  crpostno: string // 우편번호
  
  // 위치 정보
  lttdcdnt: string // 위도
  lngtcdnt: string // 경도
  
  // 운영 정보
  crcapat: string // 정원
  crchcnt: string // 현재원아수
  crspec: string // 특별지원사항
  crspecdt: string // 특별지원사항 상세
  
  // 시설 정보
  crfaclt: string // 시설현황
  crfacltdt: string // 시설현황 상세
  crfacltetc: string // 기타시설
  
  // 운영시간
  crtime: string // 운영시간
  crtimeetc: string // 운영시간 기타
  
  // 기타 정보
  crurl: string // 홈페이지
  crfaxno: string // 팩스번호
  crceoname: string // 원장명
  crceotellno: string // 원장 연락처
  
  // 지역 정보
  sidoname: string // 시도명
  sigunname: string // 시군구명
  dongname: string // 읍면동명
  
  // 코드 정보
  crcode: string // 어린이집코드
  crtype: string // 어린이집유형코드
  sido: string // 시도코드
  sigun: string // 시군구코드
  dong: string // 읍면동코드
}


/**
 * 전국어린이집 포털 API에서 어린이집 정보를 조회합니다.
 * @param arcode 시군구코드 (필수)
 * @returns 어린이집 정보 배열
 */
export async function fetchChildcareData(arcode: string): Promise<ChildcareInfo[]> {
  try {
    // Supabase Edge Function을 통한 API 호출
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase URL이 설정되지 않았습니다.')
    }

    const functionUrl = `${supabaseUrl}/functions/v1/childcare-api`
    
    console.log('어린이집 Edge Function 호출:', functionUrl)
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'fetch',
        arcode: arcode
      })
    })

    if (!response.ok) {
      throw new Error(`Edge Function 호출 실패: ${response.status}`)
    }

    const data = await response.json()
    console.log('Edge Function 응답:', data)

    if (data.error) {
      throw new Error(data.error)
    }

    if (data.success && data.data) {
      return data.data.map(transformChildcareData)
    }

    return []

  } catch (error) {
    console.error('전국어린이집 포털 API 호출 오류:', error)
    throw new Error(`어린이집 정보를 가져오는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  }
}


/**
 * API 데이터를 앱에서 사용하는 형식으로 변환합니다.
 * @param item API에서 받은 원본 데이터
 * @returns 변환된 어린이집 정보
 */
const transformChildcareData = (item: any): ChildcareInfo => {
  console.log('🔄 transformChildcareData 시작:', item)
  console.log('🆔 stcode 값:', item.stcode)
  console.log('🏢 arcode 값:', item.arcode)
  
  return {
    // 기본 정보 (Edge Function에서 변환된 필드명 사용)
    crname: item.crname || '',
    crtypename: '민간', // 기본값 설정
    crstatus: '정상', // 기본값 설정
    crtelno: item.crtelno || '',
    craddr: item.craddr || '',
    crpostno: '', // API에서 제공하지 않음
    
    // 위치 정보 (API에서 제공하지 않음)
    lttdcdnt: '',
    lngtcdnt: '',
    
    // 운영 정보
    crcapat: item.crcapat ? item.crcapat.toString() : '0',
    crchcnt: '0', // 기본값 설정
    crspec: '일반보육', // 기본값 설정
    crspecdt: '', // API에서 제공하지 않음
    
    // 시설 정보 (API에서 제공하지 않음)
    crfaclt: '',
    crfacltdt: '',
    crfacltetc: '',
    
    // 운영시간 (API에서 제공하지 않음)
    crtime: '',
    crtimeetc: '',
    
    // 기타 정보
    crurl: item.crhome || '',
    crfaxno: item.crfaxno || '',
    crceoname: '', // API에서 제공하지 않음
    crceotellno: '', // API에서 제공하지 않음
    
    // 지역 정보 (API에서 제공하지 않음)
    sidoname: '',
    sigunname: '',
    dongname: '',
    
    // 코드 정보 - stcode가 핵심!
    crcode: item.stcode || '',
    crtype: '', // API에서 제공하지 않음
    sido: '', // API에서 제공하지 않음
    sigun: item.arcode || '', // arcode 사용
    dong: '' // API에서 제공하지 않음
  }
}

/**
 * 위도/경도로 근처 어린이집을 검색합니다.
 * @param lat 위도
 * @param lng 경도
 * @param radius 반경 (km, 기본값: 5)
 * @returns 근처 어린이집 정보 배열
 */
export async function fetchNearbyChildcare(
  lat: number, 
  lng: number, 
  radius: number = 5
): Promise<ChildcareInfo[]> {
  try {
    // 캐시 기반 역지오코딩으로 시군구코드 찾기
    const { reverseGeocodeWithCache } = await import('./geocodingCache')
    const regionResult = await reverseGeocodeWithCache(lat, lng)
    
    const arcode = regionResult?.childcareArcode || findArcodeByLatLng(lat, lng)
    console.log('위치 기반 시군구코드:', arcode, `(${regionResult?.sidoName} ${regionResult?.sggName})`)
    
    // 해당 시군구의 어린이집 데이터 조회 (이미 변환됨)
    const childcareData = await fetchChildcareData(arcode)
    console.log('받은 어린이집 데이터:', childcareData.length, '개')
    
    // 거리 계산하여 필터링 (위치 정보가 없는 경우 전체 반환)
    const nearbyData = childcareData.filter(item => {
      const itemLat = parseFloat(item.lttdcdnt)
      const itemLng = parseFloat(item.lngtcdnt)
      
      // 위치 정보가 없으면 포함
      if (isNaN(itemLat) || isNaN(itemLng) || itemLat === 0 || itemLng === 0) {
        return true
      }
      
      const distance = calculateDistance(lat, lng, itemLat, itemLng)
      return distance <= radius
    })
    
    console.log('필터링된 어린이집 데이터:', nearbyData.length, '개')
    return nearbyData
  } catch (error) {
    console.error('근처 어린이집 검색 오류:', error)
    return []
  }
}

/**
 * 지역별 어린이집을 검색합니다.
 * @param arcode 시군구코드
 * @returns 어린이집 정보 배열
 */
export async function fetchChildcareByRegion(arcode: string): Promise<ChildcareInfo[]> {
  try {
    return await fetchChildcareData(arcode)
  } catch (error) {
    console.error('지역별 어린이집 검색 오류:', error)
    return []
  }
}

/**
 * 위도/경도로 시군구코드를 찾습니다.
 * @param lat 위도
 * @param lng 경도
 * @returns 시군구코드
 */
const findArcodeByLatLng = (lat: number, lng: number): string => {
  // 서울시 지역별 시군구코드 매핑
  // 서울시 강남구: 11680
  if (lat >= 37.49 && lat <= 37.56 && lng >= 127.02 && lng <= 127.13) {
    return '11680' // 서울시 강남구
  }
  
  // 서울시 서초구: 11650
  if (lat >= 37.47 && lat <= 37.52 && lng >= 126.95 && lng <= 127.05) {
    return '11650' // 서울시 서초구
  }
  
  // 서울시 중구: 11140
  if (lat >= 37.55 && lat <= 37.65 && lng >= 126.95 && lng <= 127.1) {
    return '11140' // 서울시 중구
  }
  
  // 서울시 종로구: 11110
  if (lat >= 37.57 && lat <= 37.61 && lng >= 126.96 && lng <= 127.03) {
    return '11110' // 서울시 종로구
  }
  
  // 서울시 용산구: 11170
  if (lat >= 37.52 && lat <= 37.56 && lng >= 126.96 && lng <= 127.02) {
    return '11170' // 서울시 용산구
  }
  
  // 서울시 성동구: 11200
  if (lat >= 37.55 && lat <= 37.58 && lng >= 127.02 && lng <= 127.08) {
    return '11200' // 서울시 성동구
  }
  
  // 서울시 광진구: 11215
  if (lat >= 37.53 && lat <= 37.58 && lng >= 127.08 && lng <= 127.12) {
    return '11215' // 서울시 광진구
  }
  
  // 서울시 동대문구: 11230
  if (lat >= 37.57 && lat <= 37.61 && lng >= 127.03 && lng <= 127.08) {
    return '11230' // 서울시 동대문구
  }
  
  // 서울시 중랑구: 11260
  if (lat >= 37.59 && lat <= 37.65 && lng >= 127.08 && lng <= 127.15) {
    return '11260' // 서울시 중랑구
  }
  
  // 서울시 성북구: 11290
  if (lat >= 37.59 && lat <= 37.65 && lng >= 127.00 && lng <= 127.10) {
    return '11290' // 서울시 성북구
  }
  
  // 서울시 강북구: 11305
  if (lat >= 37.64 && lat <= 37.68 && lng >= 127.00 && lng <= 127.05) {
    return '11305' // 서울시 강북구
  }
  
  // 서울시 도봉구: 11320
  if (lat >= 37.66 && lat <= 37.70 && lng >= 127.03 && lng <= 127.08) {
    return '11320' // 서울시 도봉구
  }
  
  // 서울시 노원구: 11350
  if (lat >= 37.64 && lat <= 37.70 && lng >= 127.05 && lng <= 127.12) {
    return '11350' // 서울시 노원구
  }
  
  // 서울시 은평구: 11380
  if (lat >= 37.60 && lat <= 37.66 && lng >= 126.90 && lng <= 127.00) {
    return '11380' // 서울시 은평구
  }
  
  // 서울시 서대문구: 11410
  if (lat >= 37.56 && lat <= 37.60 && lng >= 126.90 && lng <= 126.96) {
    return '11410' // 서울시 서대문구
  }
  
  // 서울시 마포구: 11440
  if (lat >= 37.52 && lat <= 37.58 && lng >= 126.90 && lng <= 126.96) {
    return '11440' // 서울시 마포구
  }
  
  // 서울시 양천구: 11470
  if (lat >= 37.51 && lat <= 37.55 && lng >= 126.83 && lng <= 126.90) {
    return '11470' // 서울시 양천구
  }
  
  // 서울시 강서구: 11500
  if (lat >= 37.54 && lat <= 37.58 && lng >= 126.80 && lng <= 126.90) {
    return '11500' // 서울시 강서구
  }
  
  // 서울시 구로구: 11530
  if (lat >= 37.48 && lat <= 37.52 && lng >= 126.85 && lng <= 126.95) {
    return '11530' // 서울시 구로구
  }
  
  // 서울시 금천구: 11545
  if (lat >= 37.45 && lat <= 37.50 && lng >= 126.90 && lng <= 126.95) {
    return '11545' // 서울시 금천구
  }
  
  // 서울시 영등포구: 11560
  if (lat >= 37.50 && lat <= 37.55 && lng >= 126.90 && lng <= 126.95) {
    return '11560' // 서울시 영등포구
  }
  
  // 서울시 동작구: 11590
  if (lat >= 37.48 && lat <= 37.52 && lng >= 126.95 && lng <= 127.02) {
    return '11590' // 서울시 동작구
  }
  
  // 서울시 관악구: 11620
  if (lat >= 37.45 && lat <= 37.50 && lng >= 126.95 && lng <= 127.02) {
    return '11620' // 서울시 관악구
  }
  
  // 서울시 송파구: 11710
  if (lat >= 37.49 && lat <= 37.55 && lng >= 127.10 && lng <= 127.18) {
    return '11710' // 서울시 송파구
  }
  
  // 서울시 강동구: 11740
  if (lat >= 37.52 && lat <= 37.58 && lng >= 127.12 && lng <= 127.20) {
    return '11740' // 서울시 강동구
  }
  
  // 기본값: 서울시 강남구 (어린이집이 많은 지역)
  console.log('위치 매핑 실패, 강남구로 fallback:', lat, lng)
  return '11680'
}

/**
 * 어린이집명으로 검색합니다.
 * @param crname 어린이집명
 * @returns 어린이집 정보 배열
 */
export async function searchChildcareByName(crname: string): Promise<ChildcareInfo[]> {
  try {
    // 이름으로 검색은 API에서 지원하지 않으므로 빈 배열 반환
    console.warn('어린이집명 검색은 API에서 지원하지 않습니다.')
    return []
  } catch (error) {
    console.error('어린이집명 검색 오류:', error)
    return []
  }
}

// 기존 geocodeAddress 함수는 geocodingCache.ts의 getGeocodingWithCache로 대체됨

/**
 * 두 지점 간의 거리를 계산합니다 (하버사인 공식).
 * @param lat1 첫 번째 지점의 위도
 * @param lng1 첫 번째 지점의 경도
 * @param lat2 두 번째 지점의 위도
 * @param lng2 두 번째 지점의 경도
 * @returns 거리 (km)
 */
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // 지구의 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * 어린이집 정보를 지도용 데이터로 변환합니다.
 * @param childcare 어린이집 정보
 * @param currentLat 현재 위치 위도 (거리 계산용)
 * @param currentLng 현재 위치 경도 (거리 계산용)
 * @param metaArcode 메타데이터의 arcode (시군구코드)
 * @returns 지도용 데이터
 */
export async function transformToMapData(
  childcare: ChildcareInfo, 
  currentLat?: number, 
  currentLng?: number,
  metaArcode?: string
) {
  console.log('🔄 transformToMapData 시작:', childcare.crname, childcare.crcode)
  
  // 어린이집 API에서는 위치 정보가 제공되지 않으므로 주소 기반으로 지오코딩
  let lat = parseFloat(childcare.lttdcdnt)
  let lng = parseFloat(childcare.lngtcdnt)
  
  // 위치 정보가 없으면 캐시 시스템 기반 지오코딩으로 실제 좌표 획득
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    const address = childcare.craddr || ''
    console.log(`캐시 기반 지오코딩 시도: ${childcare.crname} - ${address}`)
    
    try {
      const coords = await getGeocodingWithCache(address)
      if (coords) {
        lat = coords.lat
        lng = coords.lng
        console.log(`캐시 지오코딩 성공: ${childcare.crname} -> ${lat}, ${lng}`)
      } else {
        // 지오코딩 실패시 지역별 기본 좌표 사용
        console.log(`캐시 지오코딩 실패: ${childcare.crname}, 기본 좌표 사용`)
        if (address.includes('강남구')) {
          lat = 37.5172 + (Math.random() - 0.5) * 0.02
          lng = 127.0473 + (Math.random() - 0.5) * 0.02
        } else if (address.includes('서초구')) {
          lat = 37.4945 + (Math.random() - 0.5) * 0.02
          lng = 127.0256 + (Math.random() - 0.5) * 0.02
        } else if (address.includes('중구')) {
          lat = 37.5636 + (Math.random() - 0.5) * 0.02
          lng = 126.9970 + (Math.random() - 0.5) * 0.02
        } else if (address.includes('용산구')) {
          lat = 37.5384 + (Math.random() - 0.5) * 0.02
          lng = 126.9654 + (Math.random() - 0.5) * 0.02
        } else if (address.includes('성동구')) {
          lat = 37.5633 + (Math.random() - 0.5) * 0.02
          lng = 127.0366 + (Math.random() - 0.5) * 0.02
        } else {
          // 기본값: 서울시 중심
          lat = 37.5665 + (Math.random() - 0.5) * 0.1
          lng = 126.9780 + (Math.random() - 0.5) * 0.1
        }
      }
    } catch (error) {
      console.error(`캐시 지오코딩 오류 (${childcare.crname}):`, error)
      // 오류시 기본 좌표 사용
      lat = 37.5665 + (Math.random() - 0.5) * 0.1
      lng = 126.9780 + (Math.random() - 0.5) * 0.1
    }
  }
  
  // id 설정 - crcode가 있으면 사용, 없으면 name 기반으로 생성
  const id = childcare.crcode && childcare.crcode.trim() !== '' 
    ? childcare.crcode 
    : `childcare_${childcare.crname.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log('🆔 어린이집 ID 설정:', childcare.crname, '->', id)
  console.log('🔄 원본 데이터 - crcode:', childcare.crcode, 'sigun:', childcare.sigun)
  console.log('🔄 sigun 타입:', typeof childcare.sigun, '길이:', childcare.sigun?.length)
  console.log('🔄 metaArcode:', metaArcode)
  

  // sggCode 설정 - sigun이 비어있으면 metaArcode 사용
  const sggCode = parseInt(childcare.sigun) || parseInt(metaArcode || '') || 0
  console.log('🏢 sggCode 설정:', childcare.sigun, 'metaArcode:', metaArcode, '->', sggCode)
  
  const result = {
    id: id,
    code: childcare.crcode,
    name: childcare.crname,
    address: childcare.craddr,
    lat: lat,
    lng: lng,
    type: 'childcare' as const,
    establishment: childcare.crtypename,
    officeedu: childcare.sidoname + ' ' + childcare.sigunname,
    telno: childcare.crtelno,
    opertime: childcare.crtime,
    prmstfcnt: parseInt(childcare.crcapat) || 0,
    ag3fpcnt: 0, // API에서 제공하지 않음
    ag4fpcnt: 0, // API에서 제공하지 않음
    ag5fpcnt: 0, // API에서 제공하지 않음
    hpaddr: childcare.crurl,
    rating: 0.0, // 부모들이 별점을 남기면 그걸 기반으로 할 예정
    distance: currentLat && currentLng 
      ? calculateDistance(currentLat, currentLng, lat, lng)
      : 0,
    image: undefined,
    // 지역 정보
    sidoCode: parseInt(childcare.sido) || 0,
    sggCode: sggCode,
    // 추가 정보
    crcode: childcare.crcode,
    crtype: childcare.crtype,
    crstatus: childcare.crstatus,
    crceoname: childcare.crceoname,
    crceotellno: childcare.crceotellno,
    crspec: childcare.crspec,
    crfaclt: childcare.crfaclt
  }
  
  // 커스텀 이미지(건물사진 1번) 조회하여 이미지 설정
  try {
    if (childcare.crcode) {
      const { data: customInfo } = await supabase
        .from('childcare_custom_info')
        .select('building_images')
        .eq('facility_code', childcare.crcode)
        .maybeSingle()
      if (customInfo && Array.isArray(customInfo.building_images) && customInfo.building_images.length > 0) {
        result.image = customInfo.building_images[0]
      }
    }
  } catch (e) {
    console.warn('어린이집 커스텀 이미지 조회 실패:', e)
  }

  console.log('✅ transformToMapData 완료:', result.name, 'type:', result.type, 'id:', result.id)
  return result
}
