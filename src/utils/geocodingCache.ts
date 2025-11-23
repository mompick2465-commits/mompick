// 지오코딩 캐시 시스템 - 타일 기반 역지오코딩 + 주소 기반 지오코딩
import { supabase } from '../lib/supabase'

// 간단한 지오해시 구현 (precision 6 ≈ 1.2km 타일)
class SimpleGeohash {
  private static base32 = '0123456789bcdefghjkmnpqrstuvwxyz'
  
  static encode(lat: number, lng: number, precision: number = 6): string {
    let latRange = [-90.0, 90.0]
    let lngRange = [-180.0, 180.0]
    let geohash = ''
    let bits = 0
    let bit = 0
    let even = true
    
    while (geohash.length < precision) {
      if (even) {
        const mid = (lngRange[0] + lngRange[1]) / 2
        if (lng >= mid) {
          bit = (bit << 1) + 1
          lngRange[0] = mid
        } else {
          bit = bit << 1
          lngRange[1] = mid
        }
      } else {
        const mid = (latRange[0] + latRange[1]) / 2
        if (lat >= mid) {
          bit = (bit << 1) + 1
          latRange[0] = mid
        } else {
          bit = bit << 1
          latRange[1] = mid
        }
      }
      
      even = !even
      
      if (++bits === 5) {
        geohash += this.base32[bit]
        bits = 0
        bit = 0
      }
    }
    
    return geohash
  }
}

// 타일 키 생성 함수
export function getTileKey(lat: number, lng: number, precision: number = 6): string {
  return SimpleGeohash.encode(lat, lng, precision)
}

// 주소 정규화 함수
export function normalizeAddress(address: string): string {
  if (!address) return ''
  
  return address
    .replace(/\s+/g, ' ')                    // 연속 공백을 하나로
    .replace(/\([^)]*\)/g, '')               // 괄호 내용 제거
    .replace(/\d+동\s*\d+호.*$/g, '')        // 동호수 제거
    .replace(/\d+층.*$/g, '')                // 층수 제거
    .replace(/,\s*$/, '')                    // 끝의 쉼표 제거
    .trim()
}

// 역지오코딩 인터페이스
export interface ReverseGeocodingResult {
  tilKey: string
  hcode: string
  sidoName: string
  sggName: string
  dongName: string
  addressName: string
  kindergartenSidoCode: number
  kindergartenSggCode: number
  childcareArcode: string
}

// 지오코딩 인터페이스
export interface GeocodingResult {
  lat: number
  lng: number
  provider: string
  accuracy?: string
  addressType?: string
}

/**
 * 카카오 역지오코딩 API 호출
 */
async function callKakaoReverseGeocode(lat: number, lng: number): Promise<any> {
  const KAKAO_REST_KEY = process.env.REACT_APP_KAKAO_REST_KEY
  if (!KAKAO_REST_KEY) {
    throw new Error('카카오 REST API 키가 설정되지 않았습니다.')
  }

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
    {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_REST_KEY}`
      }
    }
  )

  if (!response.ok) {
    throw new Error(`카카오 역지오코딩 API 오류: ${response.status}`)
  }

  return await response.json()
}

/**
 * 카카오 지오코딩 API 호출
 */
async function callKakaoGeocode(address: string): Promise<any> {
  const KAKAO_REST_KEY = process.env.REACT_APP_KAKAO_REST_KEY
  if (!KAKAO_REST_KEY) {
    throw new Error('카카오 REST API 키가 설정되지 않았습니다.')
  }

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
    {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_REST_KEY}`
      }
    }
  )

  if (!response.ok) {
    throw new Error(`카카오 지오코딩 API 오류: ${response.status}`)
  }

  return await response.json()
}

/**
 * 타일 기반 역지오코딩 (GPS 위치 → 행정구역)
 * 캐시 우선, 없으면 API 호출 후 저장
 */
