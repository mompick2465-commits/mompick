import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, MapPin, Heart, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { listFavorites, removeFavorite, FavoriteTargetType } from '../utils/favorites'
import { getReviewStats } from '../utils/kindergartenReviewApi'
import { getChildcareReviewStats } from '../utils/childcareReviewApi'
import { regionCodes } from '../utils/kindergartenApi'

interface Favorite {
  id: string
  target_type: FavoriteTargetType
  target_id: string
  target_name: string
  created_at: string
  arcode?: string
  sido_code?: string
  sgg_code?: string
}

const ProfileFavorites = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [favoriteRegions, setFavoriteRegions] = useState<Record<string, string>>({})
  const [favoriteRatings, setFavoriteRatings] = useState<Record<string, number>>({})
  const [favoriteBuildingImages, setFavoriteBuildingImages] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  
  // 스와이프 관련 상태
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (favId: string) => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    
    if (isLeftSwipe) {
      setSwipedItemId(favId)
    } else {
      setSwipedItemId(null)
    }
  }

  // 찜 삭제 핸들러
  const handleDeleteFavorite = async (fav: Favorite) => {
    if (!window.confirm(`${fav.target_name || '이 시설'}을(를) 찜 목록에서 삭제하시겠습니까?`)) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await removeFavorite(user.id, fav.target_type, fav.target_id)
      
      // 로컬 상태 업데이트
      setFavorites(prev => prev.filter(f => f.id !== fav.id))
      setSwipedItemId(null)
      
      // 성공 메시지 (선택사항)
      // alert('찜 목록에서 삭제되었습니다.')
    } catch (error) {
      console.error('찜 삭제 오류:', error)
      alert('삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 지역 코드를 이름으로 변환하는 함수
  const getRegionNameFromCode = (sidoCode?: string, sggCode?: string, arcode?: string): string => {
    try {
      // arcode를 사용하는 경우 (어린이집)
      if (arcode) {
        const code = parseInt(arcode)
        // arcode에서 sido 코드 추출 (앞 2자리)
        const sidoNum = Math.floor(code / 1000)
        
        // regionCodes에서 매칭되는 시도 찾기
        for (const [sidoName, sidoData] of Object.entries(regionCodes)) {
          if (sidoData.sidoCode === sidoNum) {
            // sggCodes에서 매칭되는 시군구 찾기
            for (const [sggName, sggCodeValue] of Object.entries(sidoData.sggCodes)) {
              if (sggCodeValue === code) {
                // "서울특별시" → "서울시" 간소화
                const shortSido = sidoName.replace('특별시', '시').replace('광역시', '시').replace('특별자치시', '시').replace('특별자치도', '도')
                return `${shortSido} ${sggName}`
              }
            }
          }
        }
      }
      
      // sidoCode와 sggCode를 사용하는 경우 (유치원)
      if (sidoCode && sggCode) {
        const sidoNum = parseInt(sidoCode)
        const sggNum = parseInt(sggCode)
        
        // regionCodes에서 매칭되는 시도 찾기
        for (const [sidoName, sidoData] of Object.entries(regionCodes)) {
          if (sidoData.sidoCode === sidoNum) {
            // sggCodes에서 매칭되는 시군구 찾기
            for (const [sggName, sggCodeValue] of Object.entries(sidoData.sggCodes)) {
              if (sggCodeValue === sggNum) {
                // "서울특별시" → "서울시" 간소화
                const shortSido = sidoName.replace('특별시', '시').replace('광역시', '시').replace('특별자치시', '시').replace('특별자치도', '도')
                return `${shortSido} ${sggName}`
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('지역 코드 변환 오류:', error)
    }
    
    return ''
  }

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          navigate('/login')
          return
        }

        const data = await listFavorites(user.id)
        setFavorites(data as any)

        // 모든 찜 목록에 대해 지역 정보, 평점, 건물 이미지 로드
        const results = await Promise.all((data || []).map(async (fav: any) => {
          try {
            let region = ''
            let rating = 0
            let buildingImage = ''
            
            if (fav.target_type === 'kindergarten') {
              // 지역 정보: sido_code, sgg_code를 이름으로 변환
              region = getRegionNameFromCode(fav.sido_code, fav.sgg_code)
              
              // 리뷰 평점만 조회
              try {
                const stats = await getReviewStats(String(fav.target_id))
                rating = stats.average_rating || 0
              } catch {}
              
              // 건물 이미지 조회 (kindergarten_custom_info 테이블)
              try {
                const { data: customInfo } = await supabase
                  .from('kindergarten_custom_info')
                  .select('building_images')
                  .eq('kinder_code', fav.target_id)
                  .maybeSingle()
                
                if (customInfo && customInfo.building_images && customInfo.building_images.length > 0) {
                  buildingImage = customInfo.building_images[0]
                }
              } catch {}
              
              return { id: fav.id, region, rating, buildingImage }
            } else if (fav.target_type === 'childcare') {
              // 지역 정보: arcode를 이름으로 변환
              region = getRegionNameFromCode(undefined, undefined, fav.arcode)
              
              // 리뷰 평점만 조회
              try {
                const stats = await getChildcareReviewStats(String(fav.target_id))
                rating = stats.average_rating || 0
              } catch {}
              
              // 건물 이미지 조회 (childcare_custom_info 테이블) - facility_code 컬럼 사용
              try {
                const { data: customInfo } = await supabase
                  .from('childcare_custom_info')
                  .select('building_images')
                  .eq('facility_code', fav.target_id)
                  .maybeSingle()
                
                if (customInfo && customInfo.building_images && customInfo.building_images.length > 0) {
                  buildingImage = customInfo.building_images[0]
                }
              } catch {}
              
              return { id: fav.id, region, rating, buildingImage }
            }
          } catch {}
          return { id: fav.id, region: '', rating: 0, buildingImage: '' }
        }))
        
        setFavoriteRegions(prev => {
          const next = { ...prev }
          results.forEach(r => { if (r) next[r.id] = r.region })
          return next
        })
        setFavoriteRatings(prev => {
          const next = { ...prev }
          results.forEach(r => { if (r) next[r.id] = r.rating })
          return next
        })
        setFavoriteBuildingImages(prev => {
          const next = { ...prev }
          results.forEach(r => { if (r) next[r.id] = r.buildingImage })
          return next
        })

      } catch (e) {
        setError('찜 목록을 불러오지 못했습니다.')
        setFavorites([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate])

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">내가 찜한 시설</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="bg-gray-50 px-2 py-1 text-center">
            <div className="text-xs text-gray-500 font-semibold">전체 찜 목록</div>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
                <p className="text-gray-600">찜 목록을 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-sm text-red-600">{error}</div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">찜한 시설이 없습니다.</p>
                <p className="text-gray-500 text-sm mt-2">관심있는 유치원/어린이집을 찜해 보세요!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="relative overflow-hidden rounded-2xl"
                  >
                    {/* 삭제 버튼 배경 - 카드보다 넓게 */}
                    {swipedItemId === fav.id && (
                      <div className="absolute -right-4 top-0 bottom-0 w-28 bg-red-500 flex items-center justify-center rounded-r-2xl">
                        <Trash2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    {/* 스와이프 가능한 카드 */}
                    <div
                      className="w-full bg-white border border-gray-100 rounded-2xl p-3 transition-transform duration-200 relative z-10"
                      style={{
                        transform: swipedItemId === fav.id ? 'translateX(-80px)' : 'translateX(0)',
                      }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={() => handleTouchEnd(fav.id)}
                      onClick={() => {
                        if (swipedItemId === fav.id) {
                          setSwipedItemId(null)
                        }
                      }}
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                          {favoriteBuildingImages[fav.id] ? (
                            <img 
                              src={favoriteBuildingImages[fav.id]} 
                              alt={fav.target_name || '시설 사진'} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                        <BookOpen className="w-6 h-6 text-gray-400" />
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">{fav.target_name || fav.target_id}</div>
                        <div className="flex items-center space-x-1 mt-1 min-w-0">
                          <MapPin className="w-3 h-3 text-[#fb8678] flex-shrink-0" />
                          <span className="text-[10px] text-gray-500 truncate">{favoriteRegions[fav.id] || ''}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {fav.target_type === 'kindergarten' ? '유치원' : fav.target_type === 'childcare' ? '어린이집' : fav.target_type}
                        </div>
                      </div>
                      {/* rating badge */}
                      {(fav.target_type === 'kindergarten' || fav.target_type === 'childcare') && (
                        <div className="ml-3 flex items-center px-2 py-0.5 bg-black/80 border border-white rounded-xl">
                          <Heart className="w-3 h-3 text-[#fb8678] fill-current mr-1" />
                          <span className="text-white text-[11px] font-bold">{(favoriteRatings[fav.id] || 0).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    </div>
                    
                    {/* 삭제 버튼 영역 */}
                    {swipedItemId === fav.id && (
                      <button
                        onClick={() => handleDeleteFavorite(fav)}
                        className="absolute -right-4 top-0 bottom-0 w-28 bg-red-500 rounded-r-2xl flex items-center justify-center active:bg-red-600"
                      >
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ProfileFavorites

