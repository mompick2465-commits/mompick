import React, { useEffect, useState } from 'react'
import { 
  ChevronRight,
  ChevronLeft,
  Loader2,
  MapPin,
  Clock,
  Heart,
  ImageOff,
  Building,
  X
} from 'lucide-react'
import { fetchSigunguList, SigunguItem } from '../utils/childcareSigungu'
import { smartChildcareLoader, LoadResult } from '../utils/smartChildcareLoader'
import { useNavigate } from 'react-router-dom'
import { regionCodes } from '../utils/kindergartenApi'
import { reverseGeocodeWithCache } from '../utils/geocodingCache'
import { getMultipleChildcareReviewStats } from '../utils/childcareReviewApi'
import { supabase } from '../lib/supabase'

interface ChildcareApplicationProps {
  onClose?: () => void
}

const ChildcareApplication: React.FC<ChildcareApplicationProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const [selectedSido, setSelectedSido] = useState<string | null>(null)
  const [showSidoDropdown, setShowSidoDropdown] = useState(false)
  const [showSggDropdown, setShowSggDropdown] = useState(false)
  const [sigungu, setSigungu] = useState<SigunguItem[]>([])
  const [loadingSigungu, setLoadingSigungu] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<{ sgg: string; arcode: string } | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null)
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [withRatings, setWithRatings] = useState<any[] | null>(null)
  
  // 찜 상태 관리
  const [favoriteCodes, setFavoriteCodes] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showApplyModal, setShowApplyModal] = useState(false)

  // 현재 사용자 및 찜 목록 로드
  useEffect(() => {
    const loadUserAndFavorites = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          
          // 사용자의 어린이집 찜 목록 가져오기
          const { data: favoriteData } = await supabase
            .from('favorites')
            .select('target_id')
            .eq('user_id', user.id)
            .eq('target_type', 'childcare')
          
          if (favoriteData) {
            const codes = new Set(favoriteData.map(f => f.target_id))
            setFavoriteCodes(codes)
          }
        }
      } catch (error) {
        console.error('찜 목록 로드 오류:', error)
      }
    }
    
    loadUserAndFavorites()
  }, [])

  // 찜하기/해제 기능
  const toggleLike = async (childcare: any) => {
    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }
    
    const code = childcare.crcode || childcare.stcode
    if (!code) {
      console.error('어린이집 코드가 없습니다.')
      return
    }
    
    try {
      const isFavorited = favoriteCodes.has(code)
      
      if (isFavorited) {
        // 찜 해제
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUserId)
          .eq('target_id', code)
          .eq('target_type', 'childcare')
        
        if (!error) {
          const newFavorites = new Set(favoriteCodes)
          newFavorites.delete(code)
          setFavoriteCodes(newFavorites)
          
          // withRatings 업데이트
          if (withRatings) {
            setWithRatings(withRatings.map(c => 
              (c.crcode || c.stcode) === code ? { ...c, __isLiked: false } : c
            ))
          }
          
          console.log('❌ 찜 해제:', childcare.crname)
        }
      } else {
        // 찜 추가
        const insertData: any = {
          user_id: currentUserId,
          target_type: 'childcare',
          target_id: code,
          target_name: childcare.crname
        }

        // 지역 코드 추가
        if (selectedRegion?.arcode) {
          insertData.arcode = selectedRegion.arcode
        }

        const { error } = await supabase
          .from('favorites')
          .insert(insertData)

        if (!error) {
          const newFavorites = new Set(favoriteCodes)
          newFavorites.add(code)
          setFavoriteCodes(newFavorites)
          
          // withRatings 업데이트
          if (withRatings) {
            setWithRatings(withRatings.map(c => 
              (c.crcode || c.stcode) === code ? { ...c, __isLiked: true } : c
            ))
          }
          
          console.log('✅ 찜 추가:', childcare.crname)
        }
      }
    } catch (error) {
      console.error('찜하기 오류:', error)
      alert('찜하기 중 오류가 발생했습니다.')
    }
  }

  // 시군구 조회
  useEffect(() => {
    if (!selectedSido) return
    ;(async () => {
      try {
        setLoadingSigungu(true)
        const list = await fetchSigunguList(selectedSido)
        setSigungu(list)
      } catch (e) {
        setSigungu([])
      } finally {
        setLoadingSigungu(false)
      }
    })()
  }, [selectedSido])

  // 최초 진입 시 GPS로 현재 지역 자동 선택 후 어린이집 로딩
  useEffect(() => {
    const autoDetectRegion = async () => {
      if (!('geolocation' in navigator)) return
      setIsGpsLoading(true)
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          })
        })
        const { latitude, longitude } = position.coords
        const region = await reverseGeocodeWithCache(latitude, longitude)
        if (region) {
          // 시도/시군구 설정 후 목록 로드
          setSelectedSido(region.sidoName)
          setSelectedRegion({ sgg: region.sggName, arcode: region.childcareArcode })
          await loadChildcare(region.childcareArcode)
        }
      } catch (e) {
        // 무시하고 수동 선택 유도
      } finally {
        setIsGpsLoading(false)
      }
    }
    autoDetectRegion()
  }, [])

  // 어린이집 목록 조회
  const loadChildcare = async (arcode: string) => {
    try {
      const s = sigungu.find((x) => x.arcode === arcode)
      if (s) setSelectedRegion({ sgg: s.sigunname, arcode })
      setLoadingList(true)
      const result = await smartChildcareLoader.loadChildcareData(arcode)
      setLoadResult(result)
      
      // 현재 사용자의 찜 목록 다시 로드 (최신 상태 반영)
      if (currentUserId) {
        try {
          const { data: favoriteData } = await supabase
            .from('favorites')
            .select('target_id')
            .eq('user_id', currentUserId)
            .eq('target_type', 'childcare')
          
          if (favoriteData) {
            const codes = new Set(favoriteData.map(f => f.target_id))
            setFavoriteCodes(codes)
          }
        } catch (error) {
          console.error('찜 목록 로드 오류:', error)
        }
      }
      
      // 리뷰 통계 및 커스텀 정보 병합
      try {
        const codes = (result.data || []).map((c: any) => c.crcode || c.crcode || c.stcode).filter(Boolean)
        if (codes.length > 0) {
          // 리뷰 통계 조회
          const stats = await getMultipleChildcareReviewStats(codes)
          
          // 각 어린이집의 커스텀 정보 조회 (건물 사진 등)
          const customInfoMap: Record<string, any> = {}
          try {
            const { data: customInfoList } = await supabase
              .from('childcare_custom_info')
              .select('facility_code, building_images')
              .in('facility_code', codes)
              .eq('is_active', true)
            
            if (customInfoList) {
              customInfoList.forEach((info: any) => {
                customInfoMap[info.facility_code] = info
              })
            }
          } catch (err) {
            console.log('커스텀 정보 로드 오류:', err)
          }
          
          // 각 어린이집의 간편신청 정보 조회 (월 금액, 빈자리)
          const applicationInfoMap: Record<string, any> = {}
          try {
            const { data: applicationList } = await supabase
              .from('childcare_application_info')
              .select('childcare_code, monthly_price, available_slots')
              .in('childcare_code', codes)
              .eq('is_active', true)
            
            if (applicationList) {
              applicationList.forEach((info: any) => {
                applicationInfoMap[info.childcare_code] = info
              })
            }
          } catch (err) {
            console.log('간편신청 정보 로드 오류:', err)
          }
          
          const merged = (result.data || []).map((c: any) => {
            const code = c.crcode || c.stcode || ''
            const s = stats[code] || { average: 0, count: 0 }
            const customInfo = customInfoMap[code]
            const applicationInfo = applicationInfoMap[code]
            const isLiked = favoriteCodes.has(code)
            return { 
              ...c, 
              __avg: s.average || 0, 
              __count: s.count || 0,
              __buildingImage: customInfo?.building_images?.[0] || null,
              __monthlyPrice: applicationInfo?.monthly_price || null,
              __availableSlots: applicationInfo?.available_slots || null,
              __isLiked: isLiked
            }
          })
          setWithRatings(merged)
        } else {
          setWithRatings(null)
        }
      } catch {
        setWithRatings(null)
      }
    } catch (e) {
      setLoadResult({ data: [], source: 'error', error: '로드 실패' })
    } finally {
      setLoadingList(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        {/* 헤더: 유치원 스타일과 동일한 헤더/타이틀 */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <button 
            onClick={() => {
              if (onClose) { onClose(); return }
              navigate('/application')
            }}
            className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#fb8678]" />
          </button>
          어린이집 시설 목록
        </h2>

        {/* 시도/시군구 드롭다운 (유치원과 동일한 패턴) */}
        <div className="mb-6 space-y-4">
          {/* 시도 선택 */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-700">시도 선택</h3>
            <div className="relative">
              <button
                onClick={() => { setShowSidoDropdown(!showSidoDropdown); setShowSggDropdown(false) }}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
              >
                {selectedSido || '시도를 선택하세요'}
              </button>
              {showSidoDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {Object.keys(regionCodes).map((sido) => (
                    <button
                      key={sido}
                      onClick={() => { setSelectedSido(sido); setShowSidoDropdown(false); setShowSggDropdown(false); setSelectedRegion(null) }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      {sido}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 시군구 선택 */}
          {selectedSido && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-700">지역구 선택</h3>
              <div className="relative">
                <button
                  onClick={() => { setShowSggDropdown(!showSggDropdown); setShowSidoDropdown(false) }}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
                >
                  {selectedRegion?.sgg || (loadingSigungu ? '시군구 불러오는 중...' : '지역구를 선택하세요')}
                </button>
                {showSggDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingSigungu && (
                      <div className="px-4 py-3 text-sm text-gray-500">불러오는 중...</div>
                    )}
                    {!loadingSigungu && sigungu.map((g) => (
                      <button
                        key={`${g.arcode}-${g.sigunname}`}
                        onClick={() => { loadChildcare(g.arcode); setShowSggDropdown(false) }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        {g.sigunname}
                      </button>
                    ))}
                    {!loadingSigungu && sigungu.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">시군구 정보가 없습니다</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 데이터 로딩 상태 */}
        {isGpsLoading && (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl">
            <Loader2 className="w-8 h-8 text-[#fb8678] animate-spin mb-4" />
            <p className="text-sm text-gray-600 mb-2">주변 시설 찾는 중...</p>
            <p className="text-xs text-gray-500">현재 위치를 확인하고 있습니다</p>
          </div>
        )}
        {loadingList && (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl">
            <Loader2 className="w-8 h-8 text-[#fb8678] animate-spin mb-4" />
            <p className="text-sm text-gray-600 mb-2">어린이집 데이터를 불러오는 중...</p>
            <p className="text-xs text-gray-500">{selectedSido} {selectedRegion?.sgg || ''}</p>
          </div>
        )}

        {/* 목록 */}
        {!loadingList && loadResult && loadResult.data.length > 0 && (
          <div className="space-y-4">
            {(withRatings || loadResult.data).map((c: any, index: number) => (
              <div key={c.crcode || index} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="flex">
                  {/* 왼쪽 이미지 영역 */}
                  <div className="w-24 flex-shrink-0 relative">
                    {c.__buildingImage ? (
                      <img 
                        src={c.__buildingImage} 
                        alt={c.crname} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                        <ImageOff className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500 font-medium">사진없음</span>
                      </div>
                    )}
                    <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-r from-transparent to-white"></div>
                  </div>

                  {/* 오른쪽 내용 영역 */}
                  <div className="flex-1 bg-white p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2 leading-relaxed">{c.crname || '어린이집'}</h3>
                        <div className="flex items-start gap-1 text-xs text-gray-500 mb-1">
                          <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{c.craddr}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleLike(c)
                        }}
                        className="flex-shrink-0 p-1 ml-2"
                      >
                        {c.__isLiked ? (
                          <Heart className="h-4 w-4 text-[#fb8678] fill-current" />
                        ) : (
                          <Heart className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* 평점과 거리 (유사 스타일) */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-[#fb8678] fill-current" />
                        <span className="text-xs font-medium text-gray-900">{Number(c.__avg || 0).toFixed(1)}</span>
                        <span className="text-xs text-gray-500">({c.__count || 0})</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>-</span>
                      </div>
                    </div>

                    {/* 가격 및 빈자리 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {c.__monthlyPrice ? (
                          <span className="text-sm font-bold text-[#fb8678]">월 {c.__monthlyPrice}만원</span>
                        ) : (
                          <span className="text-sm font-bold text-gray-400">월 -만원</span>
                        )}
                        {c.__availableSlots ? (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                            빈자리 {c.__availableSlots}개
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full font-semibold">
                            빈자리 -개
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setShowApplyModal(true)}
                        className="flex-1 py-2 px-4 bg-[#fb8678] text-white rounded-lg text-sm font-medium hover:bg-[#e67567] transition-colors"
                      >
                        신청하기
                      </button>
                      <button
                        onClick={() => {
                          const raw = c.crtelno || ''
                          const phone = raw.replace(/[^0-9+]/g, '')
                          if (!phone) { alert('전화번호 정보가 없습니다.'); return }
                          try { navigator.clipboard.writeText(phone) } catch {}
                          window.location.href = `tel:${phone}`
                        }}
                        className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        전화문의
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loadingList && loadResult && loadResult.data.length === 0 && selectedRegion && (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100">
            <Building className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">해당 지역에 어린이집이 없습니다</p>
            <p className="text-xs text-gray-500">{selectedSido} {selectedRegion.sgg}</p>
          </div>
        )}

        {/* 지역 미선택 상태 */}
        {!loadingList && !loadResult && (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl">
            <MapPin className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">지역을 선택해주세요</p>
            <p className="text-xs text-gray-500">위에서 시도와 지역구를 선택하시면 어린이집 목록을 확인할 수 있습니다</p>
          </div>
        )}

        {/* 하단 여백 */}
        <div className="h-20" />
      </div>

      {/* 신청하기 팝업 모달 */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowApplyModal(false)}>
          <div className="bg-white rounded-[2rem] max-w-sm w-full shadow-2xl transform transition-all animate-slideUp border border-gray-100/50" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="px-4 pt-4 pb-2 border-b border-gray-100/60 bg-gradient-to-b from-white to-gray-50/30 rounded-t-[2rem]">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  간편 신청
                </h3>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="p-1.5 hover:bg-gray-100/80 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div className="px-4 py-4 bg-gradient-to-b from-white to-gray-50/20 rounded-b-[2rem]">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-[#fb8678]">
                    <path d="M12 2C17.5228 2 22 6.47715 22 12C22 14.1364 21.3301 16.1162 20.1889 17.741L17 12H20C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C14.1502 20 16.1023 19.1517 17.5398 17.7716L18.5379 19.567C16.7848 21.083 14.4995 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 7C13.6569 7 15 8.34315 15 10V11H16V16H8V11H9V10C9 8.34315 10.3431 7 12 7ZM12 9C11.4872 9 11.0645 9.38604 11.0067 9.88338L11 10V11H13V10C13 9.48716 12.614 9.06449 12.1166 9.00673L12 9Z"></path>
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-gray-900">
                    간단하게 신청할수 있는 맘픽 서비스가 되겠습니다.
                  </p>
                  <p className="text-xs text-gray-600">
                    개발 및 연구중에 있습니다.
                  </p>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="w-full px-3 py-2.5 rounded-xl text-center bg-gradient-to-r from-[#fb8678] to-[#e67567] text-white hover:from-[#e67567] hover:to-[#d46456] transition-all duration-300 font-semibold shadow-sm hover:shadow-md active:scale-[0.98] text-xs"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChildcareApplication


