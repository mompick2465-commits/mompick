import React, { useEffect, useState, useRef, useCallback } from 'react'
import { MapPin, Search, Filter, Heart, Phone, Clock, Users, ChevronLeft, Navigation, Locate, CheckCircle, Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchKindergartenData, findRegionCodes, findNearbyKindergartens, KindergartenInfo, regionCodes } from '../utils/kindergartenApi'
import { reverseGeocodeWithCache, getGeocodingWithCache, getNearbyRegions } from '../utils/geocodingCache'
import { SmartKindergartenLoader } from '../utils/smartKindergartenLoader'
import { fetchChildcareData, fetchNearbyChildcare, transformToMapData, ChildcareInfo } from '../utils/childcarePortalApi'
import {
	fetchPlaygroundsFromCache,
	fetchPlaygroundsByRegionGroup,
	fetchAllPlaygroundsFromSnapshot,
	playgroundToMapData,
} from '../utils/playgroundApi'
import type { PlaygroundRawItem } from '../utils/playgroundApi'
import { KindergartenMapData, LatLng } from '../types/kakaoMap'
import KakaoMapPlugin from '../plugins/KakaoMapPlugin'
import { getMultipleKindergartenRatings } from '../utils/kindergartenReviewApi'
import { getMultipleChildcareRatings } from '../utils/childcareReviewApi'
import { getMultiplePlaygroundRatings } from '../utils/playgroundReviewApi'
import { enableZoom, disableZoom } from '../utils/viewportControl'
import { supabase } from '../lib/supabase'

