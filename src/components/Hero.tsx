import { Users, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePageContext } from '../contexts/PageContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Advertisement {
  id: string
  title: string
  description?: string
  image: string
  link?: string
}

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([])
  const [loading, setLoading] = useState(true)
  const [showRegionRecommendModal, setShowRegionRecommendModal] = useState(false)
  const { setCurrentPage } = usePageContext()
  const navigate = useNavigate()

  // API에서 스플래시 광고 데이터 가져오기
  useEffect(() => {
    const fetchAdvertisements = async () => {
      try {
        const { data, error } = await supabase
          .from('ad_banners')
          .select('*')
          .eq('banner_type', 'splash')
          .eq('is_active', true)
          .order('order_index', { ascending: true })

        if (error) {
          console.error('광고 조회 오류:', error)
          setAdvertisements([])
        } else {
          // 데이터를 Advertisement 형식으로 변환
          const formattedAds: Advertisement[] = (data || []).map(ad => ({
            id: ad.id,
            title: ad.title,
            description: ad.description,
            image: ad.image_url,
            link: ad.link_url
          }))
          setAdvertisements(formattedAds)
        }
      } catch (error) {
        console.error('광고 가져오기 오류:', error)
        setAdvertisements([])
      } finally {
        setLoading(false)
      }
    }

    fetchAdvertisements()
  }, [])

  // 자동 슬라이드 기능
  useEffect(() => {
    if (advertisements.length === 0) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % advertisements.length)
    }, 4000) // 4초마다 슬라이드 변경

    return () => clearInterval(timer)
  }, [advertisements.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % advertisements.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + advertisements.length) % advertisements.length)
  }



  const handleCommunityClick = () => {
    // 커뮤니티 페이지로 이동
    setCurrentPage('community')
    
    // localStorage에서 저장된 카테고리가 있으면 사용, 없으면 기본값
    const savedCategory = localStorage.getItem('selectedCommunityCategory')
    let categoryToNavigate = '어린이집,유치원' // 기본값
    
    if (savedCategory) {
      // 저장된 카테고리 ID를 카테고리명으로 변환
      const categoryMapping: { [key: string]: string } = {
        'kindergarten': '어린이집,유치원',
        'hospital': '소아과 후기',
        'location': '지역 정보',
        'tips': '육아 팁'
      }
      categoryToNavigate = categoryMapping[savedCategory] || '어린이집,유치원'
    }
    
    navigate(`/main?category=${encodeURIComponent(categoryToNavigate)}`)
  }

  const handleKindergartenClick = () => {
    navigate('/kindergarten-map?type=kindergarten')
  }

  const handleChildcareClick = () => {
    navigate('/kindergarten-map?type=childcare')
  }

  const handlePlaygroundClick = () => {
    navigate('/kindergarten-map?type=playground')
  }

  const handleApplicationClick = () => {
    setCurrentPage('application')
    navigate('/application')
  }

  const handleRegionRecommendClick = () => {
    setShowRegionRecommendModal(true)
  }

  return (
    <section className="bg-white pb-12">
      {/* Advertisement Slider */}
      {!loading && advertisements.length > 0 && (
        <div className="p-4">
          <div className="max-w-md mx-auto">
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              {/* 슬라이드 컨테이너 */}
              <div className="relative h-36 overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-in-out h-full"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {advertisements.map((ad) => (
                    <div 
                      key={ad.id} 
                      className="w-full flex-shrink-0 relative cursor-pointer"
                      onClick={() => window.open(ad.link, '_blank')}
                    >
                      {/* 배경 이미지 */}
                      <div className="absolute inset-0">
                        <img 
                          src={ad.image} 
                          alt={ad.title}
                          className="w-full h-full object-cover object-center"
                        />
                        {/* 어두운 오버레이 - 투명도 더 감소 */}
                        <div className="absolute inset-0 bg-black/10"></div>
                      </div>
                      
                      {/* 텍스트 내용 오버레이 - 제목, 설명, 클릭문구 중 하나라도 있을 때만 표시 */}
                      {(ad.title || ad.description || (ad as any).show_click_text) && (
                        <div className="relative z-10 h-full flex items-center p-4">
                          <div className="text-white w-full">
                            {ad.title && (
                              <h3 className="font-bold text-white text-base mb-1 drop-shadow-lg">
                                {ad.title}
                              </h3>
                            )}
                            {ad.description && (
                              <p className="text-xs text-white/95 mb-2 line-clamp-2 drop-shadow-md">
                                {ad.description}
                              </p>
                            )}
                            {(ad as any).show_click_text && (
                              <div className="text-xs text-white/80 drop-shadow-md">
                                클릭하여 자세히 보기
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 네비게이션 버튼 */}
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-600 hover:text-[#fb8678] w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-600 hover:text-[#fb8678] w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>

              {/* 인디케이터 도트 */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {advertisements.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === currentSlide 
                        ? 'bg-[#fb8678] w-6' 
                        : 'bg-white/60 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Categories */}
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">주요 서비스</h2>
          
          {/* 위에 2개 - 중앙정렬 */}
          <div className="flex justify-center space-x-3 mb-4">
            {/* 어린이집 */}
            <div className="w-40 flex flex-col items-center">
              <div 
                className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 hover:shadow-lg hover:scale-110 cursor-pointer"
                onClick={handleChildcareClick}
              >
                <img src="/icons/kindergarten.svg" alt="어린이집" className="w-10 h-10" />
              </div>
              <h3 className="font-semibold text-gray-900 text-xs">어린이집</h3>
            </div>

            {/* 유치원 */}
            <div className="w-40 flex flex-col items-center">
              <div 
                className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 hover:shadow-lg hover:scale-110 cursor-pointer"
                onClick={handleKindergartenClick}
              >
                <img src="/icons/childhouse.svg" alt="유치원" className="w-10 h-10" />
              </div>
              <h3 className="font-semibold text-gray-900 text-xs">유치원</h3>
            </div>
          </div>

          {/* 아래 3개 - 가로 배치 */}
          <div className="flex justify-center space-x-3 mb-6">
            {/* 놀이시설 */}
            <div className="w-40 flex flex-col items-center">
              <div 
                className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 hover:shadow-lg hover:scale-110 cursor-pointer"
                onClick={handlePlaygroundClick}
              >
                <img src="/icons/facilities.svg" alt="놀이시설" className="w-10 h-10" />
              </div>
              <h3 className="font-semibold text-gray-900 text-xs">놀이시설</h3>
            </div>

            {/* 간편 신청 */}
            <div className="w-40 flex flex-col items-center">
              <div 
                className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 hover:shadow-lg hover:scale-110 cursor-pointer"
                onClick={handleApplicationClick}
              >
                <img src="/icons/application.svg" alt="간편 신청" className="w-10 h-10" />
              </div>
              <h3 className="font-semibold text-gray-900 text-xs">간편 신청</h3>
            </div>

            {/* 지역 추천 */}
            <div className="w-40 flex flex-col items-center">
              <div 
                className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 hover:shadow-lg hover:scale-110 cursor-pointer"
                onClick={handleRegionRecommendClick}
              >
                <img src="/icons/location.svg" alt="지역 추천" className="w-10 h-10" />
              </div>
              <h3 className="font-semibold text-gray-900 text-xs">지역 추천</h3>
            </div>
          </div>

          {/* Community Quick Access */}
          <div className="bg-gradient-to-r from-[#fb8678]/10 to-[#e67567]/10 rounded-xl p-4 border border-[#fb8678]/20 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#fb8678]/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#fb8678]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">커뮤니티</h3>
                  <p className="text-xs text-gray-600">정보 공유 & 경험담</p>
                </div>
              </div>
              <button 
                onClick={handleCommunityClick}
                className="bg-[#fb8678] text-white p-2 rounded-lg hover:bg-[#e67567] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 지역 추천 개발중 모달 */}
      {showRegionRecommendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowRegionRecommendModal(false)}
          />
          
          {/* 모달 컨텐츠 */}
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <div className="text-center">
              <p className="text-gray-900 text-base mb-6 leading-relaxed">
                현재 지역 추천 기능은 개발중입니다.<br />
                더 좋은 서비스로 돌아오겠습니다.
              </p>
              <button
                onClick={() => setShowRegionRecommendModal(false)}
                className="w-full py-3 px-4 bg-[#fb8678] text-white rounded-xl font-semibold hover:bg-[#e67567] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

export default Hero
