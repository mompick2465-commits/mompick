'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SortButtons } from '@/components/ui/sort-buttons'
import { Search, MapPin, Edit, Upload, X, Image as ImageIcon, Star, Trash2, Eye, EyeOff } from 'lucide-react'

interface PlaygroundInfo {
  id: string
  name: string
  address: string
  pfctSn?: string
  pfctNm?: string
  addr?: string
  roadAddr?: string
  reviewCount?: number
  buildingImageCount?: number
  averageRating?: string | null
  customInfo?: {
    id: string
    building_images?: string[]
    detailed_description?: string
    facilities?: string[]
    programs?: string[]
  }
  reviews?: Review[]
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

export default function PlaygroundsPage() {
  const [playgrounds, setPlaygrounds] = useState<PlaygroundInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'rating' | 'reviewCount' | 'name'>('name')
  
  // 지역 선택
  const [selectedSido, setSelectedSido] = useState<string>('')
  const [selectedSgg, setSelectedSgg] = useState<string>('')
  
  // 선택된 놀이시설 정보 수정
  const [selectedPlayground, setSelectedPlayground] = useState<PlaygroundInfo | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'building' | 'reviews'>('building')
  
  // 수정 폼 데이터
  const [formData, setFormData] = useState({
    building_images: [] as string[]
  })
  
  // 이미지 업로드 상태
  const [uploadingImage, setUploadingImage] = useState<'building' | null>(null)
  
  // 드래그 앤 드롭 상태
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // 시/도 목록
  const [regionCodes, setRegionCodes] = useState<any>(null)
  const [sidoList, setSidoList] = useState<string[]>([])
  
  // 시/군/구 목록
  const [sggList, setSggList] = useState<string[]>([])

  // 지역선택 배치 상태
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)
  const [regionLoadingMessage, setRegionLoadingMessage] = useState('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // 페이지 로드 시 저장된 지역 매핑 자동 로드
  useEffect(() => {
    const loadSavedRegionCodes = async () => {
      try {
        setIsInitialLoad(true)
        console.log('🔍 저장된 지역 코드 로드 시작...')
        const response = await fetch('/api/playgrounds/regions')
        
        if (response.ok) {
          const data = await response.json()
          console.log('📦 API 응답 데이터:', data)
          console.log('📋 데이터 소스:', data.source)
          console.log('📊 regionCodes 존재 여부:', !!data.regionCodes)
          console.log('📊 regionCodes 키 개수:', data.regionCodes ? Object.keys(data.regionCodes).length : 0)
          
          if (data.regionCodes && Object.keys(data.regionCodes).length > 0) {
            setRegionCodes(data.regionCodes)
            const sidoKeys = Object.keys(data.regionCodes)
            console.log('✅ 시도 목록 로드 완료:', sidoKeys.length, '개')
            console.log('✅ 시도 목록:', sidoKeys)
            setSidoList(sidoKeys)
            
            if (data.source === 'cache') {
              console.log('✅ 저장된 캐시에서 빠르게 로드했습니다.')
            } else {
              console.log('⚠️ 스토리지에서 새로 처리했습니다. (이번에 저장됨)')
            }
          } else {
            console.log('⚠️ 저장된 지역 정보가 없습니다. 배치 버튼을 눌러주세요.')
            setRegionCodes(null)
            setSidoList([])
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.log('⚠️ 지역 정보 로드 실패:', response.status, errorData)
          setRegionCodes(null)
          setSidoList([])
        }
      } catch (error) {
        console.error('❌ 저장된 지역 코드 로드 오류:', error)
        setRegionCodes(null)
        setSidoList([])
      } finally {
        setIsInitialLoad(false)
      }
    }
    
    loadSavedRegionCodes()
  }, [])

  // 지역선택 배치 함수 (수동 실행)
  const handleLoadRegionCodes = async () => {
    try {
      setIsLoadingRegions(true)
      setRegionLoadingMessage('스토리지 검색 중...')
      
      console.log('🔍 지역 코드 로드 시작...')
      const response = await fetch('/api/playgrounds/regions')
      console.log('📡 API 응답 상태:', response.status, response.statusText)
      
      setRegionLoadingMessage('배치 처리 중...')
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 API 응답 데이터:', data)
        console.log('📋 regionCodes:', data.regionCodes)
        console.log('📊 regionCodes 키 개수:', Object.keys(data.regionCodes || {}).length)
        console.log('💾 DB 저장 여부:', data.savedToDatabase)
        
        if (data.regionCodes && Object.keys(data.regionCodes).length > 0) {
          setRegionCodes(data.regionCodes)
          const sidoKeys = Object.keys(data.regionCodes)
          console.log('✅ 시도 목록:', sidoKeys)
          setSidoList(sidoKeys)
          
          // DB 저장 성공 여부 확인
          if (data.savedToDatabase) {
            setRegionLoadingMessage('완료! (DB 저장 성공)')
            setTimeout(() => {
              setRegionLoadingMessage('')
            }, 2000)
          } else {
            setRegionLoadingMessage('완료! (DB 저장 실패)')
            console.error('❌ DB 저장 실패:', data.saveError)
            alert(`지역 정보는 불러왔지만 DB 저장에 실패했습니다.\n\n에러: ${data.saveError || '알 수 없는 오류'}\n\n다시 시도해주세요.`)
            setTimeout(() => {
              setRegionLoadingMessage('')
            }, 2000)
            // 저장 실패 시 regionCodes를 초기화하여 버튼이 다시 나타나도록 함
            setRegionCodes({})
            setSidoList([])
            return
          }
        } else {
          console.warn('⚠️ regionCodes가 비어있습니다.')
          setRegionCodes({})
          setSidoList([])
          setRegionLoadingMessage('')
          alert('지역 정보를 찾을 수 없습니다.')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API 오류:', response.status, errorData)
        setRegionCodes({})
        setSidoList([])
        setRegionLoadingMessage('')
        alert('지역 정보를 불러오는 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('❌ 지역 코드 로드 오류:', error)
      setRegionCodes({})
      setSidoList([])
      setRegionLoadingMessage('')
      alert('지역 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoadingRegions(false)
    }
  }

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

  // 캐시에서 놀이시설 목록 조회
  const handleSearchFromCache = async () => {
    if (!selectedSido || !selectedSgg) {
      alert('시/도와 시/군/구를 모두 선택해주세요.')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(`/api/playgrounds/cache?sido=${encodeURIComponent(selectedSido)}&sgg=${encodeURIComponent(selectedSgg)}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 캐시 응답 데이터:', data)
        
        if (data.source === 'cache') {
          setPlaygrounds(data.playgrounds || [])
          alert(`✅ 캐시에서 ${data.count}개 놀이시설을 불러왔습니다.`)
        } else {
          alert('❌ 해당 지역의 캐시가 없습니다.')
          setPlaygrounds([])
        }
      } else {
        const errorData = await response.json()
        alert(`캐시 조회 실패: ${errorData.error}`)
        setPlaygrounds([])
      }
    } catch (error) {
      console.error('캐시 조회 오류:', error)
      alert('캐시 조회 중 오류가 발생했습니다.')
      setPlaygrounds([])
    } finally {
      setLoading(false)
    }
  }

  // 놀이시설 선택 - 상세 정보 및 커스텀 정보 조회
  const handleEditPlayground = async (playground: PlaygroundInfo) => {
    try {
      setLoading(true)
      
      const playgroundId = playground.id || playground.pfctSn || ''
      
      // 1. 커스텀 정보 조회
      let customInfo = null
      try {
        const customResponse = await fetch(`/api/playgrounds/custom/${playgroundId}`)
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
        const reviewResponse = await fetch(`/api/playgrounds/reviews/${playgroundId}`)
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json()
          reviews = reviewData.reviews || []
          reviewCount = reviewData.count || 0
          averageRating = reviewData.averageRating || '0.0'
        }
      } catch (error) {
        console.log('리뷰 정보 없음:', error)
      }
      
      setSelectedPlayground({
        ...playground,
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
      
      setActiveTab('building')
      setShowEditModal(true)
    } catch (error) {
      console.error('놀이시설 상세 정보 조회 오류:', error)
      alert('상세 정보 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 이미지 순서 변경 핸들러
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null) return

    const newImages = [...formData.building_images]
    const [draggedImage] = newImages.splice(draggedIndex, 1)
    newImages.splice(dropIndex, 0, draggedImage)

    setFormData({ ...formData, building_images: newImages })
    setDraggedIndex(null)
  }

  // 이미지 업로드 핸들러
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !selectedPlayground) return

    try {
      setUploadingImage('building')
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('playgroundId', selectedPlayground.id)
        formData.append('imageType', 'building')

        const response = await fetch('/api/playgrounds/upload', {
          method: 'POST',
          body: formData
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

      // 업로드된 이미지를 formData에 추가
      if (uploadedUrls.length > 0) {
        setFormData({
          ...formData,
          building_images: [...formData.building_images, ...uploadedUrls]
        })
        alert(`${uploadedUrls.length}개 이미지가 업로드되었습니다.`)
      }

    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingImage(null)
      // input 초기화
      event.target.value = ''
    }
  }

  // 리뷰 삭제 핸들러
  const handleDeleteReview = async (reviewId: string, playgroundId: string) => {
    if (!confirm('정말 이 리뷰를 삭제하시겠습니까?\n\n삭제된 리뷰는 앱에서 보이지 않으며, 평점과 리뷰 개수에서 제외됩니다.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/playgrounds/reviews/${playgroundId}/${reviewId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('리뷰가 삭제되었습니다.')
        const reviewResponse = await fetch(`/api/playgrounds/reviews/${playgroundId}`)
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json()
          setSelectedPlayground({
            ...selectedPlayground!,
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
  const handleHideReview = async (reviewId: string, playgroundId: string) => {
    if (!confirm('이 리뷰를 숨김 처리하시겠습니까?\n\n숨김 처리된 리뷰는 앱에서 "관리자에 의해 숨김처리된 칭찬입니다"로 표시됩니다.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/playgrounds/reviews/${playgroundId}/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'hide' })
      })

      if (response.ok) {
        alert('리뷰가 숨김 처리되었습니다.')
        const reviewResponse = await fetch(`/api/playgrounds/reviews/${playgroundId}`)
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json()
          setSelectedPlayground({
            ...selectedPlayground!,
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
  const handleUnhideReview = async (reviewId: string, playgroundId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/playgrounds/reviews/${playgroundId}/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'unhide' })
      })

      if (response.ok) {
        alert('리뷰 숨김 처리가 해제되었습니다.')
        const reviewResponse = await fetch(`/api/playgrounds/reviews/${playgroundId}`)
        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json()
          setSelectedPlayground({
            ...selectedPlayground!,
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

  // 건물 사진 저장
  const handleSaveBuildingImages = async () => {
    if (!selectedPlayground) return

    if (!confirm('건물 사진을 저장하시겠습니까?\n\n앱의 놀이시설 상세보기에 즉시 반영됩니다.')) {
      return
    }

    try {
      setLoading(true)
      
      // 1. 커스텀 정보 테이블에 저장
      const customResponse = await fetch('/api/playgrounds/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playground_id: selectedPlayground.id,
          playground_name: selectedPlayground.name,
          building_images: formData.building_images
        })
      })

      if (!customResponse.ok) {
        const errorData = await customResponse.json()
        alert(`저장 실패: ${errorData.error}`)
        return
      }

      console.log('✅ 커스텀 정보 테이블 저장 완료')

      alert('건물 사진이 저장되었습니다.\n앱에서 놀이시설을 다시 열면 반영됩니다.')
    } catch (error) {
      console.error('건물 사진 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const filteredPlaygrounds = playgrounds
    .filter(pg =>
      (pg.name || pg.pfctNm || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pg.address || pg.addr || pg.roadAddr || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const nameA = a.name || a.pfctNm || ''
      const nameB = b.name || b.pfctNm || ''
      
      switch (sortBy) {
        case 'rating':
          const ratingA = parseFloat(a.averageRating || '0')
          const ratingB = parseFloat(b.averageRating || '0')
          return ratingB - ratingA // 높은 평점 순
        case 'reviewCount':
          return (b.reviewCount || 0) - (a.reviewCount || 0) // 많은 리뷰 순
        case 'name':
          return nameA.localeCompare(nameB, 'ko') // 가나다 순
        default:
          return 0
      }
    })

  // 리뷰가 가장 많은 놀이시설 찾기
  const maxReviewCount = Math.max(...filteredPlaygrounds.map(pg => pg.reviewCount || 0))
  const hasReviews = maxReviewCount > 0

  if (loading && playgrounds.length === 0) {
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
        <h1 className="text-xl font-bold text-gray-900">놀이시설 관리</h1>
        <p className="text-sm text-gray-600">지역별 놀이시설을 검색하고 상세 정보를 추가하세요</p>
      </div>

      {/* 지역 선택 카드 */}
      <Card className="border-0 shadow-none mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">지역 선택</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 지역선택 배치 버튼 */}
          {isInitialLoad ? (
            <div className="mb-4 flex items-center justify-center md:justify-start">
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>저장된 지역 정보 불러오는 중...</span>
              </div>
            </div>
          ) : (!regionCodes || Object.keys(regionCodes).length === 0) ? (
            <div className="mb-4 flex items-center justify-center md:justify-start">
              <Button 
                onClick={handleLoadRegionCodes}
                disabled={isLoadingRegions}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none w-full md:w-auto text-base"
              >
                {isLoadingRegions ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{regionLoadingMessage || '처리 중...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>지역선택 배치</span>
                  </div>
                )}
              </Button>
            </div>
          ) : null}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedSido}
              onChange={(e) => setSelectedSido(e.target.value)}
              disabled={!regionCodes || Object.keys(regionCodes).length === 0}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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

            <Button 
              onClick={handleSearchFromCache}
              disabled={!selectedSido || !selectedSgg}
              className="text-sm"
            >
              <Search className="h-4 w-4 mr-1" />
              캐시 조회
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 놀이시설 목록 */}
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">놀이시설 목록</CardTitle>
            {playgrounds.length > 0 && (
              <span className="text-sm text-gray-600">{playgrounds.length}개 놀이시설</span>
            )}
          </div>
          {playgrounds.length > 0 && (
            <div className="space-y-3 mt-3">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="놀이시설명, 주소로 검색..."
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
          {playgrounds.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              지역을 선택하고 놀이시설을 검색하세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlaygrounds.map((playground) => {
                const isTopReviewed = hasReviews && playground.reviewCount === maxReviewCount && maxReviewCount > 0
                const playgroundName = playground.name || playground.pfctNm || '이름 없음'
                const playgroundAddress = playground.address || playground.addr || playground.roadAddr || '주소 없음'
                
                return (
                  <div 
                    key={playground.id} 
                    className={`rounded-lg hover:bg-gray-200 transition-all p-3 cursor-pointer ${
                      isTopReviewed 
                        ? 'bg-green-50 border-2 border-green-400 shadow-md' 
                        : 'bg-gray-100'
                    }`}
                    onClick={() => handleEditPlayground(playground)}
                  >
                    {/* 상단: 놀이시설명과 인기 배지 */}
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{playgroundName}</h3>
                      {isTopReviewed && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-500 text-white">
                          🏆 인기
                        </span>
                      )}
                    </div>
                    
                    {/* 주소 */}
                    <div className="flex items-center space-x-1.5 text-xs text-gray-500 mb-2">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">{playgroundAddress}</span>
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
                          {playground.averageRating && playground.reviewCount && playground.reviewCount > 0 ? (
                            <>
                              {playground.averageRating} ({playground.reviewCount})
                            </>
                          ) : (
                            `리뷰 ${playground.reviewCount || 0}`
                          )}
                        </span>
                      </div>
                      
                      {/* 건물 사진 배지 */}
                      {(playground.buildingImageCount || 0) > 0 && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                          <ImageIcon className="h-3 w-3 text-blue-600" />
                          <span className="font-medium">건물 {playground.buildingImageCount}개</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 추가 정보 */}
                    <div className="mt-2">
                      <div className="text-[10px] text-gray-500">
                        ID: {playground.id}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {playgrounds.length > 0 && filteredPlaygrounds.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 놀이시설 상세보기 모달 */}
      {showEditModal && selectedPlayground && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-4 max-h-[90vh] overflow-y-auto">
            {/* 모달 제목 */}
            <div className="mb-3 pb-2 border-b">
              <h2 className="text-base font-bold text-gray-900">놀이시설 상세보기</h2>
            </div>

            {/* 놀이시설 기본 정보 */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold">{selectedPlayground.name || selectedPlayground.pfctNm}</h3>
                <p className="text-xs text-gray-600 mt-0.5">{selectedPlayground.address || selectedPlayground.addr || selectedPlayground.roadAddr}</p>
                {selectedPlayground.reviewCount !== undefined && (
                  <div className="flex items-center space-x-2 mt-1.5">
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-xs font-medium">{selectedPlayground.averageRating || 0}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">리뷰 {selectedPlayground.reviewCount}개</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedPlayground(null)
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
                onClick={() => setActiveTab('reviews')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                리뷰 ({selectedPlayground.reviewCount || 0})
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
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
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
                            <div className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                              상세보기
                            </div>
                          </>
                        )}
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
                      onChange={handleImageUpload}
                      disabled={uploadingImage !== null}
                    />
                  </label>
                </div>
              </div>
            </div>
            )}

            {/* 리뷰 관리 탭 */}
            {activeTab === 'reviews' && (
              <div className="space-y-3">
                {selectedPlayground.reviews && selectedPlayground.reviews.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedPlayground.reviews.map((review) => (
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
                                onClick={() => handleUnhideReview(review.id, selectedPlayground.id)}
                                className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>숨김 해제</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleHideReview(review.id, selectedPlayground.id)}
                                className="text-[10px] px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors flex items-center space-x-1"
                              >
                                <EyeOff className="h-3 w-3" />
                                <span>숨김</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(review.id, selectedPlayground.id)}
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
            {activeTab === 'building' && (
            <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedPlayground(null)
                }}
                className="text-xs"
              >
                취소
              </Button>
              <Button 
                onClick={handleSaveBuildingImages}
                size="sm"
                className="text-xs"
              >
                건물 사진 저장
              </Button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

