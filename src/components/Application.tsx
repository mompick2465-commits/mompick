import React, { useState, useEffect, useMemo } from 'react'
import { 
  MapPin, 
  Star, 
  Clock, 
  Phone,
  Heart,
  Filter,
  Calendar,
  Users,
  Building,
  ChevronRight,
  Award,
  TrendingUp,
  ImageOff,
  Download,
  RefreshCw,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { SmartKindergartenLoader, LoadResult } from '../utils/smartKindergartenLoader'
import { fetchNearbyChildcare, transformToMapData } from '../utils/childcarePortalApi'
import ChildcareApplication from './ChildcareApplication'
import { KindergartenInfo } from '../utils/kindergartenCache'
import { getMultipleKindergartenReviewStats } from '../utils/kindergartenReviewApi'
import { getMultipleChildcareReviewStats } from '../utils/childcareReviewApi'
import { regionCodes } from '../utils/kindergartenApi'
import { reverseGeocodeWithCache } from '../utils/geocodingCache'

interface Facility {
  id: number
  name: string
  type: 'kindergarten' | 'childcare' | 'hospital'
  address: string
  rating: number
  reviewCount: number
  distance: string
  price?: string
  image: string
  isLiked: boolean
  availableSlots?: number
  nextAvailableDate?: string
  isRecommended?: boolean
  // 시설 코드(유치원/어린이집 식별용). 유치원은 kindergartenCache의 kinderCode 사용
  code?: string
  phone?: string
  // 지역 코드 (찜하기 시 필요)
  sidoCode?: number | string
  sggCode?: number | string
  arcode?: string
  // 간편신청 정보
  monthlyPrice?: number | null
  availableSlotsCount?: number | null
}

const Application = () => {
  const [selectedCategory, setSelectedCategory] = useState<'kindergarten' | 'childcare' | 'hospital' | null>(null)
  
  // 캐시 시스템 상태
  const [kindergartenData, setKindergartenData] = useState<KindergartenInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<{sido: string, sgg: string} | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  
  // 찜 상태 관리
  const [favoriteCodes, setFavoriteCodes] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedSido, setSelectedSido] = useState<string | null>(null)
  const [showSidoDropdown, setShowSidoDropdown] = useState(false)
  const [showSggDropdown, setShowSggDropdown] = useState(false)
  const [recommendedFacilities, setRecommendedFacilities] = useState<Facility[]>([])
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false)
  
  // 스마트 로더 인스턴스
  const smartLoader = useMemo(() => new SmartKindergartenLoader(), [])

  // 컴포넌트 마운트 시 추천시설 로드
  useEffect(() => {
    loadRecommendedFacilities()
  }, [])

  // API에서 가져온 지역 데이터 사용
  const regionData = Object.keys(regionCodes).reduce((acc, sido) => {
    acc[sido] = Object.keys(regionCodes[sido as keyof typeof regionCodes].sggCodes)
    return acc
  }, {} as Record<string, string[]>)


  // 현재 사용자 및 찜 목록 로드
  useEffect(() => {
    const loadUserAndFavorites = async () => {
      try {
        const { supabase } = await import('../lib/supabase')
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setCurrentUserId(user.id)
          
          // 찜 목록 가져오기
          const { data: favorites, error } = await supabase
            .from('favorites')
            .select('target_id, target_type')
            .eq('user_id', user.id)
            .eq('target_type', 'kindergarten')
          
          if (!error && favorites) {
            const codes = new Set(favorites.map(f => f.target_id))
            setFavoriteCodes(codes)
            console.log('✅ 찜 목록 로드:', codes)
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error)
      }
    }
    
    loadUserAndFavorites()
  }, [])

  const toggleLike = async (facility: Facility) => {
    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }
    
    if (!facility.code) {
      console.error('시설 코드가 없습니다.')
      return
    }
    
    try {
      const { supabase } = await import('../lib/supabase')
      const isFavorited = favoriteCodes.has(facility.code)
      
      if (isFavorited) {
        // 찜 해제
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUserId)
          .eq('target_id', facility.code)
          .eq('target_type', 'kindergarten')
        
        if (!error) {
          const newFavorites = new Set(favoriteCodes)
          newFavorites.delete(facility.code)
          setFavoriteCodes(newFavorites)
          console.log('❌ 찜 해제:', facility.name)
        }
      } else {
        // 찜 추가 (지역 코드 포함)
        const insertData: any = {
          user_id: currentUserId,
          target_type: facility.type,
          target_id: facility.code,
          target_name: facility.name
        }

        // 지역 코드 추가
        if (facility.type === 'kindergarten') {
          if (facility.sidoCode) insertData.sido_code = String(facility.sidoCode)
          if (facility.sggCode) insertData.sgg_code = String(facility.sggCode)
        } else if (facility.type === 'childcare') {
          if (facility.arcode) insertData.arcode = facility.arcode
        }

        const { error } = await supabase
          .from('favorites')
          .insert(insertData)
        
        if (!error) {
          const newFavorites = new Set(favoriteCodes)
          newFavorites.add(facility.code)
          setFavoriteCodes(newFavorites)
          console.log('✅ 찜 추가:', facility.name, '지역 코드:', insertData)
        }
      }
    } catch (error) {
      console.error('찜하기 오류:', error)
      alert('찜하기 처리 중 오류가 발생했습니다.')
    }
  }

  const handleCall = async (facility: Facility) => {
    try {
      const raw = facility.phone || ''
      const phone = raw.replace(/[^0-9+]/g, '')
      if (!phone) {
        alert('전화번호 정보가 없습니다.')
        return
      }
      try { await navigator.clipboard.writeText(phone) } catch {}
      window.location.href = `tel:${phone}`
    } catch {}
  }

  const handleApply = (facility: Facility) => {
    if (facility.type !== 'hospital') {
      alert(`${facility.name} 신청하기 페이지로 이동합니다.`)
    } else {
      alert(`${facility.name} 예약하기 페이지로 이동합니다.`)
    }
  }

  const handleCategorySelect = async (category: 'kindergarten' | 'childcare' | 'hospital') => {
    setSelectedCategory(category)
    
    // 유치원을 선택했을 때만 GPS 활성화
    if (category === 'kindergarten') {
      await getCurrentLocation()
    }
  }

  // GPS로 현재 위치 가져오기 (역지오코딩 기반)
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('GPS를 지원하지 않는 브라우저입니다.')
      return
    }

    setIsGpsLoading(true)
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      const { latitude: lat, longitude: lng } = position.coords
      setCurrentLocation({ lat, lng })

      // 역지오코딩으로 실제 시도/시군구 조회
      try {
        const region = await reverseGeocodeWithCache(lat, lng)
        if (region) {
          setSelectedSido(region.sidoName)
          await loadRegionData(region.sidoName, region.sggName)
          return
        }
      } catch {}

      // 폴백: 근사 좌표 매핑 사용
      const approx = findRegionCodesByLatLng(lat, lng)
      await loadRegionData(approx.sido, approx.sgg)
      
    } catch (error) {
      console.error('GPS 오류:', error)
      alert('위치 정보를 가져올 수 없습니다. 지역을 수동으로 선택해주세요.')
    } finally {
      setIsGpsLoading(false)
    }
  }

  // GPS 기반 추천시설 로드 (역지오코딩 기반)
  const loadRecommendedFacilities = async () => {
    if (!navigator.geolocation) {
      return
    }

    // 이미 로딩 중이면 중복 호출 방지
    if (isLoadingRecommended) {
      return
    }

    setIsLoadingRecommended(true)
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // 1분 캐시
        })
      })

      const { latitude: lat, longitude: lng } = position.coords

      // 역지오코딩으로 실제 시도/시군구 조회
      let sido = '서울특별시'
      let sgg = '중구'
      try {
        const region = await reverseGeocodeWithCache(lat, lng)
        if (region) {
          sido = region.sidoName
          sgg = region.sggName
        } else {
          const approx = findRegionCodesByLatLng(lat, lng)
          sido = approx.sido
          sgg = approx.sgg
        }
      } catch {
        const approx = findRegionCodesByLatLng(lat, lng)
        sido = approx.sido
        sgg = approx.sgg
      }

      // 해당 지역의 유치원 데이터 로드
      const result = await smartLoader.loadKindergartenData(sido, sgg)

      // 지역 코드 가져오기
      const sidoCode = (regionCodes as any)[sido]?.sidoCode
      const sggCode = (regionCodes as any)[sido]?.sggCodes[sgg]

      let topKindergartens: Facility[] = []
      if (result.data && result.data.length > 0) {
        const facilitiesWithDistance = result.data.map((item, index) => {
          const itemLat = Number(item.lttdcdnt)
          const itemLng = Number(item.lngtcdnt)
          const distance = getDistance(lat, lng, itemLat, itemLng)
          const code = item.kinderCode || (item as any).kindercode || (item as any).kcode || ''

          return {
            id: index + 1,
            code: code,
            name: item.kindername || '유치원명 없음',
            type: 'kindergarten' as const,
            address: item.addr || '주소 없음',
            phone: item.telno || '',
            rating: 0,
            reviewCount: 0,
            distance: `${distance.toFixed(1)}km`,
            price: '월 40만원',
            image: '',
            isLiked: false,
            availableSlots: Math.floor(Math.random() * 5) + 1,
            isRecommended: true,
            sidoCode: sidoCode,
            sggCode: sggCode
          }
        })

        // 거리 순으로 정렬하여 주변 시설 필터링 (상위 20개)
        const nearbyKindergartens = facilitiesWithDistance
          .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
          .slice(0, 20)

        try {
          const codes = nearbyKindergartens
            .map(f => f.code)
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
          if (codes.length > 0) {
            console.log('🔍 유치원 추천 시설 코드:', codes)
            console.log('🔍 유치원 추천 시설 목록:', nearbyKindergartens.map(f => ({ name: f.name, code: f.code })))
            // 리뷰 통계 가져오기
            const stats = await getMultipleKindergartenReviewStats(codes)
            console.log('📊 유치원 리뷰 통계 결과:', stats)
            
            // 건물 사진 가져오기
            const { supabase } = await import('../lib/supabase')
            const { data: customInfoData } = await supabase
              .from('kindergarten_custom_info')
              .select('kinder_code, building_images')
              .in('kinder_code', codes)
              .eq('is_active', true)
            
            const buildingImagesMap: Record<string, string[]> = {}
            if (customInfoData) {
              customInfoData.forEach((item: any) => {
                if (item.building_images && item.building_images.length > 0) {
                  buildingImagesMap[item.kinder_code] = item.building_images
                }
              })
            }
            
            // 간편신청 정보 가져오기
            const { data: applicationInfoData } = await supabase
              .from('kindergarten_application_info')
              .select('kinder_code, monthly_price, available_slots')
              .in('kinder_code', codes)
              .eq('is_active', true)
            
            const applicationInfoMap: Record<string, {monthly_price: number | null, available_slots: number | null}> = {}
            if (applicationInfoData) {
              applicationInfoData.forEach((item: any) => {
                applicationInfoMap[item.kinder_code] = {
                  monthly_price: item.monthly_price,
                  available_slots: item.available_slots
                }
              })
            }
            
            // 리뷰 통계를 포함한 시설 목록 생성
            const kindergartensWithStats = nearbyKindergartens.map(f => {
              const s = f.code ? stats[f.code] : undefined
              const buildingImages = f.code ? buildingImagesMap[f.code] : null
              const firstImage = buildingImages && buildingImages.length > 0 ? buildingImages[0] : ''
              const isLiked = f.code ? favoriteCodes.has(f.code) : false
              const applicationInfo = f.code ? applicationInfoMap[f.code] : null
              if (f.code) {
                console.log(`📊 ${f.name} (${f.code}): 평점=${s?.average || 0}, 갯수=${s?.count || 0}`)
              }
              return { 
                ...f, 
                rating: s?.average || 0, 
                reviewCount: s?.count || 0,
                image: firstImage,
                isLiked,
                monthlyPrice: applicationInfo?.monthly_price || null,
                availableSlotsCount: applicationInfo?.available_slots || null
              }
            })
            
            // 칭찬평점과 개수 순으로 정렬 (평점 높은 순, 평점 같으면 개수 많은 순)
            topKindergartens = kindergartensWithStats
              .sort((a, b) => {
                // 평점이 높은 것이 우선
                if (b.rating !== a.rating) {
                  return b.rating - a.rating
                }
                // 평점이 같으면 개수가 많은 것이 우선
                return b.reviewCount - a.reviewCount
              })
              .slice(0, 2)
          }
        } catch (error) {
          console.error('유치원 데이터 병합 오류:', error)
        }
      }

      // 어린이집 데이터 로드 (GPS 위치 기반, 지도 페이지와 동일한 방식)
      let topChildcares: Facility[] = []
      try {
        // 지도 페이지와 동일하게 fetchNearbyChildcare 사용 (반경 10km)
        const childcareList = await fetchNearbyChildcare(lat, lng, 10)
        console.log('🔍 GPS 기반 근처 어린이집:', childcareList.length, '개')
        
        if (childcareList.length > 0) {
          // 역지오코딩으로 arcode 가져오기
          const region = await reverseGeocodeWithCache(lat, lng)
          const arcode = (region as any)?.childcareArcode
          
          // 지도용 데이터로 변환 (거리 계산 포함)
          const withDistance = await Promise.all(
            childcareList.map(async (item, idx) => {
              try {
                const mapped = await transformToMapData(item as any, lat, lng, arcode)
                const distanceKm = typeof (mapped as any).distance === 'number' ? (mapped as any).distance : 0
                const f: Facility = {
                  id: 1000 + idx,
                  code: mapped.code || (item as any).crcode || (item as any).stcode,
                  name: mapped.name || (item as any).crname || '어린이집명 없음',
                  type: 'childcare',
                  address: mapped.address || (item as any).craddr || '주소 없음',
                  rating: 0,
                  reviewCount: 0,
                  distance: `${distanceKm.toFixed(1)}km`,
                  price: '월 -만원',
                  image: mapped.image || '',
                  isLiked: false,
                  availableSlots: undefined,
                  isRecommended: true,
                  arcode: arcode
                }
                return f
              } catch {
                return null
              }
            })
          )
          const valid = withDistance.filter((v): v is Facility => !!v)
          const nearbyChildcares = valid
            .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))

          // 어린이집 리뷰 통계 병합
          try {
            const codes = nearbyChildcares
              .map(f => f.code)
              .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
            if (codes.length > 0) {
              console.log('🔍 어린이집 추천 시설 코드:', codes)
              console.log('🔍 어린이집 추천 시설 목록:', nearbyChildcares.map(f => ({ name: f.name, code: f.code, distance: f.distance })))
              const stats = await getMultipleChildcareReviewStats(codes)
              console.log('📊 어린이집 리뷰 통계 결과:', stats)
              
              // 리뷰 통계를 포함한 시설 목록 생성
              const childcaresWithStats = nearbyChildcares.map(f => {
                const s = f.code ? stats[f.code] : undefined
                console.log(`📊 ${f.name} (${f.code}): 평점=${s?.average || 0}, 갯수=${s?.count || 0}, 거리=${f.distance}`)
                return { ...f, rating: s?.average || 0, reviewCount: s?.count || 0 }
              })
              
              // 칭찬평점과 개수 순으로 정렬 (평점 높은 순, 평점 같으면 개수 많은 순)
              topChildcares = childcaresWithStats
                .sort((a, b) => {
                  // 평점이 높은 것이 우선
                  if (b.rating !== a.rating) {
                    return b.rating - a.rating
                  }
                  // 평점이 같으면 개수가 많은 것이 우선
                  return b.reviewCount - a.reviewCount
                })
                .slice(0, 2)
            }
          } catch (error) {
            console.error('어린이집 리뷰 통계 병합 오류:', error)
          }
        }
      } catch (error) {
        console.error('어린이집 데이터 로드 오류:', error)
      }

      // 최종 병합 (유치원 2 + 어린이집 2)
      const merged = [...topKindergartens, ...topChildcares]
      if (merged.length > 0) {
        setRecommendedFacilities(merged)
      }
      
    } catch (error) {
      console.error('추천시설 로딩 오류:', error)
    } finally {
      setIsLoadingRecommended(false)
    }
  }

  // 위도/경도로 지역 코드 찾기
  const findRegionCodesByLatLng = (lat: number, lng: number): {sido: string, sgg: string} => {
    // 서울 지역 좌표 범위
    const regions = [
      { sido: '서울특별시', sgg: '강남구', lat: 37.5172, lng: 127.0473 },
      { sido: '서울특별시', sgg: '서초구', lat: 37.4837, lng: 127.0324 },
      { sido: '서울특별시', sgg: '송파구', lat: 37.5145, lng: 127.1058 },
      { sido: '서울특별시', sgg: '강동구', lat: 37.5301, lng: 127.1238 },
      { sido: '서울특별시', sgg: '중구', lat: 37.5636, lng: 126.9970 },
      { sido: '서울특별시', sgg: '종로구', lat: 37.5735, lng: 126.9788 },
      { sido: '서울특별시', sgg: '용산구', lat: 37.5384, lng: 126.9654 },
      { sido: '서울특별시', sgg: '성동구', lat: 37.5633, lng: 127.0366 },
      { sido: '서울특별시', sgg: '광진구', lat: 37.5385, lng: 127.0823 },
      { sido: '서울특별시', sgg: '동대문구', lat: 37.5838, lng: 127.0507 },
      { sido: '서울특별시', sgg: '중랑구', lat: 37.6066, lng: 127.0926 },
      { sido: '서울특별시', sgg: '성북구', lat: 37.5894, lng: 127.0167 },
      { sido: '서울특별시', sgg: '강북구', lat: 37.6398, lng: 127.0253 },
      { sido: '서울특별시', sgg: '도봉구', lat: 37.6688, lng: 127.0471 },
      { sido: '서울특별시', sgg: '노원구', lat: 37.6542, lng: 127.0568 },
      { sido: '서울특별시', sgg: '은평구', lat: 37.6028, lng: 126.9291 },
      { sido: '서울특별시', sgg: '서대문구', lat: 37.5791, lng: 126.9368 },
      { sido: '서울특별시', sgg: '마포구', lat: 37.5663, lng: 126.9019 },
      { sido: '서울특별시', sgg: '양천구', lat: 37.5170, lng: 126.8664 },
      { sido: '서울특별시', sgg: '강서구', lat: 37.5509, lng: 126.8495 },
      { sido: '서울특별시', sgg: '구로구', lat: 37.4954, lng: 126.8874 },
      { sido: '서울특별시', sgg: '금천구', lat: 37.4602, lng: 126.9003 },
      { sido: '서울특별시', sgg: '영등포구', lat: 37.5264, lng: 126.8962 },
      { sido: '서울특별시', sgg: '동작구', lat: 37.5124, lng: 126.9392 },
      { sido: '서울특별시', sgg: '관악구', lat: 37.4784, lng: 126.9515 }
    ]

    // 가장 가까운 지역 찾기
    let closestRegion = regions[0]
    let minDistance = getDistance(lat, lng, closestRegion.lat, closestRegion.lng)

    for (const region of regions) {
      const distance = getDistance(lat, lng, region.lat, region.lng)
      if (distance < minDistance) {
        minDistance = distance
        closestRegion = region
      }
    }

    return { sido: closestRegion.sido, sgg: closestRegion.sgg }
  }

  // 두 좌표 간 거리 계산 (하버사인 공식)
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // 지구의 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // 지역별 유치원 데이터 로딩
  const loadRegionData = async (sido: string, sgg: string) => {
    setLoading(true)
    setSelectedRegion({sido, sgg})
    
    try {
      const result = await smartLoader.loadKindergartenData(sido, sgg)
      setLoadResult(result)
      setKindergartenData(result.data)
      
    } catch (error) {
      console.error('지역 데이터 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }


  // 데이터를 Facility 형식으로 변환
  const convertToFacilities = (data: KindergartenInfo[]): Facility[] => {
    // selectedRegion에서 지역 코드 가져오기
    const sidoCode = selectedRegion?.sido ? (regionCodes as any)[selectedRegion.sido]?.sidoCode : undefined
    const sggCode = selectedRegion?.sgg && selectedRegion?.sido 
      ? (regionCodes as any)[selectedRegion.sido]?.sggCodes[selectedRegion.sgg] 
      : undefined

    return data.map((item, index) => ({
      id: index + 1,
      code: (item as any).kinderCode || (item as any).kindercode || (item as any).kcode,
      name: item.kindername || '유치원명 없음',
      type: 'kindergarten' as const,
      address: item.addr || '주소 없음',
      phone: (item as any).telno || '',
      rating: 0, // 리뷰 연동 전 기본값
      reviewCount: 0, // 리뷰 연동 전 기본값
      distance: '0.5km', // 임시 (실제로는 위치 기반 계산)
      price: '월 -만원', // 표시 전용 플레이스홀더
      image: '', // 이미지 없음으로 설정
      isLiked: false,
      availableSlots: undefined,
      isRecommended: Math.random() > 0.7,
      sidoCode: sidoCode,
      sggCode: sggCode
    }))
  }

  const [baseWithRatings, setBaseWithRatings] = useState<Facility[] | null>(null)
  // 유치원 데이터 + 리뷰 통계 병합
  const displayFacilities = baseWithRatings ?? convertToFacilities(kindergartenData)

  useEffect(() => {
    (async () => {
      try {
        const codes = kindergartenData
          .map((k: any) => k.kinderCode || k.kindercode || k.kcode)
          .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
        if (codes.length === 0) { setBaseWithRatings(null); return }
        
        // 리뷰 통계 가져오기
        const stats = await getMultipleKindergartenReviewStats(codes)
        
        // 건물 사진 가져오기
        const { supabase } = await import('../lib/supabase')
        const { data: customInfoData } = await supabase
          .from('kindergarten_custom_info')
          .select('kinder_code, building_images')
          .in('kinder_code', codes)
          .eq('is_active', true)
        
        // 건물 사진을 코드별로 매핑
        const buildingImagesMap: Record<string, string[]> = {}
        if (customInfoData) {
          customInfoData.forEach((item: any) => {
            if (item.building_images && item.building_images.length > 0) {
              buildingImagesMap[item.kinder_code] = item.building_images
            }
          })
        }
        
        // 간편신청 정보 가져오기
        const { data: applicationInfoData } = await supabase
          .from('kindergarten_application_info')
          .select('kinder_code, monthly_price, available_slots')
          .in('kinder_code', codes)
          .eq('is_active', true)
        
        const applicationInfoMap: Record<string, {monthly_price: number | null, available_slots: number | null}> = {}
        if (applicationInfoData) {
          applicationInfoData.forEach((item: any) => {
            applicationInfoMap[item.kinder_code] = {
              monthly_price: item.monthly_price,
              available_slots: item.available_slots
            }
          })
        }
        
        const merged = convertToFacilities(kindergartenData).map((f, idx) => {
          const raw = (kindergartenData as any)[idx]
          const code = raw?.kinderCode || raw?.kindercode || raw?.kcode
          const s = (code && stats[code]) ? stats[code] : { average: 0, count: 0 }
          const buildingImages = code ? buildingImagesMap[code] : null
          const firstImage = buildingImages && buildingImages.length > 0 ? buildingImages[0] : ''
          const isLiked = code ? favoriteCodes.has(code) : false
          const applicationInfo = code ? applicationInfoMap[code] : null
          
          return { 
            ...f, 
            rating: s.average || 0, 
            reviewCount: s.count || 0,
            image: firstImage, // 첫 번째 건물 사진 추가
            isLiked, // 찜 상태 추가
            monthlyPrice: applicationInfo?.monthly_price || null,
            availableSlotsCount: applicationInfo?.available_slots || null
          }
        })
        setBaseWithRatings(merged)
      } catch (error) {
        console.error('유치원 데이터 병합 오류:', error)
        setBaseWithRatings(null)
      }
    })()
  }, [kindergartenData, favoriteCodes])

  const filteredFacilities = displayFacilities.filter(facility => {
    if (selectedCategory && facility.type !== selectedCategory) return false
    return true
  })

  return (
    <div className="min-h-screen bg-white">

      {/* 메인 카테고리 선택 */}
      {!selectedCategory && (
        <div className="p-4">
          <div className="max-w-md mx-auto">
            {/* 2개 컬럼 */}
            <div className="space-y-4">
              {/* 유치원 */}
              <div 
                onClick={() => handleCategorySelect('kindergarten')}
                className="bg-gradient-to-r from-[#fb8678]/10 to-[#e67567]/10 rounded-2xl p-2 border border-[#fb8678]/20 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-28 h-28 flex items-center justify-center">
                    {isGpsLoading ? (
                      <Loader2 className="w-7 h-7 text-[#fb8678] animate-spin" />
                    ) : (
                      <img src="/icons/applicationimg1.svg" alt="유치원" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base">유치원</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {isGpsLoading ? '위치 확인 중...' : '간편 신청'}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs bg-[#fb8678] text-white px-2 py-1 rounded-full">
                        {isGpsLoading ? 'GPS 활성화' : '빠른 신청'}
                      </span>
                    </div>
                  </div>
                  {isGpsLoading ? (
                    <Loader2 className="w-5 h-5 text-[#fb8678] animate-spin" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#fb8678]" />
                  )}
                </div>
              </div>

              {/* 어린이집 */}
              <div 
                onClick={() => handleCategorySelect('childcare')}
                className="bg-gradient-to-r from-[#fb8678]/10 to-[#e67567]/10 rounded-2xl p-2 border border-[#fb8678]/20 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-28 h-28 flex items-center justify-center">
                    {isGpsLoading ? (
                      <Loader2 className="w-7 h-7 text-[#fb8678] animate-spin" />
                    ) : (
                      <img src="/icons/applicationimg3.svg" alt="어린이집" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base">어린이집</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {isGpsLoading ? '위치 확인 중...' : '간편 신청'}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs bg-[#fb8678] text-white px-2 py-1 rounded-full">
                        {isGpsLoading ? 'GPS 활성화' : '빠른 신청'}
                      </span>
                    </div>
                  </div>
                  {isGpsLoading ? (
                    <Loader2 className="w-5 h-5 text-[#fb8678] animate-spin" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#fb8678]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 선택된 카테고리별 시설 목록 */}
      {selectedCategory && selectedCategory !== 'childcare' && (
        <div className="p-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <button 
                onClick={() => setSelectedCategory(null)}
                className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180 text-[#fb8678]" />
              </button>
            유치원 시설 목록
            </h2>

            {/* 유치원 카테고리일 때 지역 선택 UI */}
            {selectedCategory === 'kindergarten' && (
              <div className="mb-6 space-y-4">
                {/* 시도 선택 드롭다운 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-700">시도 선택</h3>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowSidoDropdown(!showSidoDropdown)
                        setShowSggDropdown(false)
                      }}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
                    >
                      {selectedSido || '시도를 선택하세요'}
                    </button>
                    
                    {/* 시도 드롭다운 목록 */}
                    {showSidoDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {Object.keys(regionData).map((sido) => (
                          <button
                            key={sido}
                            onClick={() => {
                              setSelectedSido(sido)
                              setShowSidoDropdown(false)
                              setShowSggDropdown(false)
                              setSelectedRegion(null)
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            {sido}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 지역구 선택 드롭다운 */}
                {selectedSido && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-700">지역구 선택</h3>
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowSggDropdown(!showSggDropdown)
                          setShowSidoDropdown(false)
                        }}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
                      >
                        {selectedRegion?.sgg || '지역구를 선택하세요'}
                      </button>
                      
                      {/* 지역구 드롭다운 목록 */}
                      {showSggDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {regionData[selectedSido as keyof typeof regionData].map((sgg) => (
                            <button
                              key={sgg}
                              onClick={() => {
                                loadRegionData(selectedSido, sgg)
                                setShowSggDropdown(false)
                              }}
                              disabled={loading}
                              className={`w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                loading ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {sgg}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}

            <div className="space-y-4">
              {/* GPS 로딩 상태 */}
              {isGpsLoading && (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl">
                  <Loader2 className="w-8 h-8 text-[#fb8678] animate-spin mb-4" />
                  <p className="text-sm text-gray-600 mb-2">주변 시설 찾는 중...</p>
                  <p className="text-xs text-gray-500">현재 위치를 확인하고 있습니다</p>
                </div>
              )}

              {/* 데이터 로딩 상태 */}
              {loading && !isGpsLoading && (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl">
                  <Loader2 className="w-8 h-8 text-[#fb8678] animate-spin mb-4" />
                  <p className="text-sm text-gray-600 mb-2">유치원 데이터를 불러오는 중...</p>
                  <p className="text-xs text-gray-500">
                    {selectedRegion ? `${selectedRegion.sido} ${selectedRegion.sgg}` : '지역을 선택해주세요'}
                  </p>
                </div>
              )}

              {/* 유치원 목록 */}
              {!loading && displayFacilities.length > 0 && displayFacilities.map((facility) => (
                <div key={facility.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex">
                    {/* 왼쪽 이미지 영역 (3비율) */}
                    <div className="w-24 flex-shrink-0 relative">
                      {!facility.image ? (
                        // 이미지가 없는 경우 - 사진없음 표시
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                          <ImageOff className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 font-medium">사진없음</span>
                        </div>
                      ) : (
                        // 이미지가 있는 경우
                        <img 
                          src={facility.image} 
                          alt={facility.name} 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-r from-transparent to-white"></div>
                    </div>

                    {/* 오른쪽 내용 영역 (7비율) */}
                    <div className="flex-1 bg-white p-3">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2 leading-relaxed">{facility.name}</h3>
                          <div className="flex items-start gap-1 text-xs text-gray-500 mb-1">
                            <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed">{facility.address}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLike(facility)
                          }}
                          className="flex-shrink-0 p-1 ml-2"
                        >
                          {facility.isLiked ? (
                            <Heart className="h-4 w-4 text-[#fb8678] fill-current" />
                          ) : (
                            <Heart className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* 평점과 거리 */}
                      <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs font-medium text-gray-900">{Number(facility.rating).toFixed(1)}</span>
                          <span className="text-xs text-gray-500">({facility.reviewCount})</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{facility.distance}</span>
                        </div>
                      </div>

                      {/* 가격 또는 예약 정보 */}
                      {facility.type === 'kindergarten' ? (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {facility.monthlyPrice ? (
                              <span className="text-sm font-bold text-[#fb8678]">월 {facility.monthlyPrice}만원</span>
                            ) : (
                              <span className="text-sm font-bold text-gray-400">월 -만원</span>
                            )}
                            {facility.availableSlotsCount ? (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                                빈자리 {facility.availableSlotsCount}개
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-semibold">
                                빈자리 -개
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              다음 예약: {facility.nextAvailableDate}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApply(facility)}
                          className="flex-1 py-2 px-4 bg-[#fb8678] text-white rounded-lg text-sm font-medium hover:bg-[#e67567] transition-colors"
                        >
                          {facility.type === 'kindergarten' ? '신청하기' : '예약하기'}
                        </button>
                        <button
                          onClick={() => handleCall(facility)}
                          className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          전화문의
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 데이터가 없을 때 */}
              {!loading && displayFacilities.length === 0 && selectedRegion && (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100">
                  <Building className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">해당 지역에 유치원이 없습니다</p>
                  <p className="text-xs text-gray-500">
                    {selectedRegion.sido} {selectedRegion.sgg}
                  </p>
                </div>
              )}

              {/* 지역을 선택하지 않았을 때 */}
              {!loading && displayFacilities.length === 0 && !selectedRegion && (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl">
                  <MapPin className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">지역을 선택해주세요</p>
                  <p className="text-xs text-gray-500">위에서 시도와 지역구를 선택하시면 유치원 목록을 확인할 수 있습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 어린이집 카테고리일 때: 동일 헤더 아래에 전용 뷰 렌더 */}
      {selectedCategory === 'childcare' && (
        <div className="p-4">
          <div className="max-w-md mx-auto">
            <ChildcareApplication onClose={() => setSelectedCategory(null)} />
          </div>
        </div>
      )}

      {/* 추천 시설 섹션 */}
      {!selectedCategory && (
        <div className="p-4">
          <div className="max-w-md mx-auto">

            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-[#fb8678]" />
              <h2 className="text-lg font-semibold text-gray-900">내 주변 추천 시설</h2>
            </div>
            
            <div className="space-y-3">
              {/* 로딩 상태 */}
              {isLoadingRecommended && (
                <div className="flex flex-col items-center justify-center py-8 bg-white rounded-xl">
                  <Loader2 className="w-6 h-6 text-[#fb8678] animate-spin mb-2" />
                  <p className="text-sm text-gray-600">추천 시설 찾는 중...</p>
                </div>
              )}

              {/* 추천시설 목록 */}
              {!isLoadingRecommended && recommendedFacilities.length > 0 && recommendedFacilities.map((facility) => (
                <div key={facility.id} className="bg-gradient-to-r from-[#fb8678]/5 to-[#e67567]/5 border border-[#fb8678]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex">
                    {/* 왼쪽 이미지 영역 (2비율) */}
                    <div className="w-16 h-16 flex-shrink-0 relative">
                      {!facility.image ? (
                        // 이미지가 없는 경우 - 사진없음 표시
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                          <ImageOff className="w-4 h-4 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 font-medium">사진없음</span>
                        </div>
                      ) : (
                        // 이미지가 있는 경우
                        <img 
                          src={facility.image} 
                          alt={facility.name} 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      <div className="absolute inset-y-0 right-0 w-3 bg-gradient-to-r from-transparent to-white"></div>
                    </div>

                    {/* 오른쪽 내용 영역 */}
                    <div className="flex-1 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm">{facility.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3 text-pink-500 fill-current" />
                              <span className="text-xs font-medium text-gray-900">{Number(facility.rating).toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-gray-500">({facility.reviewCount})</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">{facility.distance}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApply(facility)}
                          className="bg-[#fb8678] text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-[#e67567] transition-colors ml-2"
                        >
                          {facility.type === 'kindergarten' ? '신청' : '예약'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 추천시설이 없을 때 */}
              {!isLoadingRecommended && recommendedFacilities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 bg-white rounded-xl">
                  <MapPin className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">주변에 추천할 시설이 없습니다</p>
                  <p className="text-xs text-gray-500">다른 지역을 선택해보세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* 하단 여백 */}
      <div className="h-20"></div>
    </div>
  )
}

export default Application