export async function getReverseGeocodingWithCache(
  lat: number, 
  lng: number
): Promise<ReverseGeocodingResult | null> {
  try {
    // 1. 타일 키 생성
    const tileKey = getTileKey(lat, lng, 6)
    console.log(`역지오코딩 타일 키: ${tileKey} (${lat}, ${lng})`)

    // 2. 캐시 확인
    const { data: cached, error: cacheError } = await supabase
      .from('rgc_cache')
      .select('*')
      .eq('tile_key', tileKey)
      .maybeSingle()

    // 캐시 사용 (히트 시 외부 API 호출 없음)
    if (!cacheError && cached) {
      console.log(`🎯 역지오코딩 캐시 히트! (${tileKey}) →`, cached.sido_name, cached.sgg_name)
      return {
        tilKey: cached.tile_key,
        hcode: cached.hcode,
        sidoName: cached.sido_name,
        sggName: cached.sgg_name,
        dongName: cached.dong_name,
        addressName: cached.address_name,
        kindergartenSidoCode: cached.kindergarten_sido_code,
        kindergartenSggCode: cached.kindergarten_sgg_code,
        childcareArcode: cached.childcare_arcode
      }
    }

    // 3. 캐시 없으면 카카오 API 호출
    if (cacheError) {
      if (cacheError.code === 'PGRST116') {
        console.log(`📍 역지오코딩 캐시 없음 (${tileKey}) - 새로 저장 예정`)
      } else if (cacheError.code === '406' || cacheError.message?.includes('406')) {
        console.log(`📍 역지오코딩 캐시 조회 실패 (RLS) (${tileKey}) - 새로 저장 예정`)
      } else {
        console.warn('역지오코딩 캐시 조회 오류:', cacheError.code, cacheError.message)
      }
    }
    console.log(`🔄 역지오코딩 API 호출 시작 (${tileKey})`)
    const apiResult = await callKakaoReverseGeocode(lat, lng)
    
    if (!apiResult.documents || apiResult.documents.length === 0) {
      throw new Error('역지오코딩 결과가 없습니다.')
    }

    // 행정동 기준 (H 타입) 선택
    const region = apiResult.documents.find((doc: any) => doc.region_type === 'H') ||
                   apiResult.documents[0]

    // 4. 코드 매핑 테이블에서 API 코드 찾기
    const { data: mapping, error: mappingError } = await supabase
      .from('region_code_mapping')
      .select('*')
      .eq('sido_name', region.region_1depth_name)
      .eq('sgg_name', region.region_2depth_name)
      .maybeSingle()

    if (mappingError || !mapping) {
      console.warn(`코드 매핑을 찾을 수 없습니다: ${region.region_1depth_name} ${region.region_2depth_name}`)
      // 기본값 사용 (서울시 중구)
      const result: ReverseGeocodingResult = {
        tilKey: tileKey,
        hcode: region.code,
        sidoName: region.region_1depth_name,
        sggName: region.region_2depth_name,
        dongName: region.region_3depth_name || '',
        addressName: region.address_name || `${region.region_1depth_name} ${region.region_2depth_name}`,
        kindergartenSidoCode: 11,
        kindergartenSggCode: 11140,
        childcareArcode: '11140'
      }
      
      // 캐시에 저장 (매핑이 없어도 저장)
      await supabase.from('rgc_cache').upsert({
        tile_key: tileKey,
        hcode: result.hcode,
        sido_name: result.sidoName,
        sgg_name: result.sggName,
        dong_name: result.dongName,
        address_name: result.addressName,
        kindergarten_sido_code: result.kindergartenSidoCode,
        kindergarten_sgg_code: result.kindergartenSggCode,
        childcare_arcode: result.childcareArcode
      })
      
      return result
    }

    // 5. 결과 생성
    const result: ReverseGeocodingResult = {
      tilKey: tileKey,
      hcode: region.code,
      sidoName: region.region_1depth_name,
      sggName: region.region_2depth_name,
      dongName: region.region_3depth_name || '',
      addressName: region.address_name || `${region.region_1depth_name} ${region.region_2depth_name}`,
      kindergartenSidoCode: mapping?.kindergarten_sido_code ?? 11,
      kindergartenSggCode: mapping?.kindergarten_sgg_code ?? 11140,
      childcareArcode: mapping?.childcare_arcode ?? '11140'
    }

    // 6. 캐시에 저장
    const { error: insertError } = await supabase.from('rgc_cache').upsert({
      tile_key: tileKey,
      hcode: result.hcode,
      sido_name: result.sidoName,
      sgg_name: result.sggName,
      dong_name: result.dongName,
      address_name: result.addressName,
      kindergarten_sido_code: result.kindergartenSidoCode,
      kindergarten_sgg_code: result.kindergartenSggCode,
      childcare_arcode: result.childcareArcode
    })

    if (insertError) {
      console.warn('역지오코딩 캐시 저장 실패:', insertError.code, insertError.message)
    } else {
      console.log(`💾 역지오코딩 캐시 저장 완료: (${tileKey}) → ${result.sidoName} ${result.sggName}`)
    }

    return result

  } catch (error) {
    console.error('역지오코딩 오류:', error)
    return null
  }
}