const KindergartenMapPage: React.FC = () => {
  
  // 지도 페이지에서 줌 활성화
  useEffect(() => {
    enableZoom()
    return () => {
      disableZoom()
    }
  }, [])
  
  // 커스텀 이미지(건물 1번)를 주입하는 헬퍼
  const injectKindergartenImages = async (items: KindergartenMapData[]): Promise<KindergartenMapData[]> => {
    try {
      const codes = Array.from(new Set(items.map(i => i.code).filter(Boolean) as string[]))
      if (codes.length === 0) return items
      const { data, error } = await supabase
        .from('kindergarten_custom_info')
        .select('kinder_code, building_images')
        .in('kinder_code', codes)
      if (error || !data) return items
      const codeToImage: Record<string, string> = {}
      data.forEach(row => {
        if (row && Array.isArray(row.building_images) && row.building_images.length > 0) {
          codeToImage[String(row.kinder_code)] = row.building_images[0]
        }
      })
      return items.map(item => {
        const img = item.code ? codeToImage[String(item.code)] : undefined
        return img ? { ...item, image: img } : item
      })
    } catch {
      return items
    }
  }

  // 놀이시설 커스텀 이미지(건물 1번)를 주입하는 헬퍼
  const injectPlaygroundImages = async (items: KindergartenMapData[]): Promise<KindergartenMapData[]> => {
    try {
      const ids = Array.from(new Set(items.map(i => i.id).filter(Boolean) as string[]))
      if (ids.length === 0) return items
      const { data, error } = await supabase
        .from('playground_custom_info')
        .select('playground_id, building_images')
        .in('playground_id', ids)
        .eq('is_active', true)
      if (error || !data) return items
      const idToImage: Record<string, string> = {}
      data.forEach(row => {
        if (row && Array.isArray(row.building_images) && row.building_images.length > 0) {
          idToImage[String(row.playground_id)] = row.building_images[0]
        }
      })
      return items.map(item => {
        const img = item.id ? idToImage[String(item.id)] : undefined
        return img ? { ...item, image: img } : item
      })
    } catch {
      return items
    }
  }
  
  // 유치원 데이터에 리뷰 평점 업데이트
  const updateKindergartenRatings = async (kindergartens: KindergartenMapData[]): Promise<KindergartenMapData[]> => {
    try {
      // 유치원 코드 목록 추출 (code가 있는 것만)
      const codes = kindergartens.map(k => k.code).filter(Boolean) as string[]
      
      if (codes.length === 0) {
        return kindergartens
      }
      
      // 리뷰 평점 조회
      console.log('🔍 리뷰 평점 조회 시작, 유치원 코드들:', codes)
      const ratings = await getMultipleKindergartenRatings(codes)
      console.log('📊 조회된 평점들:', ratings)
      
      // 평점 업데이트
      const updatedKindergartens = kindergartens.map(kindergarten => {
        const newRating = kindergarten.code ? (ratings[kindergarten.code] || 0.0) : 0.0
        console.log(`⭐ ${kindergarten.name} (${kindergarten.code}): ${kindergarten.rating} -> ${newRating}`)
        return {
          ...kindergarten,
          rating: newRating
        }
      })
      
      return updatedKindergartens
    } catch (error) {
      console.error('리뷰 평점 업데이트 실패:', error)
      return kindergartens
    }
  }

  // 최종 뷰포트 업데이트 스케줄러: 연속 이벤트 중 마지막만 실행
  const scheduleViewportUpdate = () => {
    if (viewportDebounceRef.current) {
      clearTimeout(viewportDebounceRef.current)
    }
    viewportDebounceRef.current = window.setTimeout(() => {
      // 최단 업데이트 간격(예: 500ms) 보장
      const now = Date.now()
      if (now - lastUpdateAtRef.current < 500) return
      lastUpdateAtRef.current = now
      loadFacilitiesForViewport()
    }, 500)
  }

  // 어린이집 데이터에 리뷰 평점 업데이트
  const updateChildcareRatings = async (childcares: KindergartenMapData[]): Promise<KindergartenMapData[]> => {
    try {
      const codes = childcares.map(c => c.code).filter(Boolean) as string[]
      if (codes.length === 0) return childcares
      const ratings = await getMultipleChildcareRatings(codes)
      const updated = childcares.map(c => ({
        ...c,
        rating: c.code ? (ratings[c.code] || 0.0) : 0.0
      }))
      return updated
    } catch (error) {
      console.error('어린이집 평점 업데이트 실패:', error)
      return childcares
    }
  }

  // 놀이시설 데이터에 리뷰 평점 업데이트
  const updatePlaygroundRatings = async (playgrounds: KindergartenMapData[]): Promise<KindergartenMapData[]> => {
    try {
      // 놀이시설 ID 목록 추출 (id가 있는 것만)
      const ids = playgrounds.map(p => p.id).filter(Boolean) as string[]
      
      if (ids.length === 0) {
        return playgrounds
      }
      
      // 리뷰 평점 조회
      console.log('🔍 놀이시설 리뷰 평점 조회 시작, 놀이시설 ID들:', ids)
      const ratings = await getMultiplePlaygroundRatings(ids)
      console.log('📊 조회된 놀이시설 평점들:', ratings)
      
      // 평점 업데이트
      const updatedPlaygrounds = playgrounds.map(playground => {
        const newRating = playground.id ? (ratings[playground.id] || 0.0) : 0.0
        console.log(`⭐ ${playground.name} (${playground.id}): ${playground.rating} -> ${newRating}`)
        return {
          ...playground,
          rating: newRating
        }
      })
      
      return updatedPlaygrounds
    } catch (error) {
      console.error('놀이시설 리뷰 평점 업데이트 실패:', error)
      return playgrounds
    }
  }
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infowindowRef = useRef<any>(null)
  const overlaysRef = useRef<any[]>([])
  const infoOverlayRef = useRef<any>(null)
  const viewportDebounceRef = useRef<number | null>(null)
  const lastViewportKeyRef = useRef<string>('')
  const lastRegionKeyRef = useRef<string>('')
  const markerByIdRef = useRef<Map<string, { marker: any, ratingOverlay: any, data: KindergartenMapData }>>(new Map())
  const allFacilitiesRef = useRef<KindergartenMapData[] | null>(null)
  const isDraggingRef = useRef<boolean>(false)
  const lastUpdateAtRef = useRef<number>(0)
  const aggregateOverlaysRef = useRef<any[]>([])
  const currentRenderModeRef = useRef<'markers' | 'district' | 'city'>('markers')
  const loadedRegionKeysRef = useRef<Set<string>>(new Set())
  const sampledDistrictGroupsRef = useRef<Map<string, { lat: number, lng: number, label: string, sidoCode: number, sggCode: number }>>(new Map())
	const sampledCityGroupsRef = useRef<Map<string, { lat: number, lng: number, label: string, sidoCode: number }>>(new Map())
	const inFlightRegionLoadsRef = useRef<Set<string>>(new Set())
	const playgroundFetchControllersRef = useRef<Set<AbortController>>(new Set())
	const playgroundRegionGroupCacheRef = useRef<Map<string, PlaygroundRawItem[]>>(new Map())
  const initialLoadInProgressRef = useRef<boolean>(false)
  const initialLoadCompletedRef = useRef<boolean>(false)
  const MAX_CONCURRENT_REGION_LOADS = 2
  const PLAYGROUND_REGION_PREFETCH_LIMIT = 8
  const isViewportLoadingRef = useRef<boolean>(false)
  const [isViewportLoading, setIsViewportLoading] = useState(false)
  const viewportLoadingStartedAtRef = useRef<number>(0)
  const activeSggCodeRef = useRef<string>('')
  const renderInProgressRef = useRef<boolean>(false)
  const mapInitializedRef = useRef<boolean>(false)

  const requestViewportLoadingOn = () => {
    setViewportLoading(true)
  }
  const requestViewportLoadingOff = () => {
    if (renderInProgressRef.current) return
    if (inFlightRegionLoadsRef.current.size > 0) return
    setViewportLoading(false)
  }
  const setViewportLoading = (v: boolean) => {
    if (v) {
      viewportLoadingStartedAtRef.current = Date.now()
      isViewportLoadingRef.current = true
      setIsViewportLoading(true)
      return
    }
    const elapsed = Date.now() - viewportLoadingStartedAtRef.current
    const minMs = 600
    const done = () => {
      isViewportLoadingRef.current = false
      setIsViewportLoading(false)
    }
    if (elapsed < minMs) {
      setTimeout(done, minMs - elapsed)
    } else {
      done()
    }
  }

	const cancelPendingPlaygroundRequests = useCallback(() => {
		if (playgroundFetchControllersRef.current.size === 0 && inFlightRegionLoadsRef.current.size === 0) {
			return
		}
		playgroundFetchControllersRef.current.forEach((controller) => controller.abort())
		playgroundFetchControllersRef.current.clear()
		inFlightRegionLoadsRef.current.clear()
		requestViewportLoadingOff()
	}, [requestViewportLoadingOff])
  
	useEffect(() => {
		return () => {
			cancelPendingPlaygroundRequests()
		}
	}, [cancelPendingPlaygroundRequests])
  
  // 캐시 시스템 로더
  const smartLoader = useRef(new SmartKindergartenLoader())
  const cacheRegionData = (
    rawSidoCode?: number | string | null,
    rawSggCode?: number | string | null,
    data: KindergartenMapData[] = [],
  ) => {
    if (rawSidoCode === undefined || rawSidoCode === null) return
    if (rawSggCode === undefined || rawSggCode === null) return
    const sidoStr = String(rawSidoCode).trim()
    const sggStr = String(rawSggCode).trim()
    if (!sidoStr || !sggStr) return
    allFacilitiesRef.current = data
    const typeKey = selectedType || urlType || 'all'
    lastRegionKeyRef.current = `${sidoStr}_${sggStr}_${typeKey}`
    initialLoadCompletedRef.current = true
    initialLoadInProgressRef.current = false
  }
  
  // 코드를 지역명으로 변환하는 함수
  const findRegionNameByCode = (sidoCode: number, sggCode: number) => {
    // 간단한 매핑 (실제로는 더 완전한 매핑이 필요)
    const regionMap: { [key: string]: { sido: string, sgg: string } } = {
      '11140': { sido: '서울특별시', sgg: '중구' },
      '11680': { sido: '서울특별시', sgg: '강남구' },
      '11740': { sido: '서울특별시', sgg: '강동구' },
      '11305': { sido: '서울특별시', sgg: '강북구' },
      '11500': { sido: '서울특별시', sgg: '강서구' },
      '11620': { sido: '서울특별시', sgg: '관악구' },
      '11215': { sido: '서울특별시', sgg: '광진구' },
      '11530': { sido: '서울특별시', sgg: '구로구' },
      '11545': { sido: '서울특별시', sgg: '금천구' },
      '11350': { sido: '서울특별시', sgg: '노원구' },
      '11320': { sido: '서울특별시', sgg: '도봉구' },
      '11230': { sido: '서울특별시', sgg: '동대문구' },
      '11590': { sido: '서울특별시', sgg: '동작구' },
      '11440': { sido: '서울특별시', sgg: '마포구' },
      '11410': { sido: '서울특별시', sgg: '서대문구' },
      '11650': { sido: '서울특별시', sgg: '서초구' },
      '11200': { sido: '서울특별시', sgg: '성동구' },
      '11710': { sido: '서울특별시', sgg: '송파구' },
      '11470': { sido: '서울특별시', sgg: '양천구' },
      '11560': { sido: '서울특별시', sgg: '영등포구' },
      '11170': { sido: '서울특별시', sgg: '용산구' },
      '11380': { sido: '서울특별시', sgg: '은평구' },
      '11110': { sido: '서울특별시', sgg: '종로구' },
      '11260': { sido: '서울특별시', sgg: '중랑구' }
    }
    
    const region = regionMap[sggCode.toString()]
    if (region) {
      return region
    }
    
    // 기본값 (중구)
    return { sido: '서울특별시', sgg: '중구' }
  }
  
  // URL 파라미터에서 타입 가져오기 (기본값: all)
  const urlType = searchParams.get('type') as 'kindergarten' | 'childcare' | 'playground' | null
  const initialType = urlType || 'all'
  
  const [kindergartens, setKindergartens] = useState<KindergartenMapData[]>([])
  const [filteredKindergartens, setFilteredKindergartens] = useState<KindergartenMapData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance')
  const [selectedType, setSelectedType] = useState<'all' | 'kindergarten' | 'childcare' | 'playground'>(initialType as any)
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null)
  const [selectedKindergarten, setSelectedKindergarten] = useState<KindergartenMapData | null>(null)
  const [isListVisible, setIsListVisible] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [listHeight, setListHeight] = useState(1) // 0: 완전숨김, 1: 10% 표시, 2: 크게 표시
  const [currentLocationMarker, setCurrentLocationMarker] = useState<any>(null)
  const [currentLocationOuterRing, setCurrentLocationOuterRing] = useState<any>(null)
  const isPlaygroundSelected = selectedType === 'playground' || urlType === 'playground'

  // 헤더 제목 설정
  const getHeaderTitle = () => {
    switch (urlType) {
      case 'kindergarten':
        return '유치원'
      case 'childcare':
        return '어린이집'
      case 'playground':
        return '놀이시설'
      default:
        return '유치원 & 어린이집'
    }
  }

  // 샘플 유치원/어린이집 데이터 생성
  const generateSampleKindergartens = async (centerLat: number, centerLng: number, type: string, currentLat?: number, currentLng?: number): Promise<KindergartenMapData[]> => {
    const sampleNames = {
      kindergarten: [
        '사랑유치원', '꿈나무유치원', '햇살유치원', '별빛유치원', '미래유치원',
        '행복유치원', '희망유치원', '사랑나무유치원', '꿈의유치원', '새싹유치원',
        '한마음유치원', '온누리유치원', '사랑빛유치원', '꿈터유치원', '희망나무유치원'
      ],
      childcare: [
        '사랑어린이집', '꿈나무어린이집', '햇살어린이집', '별빛어린이집', '미래어린이집',
        '행복어린이집', '희망어린이집', '사랑나무어린이집', '꿈의어린이집', '새싹어린이집',
        '한마음어린이집', '온누리어린이집', '사랑빛어린이집', '꿈터어린이집', '희망나무어린이집'
      ]
    }

    const establishments = ['국공립', '사립', '법인', '민간']
    const officeEdu = ['서울특별시교육청', '경기도교육청', '인천광역시교육청']
    
    // 현재 위치에 따른 지역명 결정
    const getRegionName = (lat: number, lng: number) => {
      if (lat >= 37.55 && lat <= 37.65 && lng >= 126.95 && lng <= 127.1) {
        return '서울시 중구'
      } else if (lat >= 37.57 && lat <= 37.61 && lng >= 126.95 && lng <= 127.0) {
        return '서울시 종로구'
      } else if (lat >= 37.52 && lat <= 37.56 && lng >= 126.95 && lng <= 127.05) {
        return '서울시 용산구'
      } else if (lat >= 37.5 && lat <= 37.6 && lng >= 127.0 && lng <= 127.1) {
        return '서울시 강남구'
      } else {
        return '서울시 중구'
      }
    }

    // 실제 GPS 위치에서 역지오코딩을 통해 올바른 지역 정보 가져오기
    let actualRegionInfo = { sido: '서울특별시', sgg: '중구', sidoCode: 11, sggCode: 11140 }
    try {
      const reverseGeocodeResult = await reverseGeocodeWithCache(centerLat, centerLng)
      if (reverseGeocodeResult) {
        actualRegionInfo = {
          sido: reverseGeocodeResult.sidoName,
          sgg: reverseGeocodeResult.sggName,
          sidoCode: reverseGeocodeResult.kindergartenSidoCode,
          sggCode: reverseGeocodeResult.kindergartenSggCode
        }
        console.log(`📍 실제 지역 정보: ${actualRegionInfo.sido} ${actualRegionInfo.sgg} (${actualRegionInfo.sidoCode}, ${actualRegionInfo.sggCode})`)
      }
    } catch (error) {
      console.warn('역지오코딩 실패, 기본값 사용:', error)
    }

    const regionName = getRegionName(centerLat, centerLng)
    const streetNames = ['테헤란로', '강남대로', '서초대로', '올림픽대로', '세종대로', '을지로', '종로', '명동길', '남대문로', '태평로']
    
    const data: KindergartenMapData[] = []
    const names = type === 'all' 
      ? [...sampleNames.kindergarten, ...sampleNames.childcare]
      : sampleNames[type as keyof typeof sampleNames] || sampleNames.kindergarten

    for (let i = 0; i < 20; i++) {
      const name = names[Math.floor(Math.random() * names.length)]
      const isKindergarten = name.includes('유치원')
      const lat = centerLat + (Math.random() - 0.5) * 0.015 // 약 1.5km 반경으로 축소
      const lng = centerLng + (Math.random() - 0.5) * 0.015
      const streetName = streetNames[Math.floor(Math.random() * streetNames.length)]
      
      data.push({
        id: `sample_${i}`,
        name: `${name}`,
        address: `${regionName} ${streetName} ${100 + i}번길 ${i + 1}`,
        lat,
        lng,
        type: isKindergarten ? 'kindergarten' : 'childcare',
        establishment: establishments[Math.floor(Math.random() * establishments.length)],
        officeedu: officeEdu[Math.floor(Math.random() * officeEdu.length)],
        telno: `02-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        opertime: ['08:00-17:00', '09:00-18:00', '07:30-19:00', '08:30-16:30'][Math.floor(Math.random() * 4)],
        prmstfcnt: Math.floor(Math.random() * 80) + 30,
        ag3fpcnt: Math.floor(Math.random() * 20) + 5,
        ag4fpcnt: Math.floor(Math.random() * 20) + 5,
        ag5fpcnt: Math.floor(Math.random() * 20) + 5,
        hpaddr: `https://${name.replace(/[^가-힣a-zA-Z0-9]/g, '')}.com`,
        rating: 0.0, // 부모들이 별점을 남기면 그걸 기반으로 할 예정
        distance: currentLat && currentLng 
          ? calculateDistance(currentLat, currentLng, lat, lng)
          : 0,
        image: undefined, // 실제 이미지가 없으므로 undefined로 설정
        // 실제 GPS 위치에서 역지오코딩으로 가져온 지역 정보
        sidoCode: actualRegionInfo.sidoCode,
        sggCode: actualRegionInfo.sggCode
      })
    }

    return data.sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }

  // 카카오맵 API 로드
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    
    const loadKakaoMap = () => {
      // 이미 로드된 경우 스킵
      if (window.kakao && window.kakao.maps) {
        console.log('카카오 맵이 이미 로드됨')
        initializeMap()
        loadCurrentLocationOnly()
        return
      }

      // 안드로이드 환경 감지
      const isAndroid = /Android/i.test(navigator.userAgent) || 
                       (window as any).Capacitor?.getPlatform() === 'android' ||
                       window.location.protocol === 'file:'
      
      console.log('플랫폼 감지:', {
        userAgent: navigator.userAgent,
        capacitor: (window as any).Capacitor?.getPlatform(),
        protocol: window.location.protocol,
        isAndroid
      })

      // 환경변수 확인 및 디버깅 (React 환경변수 사용)
      const kakaoKey = process.env.REACT_APP_KAKAO_MAP_KEY
      console.log('카카오맵 키 확인:', kakaoKey ? '키 존재' : '키 없음')
      console.log('REACT_APP_KAKAO_MAP_KEY:', process.env.REACT_APP_KAKAO_MAP_KEY)

      // 키가 없으면 에러 메시지 표시
      if (!kakaoKey || kakaoKey === 'YOUR_KAKAO_MAP_KEY') {
        console.error('카카오맵 API 키가 설정되지 않았습니다.')
        const errorMsg = isAndroid 
          ? '카카오맵 API 키가 설정되지 않았습니다.\n앱을 다시 빌드하고 실행해주세요.'
          : '카카오맵 API 키가 설정되지 않았습니다.\n환경변수 파일(.env)에 REACT_APP_KAKAO_MAP_KEY를 설정해주세요.'
        alert(errorMsg)
        return
      }

      // HTML에서 이미 스크립트가 로드되어 있는지 확인
      const existingScript = document.querySelector('script[src*="dapi.kakao.com"]')
      if (existingScript) {
        console.log('카카오 맵 스크립트가 이미 존재함')
        // 스크립트가 로드되었지만 아직 초기화되지 않은 경우
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            console.log('카카오 맵 초기화 완료')
            initializeMap()
            loadCurrentLocationOnly()
          })
        } else {
          // 스크립트 로드 대기
          const checkKakao = setInterval(() => {
            if (window.kakao && window.kakao.maps) {
              clearInterval(checkKakao)
              window.kakao.maps.load(() => {
                console.log('카카오 맵 초기화 완료')
                initializeMap()
                loadCurrentLocationOnly()
              })
            }
          }, 100)
          
          // 15초 후 타임아웃 (안드로이드에서 더 오래 기다림)
          setTimeout(() => {
            clearInterval(checkKakao)
            console.error('카카오 맵 로드 타임아웃')
            alert('카카오맵을 로드하는데 시간이 오래 걸리고 있습니다.\n네트워크 연결을 확인해주세요.')
          }, 15000)
        }
        return
      }

      // 스크립트가 없으면 동적으로 로드
      const script = document.createElement('script')
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false`
      script.async = true
      
      // iOS/Capacitor에서는 crossOrigin 설정하지 않음 (카카오맵 호환성 문제)
      // crossOrigin 설정은 웹 브라우저에서만 필요하며, 네이티브 앱에서는 문제를 일으킬 수 있음
      
      const handleScriptError = (error: any) => {
        retryCount++
        console.error(`카카오 맵 스크립트 로드 실패 (시도 ${retryCount}/${maxRetries}):`, error)
        console.error('사용된 키:', kakaoKey)
        console.error('플랫폼:', isAndroid ? 'Android' : 'Web')
        console.error('User Agent:', navigator.userAgent)
        console.error('현재 URL:', window.location.href)
        console.error('프로토콜:', window.location.protocol)
        console.error('스크립트 URL:', script.src)
        
        if (error instanceof Event) {
          console.error('에러 타입:', error.type)
          console.error('에러 타겟:', error.target)
        } else {
          console.error('에러 메시지:', String(error))
        }
        
        // 재시도 로직
        if (retryCount < maxRetries) {
          console.log(`${2000 * retryCount}ms 후 재시도...`)
          setTimeout(() => {
            // 기존 스크립트 제거
            const existingScript = document.querySelector('script[src*="dapi.kakao.com"]')
            if (existingScript) {
              existingScript.remove()
            }
            // 재시도
            loadKakaoMap()
          }, 2000 * retryCount)
        } else {
          console.error('카카오맵 스크립트 로드 최종 실패')
          const errorMsg = isAndroid 
            ? '카카오맵을 로드할 수 없습니다.\n앱을 다시 빌드하고 실행해주세요.\n네트워크 연결을 확인해주세요.'
            : '카카오맵을 로드할 수 없습니다.\n네트워크 연결과 API 키를 확인해주세요.\n카카오 개발자 콘솔에서 플랫폼 설정을 확인해주세요.'
          alert(errorMsg)
        }
      }
      
      script.onerror = handleScriptError
      
      script.onload = () => {
        console.log('카카오 맵 스크립트 로드 성공')
        console.log('플랫폼:', isAndroid ? 'Android' : 'Web')
        console.log('User Agent:', navigator.userAgent)
        
        // 안드로이드에서는 더 긴 대기 시간 필요
        const loadTimeout = isAndroid ? 10000 : 3000
        
        const checkKakao = setInterval(() => {
          if (window.kakao && window.kakao.maps) {
            clearInterval(checkKakao)
            console.log('카카오 맵 API 객체 확인됨, 초기화 시작')
            window.kakao.maps.load(() => {
              console.log('카카오 맵 초기화 완료')
              initializeMap()
              loadCurrentLocationOnly()
            })
          }
        }, 100)
        
        // 타임아웃 설정
        setTimeout(() => {
          clearInterval(checkKakao)
          if (!window.kakao || !window.kakao.maps) {
            console.error('카카오 맵 API 초기화 타임아웃')
            console.error('window.kakao:', window.kakao)
            console.error('window.kakao.maps:', window.kakao?.maps)
            const errorMsg = isAndroid 
              ? '카카오맵 초기화에 실패했습니다.\n앱을 다시 빌드하고 실행해주세요.'
              : '카카오맵 API가 로드되지 않았습니다.'
            alert(errorMsg)
          }
        }, loadTimeout)
      }
      
      document.head.appendChild(script)
    }

    // 안드로이드 환경에서는 더 긴 지연 시간 적용
    const isAndroid = /Android/i.test(navigator.userAgent)
    const delay = isAndroid ? 1000 : 100
    const timer = setTimeout(loadKakaoMap, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  // 지도 초기화 (Android에서는 네이티브 SDK, 웹에서는 JavaScript SDK)
  const initializeMap = async () => {
    // 개발 모드(StrictMode)에서 이펙트가 두 번 호출되는 것을 방지
    if (mapInitializedRef.current) {
      return
    }
    if (!mapRef.current) {
      console.error('지도 컨테이너를 찾을 수 없습니다')
      return
    }

    // 현재는 JavaScript SDK만 사용 (Android SDK 설정 완료 후 네이티브 사용)
    // const isCapacitorApp = (window as any).Capacitor?.isNativePlatform()
    // const isAndroidApp = (window as any).Capacitor?.getPlatform() === 'android'
    
    // if (isCapacitorApp && isAndroidApp) {
    //   try {
    //     console.log('네이티브 카카오맵 SDK로 지도 초기화')
    //     const result = await KakaoMapPlugin.initializeMap({ lat: 37.5665, lng: 126.9780 })
    //     console.log('네이티브 지도 초기화 완료:', result)
    //     return
    //   } catch (error) {
    //     console.error('네이티브 지도 초기화 실패:', error)
    //     console.log('JavaScript SDK로 폴백')
    //   }
    // }

    // JavaScript SDK 사용 (웹 또는 네이티브 실패 시)
    if (!window.kakao || !window.kakao.maps) {
      console.error('카카오 맵 API가 로드되지 않았습니다')
      console.error('window.kakao:', window.kakao)
      console.error('window.kakao.maps:', window.kakao?.maps)
      return
    }

    try {
      const defaultPosition = new window.kakao.maps.LatLng(37.5665, 126.9780) // 서울시청
      const options = {
        center: defaultPosition,
        level: 5
      }

      // 지도 컨테이너 크기 명시적 설정 (Android에서 타일 깨짐 방지)
      if (mapRef.current) {
        mapRef.current.style.width = '100%'
        mapRef.current.style.height = '100%'
        mapRef.current.style.minHeight = '400px'
        mapRef.current.style.position = 'relative'
        mapRef.current.style.overflow = 'hidden'
        mapRef.current.style.backgroundColor = '#f5f5f5'
      }
      
      mapInstance.current = new window.kakao.maps.Map(mapRef.current, options)
      infowindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 1 })
      
      // 지도 타일 로딩 완료 대기
      window.kakao.maps.event.addListener(mapInstance.current, 'tilesloaded', () => {
        console.log('지도 타일 로딩 완료')
        // 타일 로딩 완료 후 지도 새로고침 (Android에서 타일 깨짐 방지)
        setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.relayout()
            console.log('지도 레이아웃 새로고침 완료')
            
            // Android에서 타일이 안 보이는 경우 강제 새로고침
            setTimeout(() => {
              if (mapInstance.current) {
                const currentCenter = mapInstance.current.getCenter()
                const currentLevel = mapInstance.current.getLevel()
                mapInstance.current.setCenter(currentCenter)
                mapInstance.current.setLevel(currentLevel)
                console.log('지도 타일 강제 새로고침 완료')
              }
            }, 500)
          }
        }, 1000)
      })
      
      // 사용자 드래그 시작/종료 감지
      window.kakao.maps.event.addListener(mapInstance.current, 'dragstart', () => {
        isDraggingRef.current = true
        if (viewportDebounceRef.current) {
          clearTimeout(viewportDebounceRef.current)
          viewportDebounceRef.current = null
        }
      })
      window.kakao.maps.event.addListener(mapInstance.current, 'dragend', () => {
        isDraggingRef.current = false
        scheduleViewportUpdate()
      })

      // 확대/축소 변경 완료 후 업데이트 (줌 변경 시 한 번만)
      window.kakao.maps.event.addListener(mapInstance.current, 'zoom_changed', () => {
        // 드래그 중이면 스킵
        if (isDraggingRef.current) return
        scheduleViewportUpdate()
      })

      // 폴백: idle에서도 드래그 중이 아닐 때만 동작 (혹시 다른 코드에서 setCenter 호출 시)
      window.kakao.maps.event.addListener(mapInstance.current, 'idle', () => {
        if (isDraggingRef.current) return
        scheduleViewportUpdate()
      })
      
      // 지도 크기 변경 이벤트 (Android에서 타일 깨짐 방지)
      window.kakao.maps.event.addListener(mapInstance.current, 'resize', () => {
        console.log('지도 크기 변경됨')
        setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.relayout()
          }
        }, 100)
      })
      
      console.log('JavaScript 지도 초기화 성공')
      console.log('지도 인스턴스:', mapInstance.current)
      mapInitializedRef.current = true
    } catch (error) {
      console.error('지도 초기화 실패:', error)
      if (error instanceof Error) {
        console.error('에러 상세:', error.message)
        console.error('스택 트레이스:', error.stack)
      } else {
        console.error('에러 상세:', String(error))
      }
    }
  }

  // 현재 위치만 가져오기 (검색하지 않음) - 자동 GPS 활성화
  const loadCurrentLocationOnly = () => {
    if (isLoadingNearby || loadingRef.current) {
      console.log('이미 로딩 중이므로 위치 로드 건너뜀')
      return
    }
    
    // 자동으로 GPS 활성화
    showCurrentLocation()
  }


  // GPS 재시도 횟수 상태
  const [gpsRetryCount, setGpsRetryCount] = useState(0)
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [isGpsActive, setIsGpsActive] = useState(false)
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null)
  const [gpsTimeoutId, setGpsTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [firstGpsResult, setFirstGpsResult] = useState<{lat: number, lng: number, accuracy: number} | null>(null)

  // GPS 요청 취소 함수
  const cancelGpsRequest = (reason?: string) => {
    let hadActiveRequest = false
    
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId)
      setGpsWatchId(null)
      hadActiveRequest = true
    }
    if (gpsTimeoutId !== null) {
      clearTimeout(gpsTimeoutId)
      setGpsTimeoutId(null)
      hadActiveRequest = true
    }
    setIsGpsLoading(false)
    setIsGpsActive(false)
    setGpsRetryCount(0)
    
    // 실제로 활성화된 요청이 있을 때만 취소 메시지 출력
    if (hadActiveRequest) {
      console.log(`GPS 요청이 취소되었습니다.${reason ? ` (${reason})` : ''}`)
    }
  }

  // 현재 위치를 초록색 점으로 표시 (정확도 개선)
  const showCurrentLocation = () => {
    if (navigator.geolocation) {
      // 기존 GPS 요청이 있으면 취소
      cancelGpsRequest('새로운 위치 요청')
      
      setIsGpsLoading(true)
      
      // 더 정확한 위치 정보 요청
      const options = {
        enableHighAccuracy: true, // 높은 정확도 사용
        timeout: 30000, // 30초 타임아웃 (웹에서는 더 오래 걸림)
        maximumAge: 0 // 캐시된 위치 정보 사용 안함
      }
      
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          const accuracy = position.coords.accuracy
          
          console.log(`GPS 위치 (시도 ${gpsRetryCount + 1}):`, { lat, lng, accuracy })
          
          // 첫 번째 결과 저장
          if (gpsRetryCount === 0) {
            setFirstGpsResult({ lat, lng, accuracy })
            console.log('첫 번째 GPS 결과 저장:', { lat, lng, accuracy })
          }
          
          // 위치 정확도가 매우 낮으면 (10km 이상) 재시도하지 않고 바로 사용
          if (accuracy > 10000) {
            console.warn(`위치 정확도가 매우 낮습니다. (오차: ${Math.round(accuracy)}m) - 현재 위치를 사용합니다.`)
            alert(`GPS 정확도가 매우 낮습니다. (오차: ${Math.round(accuracy)}m)\n현재 위치를 사용합니다.`)
          }
          // 위치 정확도가 낮으면 (2km 이상) 재시도 (최대 1번만)
          else if (accuracy > 2000 && gpsRetryCount === 0) {
            console.warn(`위치 정확도가 낮습니다. (오차: ${Math.round(accuracy)}m) - 재시도 중... (1/1)`)
            
            // 재시도 카운트 증가
            setGpsRetryCount(1)
            
            // 3초 후 재시도 (기존 요청 취소하지 않음)
            const timeoutId = setTimeout(() => {
              // 새로운 GPS 요청 시작 (기존 요청은 그대로 두고)
              if (navigator.geolocation) {
                const newWatchId = navigator.geolocation.watchPosition(
                  (newPosition) => {
                    const newLat = newPosition.coords.latitude
                    const newLng = newPosition.coords.longitude
                    const newAccuracy = newPosition.coords.accuracy
                    
                    console.log(`GPS 위치 (재시도):`, { lat: newLat, lng: newLng, accuracy: newAccuracy })
                    
                    // 재시도 결과도 정확도가 낮으면 첫 번째 결과 사용
                    if (newAccuracy > 2000) {
                      console.warn(`재시도 후에도 정확도가 낮습니다. (오차: ${Math.round(newAccuracy)}m) - 첫 번째 결과를 사용합니다.`)
                      
                      if (firstGpsResult) {
                        console.log('첫 번째 GPS 결과 사용:', firstGpsResult)
                        const { lat: firstLat, lng: firstLng } = firstGpsResult
                        
                        // GPS 요청 중지
                        navigator.geolocation.clearWatch(newWatchId)
                        setGpsWatchId(null)
                        
                        setCurrentLocation({ lat: firstLat, lng: firstLng })
                        setGpsRetryCount(0)
                        setIsGpsLoading(false)
                        setIsGpsActive(true)
                        
                        // 지도 업데이트
                        if (mapInstance.current) {
                          const moveLatLon = new window.kakao.maps.LatLng(firstLat, firstLng)
                          mapInstance.current.setCenter(moveLatLon)
                          mapInstance.current.setLevel(3)
                          
                          // 현재 위치 마커 표시
                          const gpsMarker = new window.kakao.maps.CustomOverlay({
                            position: moveLatLon,
                            content: `
                              <div style="
                                position: relative;
                                width: 20px;
                                height: 20px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                              ">
                                <div style="
                                  position: absolute;
                                  width: 40px;
                                  height: 40px;
                                  background: #4285f4;
                                  border-radius: 50%;
                                  opacity: 0.2;
                                  animation: pulse 2s infinite;
                                  transform: translate(-50%, -50%);
                                  top: 50%;
                                  left: 50%;
                                "></div>
                                <div style="
                                  position: relative;
                                  width: 20px;
                                  height: 20px;
                                  background: #4285f4;
                                  border: 3px solid #ffffff;
                                  border-radius: 50%;
                                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                  z-index: 1;
                                "></div>
                              </div>
                              <style>
                                @keyframes pulse {
                                  0% { 
                                    transform: translate(-50%, -50%) scale(1); 
                                    opacity: 0.2; 
                                  }
                                  50% { 
                                    transform: translate(-50%, -50%) scale(1.2); 
                                    opacity: 0.1; 
                                  }
                                  100% { 
                                    transform: translate(-50%, -50%) scale(1); 
                                    opacity: 0.2; 
                                  }
                                }
                              </style>
                            `,
                            yAnchor: 0.5,
                            xAnchor: 0.5
                          })
                          
                          gpsMarker.setMap(mapInstance.current)
                          setCurrentLocationMarker(gpsMarker)
                          setCurrentLocationOuterRing(null)
                          
                          // 첫 번째 위치 주변 유치원 검색
                          console.log('첫 번째 GPS 위치에서 근처 유치원 검색 시작')
                          setListHeight(2)
                          loadNearbyKindergartens(firstLat, firstLng)
                        }
                      }
                    } else {
                      // 재시도 결과가 좋으면 사용
                      console.log('재시도 GPS 결과 사용:', { lat: newLat, lng: newLng, accuracy: newAccuracy })
                      
                      // GPS 요청 중지
                      navigator.geolocation.clearWatch(newWatchId)
                      setGpsWatchId(null)
                      
                      setCurrentLocation({ lat: newLat, lng: newLng })
                      setGpsRetryCount(0)
                      setIsGpsLoading(false)
                      setIsGpsActive(true)
                      
                      // 지도 업데이트
                      if (mapInstance.current) {
                        const moveLatLon = new window.kakao.maps.LatLng(newLat, newLng)
                        mapInstance.current.setCenter(moveLatLon)
                        mapInstance.current.setLevel(3)
                        
                        // 현재 위치 마커 표시
                        const gpsMarker = new window.kakao.maps.CustomOverlay({
                          position: moveLatLon,
                          content: `
                            <div style="
                              position: relative;
                              width: 20px;
                              height: 20px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                            ">
                              <div style="
                                position: absolute;
                                width: 40px;
                                height: 40px;
                                background: #4285f4;
                                border-radius: 50%;
                                opacity: 0.2;
                                animation: pulse 2s infinite;
                                transform: translate(-50%, -50%);
                                top: 50%;
                                left: 50%;
                              "></div>
                              <div style="
                                position: relative;
                                width: 20px;
                                height: 20px;
                                background: #4285f4;
                                border: 3px solid #ffffff;
                                border-radius: 50%;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                z-index: 1;
                              "></div>
                            </div>
                            <style>
                              @keyframes pulse {
                                0% { 
                                  transform: translate(-50%, -50%) scale(1); 
                                  opacity: 0.2; 
                                }
                                50% { 
                                  transform: translate(-50%, -50%) scale(1.2); 
                                  opacity: 0.1; 
                                }
                                100% { 
                                  transform: translate(-50%, -50%) scale(1); 
                                  opacity: 0.2; 
                                }
                              }
                            </style>
                          `,
                          yAnchor: 0.5,
                          xAnchor: 0.5
                        })
                        
                        gpsMarker.setMap(mapInstance.current)
                        setCurrentLocationMarker(gpsMarker)
                        setCurrentLocationOuterRing(null)
                        
                        // 재시도 위치 주변 유치원 검색
                        console.log('재시도 GPS 위치에서 근처 유치원 검색 시작')
                        setListHeight(2)
                        loadNearbyKindergartens(newLat, newLng)
                      }
                    }
                  },
                  (error) => {
                    console.error('재시도 GPS 오류:', error)
                    let errorMessage = '알 수 없는 오류'
                    switch(error.code) {
                      case error.PERMISSION_DENIED:
                        errorMessage = '위치 권한이 거부되었습니다'
                        break
                      case error.POSITION_UNAVAILABLE:
                        errorMessage = '위치 정보를 사용할 수 없습니다'
                        break
                      case error.TIMEOUT:
                        errorMessage = '위치 요청 시간 초과'
                        break
                    }
                    console.log(`GPS 오류: ${errorMessage}`)
                    
                    // 재시도 실패 시 첫 번째 결과 사용
                    if (firstGpsResult) {
                      console.log('재시도 실패, 첫 번째 GPS 결과 사용:', firstGpsResult)
                      const { lat: firstLat, lng: firstLng } = firstGpsResult
                      
                      navigator.geolocation.clearWatch(newWatchId)
                      setGpsWatchId(null)
                      
                      setCurrentLocation({ lat: firstLat, lng: firstLng })
                      setGpsRetryCount(0)
                      setIsGpsLoading(false)
                      setIsGpsActive(true)
                      
                      // 지도 업데이트
                      if (mapInstance.current) {
                        const moveLatLon = new window.kakao.maps.LatLng(firstLat, firstLng)
                        mapInstance.current.setCenter(moveLatLon)
                        mapInstance.current.setLevel(3)
                        
                        // 현재 위치 마커 표시
                        const gpsMarker = new window.kakao.maps.CustomOverlay({
                          position: moveLatLon,
                          content: `
                            <div style="
                              position: relative;
                              width: 20px;
                              height: 20px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                            ">
                              <div style="
                                position: absolute;
                                width: 40px;
                                height: 40px;
                                background: #4285f4;
                                border-radius: 50%;
                                opacity: 0.2;
                                animation: pulse 2s infinite;
                                transform: translate(-50%, -50%);
                                top: 50%;
                                left: 50%;
                              "></div>
                              <div style="
                                position: relative;
                                width: 20px;
                                height: 20px;
                                background: #4285f4;
                                border: 3px solid #ffffff;
                                border-radius: 50%;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                z-index: 1;
                              "></div>
                            </div>
                            <style>
                              @keyframes pulse {
                                0% { 
                                  transform: translate(-50%, -50%) scale(1); 
                                  opacity: 0.2; 
                                }
                                50% { 
                                  transform: translate(-50%, -50%) scale(1.2); 
                                  opacity: 0.1; 
                                }
                                100% { 
                                  transform: translate(-50%, -50%) scale(1); 
                                  opacity: 0.2; 
                                }
                              }
                            </style>
                          `,
                          yAnchor: 0.5,
                          xAnchor: 0.5
                        })
                        
                        gpsMarker.setMap(mapInstance.current)
                        setCurrentLocationMarker(gpsMarker)
                        setCurrentLocationOuterRing(null)
                        
                        // 첫 번째 위치 주변 유치원 검색
                        console.log('첫 번째 GPS 위치에서 근처 유치원 검색 시작')
                        setListHeight(2)
                        loadNearbyKindergartens(firstLat, firstLng)
                      }
                    }
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 30000,
                    maximumAge: 0
                  }
                )
                setGpsWatchId(newWatchId)
              }
            }, 3000)
            setGpsTimeoutId(timeoutId)
            return
          }
          // 1번 시도 후에도 정확도가 낮으면 첫 번째 결과 사용
          else if (accuracy > 2000) {
            console.warn(`1번 시도 후에도 정확도가 낮습니다. (오차: ${Math.round(accuracy)}m) - 첫 번째 결과를 사용합니다.`)
            
            // 첫 번째 결과가 있으면 사용
            if (firstGpsResult) {
              console.log('첫 번째 GPS 결과 사용:', firstGpsResult)
              const { lat: firstLat, lng: firstLng } = firstGpsResult
              
              setCurrentLocation({ lat: firstLat, lng: firstLng })
              setGpsRetryCount(0)
              setIsGpsLoading(false)
              setIsGpsActive(true)
              
              // 기존 현재 위치 마커 제거
              if (currentLocationMarker) {
                currentLocationMarker.setMap(null)
              }
              if (currentLocationOuterRing) {
                currentLocationOuterRing.setMap(null)
              }
              
              // 지도 중심을 첫 번째 위치로 이동
              if (mapInstance.current) {
                const moveLatLon = new window.kakao.maps.LatLng(firstLat, firstLng)
                mapInstance.current.setCenter(moveLatLon)
                mapInstance.current.setLevel(3)
                
                // 현재 위치 마커 표시
                const gpsMarker = new window.kakao.maps.CustomOverlay({
                  position: moveLatLon,
                  content: `
                    <div style="
                      position: relative;
                      width: 20px;
                      height: 20px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    ">
                      <div style="
                        position: absolute;
                        width: 40px;
                        height: 40px;
                        background: #4285f4;
                        border-radius: 50%;
                        opacity: 0.2;
                        animation: pulse 2s infinite;
                        transform: translate(-50%, -50%);
                        top: 50%;
                        left: 50%;
                      "></div>
                      <div style="
                        position: relative;
                        width: 20px;
                        height: 20px;
                        background: #4285f4;
                        border: 3px solid #ffffff;
                        border-radius: 50%;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        z-index: 1;
                      "></div>
                    </div>
                    <style>
                      @keyframes pulse {
                        0% { 
                          transform: translate(-50%, -50%) scale(1); 
                          opacity: 0.2; 
                        }
                        50% { 
                          transform: translate(-50%, -50%) scale(1.2); 
                          opacity: 0.1; 
                        }
                        100% { 
                          transform: translate(-50%, -50%) scale(1); 
                          opacity: 0.2; 
                        }
                      }
                    </style>
                  `,
                  yAnchor: 0.5,
                  xAnchor: 0.5
                })
                
                gpsMarker.setMap(mapInstance.current)
                setCurrentLocationMarker(gpsMarker)
                setCurrentLocationOuterRing(null)
                
                // 첫 번째 위치 주변 유치원 검색
                console.log('첫 번째 GPS 위치에서 근처 유치원 검색 시작')
                setListHeight(2)
                loadNearbyKindergartens(firstLat, firstLng)
              }
              return
            } else {
              // 첫 번째 결과가 없으면 현재 결과 사용
              console.warn('첫 번째 결과가 없어 현재 위치를 사용합니다.')
              alert(`GPS 정확도가 낮습니다. (오차: ${Math.round(accuracy)}m)\n현재 위치를 사용합니다.`)
            }
          }
          
          // GPS 요청 성공 시 watch 중지
          navigator.geolocation.clearWatch(watchId)
          setGpsWatchId(null)
          
          setCurrentLocation({ lat, lng })
          setGpsRetryCount(0) // 성공 시 재시도 카운트 리셋
          setIsGpsLoading(false)
          setIsGpsActive(true) // GPS 활성화 상태로 설정
          
          // 기존 현재 위치 마커 제거
          if (currentLocationMarker) {
            currentLocationMarker.setMap(null)
          }
          if (currentLocationOuterRing) {
            currentLocationOuterRing.setMap(null)
          }
          
          // 지도 중심을 현재 위치로 이동
          if (mapInstance.current) {
            const moveLatLon = new window.kakao.maps.LatLng(lat, lng)
            mapInstance.current.setCenter(moveLatLon)
            mapInstance.current.setLevel(3)
            
            // 화면에 일정한 크기로 표시하기 위해 CustomOverlay 사용
            const gpsMarker = new window.kakao.maps.CustomOverlay({
              position: moveLatLon,
              content: `
                <div style="
                  position: relative;
                  width: 20px;
                  height: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <!-- 펄스 애니메이션 링 -->
                  <div style="
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    background: #4285f4;
                    border-radius: 50%;
                    opacity: 0.2;
                    animation: pulse 2s infinite;
                    transform: translate(-50%, -50%);
                    top: 50%;
                    left: 50%;
                  "></div>
                  <!-- 메인 마커 -->
                  <div style="
                    position: relative;
                    width: 20px;
                    height: 20px;
                    background: #4285f4;
                    border: 3px solid #ffffff;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    z-index: 1;
                  "></div>
                </div>
                <style>
                  @keyframes pulse {
                    0% { 
                      transform: translate(-50%, -50%) scale(1); 
                      opacity: 0.2; 
                    }
                    50% { 
                      transform: translate(-50%, -50%) scale(1.2); 
                      opacity: 0.1; 
                    }
                    100% { 
                      transform: translate(-50%, -50%) scale(1); 
                      opacity: 0.2; 
                    }
                  }
                </style>
              `,
              yAnchor: 0.5,
              xAnchor: 0.5
            })
            
            // 기존 마커 제거
            if (currentLocationMarker) {
              currentLocationMarker.setMap(null)
            }
            if (currentLocationOuterRing) {
              currentLocationOuterRing.setMap(null)
            }
            
            // 새로운 GPS 마커를 지도에 추가
            gpsMarker.setMap(mapInstance.current)
            setCurrentLocationMarker(gpsMarker)
            setCurrentLocationOuterRing(null) // CustomOverlay는 하나로 통합
            
            // 현재 위치 주변 유치원 검색 실행
            console.log('GPS 위치에서 근처 유치원 검색 시작')
            setListHeight(2)
            loadNearbyKindergartens(lat, lng)
          }
        },
        (error) => {
          console.error('위치 정보 오류:', error)
          // GPS 요청 실패 시 watch 중지
          navigator.geolocation.clearWatch(watchId)
          setGpsWatchId(null)
          
          setIsGpsLoading(false)
          setIsGpsActive(false)
          setGpsRetryCount(0)
          
          let errorMessage = '위치 정보를 가져올 수 없습니다.'
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 접근 권한이 거부되었습니다.\n설정에서 위치 권한을 허용해주세요.'
              console.error('위치 권한 거부됨')
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 사용할 수 없습니다.\nGPS를 켜고 다시 시도해주세요.'
              console.error('위치 정보 사용 불가')
              break
            case error.TIMEOUT:
              errorMessage = '위치 요청 시간이 초과되었습니다.\n네트워크 연결을 확인하고 다시 시도해주세요.'
              console.error('위치 요청 타임아웃')
              break
          }
          
          alert(errorMessage)
        },
        options
      )
      
      setGpsWatchId(watchId)
    } else {
      alert('위치 서비스를 지원하지 않는 브라우저입니다.')
    }
  }

  // 검색 실행 함수
  const handleSearch = () => {
    setListHeight(2) // 검색 시 큰 리스트 표시
    if (currentLocation) {
      // 현재 위치가 있으면 근처 검색
      loadNearbyKindergartens(currentLocation.lat, currentLocation.lng)
    } else {
      // 현재 위치가 없으면 기본 지역 검색
      loadKindergartensByRegion('서울특별시', '강남구')
    }
  }

  // 중복 실행 방지를 위한 플래그
  const [isLoadingNearby, setIsLoadingNearby] = useState(false)
  const loadingRef = useRef(false)
  const lastRequestRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  // 현재 위치 주변 유치원/어린이집 검색
  const loadNearbyKindergartens = async (lat: number, lng: number) => {
    const requestKey = `${lat.toFixed(6)}_${lng.toFixed(6)}`
    
    if (isLoadingNearby || loadingRef.current || lastRequestRef.current === requestKey) {
      console.log('이미 로딩 중이거나 동일한 요청이므로 중복 실행 방지')
      return
    }
    
    // 놀이시설 모드에서는 초기 근처 유치원/어린이집 로딩을 스킵하고
    // 뷰포트 기반 로딩(loadFacilitiesForViewport)에 위임한다.
    if (selectedType === 'playground' || urlType === 'playground') {
      console.log('놀이시설 모드 - 초기 근처 로딩 스킵, 뷰포트 로딩으로 처리')
      setLoading(false)
      initialLoadInProgressRef.current = false
      initialLoadCompletedRef.current = false
      return
    }

    initialLoadInProgressRef.current = true
    initialLoadCompletedRef.current = false
    
    // 기존 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 새로운 AbortController 생성
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    lastRequestRef.current = requestKey
    loadingRef.current = true
    setIsLoadingNearby(true)
    setLoading(true)
    try {
      // 어린이집 타입인 경우 캐시 우선 시스템 사용
      if (selectedType === 'childcare' || urlType === 'childcare') {
        console.log('어린이집 캐시 시스템을 사용하여 데이터 로딩')
        
        let regionSidoCode: number | null = null
        let regionSggCode: number | null = null
        try {
          // 카카오 역지오코딩으로 정확한 행정구역 찾기
          console.log('어린이집용 역지오코딩으로 정확한 지역 찾기 시작')
          const regionResult = await reverseGeocodeWithCache(lat, lng)
          
          if (!regionResult) {
            console.error('어린이집 역지오코딩 실패')
            // 하드코딩 폴백 사용
            const fallbackData = await generateSampleKindergartens(lat, lng, 'childcare', lat, lng)
            setKindergartens(() => fallbackData)
            setFilteredKindergartens(() => fallbackData)
            addViewportMarkers(fallbackData)
            setLoading(false)
            return
          }

          const { sidoName, sggName, childcareArcode } = regionResult
          regionSidoCode = regionResult.kindergartenSidoCode ?? null
          regionSggCode = regionResult.kindergartenSggCode ?? null
          
          if (!childcareArcode) {
            console.warn('어린이집 지역코드(arcode)를 찾을 수 없습니다')
            // 폴백으로 근처 어린이집 검색 사용
            const childcareData = await fetchNearbyChildcare(lat, lng, 10)
            console.log('폴백 API 결과:', childcareData.length, '개')
            
            if (childcareData.length > 0) {
              const mapDataPromises = childcareData.map(item => transformToMapData(item, lat, lng, undefined))
              const mapData: KindergartenMapData[] = (await Promise.all(mapDataPromises))
                .sort((a, b) => (a.distance || 0) - (b.distance || 0))
              
              setKindergartens(() => mapData)
              setFilteredKindergartens(() => mapData)
              cacheRegionData(regionSidoCode, regionSggCode, mapData)
              addViewportMarkers(mapData)
            }
            setLoading(false)
            return
          }

          // 캐시 시스템을 통한 어린이집 데이터 로딩
          console.log('어린이집 캐시 시스템을 통한 데이터 로딩 시작')
          console.log('지역:', sidoName, sggName, 'arcode:', childcareArcode)
          
          // 스마트 로더를 통한 데이터 로딩 (캐시 우선)
          const { smartChildcareLoader } = await import('../utils/smartChildcareLoader')
          const result = await smartChildcareLoader.loadChildcareData(childcareArcode, `${sidoName} ${sggName}`)
          
          console.log('어린이집 캐시 로딩 결과:', {
            source: result.source,
            dataCount: result.data.length,
            loadTime: result.loadTime + 'ms'
          })
          
          if (result.error) {
            throw new Error(`어린이집 데이터 로딩 실패: ${result.error}`)
          }

          if (result.data.length > 0) {
            // 어린이집 데이터를 지도용 데이터로 변환 (지오코딩 포함)
            console.log('어린이집 지오코딩 시작...')
            const mapDataPromises = result.data.map(item => transformToMapData(item, lat, lng, childcareArcode))
            const mapData: KindergartenMapData[] = (await Promise.all(mapDataPromises))
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
            
            console.log(`✅ 어린이집 데이터 변환 완료: ${mapData.length}개`)
            
            // 리뷰 평점 업데이트 후 설정 (어린이집: childcare 리뷰 평점 사용)
            const updatedData = await updateChildcareRatings(mapData)
            setKindergartens(() => updatedData)
            setFilteredKindergartens(() => updatedData)
            cacheRegionData(regionSidoCode, regionSggCode, updatedData)
            addViewportMarkers(updatedData)
          } else {
            console.log('근처에 어린이집이 없습니다.')
            setKindergartens([])
            setFilteredKindergartens([])
            cacheRegionData(regionSidoCode, regionSggCode, [])
          }
        } catch (childcareError) {
          console.error('어린이집 캐시 시스템 오류:', childcareError)
          // 캐시 시스템 실패 시 샘플 데이터 사용
          const sampleData = await generateSampleKindergartens(lat, lng, 'childcare', lat, lng)
          setKindergartens(() => sampleData)
          setFilteredKindergartens(() => sampleData)
          cacheRegionData(regionSidoCode, regionSggCode, sampleData)
          addViewportMarkers(sampleData)
        }
      } else {
        // 유치원인 경우 새로운 캐시 시스템 사용
        // 카카오 역지오코딩으로 정확한 행정구역 찾기
        console.log('카카오 역지오코딩으로 정확한 지역 찾기 시작')
        const regionResult = await reverseGeocodeWithCache(lat, lng)
        
        if (!regionResult) {
          console.error('역지오코딩 실패')
          // 하드코딩 폴백 사용
          const fallbackData = await generateSampleKindergartens(lat, lng, 'kindergarten', lat, lng)
          setKindergartens(() => fallbackData)
          setFilteredKindergartens(() => fallbackData)
          allFacilitiesRef.current = fallbackData
          addViewportMarkers(fallbackData)
          setLoading(false)
          return
        }
        
        const { sidoName, sggName, kindergartenSidoCode: sidoCode, kindergartenSggCode: sggCode } = regionResult
        
        // 캐시 시스템을 통한 유치원 데이터 로딩
        console.log('캐시 시스템을 통한 데이터 로딩 시작')
        console.log('지역:', sidoName, sggName)
        console.log('시도코드:', sidoCode, '시군구코드:', sggCode)
        
        // 지역명은 역지오코딩 결과 사용
        const regionName = { sido: sidoName, sgg: sggName }
        console.log('지역명:', regionName)
        
        // 현재 위치의 구에만 있는 유치원 데이터 로딩 (경계 폴백 제거)
        console.log('현재 지역의 유치원만 로딩:', regionName.sido, regionName.sgg)

        // 스마트 로더를 통한 데이터 로딩 (캐시 우선)
        const result = await smartLoader.current.loadKindergartenData(regionName.sido, regionName.sgg)

        console.log('캐시 로딩 결과:', {
          source: result.source,
          dataCount: result.data.length,
          loadTime: result.loadTime + 'ms'
        })

        if (result.error) {
          throw new Error(`데이터 로딩 실패: ${result.error}`)
        }

        // 현재 지역 데이터만 사용 (주변 지역 데이터 제외)
        const data = {
          status: 'SUCCESS',
          kinderInfo: result.data
        }
        
        console.log('캐시에서 로드된 데이터:', data)
        
        // API 응답 구조 디버깅
        console.log('API 응답 키들:', Object.keys(data))
        console.log('kinderInfo 타입:', typeof data.kinderInfo)
        console.log('kinderInfo 길이:', data.kinderInfo?.length)
        
        if (data.kinderInfo && data.kinderInfo.length > 0) {
          // API 데이터를 지도용 데이터로 변환
          console.log('🔍 데이터 변환 시작 - 원본 데이터 샘플:', data.kinderInfo[0])
          
          const kindergartenData: KindergartenMapData[] = data.kinderInfo
            .filter((item: any) => {
              const itemLat = safeParseFloat(item.lttdcdnt)
              const itemLng = safeParseFloat(item.lngtcdnt)
              const isValid = isValidCoordinate(itemLat, itemLng)
              if (!isValid) {
                console.warn(`❌ 유효하지 않은 좌표: ${item.kindername} - lat: ${itemLat}, lng: ${itemLng}`)
              }
              return isValid
            })
            .map((item: any): KindergartenMapData => {
              const itemLat = safeParseFloat(item.lttdcdnt)
              const itemLng = safeParseFloat(item.lngtcdnt)
              
              // 거리 계산 디버깅
              const calculatedDistance = calculateDistance(lat, lng, itemLat, itemLng)
              console.log(`거리 계산: 현재위치(${lat}, ${lng}) -> 유치원(${itemLat}, ${itemLng}) = ${calculatedDistance.toFixed(2)}km`)
              
              return {
                id: String(item.kinderCode || item.kindercode || item.kcode),
                code: String(item.kinderCode || item.kindercode || item.kcode),
                name: item.kindername || '유치원명 없음',
                address: item.addr || '주소 없음',
                lat: itemLat,
                lng: itemLng,
                type: 'kindergarten',
                establishment: getEstablishmentType(item.establish),
                officeedu: item.officeedu || '교육청 정보 없음',
                telno: item.telno || '',
                opertime: item.opertime || '',
                prmstfcnt: parseInt(item.prmstfcnt) || 0,
                ag3fpcnt: parseInt(item.ag3fpcnt) || 0,
                ag4fpcnt: parseInt(item.ag4fpcnt) || 0,
                ag5fpcnt: parseInt(item.ag5fpcnt) || 0,
                hpaddr: item.hpaddr || '',
                rating: 0.0, // 부모들이 별점을 남기면 그걸 기반으로 할 예정
                distance: calculatedDistance,
                image: undefined, // 실제 이미지가 없으므로 undefined로 설정
                // 지역 정보 추가
                sidoCode: sidoCode,
                sggCode: sggCode
              }
            })
            .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0))
          
          console.log(`✅ 데이터 변환 완료: ${kindergartenData.length}개 유효한 유치원`)
          
          console.log('변환된 유치원 데이터:', kindergartenData)
          
          // 커스텀 이미지 주입 후 리뷰 평점 업데이트
          const withImages = await injectKindergartenImages(kindergartenData)
          const updatedData = await updateKindergartenRatings(withImages)
          setKindergartens(() => updatedData)
          setFilteredKindergartens(() => updatedData)
          cacheRegionData(sidoCode, sggCode, updatedData)
          addViewportMarkers(updatedData)
        } else {
          console.log('API에서 유치원 데이터를 찾을 수 없음')
          console.log('API 응답 전체:', data)
          
          // 다른 지역 코드로 재시도
          console.log('다른 지역 코드로 재시도 중...')
          const found = await tryAlternativeRegionCodes(lat, lng)
          
          if (!found) {
            // 데이터가 없으면 빈 배열로 설정
            setKindergartens([])
            setFilteredKindergartens([])
            cacheRegionData(sidoCode, sggCode, [])
          }
          // 기존 마커들 제거
          if (mapInstance.current) {
            const markers = document.querySelectorAll('.marker')
            markers.forEach(marker => marker.remove())
          }
        }
      }
      
    } catch (error) {
      // AbortError는 무시 (요청이 취소된 경우)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('API 요청이 취소되었습니다.')
        return
      }
      
      console.error('근처 유치원 검색 오류:', error)
      alert('유치원 정보를 가져오는 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.')
      
      // 오류 시 빈 배열로 설정
      setKindergartens([])
      setFilteredKindergartens([])
    } finally {
      setLoading(false)
      setIsLoadingNearby(false)
      loadingRef.current = false
      abortControllerRef.current = null
      // 5초 후에 lastRequestRef 초기화 (동일한 위치 재요청 허용)
      setTimeout(() => {
        lastRequestRef.current = ''
      }, 5000)
    initialLoadInProgressRef.current = false
    if (allFacilitiesRef.current && !initialLoadCompletedRef.current) {
      initialLoadCompletedRef.current = true
    }
    }
  }

  // 지역별 유치원 검색
  const loadKindergartensByRegion = async (sido: string, sgg: string) => {
    setLoading(true)
    initialLoadInProgressRef.current = true
    initialLoadCompletedRef.current = false
    const { sidoCode, sggCode } = findRegionCodes(sido, sgg)
    try {
      // 어린이집 타입인 경우 전국어린이집 포털 API 사용
      if (selectedType === 'childcare' || urlType === 'childcare') {
        console.log('전국어린이집 포털 API를 사용하여 지역별 어린이집 데이터 로딩')
        
        try {
          // 시군구코드로 어린이집 검색 (간단한 매핑)
          const arcode = getArcodeByRegion(sido, sgg)
          const childcareData = await fetchChildcareData(arcode)
          console.log('전국어린이집 포털 API 결과:', childcareData.length, '개')
          
          if (childcareData.length > 0) {
            // 어린이집 데이터를 지도용 데이터로 변환 (지오코딩 포함)
            console.log('지역별 지오코딩 시작...')
            console.log('🔍 arcode 전달:', arcode)
            const mapDataPromises = childcareData.map(item => transformToMapData(item, currentLocation?.lat, currentLocation?.lng, arcode))
            const mapData: KindergartenMapData[] = (await Promise.all(mapDataPromises))
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
            
            console.log(`✅ 지역별 어린이집 데이터 변환 완료: ${mapData.length}개`)
            
            setKindergartens(() => mapData)
            setFilteredKindergartens(() => mapData)
            cacheRegionData(sidoCode, sggCode, mapData)
            addViewportMarkers(mapData)
          } else {
            console.log('해당 지역에 어린이집이 없습니다.')
            setKindergartens([])
            setFilteredKindergartens([])
            cacheRegionData(sidoCode, sggCode, [])
          }
        } catch (childcareError) {
          console.error('전국어린이집 포털 API 오류:', childcareError)
          // 어린이집 API 실패 시 샘플 데이터 사용
          const centerLat = 37.5665
          const centerLng = 126.9780
          const sampleData = await generateSampleKindergartens(centerLat, centerLng, 'childcare', currentLocation?.lat, currentLocation?.lng)
          setKindergartens(() => sampleData)
          setFilteredKindergartens(() => sampleData)
          cacheRegionData(sidoCode, sggCode, sampleData)
          addViewportMarkers(sampleData)
        }
      } else {
        // 유치원인 경우 기존 로직 사용
        if (!process.env.REACT_APP_KINDERGARTEN_API_KEY) {
          throw new Error('API 키가 설정되지 않았습니다. REACT_APP_KINDERGARTEN_API_KEY 환경변수를 확인해주세요.')
        }
        // 유치원알리미 API 호출 - CORS 프록시 사용
        const kindergartenApiUrl = `https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do?key=${process.env.REACT_APP_KINDERGARTEN_API_KEY}&sidoCode=${sidoCode}&sggCode=${sggCode}`
        
        console.log('지역별 API 호출 시도:', kindergartenApiUrl)
        
        // CORS 프록시를 통한 API 호출
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kindergartenApiUrl)}`
        console.log(`지역별 프록시를 통한 API 호출: ${proxyUrl}`)
        
        const response = await fetch(proxyUrl, {
              method: 'GET',
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              }
            })
            
        if (!response.ok) {
          throw new Error(`지역별 프록시 API 호출 실패: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('지역별 API 응답 데이터:', data)
        
        if (data.kinderInfo && data.kinderInfo.length > 0) {
          // API 데이터를 지도용 데이터로 변환
          const centerLat = 37.5665
          const centerLng = 126.9780
          
          console.log('🔍 거리 계산 - currentLocation:', currentLocation)
          
          // 지도 중심 좌표 가져오기 (fallback)
          let mapCenter = { lat: centerLat, lng: centerLng }
          if (mapInstance.current) {
            const center = mapInstance.current.getCenter()
            mapCenter = { lat: center.getLat(), lng: center.getLng() }
            console.log('🔍 지도 중심 좌표:', mapCenter)
          }
          
          const baseLocation = currentLocation || mapCenter
          
          const kindergartenData = data.kinderInfo
            .filter((item: any) => isValidCoordinate(parseFloat(item.lttdcdnt), parseFloat(item.lngtcdnt)))
            .map((item: any) => ({
              id: String(item.kinderCode || item.kindercode || item.kcode),
              code: String(item.kinderCode || item.kindercode || item.kcode),
              name: item.kindername,
              address: item.addr,
              lat: parseFloat(item.lttdcdnt),
              lng: parseFloat(item.lngtcdnt),
              type: 'kindergarten',
              establishment: getEstablishmentType(item.establish),
              officeedu: item.officeedu,
              telno: item.telno,
              opertime: item.opertime,
              prmstfcnt: parseInt(item.prmstfcnt) || 0,
              ag3fpcnt: parseInt(item.ag3fpcnt) || 0,
              ag4fpcnt: parseInt(item.ag4fpcnt) || 0,
              ag5fpcnt: parseInt(item.ag5fpcnt) || 0,
              hpaddr: item.hpaddr,
              rating: 0.0, // 부모들이 별점을 남기면 그걸 기반으로 할 예정
              distance: calculateDistance(baseLocation.lat, baseLocation.lng, parseFloat(item.lttdcdnt), parseFloat(item.lngtcdnt)),
              image: undefined,
              sidoCode: sidoCode,
              sggCode: sggCode
            }))

          const withImages = await injectKindergartenImages(kindergartenData)
          const updatedData = await updateKindergartenRatings(withImages)
          setKindergartens(() => updatedData)
          setFilteredKindergartens(() => updatedData)
          cacheRegionData(sidoCode, sggCode, updatedData)
          addViewportMarkers(updatedData)
          requestViewportLoadingOff()
        } else {
          console.log('지역별 API에서 유치원 데이터를 찾을 수 없음, 샘플 데이터 사용')
          // API 데이터가 없으면 샘플 데이터 사용
          const centerLat = 37.5665
          const centerLng = 126.9780
          const sampleData = await generateSampleKindergartens(centerLat, centerLng, selectedType, currentLocation?.lat, currentLocation?.lng)
          setKindergartens(() => sampleData)
          setFilteredKindergartens(() => sampleData)
          cacheRegionData(sidoCode, sggCode, sampleData)
          addViewportMarkers(sampleData)
        }
      }
    } catch (error) {
      console.error('유치원 데이터 로드 오류:', error)
      // API 오류 시 샘플 데이터 사용
      const centerLat = 37.5665
      const centerLng = 126.9780
      const sampleData = await generateSampleKindergartens(centerLat, centerLng, selectedType, currentLocation?.lat, currentLocation?.lng)
      setKindergartens(() => sampleData)
      setFilteredKindergartens(() => sampleData)
      cacheRegionData(sidoCode, sggCode, sampleData)
      addViewportMarkers(sampleData)
    } finally {
      setLoading(false)
      initialLoadInProgressRef.current = false
      if (allFacilitiesRef.current && !initialLoadCompletedRef.current) {
        initialLoadCompletedRef.current = true
      }
    }
  }

  // 시군구명으로 시군구코드 찾기
  const getArcodeByRegion = (sido: string, sgg: string): string => {
    // 간단한 매핑 (실제로는 더 완전한 매핑이 필요)
    const regionMap: { [key: string]: { [key: string]: string } } = {
      '서울특별시': {
        '중구': '11140',
        '종로구': '11110',
        '성동구': '11200',
        '용산구': '11170',
        '영등포구': '11560',
        '동작구': '11590',
        '관악구': '11620',
        '강남구': '11680',
        '강동구': '11740',
        '강북구': '11305',
        '강서구': '11500',
        '광진구': '11215',
        '구로구': '11530',
        '금천구': '11545',
        '노원구': '11350',
        '도봉구': '11320',
        '동대문구': '11230',
        '마포구': '11440',
        '서대문구': '11410',
        '서초구': '11650',
        '송파구': '11710',
        '양천구': '11470',
        '은평구': '11380',
        '중랑구': '11260'
      }
    }
    
    const sidoMap = regionMap[sido]
    if (sidoMap && sgg) {
      return sidoMap[sgg] || '11140' // 기본값: 서울시 중구
    }
    
    // 기본값: 서울시 중구
    return '11140'
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

  // 거리 계산 (하버사인 공식)
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

  // 대안 지역 코드로 재시도하는 함수
  const tryAlternativeRegionCodes = async (lat: number, lng: number) => {
    const alternativeCodes = [
      { sidoCode: 11, sggCode: 11140, name: '중구' },
      { sidoCode: 11, sggCode: 11110, name: '종로구' },
      { sidoCode: 11, sggCode: 11200, name: '성동구' },
      { sidoCode: 11, sggCode: 11170, name: '용산구' },
      { sidoCode: 11, sggCode: 11560, name: '영등포구' },
      { sidoCode: 11, sggCode: 11590, name: '동작구' },
      { sidoCode: 11, sggCode: 11620, name: '관악구' }
    ]

    for (const code of alternativeCodes) {
      try {
        if (!process.env.REACT_APP_KINDERGARTEN_API_KEY) {
          throw new Error('API 키가 설정되지 않았습니다. REACT_APP_KINDERGARTEN_API_KEY 환경변수를 확인해주세요.')
        }
        
        console.log(`${code.name}(${code.sggCode})로 재시도 중...`)
        
        // 429 오류 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const kindergartenApiUrl = `https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do?key=${process.env.REACT_APP_KINDERGARTEN_API_KEY}&sidoCode=${code.sidoCode}&sggCode=${code.sggCode}`
        
        // 대안 지역에서는 다른 프록시 사용
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kindergartenApiUrl)}`
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        
        if (response.ok) {
          const responseText = await response.text()
          const data = JSON.parse(responseText)
          
          if (data.kinderInfo && data.kinderInfo.length > 0) {
            console.log(`${code.name}에서 유치원 데이터 발견!`, data.kinderInfo.length, '개')
            
            // API 데이터를 지도용 데이터로 변환
            const kindergartenData = data.kinderInfo
              .filter((item: any) => isValidCoordinate(parseFloat(item.lttdcdnt), parseFloat(item.lngtcdnt)))
              .map((item: any) => ({
                id: String(item.kindercode || item.kcode),
                code: String(item.kindercode || item.kcode),
                name: item.kindername || '유치원명 없음',
                address: item.addr || '주소 없음',
                lat: parseFloat(item.lttdcdnt),
                lng: parseFloat(item.lngtcdnt),
                type: 'kindergarten',
                establishment: getEstablishmentType(item.establish),
                officeedu: item.officeedu || '교육청 정보 없음',
                telno: item.telno || '',
                opertime: item.opertime || '',
                prmstfcnt: parseInt(item.prmstfcnt) || 0,
                ag3fpcnt: parseInt(item.ag3fpcnt) || 0,
                ag4fpcnt: parseInt(item.ag4fpcnt) || 0,
                ag5fpcnt: parseInt(item.ag5fpcnt) || 0,
                hpaddr: item.hpaddr || '',
                rating: Math.random() * 2 + 3,
                distance: calculateDistance(lat, lng, parseFloat(item.lttdcdnt), parseFloat(item.lngtcdnt)),
                image: undefined, // 실제 이미지가 없으므로 undefined로 설정
                // 지역 정보 추가
                sidoCode: code.sidoCode,
                sggCode: code.sggCode
              }))
              .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0))
            
            // 리뷰 평점 업데이트 후 설정
            const withImages = await injectKindergartenImages(kindergartenData)
            const updatedData = await updateKindergartenRatings(withImages)
            setKindergartens(() => updatedData)
            setFilteredKindergartens(() => updatedData)
            addViewportMarkers(updatedData)
            return true
          }
        }
      } catch (error) {
        console.warn(`${code.name} 재시도 실패:`, error)
        continue
      }
    }
    
    console.log('모든 대안 지역에서도 데이터를 찾을 수 없음')
    alert('해당 지역에 유치원 데이터가 없습니다.\n다른 지역을 선택해보세요.')
    return false
  }

  // 정확한 지역 좌표 데이터
  const regionCoordinates = [
    // 서울특별시
    { name: '강남구', sidoCode: 11, sggCode: 11680, lat: 37.514575, lng: 127.0495556 },
    { name: '강동구', sidoCode: 11, sggCode: 11740, lat: 37.52736667, lng: 127.1258639 },
    { name: '강북구', sidoCode: 11, sggCode: 11305, lat: 37.63695556, lng: 127.0277194 },
    { name: '강서구', sidoCode: 11, sggCode: 11500, lat: 37.54815556, lng: 126.851675 },
    { name: '관악구', sidoCode: 11, sggCode: 11620, lat: 37.47538611, lng: 126.9538444 },
    { name: '광진구', sidoCode: 11, sggCode: 11215, lat: 37.53573889, lng: 127.0845333 },
    { name: '구로구', sidoCode: 11, sggCode: 11530, lat: 37.49265, lng: 126.8895972 },
    { name: '금천구', sidoCode: 11, sggCode: 11545, lat: 37.44910833, lng: 126.9041972 },
    { name: '노원구', sidoCode: 11, sggCode: 11350, lat: 37.65146111, lng: 127.0583889 },
    { name: '도봉구', sidoCode: 11, sggCode: 11320, lat: 37.66583333, lng: 127.0495222 },
    { name: '동대문구', sidoCode: 11, sggCode: 11230, lat: 37.571625, lng: 127.0421417 },
    { name: '동작구', sidoCode: 11, sggCode: 11590, lat: 37.50965556, lng: 126.941575 },
    { name: '마포구', sidoCode: 11, sggCode: 11440, lat: 37.56070556, lng: 126.9105306 },
    { name: '서대문구', sidoCode: 11, sggCode: 11410, lat: 37.57636667, lng: 126.9388972 },
    { name: '서초구', sidoCode: 11, sggCode: 11650, lat: 37.48078611, lng: 127.0348111 },
    { name: '성동구', sidoCode: 11, sggCode: 11200, lat: 37.56061111, lng: 127.039 },
    { name: '성북구', sidoCode: 11, sggCode: 11290, lat: 37.58638333, lng: 127.0203333 },
    { name: '송파구', sidoCode: 11, sggCode: 11710, lat: 37.51175556, lng: 127.1079306 },
    { name: '양천구', sidoCode: 11, sggCode: 11470, lat: 37.51423056, lng: 126.8687083 },
    { name: '영등포구', sidoCode: 11, sggCode: 11560, lat: 37.52361111, lng: 126.8983417 },
    { name: '용산구', sidoCode: 11, sggCode: 11170, lat: 37.53609444, lng: 126.9675222 },
    { name: '은평구', sidoCode: 11, sggCode: 11380, lat: 37.59996944, lng: 126.9312417 },
    { name: '종로구', sidoCode: 11, sggCode: 11110, lat: 37.57037778, lng: 126.9816417 },
    { name: '중구', sidoCode: 11, sggCode: 11140, lat: 37.56100278, lng: 126.9996417 },
    { name: '중랑구', sidoCode: 11, sggCode: 11260, lat: 37.60380556, lng: 127.0947778 },
    // 경기도 (주요 지역만)
    { name: '수원시', sidoCode: 41, sggCode: 41110, lat: 37.30101111, lng: 127.0122222 },
    { name: '성남시', sidoCode: 41, sggCode: 41130, lat: 37.44749167, lng: 127.1477194 },
    { name: '의정부시', sidoCode: 41, sggCode: 41150, lat: 37.73528889, lng: 127.0358417 },
    { name: '안양시', sidoCode: 41, sggCode: 41170, lat: 37.3897, lng: 126.9533556 },
    { name: '부천시', sidoCode: 41, sggCode: 41190, lat: 37.5035917, lng: 126.766 },
    { name: '광명시', sidoCode: 41, sggCode: 41210, lat: 37.47575, lng: 126.8667083 },
    { name: '평택시', sidoCode: 41, sggCode: 41220, lat: 36.98943889, lng: 127.1146556 },
    { name: '과천시', sidoCode: 41, sggCode: 41250, lat: 37.42637222, lng: 126.9898 },
    { name: '오산시', sidoCode: 41, sggCode: 41370, lat: 37.14691389, lng: 127.0796417 },
    { name: '시흥시', sidoCode: 41, sggCode: 41390, lat: 37.37731944, lng: 126.8050778 },
    { name: '군포시', sidoCode: 41, sggCode: 41410, lat: 37.35865833, lng: 126.9375 },
    { name: '의왕시', sidoCode: 41, sggCode: 41430, lat: 37.34195, lng: 126.9703889 },
    { name: '하남시', sidoCode: 41, sggCode: 41450, lat: 37.53649722, lng: 127.217 },
    { name: '용인시', sidoCode: 41, sggCode: 41460, lat: 37.23147778, lng: 127.2038444 },
    { name: '파주시', sidoCode: 41, sggCode: 41480, lat: 37.75708333, lng: 126.7819528 },
    { name: '이천시', sidoCode: 41, sggCode: 41500, lat: 37.27543611, lng: 127.4432194 },
    { name: '안성시', sidoCode: 41, sggCode: 41550, lat: 37.005175, lng: 127.2818444 },
    { name: '김포시', sidoCode: 41, sggCode: 41570, lat: 37.61245833, lng: 126.7177778 },
    { name: '화성시', sidoCode: 41, sggCode: 41590, lat: 37.19681667, lng: 126.8335306 },
    { name: '광주시', sidoCode: 41, sggCode: 41610, lat: 37.41450556, lng: 127.2577861 },
    { name: '여주시', sidoCode: 41, sggCode: 41630, lat: 37.29535833, lng: 127.6396222 },
    { name: '양평군', sidoCode: 41, sggCode: 41800, lat: 37.48893611, lng: 127.4898861 },
    { name: '고양시', sidoCode: 41, sggCode: 41280, lat: 37.65590833, lng: 126.7770556 },
    { name: '동두천시', sidoCode: 41, sggCode: 41250, lat: 37.90091667, lng: 127.0626528 },
    { name: '가평군', sidoCode: 41, sggCode: 41820, lat: 37.82883056, lng: 127.5117778 },
    { name: '연천군', sidoCode: 41, sggCode: 41830, lat: 38.09336389, lng: 127.0770667 },
    // 인천광역시
    { name: '계양구', sidoCode: 28, sggCode: 28410, lat: 37.53770728, lng: 126.737744 },
    { name: '남구', sidoCode: 28, sggCode: 28140, lat: 37.46369169, lng: 126.6502972 },
    { name: '남동구', sidoCode: 28, sggCode: 28200, lat: 37.44971062, lng: 126.7309669 },
    { name: '동구', sidoCode: 28, sggCode: 28170, lat: 37.47401607, lng: 126.6432441 },
    { name: '부평구', sidoCode: 28, sggCode: 28260, lat: 37.50784204, lng: 126.7219068 },
    { name: '서구', sidoCode: 28, sggCode: 28245, lat: 37.54546372, lng: 126.6759616 },
    { name: '연수구', sidoCode: 28, sggCode: 28185, lat: 37.41038125, lng: 126.6782658 },
    { name: '중구', sidoCode: 28, sggCode: 28110, lat: 37.47384843, lng: 126.6217617 },
    // 부산광역시
    { name: '강서구', sidoCode: 26, sggCode: 26440, lat: 35.20916389, lng: 128.9829083 },
    { name: '금정구', sidoCode: 26, sggCode: 26230, lat: 35.24007778, lng: 129.0943194 },
    { name: '남구', sidoCode: 26, sggCode: 26290, lat: 35.13340833, lng: 129.0865 },
    { name: '동구', sidoCode: 26, sggCode: 26170, lat: 35.13589444, lng: 129.059175 },
    { name: '동래구', sidoCode: 26, sggCode: 26260, lat: 35.20187222, lng: 129.0858556 },
    { name: '부산진구', sidoCode: 26, sggCode: 26200, lat: 35.15995278, lng: 129.0553194 },
    { name: '북구', sidoCode: 26, sggCode: 26320, lat: 35.19418056, lng: 128.992475 },
    { name: '사상구', sidoCode: 26, sggCode: 26530, lat: 35.14946667, lng: 128.9933333 },
    { name: '사하구', sidoCode: 26, sggCode: 26380, lat: 35.10142778, lng: 128.9770417 },
    { name: '서구', sidoCode: 26, sggCode: 26140, lat: 35.09483611, lng: 129.0263778 },
    { name: '수영구', sidoCode: 26, sggCode: 26500, lat: 35.14246667, lng: 129.115375 },
    { name: '연제구', sidoCode: 26, sggCode: 26470, lat: 35.17318611, lng: 129.082075 },
    { name: '영도구', sidoCode: 26, sggCode: 26200, lat: 35.08811667, lng: 129.0701861 },
    { name: '중구', sidoCode: 26, sggCode: 26110, lat: 35.10321667, lng: 129.0345083 },
    { name: '해운대구', sidoCode: 26, sggCode: 26350, lat: 35.16001944, lng: 129.1658083 },
    { name: '기장군', sidoCode: 26, sggCode: 26710, lat: 35.24477541, lng: 129.2222873 },
    // 대구광역시
    { name: '남구', sidoCode: 27, sggCode: 27200, lat: 35.84621351, lng: 128.597702 },
    { name: '달서구', sidoCode: 27, sggCode: 27290, lat: 35.82997744, lng: 128.5325905 },
    { name: '달성군', sidoCode: 27, sggCode: 27710, lat: 35.77475029, lng: 128.4313995 },
    { name: '동구', sidoCode: 27, sggCode: 27140, lat: 35.88682728, lng: 128.6355584 },
    { name: '북구', sidoCode: 27, sggCode: 27230, lat: 35.8858646, lng: 128.5828924 },
    { name: '서구', sidoCode: 27, sggCode: 27170, lat: 35.87194054, lng: 128.5591601 },
    { name: '수성구', sidoCode: 27, sggCode: 27260, lat: 35.85835148, lng: 128.6307011 },
    { name: '중구', sidoCode: 27, sggCode: 27110, lat: 35.86952722, lng: 128.6061745 },
    // 광주광역시
    { name: '광산구', sidoCode: 29, sggCode: 29200, lat: 35.13995836, lng: 126.793668 },
    { name: '남구', sidoCode: 29, sggCode: 29140, lat: 35.13301749, lng: 126.9025572 },
    { name: '동구', sidoCode: 29, sggCode: 29170, lat: 35.14627776, lng: 126.9230903 },
    { name: '북구', sidoCode: 29, sggCode: 29155, lat: 35.1812138, lng: 126.9010806 },
    { name: '서구', sidoCode: 29, sggCode: 29170, lat: 35.1525164, lng: 126.8895063 },
    // 대전광역시
    { name: '대덕구', sidoCode: 30, sggCode: 30230, lat: 36.35218384, lng: 127.4170933 },
    { name: '동구', sidoCode: 30, sggCode: 30110, lat: 36.31204028, lng: 127.4548596 },
    { name: '서구', sidoCode: 30, sggCode: 30170, lat: 36.35707299, lng: 127.3834158 },
    { name: '유성구', sidoCode: 30, sggCode: 30200, lat: 36.36405586, lng: 127.3561363 },
    { name: '중구', sidoCode: 30, sggCode: 30140, lat: 36.32582989, lng: 127.421381 },
    // 울산광역시
    { name: '남구', sidoCode: 31, sggCode: 31140, lat: 35.54404265, lng: 129.3301754 },
    { name: '동구', sidoCode: 31, sggCode: 31170, lat: 35.50516996, lng: 129.4166919 },
    { name: '북구', sidoCode: 31, sggCode: 31200, lat: 35.58270783, lng: 129.361245 },
    { name: '울주군', sidoCode: 31, sggCode: 31710, lat: 35.52230648, lng: 129.2424748 },
    { name: '중구', sidoCode: 31, sggCode: 31110, lat: 35.56971228, lng: 129.3328162 },
    // 세종특별자치시
    { name: '세종특별자치시', sidoCode: 36, sggCode: 36110, lat: 36.479522, lng: 127.289448 },
    // 제주특별자치도
    { name: '제주시', sidoCode: 50, sggCode: 50110, lat: 33.49631111, lng: 126.5332083 },
    { name: '서귀포시', sidoCode: 50, sggCode: 50130, lat: 33.25235, lng: 126.5125556 }
  ]

  // 위도/경도로 가장 가까운 시도/시군구 코드 찾기
  const findRegionCodesByLatLng = (lat: number, lng: number) => {
    console.log('현재 위치:', lat, lng)
    
    
    // 모든 지역과의 거리 계산
    let closestRegion = regionCoordinates[0]
    let minDistance = calculateDistance(lat, lng, closestRegion.lat, closestRegion.lng)
    
    for (const region of regionCoordinates) {
      const distance = calculateDistance(lat, lng, region.lat, region.lng)
      if (distance < minDistance) {
        minDistance = distance
        closestRegion = region
      }
    }
    
    console.log(`-> ${closestRegion.name} (${closestRegion.sggCode}) - 거리: ${minDistance.toFixed(2)}km`)
    return { sidoCode: closestRegion.sidoCode, sggCode: closestRegion.sggCode }
  }

  // 마커 오프셋 계산 함수 - 비슷한 위치의 마커들을 분산시킴
  const calculateMarkerOffsets = (data: KindergartenMapData[]): Map<string, { lat: number; lng: number }> => {
    const offsets = new Map<string, { lat: number; lng: number }>()
    if (!mapInstance.current || data.length === 0) return offsets
    
    // 줌 레벨에 따라 오프셋 크기 조정
    const zoomLevel = mapInstance.current.getLevel?.() ?? 3
    // 줌 레벨이 높을수록(숫자가 작을수록) 작은 오프셋 사용
    const baseOffsetRadius = 0.00015 // 약 17m 정도의 기본 오프셋 반경
    const offsetRadius = baseOffsetRadius * Math.max(0.5, Math.min(2, zoomLevel / 3))
    
    const threshold = 0.0001 // 약 11m 정도의 거리 (위도/경도 차이)
    
    // 위치 그룹화
    const groups: Array<KindergartenMapData[]> = []
    const processed = new Set<string>()
    
    data.forEach((item, index) => {
      const id = String(item.id)
      if (processed.has(id)) return
      
      const group: KindergartenMapData[] = [item]
      processed.add(id)
      
      // 같은 위치에 있는 다른 마커 찾기
      data.forEach((other, otherIndex) => {
        if (index === otherIndex) return
        const otherId = String(other.id)
        if (processed.has(otherId)) return
        
        const latDiff = Math.abs(item.lat - other.lat)
        const lngDiff = Math.abs(item.lng - other.lng)
        
        if (latDiff < threshold && lngDiff < threshold) {
          group.push(other)
          processed.add(otherId)
        }
      })
      
      if (group.length > 1) {
        groups.push(group)
      }
    })
    
    // 각 그룹 내에서 원형 패턴으로 분산
    groups.forEach((group) => {
      if (group.length === 1) return
      
      const centerLat = group[0].lat
      const centerLng = group[0].lng
      
      group.forEach((item, idx) => {
        const id = String(item.id)
        
        if (group.length === 2) {
          // 2개만 있을 때는 양옆으로, 첫 번째는 왼쪽, 두 번째는 오른쪽
          const offsetLng = idx === 0 ? -offsetRadius * 0.6 : offsetRadius * 0.6
          offsets.set(id, {
            lat: centerLat,
            lng: centerLng + offsetLng
          })
        } else if (group.length === 3) {
          // 3개일 때는 첫 번째는 중앙, 나머지는 양옆으로
          if (idx === 0) {
            // 첫 번째는 중앙 유지 (오프셋 없음)
            return
          } else {
            const offsetLng = idx === 1 ? -offsetRadius * 0.8 : offsetRadius * 0.8
            const offsetLat = offsetRadius * 0.3
            offsets.set(id, {
              lat: centerLat + offsetLat,
              lng: centerLng + offsetLng
            })
          }
        } else {
          // 4개 이상일 때는 원형으로 분산
          const angle = (2 * Math.PI * idx) / group.length
          const offsetLat = offsetRadius * Math.cos(angle)
          const offsetLng = offsetRadius * Math.sin(angle)
          
          offsets.set(id, {
            lat: centerLat + offsetLat,
            lng: centerLng + offsetLng
          })
        }
      })
    })
    
    return offsets
  }

  // 이벤트 리스너 등록을 위한 ref들
  const addMarkersToMap = (data: KindergartenMapData[]) => {
    if (!mapInstance.current) return

    // 집계 모드(district/city)에서는 마커를 표시하지 않음
    if (currentRenderModeRef.current !== 'markers') {
      markersRef.current.forEach((marker: any) => marker.setMap(null))
      overlaysRef.current.forEach((overlay: any) => overlay.setMap(null))
      return
    }

    // 기존 데이터 맵으로 빠른 조회
    const existing = markerByIdRef.current
    const incomingIds = new Set<string>()

    // 마커 오프셋 계산
    const markerOffsets = calculateMarkerOffsets(data)

    data.forEach((kindergarten) => {
      console.log('📍 마커 생성:', kindergarten.name, '거리:', kindergarten.distance?.toFixed(2) || '0', 'km')
      const id = String(kindergarten.id)
      
      // 오프셋 적용된 위치 사용
      const offset = markerOffsets.get(id)
      const finalLat = offset ? offset.lat : kindergarten.lat
      const finalLng = offset ? offset.lng : kindergarten.lng
      const position = new window.kakao.maps.LatLng(finalLat, finalLng)
      incomingIds.add(id)

      let entry = existing.get(id)

      if (!entry) {
        // 새 마커 생성
        const marker = new window.kakao.maps.Marker({
          position: position,
          map: mapInstance.current,
          title: kindergarten.name,
          zIndex: 1
        })

        const ratingOverlay = new window.kakao.maps.CustomOverlay({
          position: position,
          content: `
          <div style="
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            text-align: center;
            border: 1px solid #fff;
            position: relative;
            top: -38px;
            left: 0px;
          ">
            <span style="color:#fb8678;">❤</span> ${kindergarten.rating ? kindergarten.rating.toFixed(1) : '0.0'}
          </div>
        `,
          yAnchor: 1
        })

        // 마커 클릭 이벤트
        window.kakao.maps.event.addListener(marker, 'click', () => {
        // 기존 정보창 제거
        if (infoOverlayRef.current) {
          infoOverlayRef.current.setMap(null)
        }

        // 새로운 정보창 생성
        infoOverlayRef.current = new window.kakao.maps.CustomOverlay({
          position: position,
          zIndex: 10000,
          content: `
            <div style="
              background: white;
              border: 1px solid #ddd;
              border-radius: 12px;
              padding: 16px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15);
              min-width: 240px;
              max-width: 320px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              position: relative;
              top: -70px;
              left: 0px;
              z-index: 1000;
            ">
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #f0f0f0;
              ">
                <div style="
                  display: flex;
                  align-items: center;
                  flex: 1;
                ">
                  <div style="
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: ${kindergarten.type === 'kindergarten' ? '#4CAF50' : (kindergarten.type === 'childcare' ? '#2196F3' : '#9C27B0')};
                    margin-right: 8px;
                  "></div>
                  <h3 style="
                    margin: 0;
                    color: #333;
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 1.3;
                    word-break: keep-all;
                    overflow-wrap: break-word;
                    max-width: 240px;
                    white-space: normal;
                    hyphens: auto;
                  ">
                    ${kindergarten.name}
                  </h3>
                </div>
                <button 
                  onclick="window.closeInfoWindow && window.closeInfoWindow()"
                  style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #999;
                    cursor: pointer;
                    padding: 4px;
                    margin-left: 8px;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s;
                  "
                  onmouseover="this.style.backgroundColor='#f5f5f5'; this.style.color='#666'"
                  onmouseout="this.style.backgroundColor='transparent'; this.style.color='#999'"
                >
                  ×
                </button>
              </div>
              
              <div style="margin-bottom: 8px;">
                <p style="
                  margin: 0;
                  color: #666;
                  font-size: 13px;
                  line-height: 1.4;
                  word-break: keep-all;
                  overflow-wrap: break-word;
                  max-width: 260px;
                  white-space: normal;
                  hyphens: auto;
                ">
                  ${kindergarten.address}
                </p>
              </div>
              
              ${kindergarten.type === 'childcare' && (kindergarten as any).crceoname ? `
                <div style="margin-bottom: 8px;">
                  <p style="
                    margin: 0;
                    color: #666;
                    font-size: 12px;
                    line-height: 1.4;
                  ">
                    원장: ${(kindergarten as any).crceoname}
                  </p>
                </div>
              ` : ''}
              
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
              ">
                <div style="
                  color: #666;
                  font-size: 13px;
                  display: flex;
                  align-items: center;
                  gap: 4px;
                ">
                  <span style="color:#fb8678;">❤</span>
                  <span>칭찬 : ${kindergarten.rating ? kindergarten.rating.toFixed(1) : '0.0'}</span>
                </div>
                <div style="
                  color: #666;
                  font-size: 13px;
                ">
                  ${kindergarten.telno || '없음'}
                </div>
              </div>
              
              ${kindergarten.type === 'childcare' && (kindergarten as any).crcapat ? `
                <div style="margin-bottom: 8px;">
                  <p style="
                    margin: 0;
                    color: #666;
                    font-size: 12px;
                    line-height: 1.4;
                  ">
                    정원: ${(kindergarten as any).crcapat}명
                  </p>
                </div>
              ` : ''}
              
              <button id="detail-nav" style="
                width: 100%;
                background: linear-gradient(135deg, #fb8678 0%, #ff6b9d 100%);
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(251, 134, 120, 0.3);
              " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(251, 134, 120, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(251, 134, 120, 0.3)'">
                자세히 보기
              </button>
            </div>
          `,
          yAnchor: 1
        })

        infoOverlayRef.current.setMap(mapInstance.current)
        setSelectedKindergarten(kindergarten)
        // 클릭된 마커를 다른 마커들보다 위로 (하지만 모달보다는 아래)
        marker.setZIndex(100)

        // 내부 버튼 네비게이션을 React/JS에서 직접 연결 (샘플 라우팅 방지)
        setTimeout(() => {
          const el = document.getElementById('detail-nav')
          if (el) {
            el.onclick = () => {
              const type = kindergarten.type
              const id = encodeURIComponent(String(kindergarten.id))
              const sidoCode = String(kindergarten.sidoCode ?? '')
              const sggCode = String(kindergarten.sggCode ?? '')

              if (type === 'playground') {
                cancelPendingPlaygroundRequests()
                try {
                  window.sessionStorage.setItem(
                    'mompick:lastPlaygroundSelection',
                    JSON.stringify({
                      id: kindergarten.id,
                      code: kindergarten.code ?? kindergarten.id,
                      name: kindergarten.name,
                      address: kindergarten.address,
                      lat: kindergarten.lat,
                      lng: kindergarten.lng,
                      establishment: kindergarten.establishment,
                      officeedu: kindergarten.officeedu,
                      telno: kindergarten.telno ?? '',
                      opertime: kindergarten.opertime ?? '',
                      prmstfcnt: kindergarten.prmstfcnt ?? 0,
                      rating: kindergarten.rating ?? 0,
                      distance: kindergarten.distance ?? null,
                      image: kindergarten.image ?? '',
                      type: kindergarten.type,
                      sidoCode: kindergarten.sidoCode ?? null,
                      sggCode: kindergarten.sggCode ?? null,
                    }),
                  )
                } catch (storageError) {
                  console.warn('[PlaygroundDetail] 세션 저장 실패:', storageError)
                }

                const params = new URLSearchParams()
                if (sidoCode) params.set('sidoCode', sidoCode)
                if (sggCode) params.set('sggCode', sggCode)
                const query = params.toString()
                window.location.href = `/playground/${id}${query ? `?${query}` : ''}`
                return
              }

              if (type === 'childcare') {
                const url = `/childcare/${id}${sggCode ? `?arcode=${sggCode}` : ''}`
                window.location.href = url
              } else {
                const params = new URLSearchParams()
                if (sidoCode) params.set('sidoCode', sidoCode)
                if (sggCode) params.set('sggCode', sggCode)
                const query = params.toString()
                window.location.href = `/kindergarten/${id}${query ? `?${query}` : ''}`
              }
            }
          }
        }, 0)
      })

        // 저장 및 지도에 표시
        existing.set(id, { marker, ratingOverlay, data: kindergarten })
        marker.setMap(mapInstance.current)
        ratingOverlay.setMap(mapInstance.current)
      } else {
        // 기존 마커 재사용: 안전 가드 후 위치/제목/평점 업데이트
        if (!entry.marker) {
          // 마커가 사라졌다면 재생성
          const marker = new window.kakao.maps.Marker({
            position: position,
            map: mapInstance.current,
            title: kindergarten.name,
            zIndex: 1
          })
          entry.marker = marker
        }
        // 지도에 다시 붙인 후 업데이트 (내부 널 참조 방지)
        entry.marker.setMap(mapInstance.current)
        entry.marker.setPosition(position)
        if (typeof entry.marker.setTitle === 'function') {
          entry.marker.setTitle(kindergarten.name)
        }
        entry.marker.setZIndex(1)

        if (!entry.ratingOverlay) {
          entry.ratingOverlay = new window.kakao.maps.CustomOverlay({ position: position, content: '' })
        }
        entry.ratingOverlay.setPosition(position)
        entry.ratingOverlay.setContent(`
          <div style="
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            text-align: center;
            border: 1px solid #fff;
            position: relative;
            top: -38px;
            left: 0px;
          ">
            <span style="color:#fb8678;">❤</span> ${kindergarten.rating ? kindergarten.rating.toFixed(1) : '0.0'}
          </div>
        `)
        entry.ratingOverlay.setMap(mapInstance.current)
        entry.data = kindergarten
      }
    })

    // 화면 밖 마커는 숨기지 않고 유지하되, 필요하면 성능 위해 제거 로직을 여기에 추가 가능
    markersRef.current = Array.from(existing.values()).map(v => v.marker)
    overlaysRef.current = Array.from(existing.values()).map(v => v.ratingOverlay)
  }

  // 위도/경도 유효성 검사
  const isValidCoordinate = (lat: number, lng: number) => {
    // NaN 체크 및 유효한 범위 체크 (한국 좌표 범위)
    return !isNaN(lat) && !isNaN(lng) && 
           isFinite(lat) && isFinite(lng) &&
           lat !== 0 && lng !== 0 &&
           lat >= 33 && lat <= 43 && // 한국 위도 범위
           lng >= 124 && lng <= 132  // 한국 경도 범위
  }
  
  // 안전한 좌표 파싱 함수
  const safeParseFloat = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') {
      return defaultValue
    }
    const parsed = parseFloat(String(value))
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed
  }

  // 현재 지도 화면(뷰포트)에 해당하는 시설만 마킹
  const addViewportMarkers = (data: KindergartenMapData[]) => {
    if (!mapInstance.current) return
    if (isDraggingRef.current) return

    const level = mapInstance.current.getLevel?.() ?? 0
    const bounds = mapInstance.current.getBounds()
    const sw = bounds?.getSouthWest()
    const ne = bounds?.getNorthEast()
    const inView = (k: KindergartenMapData) => {
      if (!sw || !ne) return true
      return k.lat >= sw.getLat() && k.lat <= ne.getLat() && k.lng >= sw.getLng() && k.lng <= ne.getLng()
    }
    const filtered = data.filter(inView)

    const isPlaygroundMode = selectedType === 'playground' || urlType === 'playground'

    const sggSet = new Set<string>()
    const sidoSet = new Set<string>()
    for (const k of filtered) {
      if (k.sggCode) sggSet.add(String(k.sggCode))
      if (k.sidoCode) sidoSet.add(String(k.sidoCode))
    }

    const showCity = isPlaygroundMode
      ? level >= 8
      : (level >= 8) || (level >= 7 && sidoSet.size >= 2) || (sggSet.size >= 5)
    const showDistrict = isPlaygroundMode
      ? (!showCity) && level >= 7
      : (!showCity) && ((level >= 7) || (level >= 6 && sggSet.size >= 3))

    if (showCity) {
      requestViewportLoadingOn()
      ensureDataForBounds('city').finally(() => {
        renderAggregates('city')
        requestViewportLoadingOff()
      })
      return
    }
    if (showDistrict) {
      requestViewportLoadingOn()
      ensureDataForBounds('district').finally(() => {
        renderAggregates('district')
        requestViewportLoadingOff()
      })
      return
    }

    if (isPlaygroundMode) {
      aggregateOverlaysRef.current.forEach((o) => o.setMap(null))
      aggregateOverlaysRef.current = []
      currentRenderModeRef.current = 'markers'
      renderInProgressRef.current = true
      addMarkersToMap(filtered)
      renderInProgressRef.current = false
      requestViewportLoadingOff()
      return
    }

    // 히스테리시스(모드 지속성): 이미 집계 모드라면 약간 확대해도 유지 (질서: city > district > markers)
    if (currentRenderModeRef.current === 'city' && level >= 8) {
      requestViewportLoadingOn()
      renderAggregates('city')
      return
    }
    if (currentRenderModeRef.current === 'district' && !showCity && level >= 7) {
      requestViewportLoadingOn()
      renderAggregates('district')
      return
    }

    if (showCity) {
      requestViewportLoadingOn()
      ensureDataForBounds('city').finally(() => {
        renderAggregates('city')
        requestViewportLoadingOff()
      })
      return
    }
    if (showDistrict) {
      requestViewportLoadingOn()
      ensureDataForBounds('district').finally(() => {
        renderAggregates('district')
        requestViewportLoadingOff()
      })
      return
    }

    // 마커 모드: 집계 배지 제거 후 마커만 렌더 (배지와 동시 표시는 하지 않음)
    renderInProgressRef.current = true
    aggregateOverlaysRef.current.forEach(o => o.setMap(null))
    aggregateOverlaysRef.current = []
    currentRenderModeRef.current = 'markers'
    addMarkersToMap(filtered)
    renderInProgressRef.current = false
    requestViewportLoadingOff()
  }

  // 화면 경계 내 대표 지점들을 샘플링하여 인접 행정구 데이터를 미리 로드
  const ensureDataForBounds = async (mode: 'district' | 'city') => {
    try {
      if (!mapInstance.current) return
      const bounds = mapInstance.current.getBounds()
      if (!bounds) return
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      // 샘플 그리드: 구 모드는 3x3(표시 정확도 우선), 시/도 모드는 2x2(가벼움 우선)
      const latRatios = mode === 'district' ? [0, 0.5, 1] : [0, 1]
      const lngRatios = mode === 'district' ? [0, 0.5, 1] : [0, 1]
      const lats = latRatios.map(r => sw.getLat() + (ne.getLat() - sw.getLat()) * r)
      const lngs = lngRatios.map(r => sw.getLng() + (ne.getLng() - sw.getLng()) * r)
      const samples: Array<{ lat: number, lng: number }> = []
      lats.forEach(lat => lngs.forEach(lng => samples.push({ lat, lng })))

      // 역지오코딩으로 지역 코드 수집
		const results = await Promise.all(samples.map((p) => reverseGeocodeWithCache(p.lat, p.lng)))
		const regions = results.reduce<
			Array<{
				sidoName: string
				sggName: string
				sidoCode: number
				sggCode: number
				arcode: string
				hcode?: string
				sampleLat?: number
				sampleLng?: number
			}>
		>((acc, r: any, idx) => {
			if (!r) return acc
			const sample = samples[idx]
			acc.push({
				sidoName: r.sidoName,
				sggName: r.sggName,
				sidoCode: r.kindergartenSidoCode,
				sggCode: r.kindergartenSggCode,
				arcode: r.childcareArcode,
				hcode: r.hcode,
				sampleLat: sample?.lat,
				sampleLng: sample?.lng,
			})
			return acc
		}, [])

      // 중복 제거 + 대표 좌표 샘플링 저장
      const unique: Array<typeof regions[number]> = []
      const seen = new Set<string>()
		regions.forEach((reg) => {
        const key = `${reg.sidoCode}_${reg.sggCode}`
        if (!seen.has(key)) {
          seen.add(key)
          unique.push(reg)
				const sampleLat = reg.sampleLat
				const sampleLng = reg.sampleLng
				if (mode === 'district') {
					if (sampleLat !== undefined && sampleLng !== undefined) {
						sampledDistrictGroupsRef.current.set(String(reg.sggCode), {
							lat: sampleLat,
							lng: sampleLng,
							label: reg.sggName,
							sidoCode: reg.sidoCode,
							sggCode: reg.sggCode,
						})
					}
				} else {
					if (sampleLat !== undefined && sampleLng !== undefined) {
						sampledCityGroupsRef.current.set(String(reg.sidoCode), {
							lat: sampleLat,
							lng: sampleLng,
							label: reg.sidoName,
							sidoCode: reg.sidoCode,
						})
					}
				}
        }
      })

      // 이미 로드된 키는 제외
		const toLoad = unique.filter((reg) => {
			if (selectedType === 'childcare' || urlType === 'childcare') {
				const keyCc = `cc:${reg.arcode}`
				return !!reg.arcode && !loadedRegionKeysRef.current.has(keyCc)
			}
			if (selectedType === 'playground' || urlType === 'playground') {
				if (mode === 'city' || mode === 'district') {
					return false
				}
				const keyPg = reg.hcode ? `pg:${reg.hcode}` : reg.sggCode ? `pg:${reg.sidoCode}_${reg.sggCode}` : null
				return !!keyPg && !loadedRegionKeysRef.current.has(keyPg)
			}
			const keyKg = `kg:${reg.sidoName}/${reg.sggName}`
			return !loadedRegionKeysRef.current.has(keyKg)
		})

		if (toLoad.length === 0) return
		if (selectedType === 'childcare' || urlType === 'childcare') {
        const { smartChildcareLoader } = await import('../utils/smartChildcareLoader')
        const loadedArrays: KindergartenMapData[] = []
        for (const reg of toLoad) {
          // 동시 요청 제한 + 중복 방지
          const keyCc = `cc:${reg.arcode}`
          if (inFlightRegionLoadsRef.current.size >= MAX_CONCURRENT_REGION_LOADS) break
          if (inFlightRegionLoadsRef.current.has(keyCc)) continue
          if (loadedRegionKeysRef.current.has(keyCc)) continue
          inFlightRegionLoadsRef.current.add(keyCc)
          try {
            const res = await smartChildcareLoader.loadChildcareData(reg.arcode, `${reg.sidoName} ${reg.sggName}`)
          if (res.data?.length) {
            const src = res.data.filter((d: any) => !!d.crcode)
            const mapped = await Promise.all(src.map(item => transformToMapData(item, undefined, undefined, reg.arcode)))
            loadedArrays.push(...mapped)
            loadedRegionKeysRef.current.add(keyCc)
          }
          } finally {
            inFlightRegionLoadsRef.current.delete(keyCc)
          }
        }
        if (loadedArrays.length) {
          // 평점 병합 후 합치기
          const updated = await updateChildcareRatings(loadedArrays)
          const base = allFacilitiesRef.current || []
          allFacilitiesRef.current = mergeFacilitiesPreservingImage(base, updated)
        }
		} else if (selectedType === 'playground' || urlType === 'playground') {
			const loadedArrays: KindergartenMapData[] = []
			for (const reg of toLoad) {
				const sggCodeStr = reg.sggCode ? String(reg.sggCode).padStart(5, '0') : ''
				const cacheKey = sggCodeStr ? `sgg:${sggCodeStr}` : reg.hcode ? `reg:${reg.hcode}` : ''
				const loadKey = cacheKey ? `pg:${cacheKey}` : null
				if (!loadKey) continue
				if (inFlightRegionLoadsRef.current.size >= MAX_CONCURRENT_REGION_LOADS) break
				if (inFlightRegionLoadsRef.current.has(loadKey)) continue
				if (loadedRegionKeysRef.current.has(loadKey)) continue

				const cachedGroup = cacheKey ? playgroundRegionGroupCacheRef.current.get(cacheKey) : undefined
				const baseLat = reg.sampleLat ?? mapInstance.current?.getCenter()?.getLat() ?? 37.5665
				const baseLng = reg.sampleLng ?? mapInstance.current?.getCenter()?.getLng() ?? 126.978

				if (cachedGroup?.length) {
					const mapped = await Promise.all(
						cachedGroup.map((item) => playgroundToMapData(item, baseLat, baseLng)),
					)
					loadedArrays.push(...mapped)
					loadedRegionKeysRef.current.add(loadKey)
					continue
				}

				inFlightRegionLoadsRef.current.add(loadKey)
				const controller = new AbortController()
				playgroundFetchControllersRef.current.add(controller)
				try {
					const result = await fetchPlaygroundsByRegionGroup({
						regionCode: reg.hcode,
						sggCode: sggCodeStr,
						signal: controller.signal,
					})
					if (result.items.length) {
						const mapped = await Promise.all(
							result.items.map((item) => playgroundToMapData(item, baseLat, baseLng)),
						)
						loadedArrays.push(...mapped)
						if (cacheKey) {
							playgroundRegionGroupCacheRef.current.set(cacheKey, result.items)
						}
						loadedRegionKeysRef.current.add(loadKey)
					}
				} catch (error) {
					if ((error as any)?.name === 'AbortError') {
						console.log('[PlaygroundMap] 구 단위 캐시 로드 중단', {
							regionCode: reg.hcode,
							sggCode: sggCodeStr,
						})
						if (cacheKey) {
							playgroundRegionGroupCacheRef.current.delete(cacheKey)
						}
						lastRegionKeyRef.current = ''
						requestViewportLoadingOff()
						return
					}
					throw error
				} finally {
					playgroundFetchControllersRef.current.delete(controller)
					inFlightRegionLoadsRef.current.delete(loadKey)
				}
			}
			if (loadedArrays.length) {
				const base = allFacilitiesRef.current || []
				allFacilitiesRef.current = mergeFacilitiesPreservingImage(base, loadedArrays)
			}
		} else {
        // kindergarten
        const loadedArrays: KindergartenMapData[] = []
        for (const reg of toLoad) {
          const keyKg = `kg:${reg.sidoName}/${reg.sggName}`
          if (inFlightRegionLoadsRef.current.size >= MAX_CONCURRENT_REGION_LOADS) break
          if (inFlightRegionLoadsRef.current.has(keyKg)) continue
          if (loadedRegionKeysRef.current.has(keyKg)) continue
          inFlightRegionLoadsRef.current.add(keyKg)
          try {
            const res = await smartLoader.current.loadKindergartenData(reg.sidoName, reg.sggName)
          if (res.data?.length) {
            const mapped: KindergartenMapData[] = res.data
              .filter((item: any) => isValidCoordinate(parseFloat(item.lttdcdnt), parseFloat(item.lngtcdnt)))
              .map((item: any) => ({
                id: String(item.kinderCode || item.kindercode || item.kcode),
                code: String(item.kinderCode || item.kindercode || item.kcode),
                name: item.kindername,
                address: item.addr,
                lat: parseFloat(item.lttdcdnt),
                lng: parseFloat(item.lngtcdnt),
                type: 'kindergarten',
                establishment: getEstablishmentType(item.establish),
                officeedu: item.officeedu,
                telno: item.telno,
                opertime: item.opertime,
                prmstfcnt: parseInt(item.prmstfcnt) || 0,
                ag3fpcnt: parseInt(item.ag3fpcnt) || 0,
                ag4fpcnt: parseInt(item.ag4fpcnt) || 0,
                ag5fpcnt: parseInt(item.ag5fpcnt) || 0,
                hpaddr: item.hpaddr,
                rating: 0.0,
                distance: 0,
                image: undefined,
                sidoCode: reg.sidoCode,
                sggCode: reg.sggCode
              }))
            const updated = await updateKindergartenRatings(mapped)
            const withImages = await injectKindergartenImages(updated)
            loadedArrays.push(...withImages)
            loadedRegionKeysRef.current.add(keyKg)
          }
          } finally {
            inFlightRegionLoadsRef.current.delete(keyKg)
          }
        }
        if (loadedArrays.length) {
          const base = allFacilitiesRef.current || []
          allFacilitiesRef.current = mergeFacilitiesPreservingImage(base, loadedArrays)
        }
      }
    } catch (e) {
      console.warn('ensureDataForBounds 오류:', e)
    }
  }

  // 간단한 집계 렌더링(시/구 단위): 중심 텍스트 배지로 표시
  const renderAggregates = (mode: 'district' | 'city', dataArg?: KindergartenMapData[]) => {
    renderInProgressRef.current = true
    if (!mapInstance.current) return
    // 집계 모드에서는 항상 마커 숨김 (남아있을 수 있는 마커 방지)
    markersRef.current.forEach(m => m.setMap(null))
    overlaysRef.current.forEach(o => o.setMap(null))
    currentRenderModeRef.current = mode
    // 기존 집계 오버레이 제거
    aggregateOverlaysRef.current.forEach(o => o.setMap(null))
    aggregateOverlaysRef.current = []

    // 현재 화면 내 아이템만 집계
    const bounds = mapInstance.current.getBounds()
    const sw = bounds?.getSouthWest()
    const ne = bounds?.getNorthEast()
    const inView = (k: KindergartenMapData) => {
      if (!sw || !ne) return true
      return k.lat >= sw.getLat() && k.lat <= ne.getLat() && k.lng >= sw.getLng() && k.lng <= ne.getLng()
    }
    const data = dataArg || allFacilitiesRef.current || []
    // 그룹키: district는 sggCode, city는 sidoCode (표시는 샘플링 보정 사용)
    const counts = new Map<string, number>()
    const groups = new Map<string, { lat: number, lng: number, label: string }>()
    for (const k of data) {
      if (!inView(k)) continue
      const key = mode === 'district' ? String(k.sggCode || '') : String(k.sidoCode || '')
      if (!key) continue
      counts.set(key, (counts.get(key) || 0) + 1)
      // 대표 위치는 역지오코딩 샘플에서 가져오거나, 첫 좌표로 설정
      if (!groups.has(key)) {
        if (mode === 'district') {
          const sampled = sampledDistrictGroupsRef.current.get(key)
          const name = sampled?.label ?? getSggName(String(k.sidoCode || ''), key)
          groups.set(key, { lat: sampled?.lat ?? k.lat, lng: sampled?.lng ?? k.lng, label: name })
        } else {
          const sampled = sampledCityGroupsRef.current.get(key)
          const name = sampled?.label ?? getSidoName(key)
          groups.set(key, { lat: sampled?.lat ?? k.lat, lng: sampled?.lng ?? k.lng, label: name })
        }
      }
    }

    // 샘플링된 행정구를 병합해, 데이터 미로드 지역도 배지 생성
    if (mode === 'district') {
      sampledDistrictGroupsRef.current.forEach((sample, key) => {
        // 화면 안일 때만
        if (sw && ne && !(sample.lat >= sw.getLat() && sample.lat <= ne.getLat() && sample.lng >= sw.getLng() && sample.lng <= ne.getLng())) {
          return
        }
        if (!groups.has(key)) {
          groups.set(key, { lat: sample.lat, lng: sample.lng, label: sample.label })
        }
        if (!counts.has(key)) counts.set(key, 0)
      })
    } else {
      sampledCityGroupsRef.current.forEach((sample, key) => {
        if (sw && ne && !(sample.lat >= sw.getLat() && sample.lat <= ne.getLat() && sample.lng >= sw.getLng() && sample.lng <= ne.getLng())) {
          return
        }
        if (!groups.has(key)) {
          groups.set(key, { lat: sample.lat, lng: sample.lng, label: sample.label })
        }
        if (!counts.has(key)) counts.set(key, 0)
      })
    }

    // 오버레이 생성 (현재 화면 안에 항상 유지되도록)
    groups.forEach((g, key) => {
      // 마커 모드 동시표시: 활성 구는 배지 생략
      if (currentRenderModeRef.current === 'markers' && mode === 'district') {
        if (activeSggCodeRef.current && key === activeSggCodeRef.current) {
          return
        }
      }
      const pos = new window.kakao.maps.LatLng(g.lat, g.lng)
      const buildBadgeHtml = (labelText: string) => `
          <div style="
            background: rgba(0, 0, 0, 0.85);
            color: #ffffff;
            padding: 6px 10px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
            text-align: center;
            border: 1px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            position: relative;
            left: 0px;
          ">
            ${labelText}
          </div>
        `
      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos,
        content: buildBadgeHtml(g.label),
        yAnchor: 1,
        zIndex: 2
      })
      // 지도 이동 후에도 보이도록 setMap만 호출 (좌표는 샘플/그룹 대표점 고정)
      overlay.setMap(mapInstance.current)
      aggregateOverlaysRef.current.push(overlay)

      // 라벨이 코드처럼 보이면(예: "구11290", 숫자) 역지오코딩으로 보정
      const looksLikeCode = /^(구\s*\d+|\d{4,})$/.test(g.label)
      if (looksLikeCode) {
        ;(async () => {
          try {
            const r = await reverseGeocodeWithCache(g.lat, g.lng)
            if (!r) return
            const fixed = mode === 'district' ? (r.sggName || g.label) : (r.sidoName || g.label)
            if (fixed && fixed !== g.label) {
              overlay.setContent(buildBadgeHtml(fixed))
            }
          } catch {}
        })()
      }
    })
    renderInProgressRef.current = false
    requestViewportLoadingOff()
  }

  // 코드 → 행정구/시도 실명 매핑
  const getSidoName = (sidoCodeStr: string): string => {
    const code = parseInt(sidoCodeStr)
    const entry = Object.entries(regionCodes).find(([_, v]) => v.sidoCode === code)
    return entry ? entry[0] : `시도 ${sidoCodeStr}`
  }
  const getSggName = (sidoCodeStr: string, sggCodeStr: string): string => {
    const sidoCode = parseInt(sidoCodeStr)
    const sggCode = parseInt(sggCodeStr)
    const entry = Object.entries(regionCodes).find(([_, v]) => v.sidoCode === sidoCode)
    if (!entry) return `구 ${sggCodeStr}`
    const sggName = Object.entries(entry[1].sggCodes).find(([name, code]) => code === sggCode)?.[0]
    return sggName || `구 ${sggCodeStr}`
  }

  // 뷰포트 기반 로딩: 현재 지도의 중심을 역지오코딩하여 해당 행정구 데이터만 로드
  const loadFacilitiesForViewport = async () => {
    if (!mapInstance.current) return
    if (isDraggingRef.current) return
    if (initialLoadInProgressRef.current) {
      if (allFacilitiesRef.current) {
        addViewportMarkers(allFacilitiesRef.current)
      }
      requestViewportLoadingOff()
      return
    }
    if (!initialLoadCompletedRef.current && selectedType !== 'playground' && urlType !== 'playground') {
      if (allFacilitiesRef.current) {
        addViewportMarkers(allFacilitiesRef.current)
      }
      requestViewportLoadingOff()
      return
    }
    requestViewportLoadingOn()
    const center = mapInstance.current.getCenter()
    if (!center) {
      requestViewportLoadingOff()
      return
    }

    const centerLat = center.getLat()
    const centerLng = center.getLng()
    const currentLevel = mapInstance.current.getLevel?.() ?? 0
    if (isPlaygroundSelected && currentLevel >= 7) {
      addViewportMarkers(allFacilitiesRef.current || [])
      requestViewportLoadingOff()
      return
    }

    // 동일 요청 중복 방지 키
    const viewportKey = `${currentLevel.toString()}_${centerLat.toFixed(4)}_${centerLng.toFixed(4)}_${selectedType}`
    if (lastViewportKeyRef.current === viewportKey) {
      requestViewportLoadingOff()
      return
    }
    lastViewportKeyRef.current = viewportKey

    try {
      const region = await reverseGeocodeWithCache(centerLat, centerLng)
      if (!region) {
        requestViewportLoadingOff()
        return
      }

      const regionKey = `${region.kindergartenSidoCode}_${region.kindergartenSggCode}_${selectedType || urlType || 'all'}`
      if (lastRegionKeyRef.current === regionKey && allFacilitiesRef.current) {
        // 지역이 변하지 않았다면 재로딩 없이 뷰포트 필터만
        addViewportMarkers(allFacilitiesRef.current)
        requestViewportLoadingOff()
        return
      }
      lastRegionKeyRef.current = regionKey

      // 타입별 분기
      if (selectedType === 'childcare' || urlType === 'childcare') {
        // 어린이집: arcode 사용 → 캐시 우선 로드 후 지오코딩 변환
        const { smartChildcareLoader } = await import('../utils/smartChildcareLoader')
        const result = await smartChildcareLoader.loadChildcareData(region.childcareArcode, `${region.sidoName} ${region.sggName}`)
        if (!result.data || result.data.length === 0) {
          addMarkersToMap([])
          cacheRegionData(region.kindergartenSidoCode, region.kindergartenSggCode, [])
          requestViewportLoadingOff()
          return
        }
        // 코드 없는 항목 제거 후 변환, 지역 arcode 전달
        const source = result.data.filter((d: any) => !!d.crcode)
        const mapData = (await Promise.all(source.map(item => transformToMapData(item, centerLat, centerLng, region.childcareArcode)))).map(m => ({ ...m }))
        // 리뷰 평점 병합
        const rated = await updateChildcareRatings(mapData)
        setKindergartens(() => rated)
        setFilteredKindergartens(() => rated)
        cacheRegionData(region.kindergartenSidoCode, region.kindergartenSggCode, rated)
        addViewportMarkers(rated)
        requestViewportLoadingOff()
		} else if (selectedType === 'playground' || urlType === 'playground') {
        const latestLevel = mapInstance.current?.getLevel?.() ?? currentLevel
        if (latestLevel >= 7) {
          addViewportMarkers(allFacilitiesRef.current || [])
          requestViewportLoadingOff()
          return
        }
        const baseLocation = { lat: centerLat, lng: centerLng }
        const regionCode = region.hcode ? String(region.hcode) : ''

        let cacheResult = null
        if (regionCode) {
          cacheResult = await fetchPlaygroundsFromCache(regionCode)
        }

			const sggCode = region.kindergartenSggCode
				? String(region.kindergartenSggCode).replace(/\D+/g, '').padStart(5, '0')
				: ''
			const groupKey = sggCode ? `sgg:${sggCode}` : regionCode ? `reg:${regionCode}` : ''

			let items = cacheResult?.items ?? []
			if (items.length) {
				console.log('[PlaygroundMap] 지역 캐시 사용', {
					regionCode,
					received: items.length,
					snapshot: cacheResult?.meta?.snapshotPrefix,
				})
			}

			if (!items.length) {
				const cachedGroup = groupKey ? playgroundRegionGroupCacheRef.current.get(groupKey) : undefined
				if (cachedGroup?.length) {
					items = cachedGroup
					console.log('[PlaygroundMap] 구 단위 캐시 사용', {
						regionCode,
						sggCode,
						received: items.length,
					})
				}
			}

			if (!items.length) {
				console.log('[PlaygroundMap] 지역 캐시 없음 → 구 단위 캐시 로딩 시도', {
					regionCode,
					sggCode,
				})
				const controller = new AbortController()
				playgroundFetchControllersRef.current.add(controller)
				try {
					const result = await fetchPlaygroundsByRegionGroup({
						regionCode,
						sggCode,
						signal: controller.signal,
					})
					if (result.items.length) {
						items = result.items
						if (groupKey) {
							playgroundRegionGroupCacheRef.current.set(groupKey, result.items)
						}
						console.log('[PlaygroundMap] 구 단위 캐시 로드 성공', {
							regionCode,
							sggCode,
							regionCount: result.regionCodes.length,
							received: result.items.length,
						})
					}
				} catch (error) {
					if ((error as any)?.name === 'AbortError') {
						console.log('[PlaygroundMap] 구 단위 캐시 로드 중단', {
							regionCode,
							sggCode,
						})
						if (groupKey) {
							playgroundRegionGroupCacheRef.current.delete(groupKey)
						}
						lastRegionKeyRef.current = ''
						requestViewportLoadingOff()
						return
					}
					console.warn('[PlaygroundMap] 구 단위 캐시 로드 실패', {
						regionCode,
						sggCode,
						error,
					})
				} finally {
					playgroundFetchControllersRef.current.delete(controller)
				}
			}

			if (!items.length) {
				console.log('[PlaygroundMap] 구 단위 캐시 실패 → 전체 스냅샷 로딩 시도')
				items = await fetchAllPlaygroundsFromSnapshot()
				console.log('[PlaygroundMap] 스냅샷 로드 결과', {
					snapshotCount: items.length,
				})
			}

        if (!items.length) {
          addMarkersToMap([])
          cacheRegionData(region.kindergartenSidoCode, region.kindergartenSggCode, [])
          requestViewportLoadingOff()
          return
        }

        try {
          console.log(
            '[PlaygroundMap] 원본 items 배열 길이:',
            items.length,
            '지역코드:',
            regionCode,
          )
          if (items.length > 0) {
            console.log('[PlaygroundMap] 첫 항목 샘플:', items[0])
          }
        } catch {}

        const mapData = await Promise.all(
          items.map((item) => playgroundToMapData(item, baseLocation.lat, baseLocation.lng)),
        )

        try {
          console.log('[PlaygroundMap] 지도 변환 데이터 개수:', mapData.length)
          if (mapData.length > 0) console.log('[PlaygroundMap] 변환 샘플:', mapData[0])
        } catch {}

        const withDistance = mapData.map((data) => ({
          ...data,
          distance: calculateDistance(baseLocation.lat, baseLocation.lng, data.lat, data.lng),
        }))

        const sortedMapData = withDistance.sort(
          (a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY),
        )

        const finalMapData = sortedMapData.slice(0, 250)

        // 건물 사진 주입 후 리뷰 평점 업데이트
        const withImages = await injectPlaygroundImages(finalMapData)
        const updatedData = await updatePlaygroundRatings(withImages)
        setKindergartens(() => updatedData)
        setFilteredKindergartens(() => updatedData)
        cacheRegionData(region.kindergartenSidoCode, region.kindergartenSggCode, updatedData)
        addViewportMarkers(updatedData)
        // 놀이시설은 인접 구를 빠르게 탐색할 수 있도록 화면 전체 샘플을 프리패치
        ensureDataForBounds('district').catch((prefetchError) => {
          console.warn('Playground viewport prefetch failed:', prefetchError)
        })
        requestViewportLoadingOff()
      } else {
        // 유치원: 스마트 로더 사용 (시도/시군구명)
        const result = await smartLoader.current.loadKindergartenData(region.sidoName, region.sggName)
        const data = result.data || []
        
        // 거리 계산 기준: 현재 위치 우선, 없으면 지도 중심
        const baseLocation = currentLocation || { lat: centerLat, lng: centerLng }
        console.log('🔍 뷰포트 로딩 - 거리 계산 기준:', currentLocation ? '현재 위치' : '지도 중심', baseLocation)
        
			const kindergartenData: KindergartenMapData[] = data
          .filter((item: any) => isValidCoordinate(parseFloat(item.lttdcdnt), parseFloat(item.lngtcdnt)))
          .map((item: any) => ({
            id: String(item.kinderCode || item.kindercode || item.kcode),
            code: String(item.kinderCode || item.kindercode || item.kcode),
            name: item.kindername,
            address: item.addr,
            lat: parseFloat(item.lttdcdnt),
            lng: parseFloat(item.lngtcdnt),
            type: 'kindergarten',
            establishment: getEstablishmentType(item.establish),
            officeedu: item.officeedu,
            telno: item.telno,
            opertime: item.opertime,
            prmstfcnt: parseInt(item.prmstfcnt) || 0,
            ag3fpcnt: parseInt(item.ag3fpcnt) || 0,
            ag4fpcnt: parseInt(item.ag4fpcnt) || 0,
            ag5fpcnt: parseInt(item.ag5fpcnt) || 0,
            hpaddr: item.hpaddr,
            rating: 0.0,
            distance: calculateDistance(baseLocation.lat, baseLocation.lng, parseFloat(item.lttdcdnt), parseFloat(item.lngtcdnt)),
            image: undefined,
            sidoCode: region.kindergartenSidoCode,
            sggCode: region.kindergartenSggCode
          }))

		const withImages = await injectKindergartenImages(kindergartenData)
		const updatedData = await updateKindergartenRatings(withImages)
		setKindergartens(() => updatedData)
		setFilteredKindergartens(() => updatedData)
		cacheRegionData(region.kindergartenSidoCode, region.kindergartenSggCode, updatedData)
        addViewportMarkers(updatedData)
        requestViewportLoadingOff()
      }
    } catch (e) {
      console.error('뷰포트 데이터 로드 실패:', e)
    } finally {
      requestViewportLoadingOff()
    }
  }

  // 정보창 닫기
  const closeInfoWindow = () => {
    if (infoOverlayRef.current) {
      infoOverlayRef.current.setMap(null)
    }
    setSelectedKindergarten(null)
  }

  // 정보창 표시
  const showInfoWindow = (marker: any, kindergarten: KindergartenMapData) => {
    // 기존 정보 오버레이 제거
    if (infoOverlayRef.current) {
      infoOverlayRef.current.setMap(null)
    }

    const position = marker.getPosition()
    
    const content = `
      <div style="
        padding: 12px; 
        min-width: 200px; 
        border-radius: 12px;
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        position: relative;
        transform: translateY(-10px);
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #333; flex: 1;">${kindergarten.name}</h3>
          <button 
            onclick="window.closeInfoWindow && window.closeInfoWindow()"
            style="
              background: none;
              border: none;
              font-size: 16px;
              color: #999;
              cursor: pointer;
              padding: 0;
              margin-left: 8px;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              transition: all 0.2s;
            "
            onmouseover="this.style.backgroundColor='#f5f5f5'; this.style.color='#666'"
            onmouseout="this.style.backgroundColor='transparent'; this.style.color='#999'"
          >
            ×
          </button>
        </div>
        <p style="margin: 0 0 6px 0; font-size: 12px; color: #666; line-height: 1.4;">${kindergarten.address}</p>
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #888;">${kindergarten.establishment} • ${kindergarten.officeedu}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          ${kindergarten.distance ? `<span style="font-size: 11px; color: #fb8678; font-weight: 500;">거리: ${kindergarten.distance.toFixed(1)}km</span>` : '<span></span>'}
          <span style="font-size: 11px; color: #fb8678; font-weight: 600;">
            ❤ ${kindergarten.rating ? kindergarten.rating.toFixed(1) : '0.0'}
          </span>
        </div>
      </div>
    `
    
    // 커스텀 오버레이로 정보창 생성
    infoOverlayRef.current = new window.kakao.maps.CustomOverlay({
      position: position,
      content: content,
      yAnchor: 1.2,
      zIndex: 10000
    })
    
    infoOverlayRef.current.setMap(mapInstance.current)
  }

  // 검색 필터링
  useEffect(() => {
    let filtered = kindergartens

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(k => 
        k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 타입 필터링
    if (selectedType !== 'all') {
      filtered = filtered.filter(k => k.type === selectedType)
    }

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distance || 0) - (b.distance || 0)
      } else {
        return (b.rating || 0) - (a.rating || 0)
      }
    })

    setFilteredKindergartens(filtered)
  }, [kindergartens, searchTerm, selectedType, sortBy])

  // 검색어 변경 시 마커 업데이트
  useEffect(() => {
    addMarkersToMap(filteredKindergartens)
  }, [filteredKindergartens])

  // 드래그 이벤트 핸들러 (드래그 핸들 영역에서만)
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStartY(e.clientY)
    
    // 드래그 이벤트 리스너 추가
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = e.clientY - moveEvent.clientY
      if (deltaY > 50) {
        setListHeight(2) // 크게
      } else if (deltaY > 20) {
        setListHeight(1) // 10% 표시
      } else if (deltaY < -20) {
        setListHeight(1) // 최소 10% 유지
      }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // 터치 이벤트 핸들러 (드래그 핸들 영역에서만)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setDragStartY(e.touches[0].clientY)
    
    // 터치 드래그 이벤트 리스너 추가
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const deltaY = e.touches[0].clientY - moveEvent.touches[0].clientY
      if (deltaY > 50) {
        setListHeight(2) // 크게
      } else if (deltaY > 20) {
        setListHeight(1) // 10% 표시
      } else if (deltaY < -20) {
        setListHeight(1) // 최소 10% 유지
      }
    }
    
    const handleTouchEnd = () => {
      setIsDragging(false)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
    
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // 검색란과 검색 결과 영역에서 지도 확대/축소 이벤트 차단 (Ctrl + 휠만)
  const preventMapZoom = (e: Event) => {
    const wheelEvent = e as WheelEvent
    // Ctrl 키가 눌린 상태에서만 확대/축소 차단 (일반 스크롤은 허용)
    if (wheelEvent.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // 이벤트 리스너 등록을 위한 ref들
  const searchAreaRef = useRef<HTMLDivElement>(null)
  const filterAreaRef = useRef<HTMLDivElement>(null)
  const listAreaRef = useRef<HTMLDivElement>(null)

  // 컴포넌트 언마운트 시 GPS 요청 및 API 요청 취소
  useEffect(() => {
    return () => {
      cancelGpsRequest()
      // API 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // 이벤트 리스너 등록 (Ctrl + 휠만 차단)
  useEffect(() => {
    const searchArea = searchAreaRef.current
    const filterArea = filterAreaRef.current
    const listArea = listAreaRef.current

    if (searchArea) {
      searchArea.addEventListener('wheel', preventMapZoom, { passive: false })
    }
    if (filterArea) {
      filterArea.addEventListener('wheel', preventMapZoom, { passive: false })
    }
    if (listArea) {
      listArea.addEventListener('wheel', preventMapZoom, { passive: false })
    }

    // 전역 함수로 closeInfoWindow 등록
    (window as any).closeInfoWindow = closeInfoWindow

    return () => {
      if (searchArea) {
        searchArea.removeEventListener('wheel', preventMapZoom)
      }
      if (filterArea) {
        filterArea.removeEventListener('wheel', preventMapZoom)
      }
      if (listArea) {
        listArea.removeEventListener('wheel', preventMapZoom)
      }
      // 전역 함수 정리
      delete (window as any).closeInfoWindow
    }
  }, [])

  // 기존 이미지가 있고, 새 데이터의 image가 비어있으면 기존 이미지를 보존하는 병합 헬퍼
  const mergeFacilitiesPreservingImage = (
    prev: KindergartenMapData[] | null | undefined,
    next: KindergartenMapData[]
  ): KindergartenMapData[] => {
    const base = prev || []
    const map = new Map<string, KindergartenMapData>()
    for (const k of base) {
      map.set(String(k.id), k)
    }
    for (const k of next) {
      const id = String(k.id)
      const exist = map.get(id)
      if (exist) {
        const merged: KindergartenMapData = { ...exist, ...k, image: k.image ?? exist.image }
        map.set(id, merged)
      } else {
        map.set(id, k)
      }
    }
    return Array.from(map.values())
  }

  useEffect(() => {
    if (!mapInstance.current) return
    const map = mapInstance.current
    if (isPlaygroundSelected && isViewportLoading) {
      map.setDraggable(false)
      map.setZoomable(false)
    } else {
      map.setDraggable(true)
      map.setZoomable(true)
    }
  }, [isViewportLoading, isPlaygroundSelected])

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* 통합 헤더 - 컴팩트 */}
      <div className="bg-gradient-to-r from-[#fb8678]/10 to-[#e67567]/10 border-b border-[#fb8678]/20">
        {/* 상단 헤더 */}
        <div className="h-[60px] flex items-center">
          <div className="px-3 w-full flex items-center justify-between">
            <button
              onClick={() => navigate('/main')}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <h1 className="text-base font-bold text-gray-900">{getHeaderTitle()}</h1>
            <div className="w-6"></div>
          </div>
        </div>

        {/* 검색 및 필터 영역 - 컴팩트 */}
        <div ref={searchAreaRef} className="px-3">
          {/* 검색바 */}
          <div className="relative mb-2">
            <div className="flex items-center bg-white rounded-lg border border-[#fb8678]/20 p-2 shadow-sm">
              <Search className="w-3.5 h-3.5 text-[#fb8678] mr-2" />
              <input
                type="text"
                placeholder="시설명 또는 주소로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 outline-none text-xs"
              />
              <button 
                onClick={handleSearch}
                className="ml-2 px-3 py-1.5 bg-[#fb8678] text-white rounded-md text-xs font-medium hover:bg-[#e67567] transition-colors"
              >
                검색
              </button>
            </div>
          </div>

          {/* 필터 버튼들 - 컴팩트 */}
          <div ref={filterAreaRef} className="flex items-center justify-end">
            {/* 타입 필터 - URL에 특정 타입이 없을 때만 표시 */}
            {!urlType && (
              <div className="flex space-x-1.5">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedType === 'all'
                      ? 'bg-[#fb8678] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-[#fb8678]/20 hover:bg-[#fb8678]/5'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setSelectedType('kindergarten')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedType === 'kindergarten'
                      ? 'bg-[#fb8678] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-[#fb8678]/20 hover:bg-[#fb8678]/5'
                  }`}
                >
                  유치원
                </button>
                <button
                  onClick={() => setSelectedType('childcare')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedType === 'childcare'
                      ? 'bg-[#fb8678] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-[#fb8678]/20 hover:bg-[#fb8678]/5'
                  }`}
                >
                  어린이집
                </button>
                <button
                  onClick={() => setSelectedType('playground')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedType === 'playground'
                      ? 'bg-[#fb8678] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-[#fb8678]/20 hover:bg-[#fb8678]/5'
                  }`}
                >
                  놀이시설
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 지도 영역 - 전체 화면 */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        {isPlaygroundSelected && isViewportLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="rounded-full bg-white/95 px-5 py-3 shadow-lg flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#fb8678]" />
              <span className="text-sm font-medium text-gray-700">주변 놀이시설을 불러오는 중이에요…</span>
            </div>
          </div>
        )}
        
        {/* GPS 버튼 - 위치 갱신용 */}
        <button
          onClick={showCurrentLocation}
          disabled={isGpsLoading}
          className={`absolute top-4 right-4 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-10 border group ${
            isGpsActive 
              ? 'bg-[#fb8678] border-[#fb8678] text-white' 
              : 'bg-white border-gray-200 hover:bg-gray-50'
          } ${
            isGpsLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title={isGpsActive ? '위치 갱신' : '현재 위치 찾기'}
        >
          {isGpsLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
          ) : (
            <Locate className={`w-5 h-5 transition-colors duration-200 ${
              isGpsActive 
                ? 'text-white' 
                : 'text-gray-700 group-hover:text-[#fb8678]'
            }`} />
          )}
        </button>

        {/* 뷰포트 로딩/완료 인디케이터 (GPS 버튼과 동일 크기/스타일) - GPS 버튼 바로 아래 */}
        <button
          type="button"
          className={`absolute top-[64px] right-4 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-10 border group ${
            isViewportLoading ? 'bg-white border-gray-200' : 'bg-[#10b981] border-[#10b981] text-white'
          }`}
          title={isViewportLoading ? '로딩 중' : '로딩 완료'}
          disabled
        >
          {isViewportLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#fb8678] border-t-transparent"></div>
          ) : (
            <CheckCircle className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* 하단 드래그 가능한 리스트 모달 */}
      {listHeight > 0 && (
        <div 
          ref={listAreaRef}
          className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-all duration-300 z-20 flex flex-col ${
            listHeight === 1 ? 'h-[10%] min-h-[80px]' : 'h-2/3'
          }`}
        >
          {/* 드래그 핸들 */}
          <div 
            className="flex justify-center py-3 cursor-grab active:cursor-grabbing flex-shrink-0"
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          
          {/* 정렬 필터 및 검색 결과 헤더 */}
          <div className="px-4 pt-2 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* 정렬 필터 - 왼쪽 */}
              <div className="flex space-x-1.5">
                <button
                  onClick={() => setSortBy('distance')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    sortBy === 'distance'
                      ? 'bg-[#fb8678] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-[#fb8678]/20 hover:bg-[#fb8678]/5'
                  }`}
                >
                  거리순
                </button>
                <button
                  onClick={() => setSortBy('rating')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    sortBy === 'rating'
                      ? 'bg-[#fb8678] text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-[#fb8678]/20 hover:bg-[#fb8678]/5'
                  }`}
                >
                  칭찬순
                </button>
              </div>
              {/* 검색 결과 텍스트 - 오른쪽 */}
              <h3 className="font-semibold text-gray-900">
                검색 결과 ({filteredKindergartens.length}개)
              </h3>
            </div>
          </div>
          
          {/* 리스트 내용 - 10% 높이일 때는 숨김 */}
          {listHeight > 1 && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading || isViewportLoading ? (
                <div className="space-y-3 px-4 pb-6">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`skeleton-${idx}`}
                      className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm animate-pulse"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-14 h-14 rounded-lg bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-full" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-center pt-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#fb8678] border-t-transparent mr-2"></div>
                    데이터를 불러오는 중입니다...
                  </div>
                </div>
              ) : filteredKindergartens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {filteredKindergartens.map((kindergarten, idx) => {
                    if (idx === 0) {
                      console.log('🔍 리스트 첫 번째 항목 - distance:', kindergarten.distance, 'name:', kindergarten.name)
                    }
                    return (
                    <div
                      key={kindergarten.id}
                      className={`rounded-lg border cursor-pointer transition-all overflow-hidden ${
                        selectedKindergarten?.id === kindergarten.id
                          ? 'border-[#fb8678] bg-[#fb8678]/5'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => {
                        // 선택된 유치원으로 설정하고 지도 중심 이동
                        setSelectedKindergarten(kindergarten)
                        if (mapInstance.current) {
                          const position = new window.kakao.maps.LatLng(kindergarten.lat, kindergarten.lng)
                          mapInstance.current.setCenter(position)
                          mapInstance.current.setLevel(3)
                          
                          // 해당 마커의 정보창 표시
                          const marker = markersRef.current.find(m => m.getTitle() === kindergarten.name)
                          if (marker) {
                            // 기존 정보창 제거
                            if (infoOverlayRef.current) {
                              infoOverlayRef.current.setMap(null)
                            }

                            // 새로운 정보창 생성
                            infoOverlayRef.current = new window.kakao.maps.CustomOverlay({
                              position: position,
                              zIndex: 10000,
                              content: `
                                <div style="
                                  background: white;
                                  border: 1px solid #ddd;
                                  border-radius: 12px;
                                  padding: 16px;
                                  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                                  min-width: 240px;
                                  max-width: 320px;
                                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                  position: relative;
                                  top: -70px;
                                  left: 0px;
                                ">
                                  <div style="
                                    display: flex;
                                    align-items: center;
                                    justify-content: space-between;
                                    margin-bottom: 12px;
                                    padding-bottom: 8px;
                                    border-bottom: 1px solid #f0f0f0;
                                  ">
                                    <div style="
                                      display: flex;
                                      align-items: center;
                                      flex: 1;
                                    ">
                                      <div style="
                                        width: 8px;
                                        height: 8px;
                                        border-radius: 50%;
                                        background: ${kindergarten.type === 'kindergarten' ? '#4CAF50' : (kindergarten.type === 'childcare' ? '#2196F3' : '#9C27B0')};
                                        margin-right: 8px;
                                      "></div>
                                      <h3 style="
                                        margin: 0;
                                        color: #333;
                                        font-size: 16px;
                                        font-weight: 600;
                                        line-height: 1.3;
                                        word-break: keep-all;
                                        overflow-wrap: break-word;
                                        max-width: 240px;
                                        white-space: normal;
                                        hyphens: auto;
                                      ">
                                        ${kindergarten.name}
                                      </h3>
                                    </div>
                                    <button 
                                      onclick="window.closeInfoWindow && window.closeInfoWindow()"
                                      style="
                                        background: none;
                                        border: none;
                                        font-size: 18px;
                                        color: #999;
                                        cursor: pointer;
                                        padding: 4px;
                                        margin-left: 8px;
                                        width: 24px;
                                        height: 24px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        border-radius: 50%;
                                        transition: all 0.2s;
                                      "
                                      onmouseover="this.style.backgroundColor='#f5f5f5'; this.style.color='#666'"
                                      onmouseout="this.style.backgroundColor='transparent'; this.style.color='#999'"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  
                                  <div style="margin-bottom: 8px;">
                                    <p style="
                                      margin: 0;
                                      color: #666;
                                      font-size: 13px;
                                      line-height: 1.4;
                                      word-break: keep-all;
                                      overflow-wrap: break-word;
                                      max-width: 260px;
                                      white-space: normal;
                                      hyphens: auto;
                                    ">
                                      ${kindergarten.address}
                                    </p>
                                  </div>
                                  
                                  ${kindergarten.type === 'childcare' && (kindergarten as any).crceoname ? `
                                    <div style="margin-bottom: 8px;">
                                      <p style="
                                        margin: 0;
                                        color: #666;
                                        font-size: 12px;
                                        line-height: 1.4;
                                      ">
                                        원장: ${(kindergarten as any).crceoname}
                                      </p>
                                    </div>
                                  ` : ''}
                                  
                                  <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    margin-bottom: 12px;
                                  ">
                                    <div style="
                                      color: #666;
                                      font-size: 13px;
                                      display: flex;
                                      align-items: center;
                                      gap: 4px;
                                    ">
                                      <span style="color:#fb8678;">❤</span>
                                      <span>칭찬 : ${kindergarten.rating ? kindergarten.rating.toFixed(1) : '0.0'}</span>
                                    </div>
                                    <div style="
                                      color: #666;
                                      font-size: 13px;
                                    ">
                                      ${kindergarten.telno || '없음'}
                                    </div>
                                  </div>
                                  
                                  ${kindergarten.type === 'childcare' && (kindergarten as any).crcapat ? `
                                    <div style="margin-bottom: 8px;">
                                      <p style="
                                        margin: 0;
                                        color: #666;
                                        font-size: 12px;
                                        line-height: 1.4;
                                      ">
                                        정원: ${(kindergarten as any).crcapat}명
                                      </p>
                                    </div>
                                  ` : ''}
                                  
                                  <button id="detail-nav" style="
                                    width: 100%;
                                    background: linear-gradient(135deg, #fb8678 0%, #ff6b9d 100%);
                                    color: white;
                                    border: none;
                                    padding: 10px 16px;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-weight: 500;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 8px rgba(251, 134, 120, 0.3);
                                  " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(251, 134, 120, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(251, 134, 120, 0.3)'">
                                    자세히 보기
                                  </button>
                                </div>
                              `,
                              yAnchor: 1
                            })

                            infoOverlayRef.current.setMap(mapInstance.current)

                            setTimeout(() => {
                              const el = document.getElementById('detail-nav')
                              if (el) {
                                el.onclick = () => {
                                  const type = kindergarten.type
                                  const id = encodeURIComponent(String(kindergarten.id))
                                  const sidoCode = String(kindergarten.sidoCode ?? '')
                                  const sggCode = String(kindergarten.sggCode ?? '')

                                  if (type === 'playground') {
                                    cancelPendingPlaygroundRequests()
                                    try {
                                      window.sessionStorage.setItem(
                                        'mompick:lastPlaygroundSelection',
                                        JSON.stringify({
                                          id: kindergarten.id,
                                          code: kindergarten.code ?? kindergarten.id,
                                          name: kindergarten.name,
                                          address: kindergarten.address,
                                          lat: kindergarten.lat,
                                          lng: kindergarten.lng,
                                          establishment: kindergarten.establishment,
                                          officeedu: kindergarten.officeedu,
                                          telno: kindergarten.telno ?? '',
                                          opertime: kindergarten.opertime ?? '',
                                          prmstfcnt: kindergarten.prmstfcnt ?? 0,
                                          rating: kindergarten.rating ?? 0,
                                          distance: kindergarten.distance ?? null,
                                          image: kindergarten.image ?? '',
                                          type: kindergarten.type,
                                          sidoCode: kindergarten.sidoCode ?? null,
                                          sggCode: kindergarten.sggCode ?? null,
                                        }),
                                      )
                                    } catch (storageError) {
                                      console.warn('[PlaygroundDetail] 세션 저장 실패:', storageError)
                                    }

                                    const params = new URLSearchParams()
                                    if (sidoCode) params.set('sidoCode', sidoCode)
                                    if (sggCode) params.set('sggCode', sggCode)
                                    const query = params.toString()
                                    window.location.href = `/playground/${id}${query ? `?${query}` : ''}`
                                    return
                                  }

                                  if (type === 'childcare') {
                                    const url = `/childcare/${id}${sggCode ? `?arcode=${sggCode}` : ''}`
                                    window.location.href = url
                                  } else {
                                    const params = new URLSearchParams()
                                    if (sidoCode) params.set('sidoCode', sidoCode)
                                    if (sggCode) params.set('sggCode', sggCode)
                                    const query = params.toString()
                                    window.location.href = `/kindergarten/${id}${query ? `?${query}` : ''}`
                                  }
                                }
                              }
                            }, 0)
                          }
                        }
                      }}
                    >
                      <div className="flex">
                        {/* 왼쪽 이미지 영역 (3비율) */}
                        <div className="w-20 flex-shrink-0 relative">
                          {!kindergarten.image ? (
                            // 이미지가 없는 경우 - 사진없음 표시
                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                              <div className="w-6 h-6 text-gray-400 mb-1 flex items-center justify-center">
                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <span className="text-xs text-gray-500 font-medium">사진없음</span>
                            </div>
                          ) : (
                            // 이미지가 있는 경우
                            <img 
                              src={kindergarten.image} 
                              alt={kindergarten.name} 
                              className="w-full h-full object-cover" 
                            />
                          )}
                          <div className="absolute inset-y-0 right-0 w-3 bg-gradient-to-r from-transparent to-white"></div>
                        </div>

                        {/* 오른쪽 내용 영역 (7비율) */}
                        <div className="flex-1 bg-white p-3">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-relaxed break-words">
                                {kindergarten.name}
                              </h4>
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                                  {kindergarten.establishment}
                                </span>
                                <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full">
                                  {kindergarten.officeedu}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="w-3 h-3 text-[#fb8678] fill-current" />
                              <span className="text-xs text-gray-600">{kindergarten.rating ? kindergarten.rating.toFixed(1) : '0.0'}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-start space-x-1">
                              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2 leading-snug">{kindergarten.address}</span>
                            </div>
                            {kindergarten.telno && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>{kindergarten.telno}</span>
                              </div>
                            )}
                            {kindergarten.distance && (
                              <div className="flex items-center space-x-1">
                                <Navigation className="w-3 h-3" />
                                <span className="text-[#fb8678] font-medium">
                                  {kindergarten.distance.toFixed(1)}km
                                </span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>총 {kindergarten.prmstfcnt}명 정원</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default KindergartenMapPage
