import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Calendar, Camera, X, MoreHorizontal } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface MealData {
  meal_date: string
  meal_images: string[]
  menu_description: string
}

const MealCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { kindercode, stcode } = useParams<{ kindercode?: string; stcode?: string }>();
  const facilityCode = kindercode || stcode || ''
  const facilityType = kindercode ? 'kindergarten' : 'childcare'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealsByDate, setMealsByDate] = useState<{[date: string]: MealData}>({})
  const [loading, setLoading] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<MealData | null>(null)
  const [showMealDetail, setShowMealDetail] = useState(false)
  
  // 이미지 뷰어 관련 상태
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [imageViewerPhotos, setImageViewerPhotos] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)
  const [showImageViewerMenu, setShowImageViewerMenu] = useState<boolean>(false)
  
  // 신고 모달 관련 상태
  const [showImageReportModal, setShowImageReportModal] = useState<boolean>(false)
  const [imageReportReason, setImageReportReason] = useState<string>('')
  const [imageReportType, setImageReportType] = useState<string>('wrong_purpose')
  const [imageReportLoading, setImageReportLoading] = useState<boolean>(false)
  
  // 사용자 정보
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  
  // 터치 제스처 관련 ref
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  // 현재 월의 첫 번째 날과 마지막 날 계산
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // 사용자 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      // 현재 사용자 정보 가져오기
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()
          
          if (profile) {
            setCurrentProfileId(profile.id)
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error)
      }
    }
    
    loadUserInfo()
  }, [])

  // 급식 데이터 로드
  useEffect(() => {
    loadMeals()
  }, [currentDate, facilityCode])
  
  // 이미지 뷰어가 열릴 때 body 스크롤 비활성화
  useEffect(() => {
    if (showImageViewer || showImageReportModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showImageViewer, showImageReportModal])

  const loadMeals = async () => {
    if (!facilityCode) return

    try {
      setLoading(true)
      
      const tableName = facilityType === 'kindergarten' ? 'kindergarten_meals' : 'childcare_meals'
      const codeColumn = facilityType === 'kindergarten' ? 'kindergarten_code' : 'childcare_code'
      
      // 현재 월의 급식 데이터 조회
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(codeColumn, facilityCode)
        .gte('meal_date', startDate)
        .lte('meal_date', endDate)
        .eq('is_active', true)
      
      if (error) {
        console.error('급식 데이터 로드 오류:', error)
        return
      }
      
      // 날짜별로 매핑
      const mealMap: {[date: string]: MealData} = {}
      data?.forEach(meal => {
        mealMap[meal.meal_date] = {
          meal_date: meal.meal_date,
          meal_images: meal.meal_images || [],
          menu_description: meal.menu_description || ''
        }
      })
      
      setMealsByDate(mealMap)
      console.log(`✅ ${Object.keys(mealMap).length}개 날짜 급식 데이터 로드`)
    } catch (error) {
      console.error('급식 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // 오늘 날짜인지 확인
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  };

  // 달력 날짜 생성
  const calendarDays = [] as (number | null)[];
  
  // 이전 달의 빈 날짜들
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // 현재 달의 날짜들
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // 월 이름 배열
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  // 요일 배열
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  
  // 이미지 뷰어 열기
  const openImageViewer = (photos: string[], startIndex: number = 0) => {
    if (!photos || photos.length === 0) return
    setImageViewerPhotos(photos)
    setCurrentImageIndex(Math.min(Math.max(startIndex, 0), photos.length - 1))
    setShowImageViewer(true)
    setShowImageViewerMenu(false)
  }
  
  // 이미지 뷰어 닫기
  const closeImageViewer = () => {
    setShowImageViewer(false)
    setShowImageViewerMenu(false)
  }
  
  // 이전 이미지로 이동
  const goPrevImage = () => {
    if (imageViewerPhotos.length === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + imageViewerPhotos.length) % imageViewerPhotos.length)
  }
  
  // 다음 이미지로 이동
  const goNextImage = () => {
    if (imageViewerPhotos.length === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % imageViewerPhotos.length)
  }
  
  // 터치 제스처 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartXRef.current = t.clientX
    touchStartYRef.current = t.clientY
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartXRef.current
    const threshold = 50
    if (Math.abs(dx) > threshold) {
      if (dx > 0) {
        goPrevImage()
      } else {
        goNextImage()
      }
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }
  
  // 신고 모달 제출
  const handleSubmitImageReportModal = async () => {
    if (!currentProfileId) {
      alert('로그인이 필요합니다.')
      return
    }
    
    try {
      setImageReportLoading(true)
      
      // 현재 보고 있는 이미지 URL 가져오기
      const reportedImageUrl = imageViewerPhotos[currentImageIndex] || null
      
      // admin_notes에 이미지 URL 및 발생 위치 정보를 JSON으로 저장
      const adminNotesData = {
        reported_image_url: reportedImageUrl,
        report_source: 'meal_calendar' // 급식 캘린더에서 신고한 경우
      }
      
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: currentProfileId,
          report_reason: imageReportReason.trim(),
          report_type: imageReportType,
          status: 'pending',
          target_type: 'meal_image',
          target_id: null, // 급식 사진 신고는 target_id를 사용하지 않음 (facility_code로 식별)
          facility_type: facilityType,
          facility_code: facilityCode || null,
          facility_name: null, // 시설 이름은 선택적
          admin_notes: JSON.stringify(adminNotesData)
        })
      
      if (error) {
        throw error
      }
      
      setShowImageReportModal(false)
      setImageReportReason('')
      setImageReportType('wrong_purpose')
      alert('신고가 접수되었습니다.')
    } catch (error: any) {
      console.error('급식 사진 신고 오류:', error)
      alert('신고 처리 중 오류가 발생했습니다.')
    } finally {
      setImageReportLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-2"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">급식 캘린더</h1>
            </div>
            {/* 시설 코드 표시 제거 */}
          </div>
        </div>
      </div>

      {/* 캘린더 컨트롤 */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="bg-white">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`p-3 text-center text-sm font-medium ${
                index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[80px] p-1 ${
                day ? 'hover:bg-gray-50' : 'bg-white'
              }`}
            >
              {day && (
                <div className="h-full flex flex-col">
                  {/* 급식 사진 영역 */}
                  <div className="flex flex-col items-center justify-center">
                    {/* 통합 컨테이너 */}
                    <div 
                      className="w-12 overflow-hidden rounded-lg cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
                      onClick={() => {
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const meal = mealsByDate[dateStr]
                        if (meal) {
                          setSelectedMeal(meal)
                          setShowMealDetail(true)
                        }
                      }}
                    >
                      {/* 날짜 헤더 */}
                      <div className={`px-1 py-0.5 text-center text-[10px] font-medium ${
                        isToday(day)
                          ? 'bg-[#fb8678] text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {day}
                      </div>
                      {/* 급식 사진 또는 아이콘 */}
                      {(() => {
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const meal = mealsByDate[dateStr]
                        
                        return meal && meal.meal_images.length > 0 ? (
                          <div className="w-12 h-12 relative">
                            <img 
                              src={meal.meal_images[0]} 
                              alt={`${day}일 급식`}
                              className="w-full h-full object-cover"
                            />
                            {meal.meal_images.length > 1 && (
                              <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-[8px] px-1 rounded-tl">
                                +{meal.meal_images.length - 1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`w-12 h-12 flex items-center justify-center ${
                            isToday(day) ? 'bg-orange-100' : 'bg-gray-100'
                          }`}>
                            <Camera className={`w-4 h-4 ${
                              isToday(day) ? 'text-orange-500' : 'text-gray-400'
                            }`} />
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 설명 */}
      <div className="p-4 bg-white">
        <div className="text-center text-sm text-gray-500">
          <p>• 급식 사진이 있는 날짜를 클릭하여 자세히 보기</p>
        </div>
      </div>

      {/* 급식 상세보기 모달 */}
      {showMealDetail && selectedMeal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowMealDetail(false)
            setSelectedMeal(null)
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-bold">
                {new Date(selectedMeal.meal_date).toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} 급식
              </h3>
              <button
                onClick={() => {
                  setShowMealDetail(false)
                  setSelectedMeal(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {/* 급식 사진 */}
            {selectedMeal.meal_images.length > 0 && (
              <div className="p-4">
                <h4 className="text-sm font-semibold mb-2">급식 사진</h4>
                <div className="flex flex-col items-center gap-3">
                  {selectedMeal.meal_images.map((image, index) => (
                    <img 
                      key={index}
                      src={image}
                      alt={`급식 사진 ${index + 1}`}
                      className="w-full max-w-md h-auto object-cover rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openImageViewer(selectedMeal.meal_images, index)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 메뉴 설명 */}
            {selectedMeal.menu_description && (
              <div className="p-4">
                <h4 className="text-sm font-semibold mb-2">메뉴 정보</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedMeal.menu_description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 이미지 뷰어 */}
      {showImageViewer && imageViewerPhotos.length > 0 && (
        <div 
          className="fixed inset-0 bg-black z-[60] flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            // 메뉴 외부 클릭 시 메뉴 닫기
            if (!(e.target as Element).closest('.image-viewer-menu-container')) {
              setShowImageViewerMenu(false)
            }
          }}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={closeImageViewer}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white z-10"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 점 3개 메뉴 버튼 */}
          <div className="absolute top-4 right-16 image-viewer-menu-container z-10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowImageViewerMenu(!showImageViewerMenu)
              }}
              className="p-2 rounded-full hover:bg-white/10 text-white"
              aria-label="옵션 메뉴"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
            {showImageViewerMenu && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setImageReportType('wrong_purpose')
                    setImageReportReason('')
                    setShowImageReportModal(true)
                    setShowImageViewerMenu(false)
                  }}
                  className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                >
                  신고하기
                </button>
              </div>
            )}
          </div>

          {/* 이전 버튼 */}
          {imageViewerPhotos.length > 1 && (
            <button
              onClick={goPrevImage}
              className="absolute left-2 sm:left-4 p-3 rounded-full hover:bg-white/10 text-white"
              aria-label="이전 이미지"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* 이미지 */}
          <div className="max-w-full max-h-full">
            <img
              src={imageViewerPhotos[currentImageIndex]}
              alt="급식 사진"
              className="max-w-full max-h-[85vh] object-contain"
            />
            {imageViewerPhotos.length > 1 && (
              <div className="mt-3 text-center text-xs text-white/70">
                {currentImageIndex + 1} / {imageViewerPhotos.length}
              </div>
            )}
          </div>

          {/* 다음 버튼 */}
          {imageViewerPhotos.length > 1 && (
            <button
              onClick={goNextImage}
              className="absolute right-2 sm:right-4 p-3 rounded-full hover:bg-white/10 text-white"
              aria-label="다음 이미지"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
        </div>
      )}

      {/* 이미지 신고 모달 */}
      {showImageReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full min-h-[500px] max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                급식사진 신고
              </h3>
              <button
                onClick={() => {
                  setShowImageReportModal(false)
                  setImageReportReason('')
                  setImageReportType('wrong_purpose')
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6">
              <p className="text-gray-600 text-sm mb-4">
                이 급식사진의 목적이나 사진이 다르거나 부적절한 경우 신고해주세요. 관리자가 확인 후 조치하겠습니다.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 유형
                </label>
                <select
                  value={imageReportType}
                  onChange={(e) => setImageReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
                >
                  <option value="wrong_purpose">사진의 목적이 다름</option>
                  <option value="wrong_image">사진이 다름</option>
                  <option value="inappropriate">부적절한 내용</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 사유
                </label>
                <textarea
                  value={imageReportReason}
                  onChange={(e) => setImageReportReason(e.target.value)}
                  placeholder="급식사진이 왜 부적절한지 구체적으로 작성해주세요. 예: 사진의 목적이 다르거나, 잘못된 사진이 올라왔습니다..."
                  rows={6}
                  maxLength={500}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent resize-none text-sm"
                />
                <div className="flex justify-between text-xs text-gray-400 font-semibold mt-1">
                  <span>최대 텍스트 길이</span>
                  <span>{imageReportReason.length}/500</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowImageReportModal(false)
                  setImageReportReason('')
                  setImageReportType('wrong_purpose')
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSubmitImageReportModal}
                disabled={imageReportLoading || !imageReportReason.trim()}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {imageReportLoading ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealCalendar;