/**
 * 주소 기반 지오코딩 (주소 → 위경도)
 * 캐시 우선, 없으면 API 호출 후 저장
 */
export async function getGeocodingWithCache(address: string): Promise<GeocodingResult | null> {
  try {
    // 1. 주소 정규화
    const normalizedAddress = normalizeAddress(address)
    if (!normalizedAddress) {
      console.warn('빈 주소입니다:', address)
      return null
    }

    console.log(`지오코딩: "${address}" → "${normalizedAddress}"`)

    // 2. 캐시 확인
    const { data: cached, error: cacheError } = await supabase
      .from('geocode_cache')
      .select('*')
      .eq('address_norm', normalizedAddress)
      .maybeSingle()

    if (!cacheError && cached) {
      console.log(`🎯 지오코딩 캐시 히트! "${cached.address_norm}" → ${cached.lat}, ${cached.lng}`)
      return {
        lat: cached.lat,
        lng: cached.lng,
        provider: cached.provider,
        accuracy: cached.accuracy,
        addressType: cached.address_type
      }
    }

    // 3. 캐시 없으면 카카오 API 호출
    if (cacheError) {
      if (cacheError.code === 'PGRST116') {
        console.log(`📍 지오코딩 캐시 없음 "${normalizedAddress}" - 새로 저장 예정`)
      } else if (cacheError.code === '406' || cacheError.message?.includes('406')) {
        console.log(`📍 지오코딩 캐시 조회 실패 (RLS) "${normalizedAddress}" - 새로 저장 예정`)
      } else {
        console.warn('지오코딩 캐시 조회 오류:', cacheError.code, cacheError.message)
      }
    }
    console.log(`🔄 지오코딩 API 호출 시작: "${normalizedAddress}"`)
    const apiResult = await callKakaoGeocode(normalizedAddress)
    
    if (!apiResult.documents || apiResult.documents.length === 0) {
      console.warn('지오코딩 결과가 없습니다:', normalizedAddress)
      return null
    }

    const doc = apiResult.documents[0]
    const result: GeocodingResult = {
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      provider: 'kakao',
      accuracy: doc.accuracy || 'UNKNOWN',
      addressType: doc.address_type || 'UNKNOWN'
    }

    // 4. 캐시에 저장
    const { error: insertError } = await supabase.from('geocode_cache').upsert({
      address_norm: normalizedAddress,
      original_address: address,
      lat: result.lat,
      lng: result.lng,
      provider: result.provider,
      accuracy: result.accuracy,
      address_type: result.addressType
    })

    if (insertError) {
      console.warn('지오코딩 캐시 저장 실패:', insertError.code, insertError.message)
    } else {
      console.log(`💾 지오코딩 캐시 저장 완료: "${normalizedAddress}" → ${result.lat}, ${result.lng}`)
    }

    return result

  } catch (error) {
    console.error('지오코딩 오류:', error)
    return null
  }
}

/**
 * 경계 근처 폴백: 주변 지역도 함께 조회
 */
