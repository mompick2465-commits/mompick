'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SortButtons } from '@/components/ui/sort-buttons'
import { Search, MapPin, Phone, Star, Upload, X, Image as ImageIcon, Trash2, Eye, EyeOff } from 'lucide-react'

interface ChildcareInfo {
  crcode: string
  crname: string
  craddr: string
  crtelno: string
  crtypename: string
  crcapat: string
  reviewCount?: number
  averageRating?: string
  buildingImageCount?: number
  mealDatesCount?: number
  // 추가 정보
  customInfo?: {
    id: string
    building_images?: string[]
    meal_images?: string[]
    detailed_description?: string
    facilities?: string[]
    programs?: string[]
  }
  // 리뷰 정보
  reviews?: Review[]
  // 간편신청 정보
  monthlyPrice?: number | null
  availableSlots?: number | null
}

interface Review {
  id: string
  user_id: string
  user_name: string
  user_nickname?: string
  user_profile_image?: string
  rating: number
  content: string
  helpful_count: number
  created_at: string
  images: ReviewImage[]
  is_deleted?: boolean
  is_hidden?: boolean
}

interface ReviewImage {
  id: string
  review_id: string
  image_url: string
  image_order: number
}

export default function ChildcarePage() {
  const [childcareCenters, setChildcareCenters] = useState<ChildcareInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'rating' | 'reviewCount' | 'name'>('name')
  
  // 지역 선택
  const [selectedSido, setSelectedSido] = useState<string>('')
  const [selectedSgg, setSelectedSgg] = useState<string>('')
  
  // 선택된 어린이집 정보 수정
  const [selectedChildcare, setSelectedChildcare] = useState<ChildcareInfo | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'building' | 'meals' | 'application' | 'reviews'>('building')
  
  // 수정 폼 데이터
  const [formData, setFormData] = useState({
    building_images: [] as string[]
  })
  
  // 급식 관련 상태
  const [selectedMealDate, setSelectedMealDate] = useState<string>('') // YYYY-MM-DD 형식
  const [mealData, setMealData] = useState<{[date: string]: {images: string[], description: string}}>({})
  
  // 간편신청 관련 상태
  const [applicationData, setApplicationData] = useState<{
    monthly_price: number | null
    available_slots: number | null
  }>({
    monthly_price: null,
    available_slots: null
  })

  // 이미지 업로드 상태
  const [uploadingImage, setUploadingImage] = useState<'building' | 'meal' | null>(null)
  
  // 드래그 앤 드롭 상태
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [draggedType, setDraggedType] = useState<'building' | 'meal' | null>(null)
  
  // 지역 코드
  const [regionCodes, setRegionCodes] = useState<any>(null)
  const [sidoList, setSidoList] = useState<string[]>([])
  const [sggList, setSggList] = useState<string[]>([])

  // regionCodes 로드
  useEffect(() => {
    const loadRegionCodes = async () => {
      try {
        const response = await fetch('/api/childcare/regions')
        if (response.ok) {
          const data = await response.json()
          setRegionCodes(data.regionCodes)
          setSidoList(Object.keys(data.regionCodes))
        }
      } catch (error) {
        console.error('지역 코드 로드 오류:', error)
      }
    }
    loadRegionCodes()
  }, [])

  // 시/도 변경 시 시/군/구 목록 업데이트
  useEffect(() => {
    if (selectedSido && regionCodes) {
      const sidoData = regionCodes[selectedSido]
      if (sidoData && sidoData.sggCodes) {
        setSggList(Object.keys(sidoData.sggCodes))
      } else {
        setSggList([])
      }
      setSelectedSgg('')
    }
  }, [selectedSido, regionCodes])

  // 캐시에서 어린이집 목록 조회
  const handleSearchFromCache = async () => {
    if (!selectedSido || !selectedSgg) {
      alert('시/도와 시/군/구를 모두 선택해주세요.')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(`/api/childcare/cache?sido=${encodeURIComponent(selectedSido)}&sgg=${encodeURIComponent(selectedSgg)}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 캐시 응답 데이터:', data)
        
        if (data.source === 'cache') {
          setChildcareCenters(data.childcareCenters || [])
          alert(`✅ 캐시에서 ${data.count}개 어린이집을 불러왔습니다.`)
        } else {
          alert('❌ 해당 지역의 캐시가 없습니다.\nAPI 호출 버튼을 사용하여 데이터를 가져오세요.')
          setChildcareCenters([])
        }
      } else {
        const errorData = await response.json()
        alert(`캐시 조회 실패: ${errorData.error}`)
        setChildcareCenters([])
      }
    } catch (error) {
      console.error('캐시 조회 오류:', error)
      alert('캐시 조회 중 오류가 발생했습니다.')
      setChildcareCenters([])
    } finally {
      setLoading(false)
    }
  }

  // API에서 어린이집 목록 조회 (강제 새로고침)
  const handleSearchFromAPI = async () => {
    if (!selectedSido || !selectedSgg) {
      alert('시/도와 시/군/구를 모두 선택해주세요.')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(`/api/childcare?sido=${encodeURIComponent(selectedSido)}&sgg=${encodeURIComponent(selectedSgg)}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 API 응답 데이터:', data)
        setChildcareCenters(data.childcareCenters || [])
        
        alert(`📡 API에서 ${data.count}개 어린이집을 불러와 캐시에 저장했습니다.`)
      } else {
        const errorData = await response.json()
        alert(`오류: ${errorData.error}`)
        setChildcareCenters([])
      }
    } catch (error) {
      console.error('어린이집 목록 조회 오류:', error)
      alert('어린이집 목록 조회 중 오류가 발생했습니다.')
      setChildcareCenters([])
    } finally {
      setLoading(false)
    }
  }

  // 어린이집 선택 - 상세 정보 및 커스텀 정보 조회
  const handleEditChildcare = async (childcare: ChildcareInfo) => {
    try {
      setLoading(true)
      
      // 1. 커스텀 정보 조회
      let customInfo = null
      try {
        const customResponse = await fetch(`/api/childcare/custom/${childcare.crcode}`)
        if (customResponse.ok) {
          const customData = await customResponse.json()
          customInfo = customData.customInfo
        }
      } catch (error) {
        console.log('커스텀 정보 없음:', error)
      }
      
      // 2. 리뷰 정보 조회
      let reviews: any[] = []
      let reviewCount = 0
      let averageRating = '0.0'
      
      try {
        const reviewResponse = await fetch(`/api/childcare/reviews/${childcare.crcode}`)
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json()
          reviews = reviewData.reviews || []
          reviewCount = reviewData.count || 0
          averageRating = reviewData.averageRating || '0.0'
        }
      } catch (error) {
        console.log('리뷰 정보 없음:', error)
      }
      
      setSelectedChildcare({
        ...childcare,
        customInfo,
        reviews,
        reviewCount,
        averageRating
      })
      
      // 커스텀 정보 로드
      if (customInfo) {
        setFormData({
          building_images: customInfo.building_images || []
        })
      } else {
        setFormData({
          building_images: []
        })
      }
      
      // 3. 급식 정보 조회 (날짜별)
      try {
        const mealsResponse = await fetch(`/api/childcare/meals/${childcare.crcode}`)
        if (mealsResponse.ok) {
          const mealsData = await mealsResponse.json()
          // 날짜별로 급식 데이터 매핑
          const mealsByDate: {[date: string]: {images: string[], description: string}} = {}
          mealsData.meals.forEach((meal: any) => {
            mealsByDate[meal.meal_date] = {
              images: meal.meal_images || [],
              description: meal.menu_description || ''
            }
          })
          setMealData(mealsByDate)
        }
      } catch (error) {
        console.log('급식 정보 없음:', error)
      }
      
      // 4. 간편신청 정보 조회
      try {
        const applicationResponse = await fetch(`/api/childcare/application/${childcare.crcode}`)
        if (applicationResponse.ok) {
          const applicationResponseData = await applicationResponse.json()
          if (applicationResponseData.applicationInfo) {
            setApplicationData({
              monthly_price: applicationResponseData.applicationInfo.monthly_price,
              available_slots: applicationResponseData.applicationInfo.available_slots
            })
          } else {
            setApplicationData({
              monthly_price: null,
              available_slots: null
            })
          }
        }
      } catch (error) {
        console.log('간편신청 정보 없음:', error)
        setApplicationData({
          monthly_price: null,
          available_slots: null
        })
      }
      
      setActiveTab('building')
      setShowEditModal(true)
    } catch (error) {
      console.error('어린이집 상세 정보 조회 오류:', error)
      alert('상세 정보 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 이미지 순서 변경 핸들러
  const handleDragStart = (index: number, imageType: 'building' | 'meal') => {
    setDraggedIndex(index)
    setDraggedType(imageType)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (dropIndex: number, imageType: 'building' | 'meal') => {
    if (draggedIndex === null || draggedType !== imageType) return

    if (imageType === 'building') {
      const newImages = [...formData.building_images]
      const [draggedImage] = newImages.splice(draggedIndex, 1)
      newImages.splice(dropIndex, 0, draggedImage)
      setFormData({ ...formData, building_images: newImages })
    }

    setDraggedIndex(null)
    setDraggedType(null)
  }

  // 이미지 업로드 핸들러
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: 'building' | 'meal') => {
    const files = event.target.files
    if (!files || files.length === 0 || !selectedChildcare) return

    try {
      setUploadingImage(imageType)
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const formDataToSend = new FormData()
        formDataToSend.append('file', file)
        formDataToSend.append('childcareCode', selectedChildcare.crcode)
        formDataToSend.append('imageType', imageType)

        const response = await fetch('/api/childcare/upload', {
          method: 'POST',
          body: formDataToSend
        })

        if (response.ok) {
          const data = await response.json()
          uploadedUrls.push(data.url)
          console.log(`✅ 이미지 업로드 성공: ${data.url}`)
        } else {
          const errorData = await response.json()
          console.error('이미지 업로드 실패:', errorData)
          alert(`이미지 업로드 실패: ${errorData.error}`)
        }
      }

      // 업로드된 이미지를 formData 또는 mealData에 추가
      if (uploadedUrls.length > 0) {
        if (imageType === 'building') {
          setFormData({
            ...formData,
            building_images: [...formData.building_images, ...uploadedUrls]
          })
        } else if (imageType === 'meal' && selectedMealDate) {
          // 급식 이미지는 선택된 날짜에 추가
          setMealData({
            ...mealData,
            [selectedMealDate]: {
              images: [...(mealData[selectedMealDate]?.images || []), ...uploadedUrls],
              description: mealData[selectedMealDate]?.description || ''
            }
          })
        }
        alert(`${uploadedUrls.length}개 이미지가 업로드되었습니다.`)
      }

    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingImage(null)
      event.target.value = ''
    }
  }

  // 건물 사진 저장
  const handleSaveBuildingImages = async () => {
    if (!selectedChildcare) return

    if (!confirm('건물 사진을 저장하시겠습니까?\n\n앱의 어린이집 상세보기에 즉시 반영됩니다.')) {
      return
    }

    try {
      setLoading(true)
      
      const customResponse = await fetch('/api/childcare/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          childcare_code: selectedChildcare.crcode,
          childcare_name: selectedChildcare.crname,
          building_images: formData.building_images
        })
      })

      if (!customResponse.ok) {
        const errorData = await customResponse.json()
        alert(`저장 실패: ${errorData.error}`)
        return
      }

      console.log('✅ 커스텀 정보 테이블 저장 완료')

      alert('건물 사진이 저장되었습니다.\n앱에서 어린이집을 다시 열면 반영됩니다.')
    } catch (error) {
      console.error('건물 사진 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 급식 정보 저장
  const handleSaveMealInfo = async () => {
    if (!selectedChildcare) return

    if (!confirm('급식 정보를 저장하시겠습니까?\n\n앱의 급식 캘린더에 즉시 반영됩니다.')) {
      return
    }

    try {
      setLoading(true)
      
      // 날짜별 급식 정보를 배열로 변환
      const mealsArray = Object.entries(mealData).map(([date, data]) => ({
        meal_date: date,
        meal_images: data.images,
        menu_description: data.description
      }))

      // 급식 정보 저장
      const mealsResponse = await fetch('/api/childcare/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          childcare_code: selectedChildcare.crcode,
          meals: mealsArray
        })
      })

      if (!mealsResponse.ok) {
        const errorData = await mealsResponse.json()
        alert(`저장 실패: ${errorData.error}`)
        return
      }

      alert('급식 정보가 저장되었습니다.')
    } catch (error) {
      console.error('급식 정보 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 리뷰 삭제 핸들러
  const handleDeleteReview = async (reviewId: string, childcareCode: string) => {
    if (!confirm('정말 이 리뷰를 삭제하시겠습니까?\n\n삭제된 리뷰는 앱에서 보이지 않으며, 평점과 리뷰 개수에서 제외됩니다.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/childcare/reviews/${childcareCode}/${reviewId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('리뷰가 삭제되었습니다.')
        const reviewResponse = await fetch(`/api/childcare/reviews/${childcareCode}`)
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json()
          setSelectedChildcare({
            ...selectedChildcare!,
            reviews: reviewData.reviews || [],
            reviewCount: reviewData.count || 0,
            averageRating: reviewData.averageRating || '0.0'
          })
        }
      } else {
        const errorData = await response.json()
        alert(`삭제 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('리뷰 삭제 오류:', error)
      alert('리뷰 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 리뷰 숨김 처리 핸들러
  const handleHideReview = async (reviewId: string, childcareCode: string) => {
    if (!confirm('이 리뷰를 숨김 처리하시겠습니까?\n\n숨김 처리된 리뷰는 앱에서 "관리자에 의해 숨김처리된 칭찬입니다"로 표시됩니다.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/childcare/reviews/${childcareCode}/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'hide' })
      })

      if (response.ok) {
        alert('리뷰가 숨김 처리되었습니다.')
        const reviewResponse = await fetch(`/api/childcare/reviews/${childcareCode}`)
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json()
          setSelectedChildcare({
            ...selectedChildcare!,
            reviews: reviewData.reviews || [],
            reviewCount: reviewData.count || 0,
            averageRating: reviewData.averageRating || '0.0'
          })
        }
      } else {
        const errorData = await response.json()
        alert(`숨김 처리 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('리뷰 숨김 처리 오류:', error)
      alert('리뷰 숨김 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 리뷰 숨김 해제 핸들러
  const handleUnhideReview = async (reviewId: string, childcareCode: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/childcare/reviews/${childcareCode}/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'unhide' })
      })

      if (response.ok) {
        alert('리뷰 숨김 처리가 해제되었습니다.')
        const reviewResponse = await fetch(`/api/childcare/reviews/${childcareCode}`)
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json()
          setSelectedChildcare({
            ...selectedChildcare!,
            reviews: reviewData.reviews || [],
            reviewCount: reviewData.count || 0,
            averageRating: reviewData.averageRating || '0.0'
          })
        }
      } else {
        const errorData = await response.json()
        alert(`숨김 해제 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('리뷰 숨김 해제 오류:', error)
      alert('리뷰 숨김 해제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 간편신청 정보 저장
  const handleSaveApplicationInfo = async () => {
    if (!selectedChildcare) return

    if (!confirm('간편신청 정보를 저장하시겠습니까?\n\n앱의 어린이집 목록에 즉시 반영됩니다.')) {
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/childcare/application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          childcare_code: selectedChildcare.crcode,
          childcare_name: selectedChildcare.crname,
          monthly_price: applicationData.monthly_price,
          available_slots: applicationData.available_slots
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`저장 실패: ${errorData.error}`)
        return
      }

      alert('간편신청 정보가 저장되었습니다.')
    } catch (error) {
      console.error('간편신청 정보 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const filteredChildcareCenters = childcareCenters
    .filter(cc =>
      cc.crname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.craddr.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          const ratingA = parseFloat(a.averageRating || '0')
          const ratingB = parseFloat(b.averageRating || '0')
          return ratingB - ratingA // 높은 평점 순
        case 'reviewCount':
          return (b.reviewCount || 0) - (a.reviewCount || 0) // 많은 리뷰 순
        case 'name':
          return a.crname.localeCompare(b.crname, 'ko') // 가나다 순
        default:
          return 0
      }
    })

  // 리뷰가 가장 많은 어린이집 찾기
  const maxReviewCount = Math.max(...filteredChildcareCenters.map(cc => cc.reviewCount || 0))
  const hasReviews = maxReviewCount > 0

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">어린이집 관리</h1>
        <p className="text-sm text-gray-600">지역별 어린이집을 검색하고 상세 정보를 추가하세요</p>
      </div>

      {/* 지역 선택 카드 */}
      <Card className="border-0 shadow-none mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">지역 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedSido}
              onChange={(e) => setSelectedSido(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">시/도 선택</option>
              {sidoList.map(sido => (
                <option key={sido} value={sido}>{sido}</option>
              ))}
            </select>

            <select
              value={selectedSgg}
              onChange={(e) => setSelectedSgg(e.target.value)}
              disabled={!selectedSido}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">시/군/구 선택</option>
              {sggList.map(sgg => (
                <option key={sgg} value={sgg}>{sgg}</option>
              ))}
            </select>

            <div className="flex space-x-2">
              <Button 
                onClick={handleSearchFromCache}
                disabled={!selectedSido || !selectedSgg}
                variant="outline"
                className="text-sm flex-1"
              >
                <Search className="h-4 w-4 mr-1" />
                캐시 조회
              </Button>
              <Button 
                onClick={handleSearchFromAPI}
                disabled={!selectedSido || !selectedSgg}
                className="text-sm flex-1"
              >
                <Search className="h-4 w-4 mr-1" />
                API 호출
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 어린이집 목록 */}
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
          <CardTitle className="text-lg">어린이집 목록</CardTitle>
            {childcareCenters.length > 0 && (
              <span className="text-sm text-gray-600">{childcareCenters.length}개 어린이집</span>
            )}
          </div>
          {childcareCenters.length > 0 && (
            <div className="space-y-3 mt-3">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="어린이집명, 주소로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div>
                <SortButtons
                  options={[
                    { value: 'rating', label: '리뷰평점 순' },
                    { value: 'reviewCount', label: '리뷰갯수 순' },
                    { value: 'name', label: '가나다 순' }
                  ]}
                  activeSort={sortBy}
                  onSortChange={(sort) => setSortBy(sort as 'rating' | 'reviewCount' | 'name')}
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {childcareCenters.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              지역을 선택하고 어린이집을 검색하세요.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChildcareCenters.map((childcare) => {
                const isTopReviewed = hasReviews && childcare.reviewCount === maxReviewCount && maxReviewCount > 0
                
                return (
                  <div 
                    key={childcare.crcode} 
                    className={`rounded-lg hover:bg-gray-200 transition-all p-3 cursor-pointer ${
                      isTopReviewed 
                        ? 'bg-green-50 border-2 border-green-400 shadow-md' 
                        : 'bg-gray-100'
                    }`}
                    onClick={() => handleEditChildcare(childcare)}
                  >
                    {/* 상단: 어린이집명과 인기 배지 */}
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{childcare.crname}</h3>
                      {isTopReviewed && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-500 text-white">
                          🏆 인기
                        </span>
                      )}
                    </div>
                    
                    {/* 주소 */}
                    <div className="flex items-center space-x-1.5 text-xs text-gray-500 mb-2">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">{childcare.craddr}</span>
                    </div>
                    
                    {/* 하단: 정보들을 가로로 배치 (배지 스타일) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-200">
                      {/* 리뷰 배지 */}
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs ${
                        isTopReviewed 
                          ? 'bg-green-100 text-green-700 font-semibold' 
                          : 'bg-yellow-50 text-yellow-800'
                      }`}>
                        <Star className={`h-3 w-3 ${isTopReviewed ? 'text-green-600' : 'text-yellow-500'} fill-current`} />
                        <span className="font-medium">
                          {childcare.averageRating && childcare.reviewCount && childcare.reviewCount > 0 ? (
                            <>
                              {childcare.averageRating} ({childcare.reviewCount})
                            </>
                          ) : (
                            `리뷰 ${childcare.reviewCount || 0}`
                          )}
                  </span>
                </div>
                
                      {/* 건물 사진 배지 */}
                      {(childcare.buildingImageCount || 0) > 0 && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                          <ImageIcon className="h-3 w-3 text-blue-600" />
                          <span className="font-medium">건물 {childcare.buildingImageCount}개</span>
                        </div>
                      )}
                      
                      {/* 급식 배지 */}
                      {(childcare.mealDatesCount || 0) > 0 && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs">
                          <svg className="h-3 w-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                          </svg>
                          <span className="font-medium">급식 {childcare.mealDatesCount}일</span>
                  </div>
                      )}
                      
                      {/* 간편신청 - 월 금액 배지 */}
                      {childcare.monthlyPrice && (
                        <div className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-semibold">
                          월 {childcare.monthlyPrice}만원
                  </div>
                      )}
                      
                      {/* 간편신청 - 빈자리 배지 */}
                      {childcare.availableSlots && (
                        <div className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
                          빈자리 {childcare.availableSlots}개
                        </div>
                      )}
                    </div>
                    
                    {/* 추가 정보 */}
                    <div className="mt-2 space-y-1">
                      {childcare.crtelno && (
                        <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{childcare.crtelno}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-gray-500">
                        코드: {childcare.crcode}
                      </div>
                    </div>
                  </div>
                )
              })}
                  </div>
          )}
          
          {childcareCenters.length > 0 && filteredChildcareCenters.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 어린이집 상세보기 모달 */}
      {showEditModal && selectedChildcare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-4 max-h-[90vh] overflow-y-auto">
            {/* 모달 제목 */}
            <div className="mb-3 pb-2 border-b">
              <h2 className="text-base font-bold text-gray-900">어린이집 상세보기</h2>
            </div>

            {/* 어린이집 기본 정보 */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold">{selectedChildcare.crname}</h3>
                <p className="text-xs text-gray-600 mt-0.5">{selectedChildcare.craddr}</p>
                {selectedChildcare.reviewCount !== undefined && (
                  <div className="flex items-center space-x-2 mt-1.5">
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-xs font-medium">{selectedChildcare.averageRating || 0}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">리뷰 {selectedChildcare.reviewCount}개</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedChildcare(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex border-b mb-4">
              <button
                onClick={() => setActiveTab('building')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'building'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                건물 사진
              </button>
              <button
                onClick={() => setActiveTab('meals')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'meals'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                급식 관리
              </button>
              <button
                onClick={() => setActiveTab('application')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'application'
                    ? 'border-b-2 border-orange-600 text-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                간편신청
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                리뷰 ({selectedChildcare.reviewCount || 0})
              </button>
              </div>
              
            {/* 건물 사진 탭 */}
            {activeTab === 'building' && (
              <div className="space-y-4">
              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    건물 사진
                    <span className="text-[10px] text-gray-500 ml-2">(드래그하여 순서 변경 가능)</span>
                </label>
                  <div className="grid grid-cols-4 gap-2">
                    {formData.building_images.map((url, index) => (
                      <div 
                        key={index} 
                        className="relative group cursor-move"
                        draggable
                        onDragStart={() => handleDragStart(index, 'building')}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index, 'building')}
                      >
                        <img src={url} alt={`건물 ${index + 1}`} className="w-full h-20 object-cover rounded" />
                        {/* 순서 번호 및 배지 표시 */}
                        <div className="absolute top-1 left-1 flex items-center gap-1">
                          <div className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {index + 1}
                          </div>
                          {index === 0 && (
                            <>
                              <div className="bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                프로필
                              </div>
                            <div className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                              간편신청
                            </div>
                            </>
                          )}
                          <div className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                            상세보기
                          </div>
                        </div>
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            building_images: formData.building_images.filter((_, i) => i !== index)
                          })}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    <label className="cursor-pointer">
                      <div className="w-full h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center hover:border-blue-500 transition-colors">
                        {uploadingImage === 'building' ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-blue-500 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <div className="text-[10px] text-gray-500">업로드 중...</div>
                          </>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-gray-400 mb-1" />
                            <div className="text-[10px] text-gray-500">사진 추가</div>
                          </>
                        )}
                      </div>
                <input
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, 'building')}
                        disabled={uploadingImage !== null}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
              
            {/* 급식 관리 탭 */}
            {activeTab === 'meals' && (
              <div className="space-y-4">
              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    급식 날짜 선택
                </label>
                  <input
                    type="date"
                    value={selectedMealDate}
                    onChange={(e) => setSelectedMealDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
              </div>
              
                {selectedMealDate && (
                  <>
              <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        {selectedMealDate} 급식 사진
                        <span className="text-[10px] text-gray-500 ml-2">(드래그하여 순서 변경 가능)</span>
                </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(mealData[selectedMealDate]?.images || []).map((url, index) => (
                          <div 
                            key={index} 
                            className="relative group cursor-move"
                          >
                            <img src={url} alt={`급식 ${index + 1}`} className="w-full h-20 object-cover rounded" />
                            <div className="absolute top-1 left-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                              {index + 1}
                            </div>
                            <button
                              onClick={() => {
                                const currentImages = mealData[selectedMealDate]?.images || []
                                setMealData({
                                  ...mealData,
                                  [selectedMealDate]: {
                                    ...mealData[selectedMealDate],
                                    images: currentImages.filter((_, i) => i !== index)
                                  }
                                })
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <label className="cursor-pointer">
                          <div className="w-full h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center hover:border-purple-500 transition-colors">
                            {uploadingImage === 'meal' ? (
                              <>
                                <svg className="animate-spin h-5 w-5 text-purple-500 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <div className="text-[10px] text-gray-500">업로드 중...</div>
                              </>
                            ) : (
                              <>
                                <Upload className="h-5 w-5 text-gray-400 mb-1" />
                                <div className="text-[10px] text-gray-500">사진 추가</div>
                              </>
                            )}
                          </div>
                <input
                            type="file" 
                            accept="image/*" 
                            multiple
                            className="hidden" 
                            onChange={(e) => handleImageUpload(e, 'meal')}
                            disabled={uploadingImage !== null}
                          />
                        </label>
                      </div>
              </div>
              
              <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        메뉴 설명
                        <span className="text-[10px] text-gray-500 ml-2">(반찬, 영양 정보 등)</span>
                </label>
                      <textarea
                        value={mealData[selectedMealDate]?.description || ''}
                        onChange={(e) => setMealData({
                          ...mealData,
                          [selectedMealDate]: {
                            images: mealData[selectedMealDate]?.images || [],
                            description: e.target.value
                          }
                        })}
                        rows={3}
                        className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="예: 쌀밥, 된장찌개, 불고기, 김치&#10;칼로리: 500kcal, 단백질: 20g"
                      />
                    </div>
                  </>
                )}

                {!selectedMealDate && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    날짜를 선택하여 급식 정보를 추가하세요.
                  </div>
                )}
              </div>
            )}

            {/* 간편신청 탭 */}
            {activeTab === 'application' && (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-orange-800">
                    💡 앱의 어린이집 간편신청 목록에서 "월 -만원", "빈자리 -개" 형태로 표시됩니다.
                  </p>
              </div>
              
              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    월 금액 (만원)
                    <span className="text-[10px] text-gray-500 ml-2">(예: 40만원 → 40 입력)</span>
                </label>
                <input
                    type="number"
                    value={applicationData.monthly_price || ''}
                    onChange={(e) => setApplicationData({
                      ...applicationData,
                      monthly_price: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="40"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {applicationData.monthly_price && (
                    <p className="text-xs text-gray-500 mt-1">
                      앱 표시: <span className="font-semibold text-orange-600">월 {applicationData.monthly_price}만원</span>
                    </p>
                  )}
              </div>
              
              <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    빈자리 개수
                    <span className="text-[10px] text-gray-500 ml-2">(예: 3개 → 3 입력)</span>
                </label>
                <input
                  type="number"
                    value={applicationData.available_slots || ''}
                    onChange={(e) => setApplicationData({
                      ...applicationData,
                      available_slots: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="3"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {applicationData.available_slots && (
                    <p className="text-xs text-gray-500 mt-1">
                      앱 표시: <span className="font-semibold text-green-600">빈자리 {applicationData.available_slots}개</span>
                    </p>
                  )}
                </div>

                {(applicationData.monthly_price || applicationData.available_slots) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">📱 앱 미리보기</p>
                    <div className="flex items-center gap-2">
                      {applicationData.monthly_price && (
                        <span className="text-sm font-bold text-[#fb8678]">
                          월 {applicationData.monthly_price}만원
                        </span>
                      )}
                      {applicationData.available_slots && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                          빈자리 {applicationData.available_slots}개
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 리뷰 관리 탭 */}
            {activeTab === 'reviews' && (
              <div className="space-y-3">
                {selectedChildcare.reviews && selectedChildcare.reviews.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedChildcare.reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start space-x-2">
                            {review.user_profile_image ? (
                              <img
                                src={review.user_profile_image}
                                alt={review.user_name || '사용자'}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {review.user_name ? review.user_name.charAt(0) : '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium">{review.user_name || '알 수 없음'}</p>
                              {review.user_nickname && (
                                <p className="text-[10px] text-gray-500">@{review.user_nickname}</p>
                              )}
                              <div className="flex items-center space-x-0.5 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-2.5 w-2.5 ${
                                      star <= review.rating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {new Date(review.created_at).toLocaleDateString('ko-KR')}
                          </span>
            </div>
            
                        {/* 숨김 처리된 리뷰 표시 */}
                        {review.is_hidden ? (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 italic mb-2">관리자에 의해 숨김처리된 칭찬입니다.</p>
                            {review.images && review.images.length > 0 && (
                              <div className="mb-2">
                                <strong className="text-xs text-gray-700">이미지 ({review.images.length}개):</strong>
                                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                                  {review.images.map((image: any, index: number) => (
                                    <div key={image.id || index} className="relative aspect-square rounded overflow-hidden bg-gray-200 flex items-center justify-center">
                                      <span className="text-[10px] text-gray-400">사진 없음</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-gray-900 mb-2">{review.content}</p>
                            
                            {/* 이미지 표시 (신고관리와 동일한 방식) */}
                            {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                              <div className="mb-2">
                                <strong className="text-xs text-gray-700">이미지 ({review.images.length}개):</strong>
                                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                                  {review.images.map((image: any, index: number) => {
                                    const imageUrl = typeof image === 'string' ? image : image.image_url
                                    return (
                                      <div key={image.id || index} className="relative aspect-square rounded overflow-hidden bg-gray-100">
                                        <img
                                          src={imageUrl}
                                          alt={`리뷰 이미지 ${index + 1}`}
                                          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => window.open(imageUrl, '_blank')}
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-[10px] text-gray-600">
                            도움됨 {review.helpful_count}
                          </span>
                          <div className="flex items-center space-x-1">
                            {review.is_hidden ? (
                              <button
                                onClick={() => handleUnhideReview(review.id, selectedChildcare.crcode)}
                                className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>숨김 해제</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleHideReview(review.id, selectedChildcare.crcode)}
                                className="text-[10px] px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors flex items-center space-x-1"
                              >
                                <EyeOff className="h-3 w-3" />
                                <span>숨김</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(review.id, selectedChildcare.crcode)}
                              className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center space-x-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>삭제</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    등록된 리뷰가 없습니다.
                  </div>
                )}
              </div>
            )}

            {/* 저장 버튼 */}
            {(activeTab === 'building' || activeTab === 'meals' || activeTab === 'application') && (
              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t">
              <Button
                variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedChildcare(null)
                  }}
                  className="text-xs"
              >
                취소
              </Button>
                <Button 
                  onClick={
                    activeTab === 'building' ? handleSaveBuildingImages : 
                    activeTab === 'meals' ? handleSaveMealInfo : 
                    handleSaveApplicationInfo
                  }
                  size="sm"
                  className="text-xs"
                >
                  {activeTab === 'building' ? '건물 사진 저장' : 
                   activeTab === 'meals' ? '급식 정보 저장' : 
                   '간편신청 정보 저장'}
              </Button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