export async function getNearbyRegions(
  lat: number, 
  lng: number, 
  radiusKm: number = 3
): Promise<ReverseGeocodingResult[]> {
  try {
    // 반경 내 여러 지점을 샘플링해서 행정구역 찾기
    const samplePoints = [
      { lat, lng },                                    // 중심점
      { lat: lat + 0.01, lng },                       // 북쪽
      { lat: lat - 0.01, lng },                       // 남쪽
      { lat, lng: lng + 0.01 },                       // 동쪽
      { lat, lng: lng - 0.01 },                       // 서쪽
    ]

    const regions = await Promise.all(
      samplePoints.map(point => getReverseGeocodingWithCache(point.lat, point.lng))
    )

    // 중복 제거 (같은 시군구)
    const uniqueRegions = regions
      .filter((region): region is ReverseGeocodingResult => region !== null)
      .filter((region, index, arr) => 
        arr.findIndex(r => r.sidoName === region.sidoName && r.sggName === region.sggName) === index
      )

    console.log(`경계 폴백: ${lat}, ${lng} 주변 ${uniqueRegions.length}개 지역 발견`)
    return uniqueRegions

  } catch (error) {
    console.error('경계 폴백 오류:', error)
    return []
  }
}

/**
 * 하드코딩 폴백 (API 장애 시)
 */
export function getHardcodedRegion(lat: number, lng: number): ReverseGeocodingResult {
  // 서울시 지역별 하드코딩 매핑 (폴백용)
  if (lat >= 37.49 && lat <= 37.56 && lng >= 127.02 && lng <= 127.13) {
    return {
      tilKey: getTileKey(lat, lng),
      hcode: '1168000000',
      sidoName: '서울특별시',
      sggName: '강남구',
      dongName: '',
      addressName: '서울 강남구',
      kindergartenSidoCode: 11,
      kindergartenSggCode: 11680,
      childcareArcode: '11680'
    }
  }
  
  if (lat >= 37.47 && lat <= 37.52 && lng >= 126.95 && lng <= 127.05) {
    return {
      tilKey: getTileKey(lat, lng),
      hcode: '1165000000',
      sidoName: '서울특별시',
      sggName: '서초구',
      dongName: '',
      addressName: '서울 서초구',
      kindergartenSidoCode: 11,
      kindergartenSggCode: 11650,
      childcareArcode: '11650'
    }
  }

  // 기본값: 서울시 중구
  return {
    tilKey: getTileKey(lat, lng),
    hcode: '1114000000',
    sidoName: '서울특별시',
    sggName: '중구',
    dongName: '',
    addressName: '서울 중구',
    kindergartenSidoCode: 11,
    kindergartenSggCode: 11140,
    childcareArcode: '11140'
  }
}

/**
 * 통합 역지오코딩 함수 (캐시 + 폴백)
 */
export async function reverseGeocodeWithCache(
  lat: number, 
  lng: number
): Promise<ReverseGeocodingResult> {
  try {
    // 1. 캐시된 역지오코딩 시도
    const result = await getReverseGeocodingWithCache(lat, lng)
    if (result) {
      return result
    }

    // 2. API 실패 시 하드코딩 폴백
    console.log('역지오코딩 API 실패, 하드코딩 폴백 사용')
    return getHardcodedRegion(lat, lng)

  } catch (error) {
    console.error('역지오코딩 전체 실패:', error)
    return getHardcodedRegion(lat, lng)
  }
}

/**
 * 배치 지오코딩 (여러 주소를 한 번에 처리)
 * 속도 제한 포함
 */
export async function batchGeocodeWithCache(
  addresses: string[],
  delayMs: number = 100
): Promise<Map<string, GeocodingResult | null>> {
  const results = new Map<string, GeocodingResult | null>()
  
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i]
    const result = await getGeocodingWithCache(address)
    results.set(address, result)
    
    // 속도 제한 (API 쿼터 보호)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  return results
}

/**
 * 캐시 통계 조회
 */
export async function getCacheStats() {
  try {
    const [rgcCount, geocodeCount] = await Promise.all([
      supabase.from('rgc_cache').select('count', { count: 'exact' }),
      supabase.from('geocode_cache').select('count', { count: 'exact' })
    ])

    return {
      reverseGeocodeCache: rgcCount.count || 0,
      geocodeCache: geocodeCount.count || 0
    }
  } catch (error) {
    console.error('캐시 통계 조회 오류:', error)
    return { reverseGeocodeCache: 0, geocodeCache: 0 }
  }
}
