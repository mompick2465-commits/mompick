'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, truncateText } from '@/lib/utils'
import { Search, Star, Heart, XCircle, Eye, EyeOff, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Review {
  id: string
  review_type: 'playground' | 'kindergarten' | 'childcare'
  facility_id: string
  facility_name?: string
  user_id: string
  user_name: string
  user_nickname?: string
  user_profile_image?: string
  rating: number
  content: string
  helpful_count: number
  created_at: string
  images: Array<{
    id: string
    image_url: string
    image_order: number
  }>
  is_deleted?: boolean
  is_hidden?: boolean
}

export default function AllReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'playground' | 'kindergarten' | 'childcare'>('all')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchReviews()
  }, [page, filterType, searchTerm])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        type: filterType,
        search: searchTerm
      })
      
      const response = await fetch(`/api/reviews/all?${params}`)
      const result = await response.json()
      
      if (response.ok) {
        setReviews(result.reviews || [])
        setPagination(result.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        })
      } else {
        console.error('API 오류:', result.error)
        setReviews([])
      }
    } catch (error) {
      console.error('칭찬 목록 조회 오류:', error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const getReviewTypeLabel = (type: string): string => {
    if (type === 'playground') return '놀이시설'
    if (type === 'kindergarten') return '유치원'
    if (type === 'childcare') return '어린이집'
    return type
  }

  const handleHideReview = async (review: Review) => {
    if (!confirm('이 칭찬을 숨김 처리하시겠습니까?\n\n숨김 처리된 칭찬은 앱에서 "관리자에 의해 숨김처리된 칭찬입니다"로 표시됩니다.')) {
      return
    }

    try {
      setProcessingId(review.id)
      const apiPath = review.review_type === 'playground' 
        ? `/api/playgrounds/reviews/${review.facility_id}/${review.id}`
        : review.review_type === 'kindergarten'
        ? `/api/kindergartens/reviews/${review.facility_id}/${review.id}`
        : `/api/childcare/reviews/${review.facility_id}/${review.id}`
      
      const response = await fetch(apiPath, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'hide' })
      })

      if (response.ok) {
        alert('칭찬이 숨김 처리되었습니다.')
        fetchReviews()
        setSelectedReview(null)
      } else {
        const errorData = await response.json()
        alert(`숨김 처리 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('칭찬 숨김 처리 오류:', error)
      alert('칭찬 숨김 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleUnhideReview = async (review: Review) => {
    try {
      setProcessingId(review.id)
      const apiPath = review.review_type === 'playground' 
        ? `/api/playgrounds/reviews/${review.facility_id}/${review.id}`
        : review.review_type === 'kindergarten'
        ? `/api/kindergartens/reviews/${review.facility_id}/${review.id}`
        : `/api/childcare/reviews/${review.facility_id}/${review.id}`
      
      const response = await fetch(apiPath, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'unhide' })
      })

      if (response.ok) {
        alert('칭찬 숨김 처리가 해제되었습니다.')
        fetchReviews()
        setSelectedReview(null)
      } else {
        const errorData = await response.json()
        alert(`숨김 해제 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('칭찬 숨김 해제 오류:', error)
      alert('칭찬 숨김 해제 중 오류가 발생했습니다.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteReview = async (review: Review) => {
    if (!confirm('정말 이 칭찬을 삭제하시겠습니까?\n\n삭제된 칭찬은 앱에서 보이지 않으며, 평점과 칭찬 개수에서 제외됩니다.')) {
      return
    }

    try {
      setProcessingId(review.id)
      const apiPath = review.review_type === 'playground' 
        ? `/api/playgrounds/reviews/${review.facility_id}/${review.id}`
        : review.review_type === 'kindergarten'
        ? `/api/kindergartens/reviews/${review.facility_id}/${review.id}`
        : `/api/childcare/reviews/${review.facility_id}/${review.id}`
      
      const response = await fetch(apiPath, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('칭찬이 삭제되었습니다.')
        fetchReviews()
        setSelectedReview(null)
      } else {
        const errorData = await response.json()
        alert(`삭제 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('칭찬 삭제 오류:', error)
      alert('칭찬 삭제 중 오류가 발생했습니다.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchReviews()
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">전체 칭찬</h1>
        <p className="text-gray-600">모든 칭찬을 조회하고 관리할 수 있습니다.</p>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="검색 (내용, 사용자명, 시설명)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as any)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체 타입</option>
            <option value="playground">놀이시설</option>
            <option value="kindergarten">유치원</option>
            <option value="childcare">어린이집</option>
          </select>
          <Button onClick={handleSearch} className="w-full md:w-auto">
            검색
          </Button>
        </div>
      </div>

      {/* 칭찬 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>칭찬 목록 ({pagination.total}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              칭찬이 없습니다.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedReview(review)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold text-gray-900">
                            {getReviewTypeLabel(review.review_type)} 칭찬
                          </span>
                          {review.facility_name && (
                            <span className="text-sm text-gray-600">- {review.facility_name}</span>
                          )}
                          {review.is_hidden && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">숨김</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {review.user_profile_image ? (
                            <img
                              src={review.user_profile_image}
                              alt={review.user_name || '사용자'}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {review.user_name ? review.user_name.charAt(0) : '?'}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-700 font-medium">
                            {review.user_name || '알 수 없음'}
                          </span>
                          <span className="inline-flex items-center ml-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Heart
                                key={i}
                                className={`h-3 w-3 ${i <= review.rating ? 'text-pink-500 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </span>
                        </div>
                        {review.is_hidden ? (
                          <p className="text-sm text-gray-500 italic mb-2">관리자에 의해 숨김처리된 칭찬입니다.</p>
                        ) : (
                          <p className="text-sm text-gray-700 mb-2">
                            {truncateText(review.content, 150)}
                          </p>
                        )}
                        {review.images && review.images.length > 0 && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {review.images.slice(0, 3).map((img) => (
                              <img
                                key={img.id}
                                src={img.image_url}
                                alt={`칭찬 이미지 ${img.image_order + 1}`}
                                className="w-16 h-16 object-cover rounded border border-gray-200"
                              />
                            ))}
                            {review.images.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                                +{review.images.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          작성일: {formatDate(review.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-600">
                    {pagination.total}개 중 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      이전
                    </Button>
                    <div className="text-sm text-gray-600">
                      {pagination.page} / {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      다음
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 칭찬 상세 모달 */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReview(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">칭찬 상세</h2>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">칭찬 타입</label>
                  <div className="mt-1 text-gray-900">{getReviewTypeLabel(selectedReview.review_type)}</div>
                </div>
                
                {selectedReview.facility_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">시설명</label>
                    <div className="mt-1 text-gray-900">{selectedReview.facility_name}</div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-700">작성자</label>
                  <div className="mt-1 flex items-center gap-2">
                    {selectedReview.user_profile_image ? (
                      <img
                        src={selectedReview.user_profile_image}
                        alt={selectedReview.user_name || '사용자'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {selectedReview.user_name ? selectedReview.user_name.charAt(0) : '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-900">{selectedReview.user_name || '알 수 없음'}</div>
                      {selectedReview.user_nickname && (
                        <div className="text-xs text-gray-500">@{selectedReview.user_nickname}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">평점</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Heart
                          key={i}
                          className={`h-4 w-4 ${i <= selectedReview.rating ? 'text-pink-500 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-900 font-medium">{selectedReview.rating}점</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">칭찬 내용</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-900 whitespace-pre-wrap">
                    {selectedReview.is_hidden ? (
                      <span className="text-gray-500 italic">관리자에 의해 숨김처리된 칭찬입니다.</span>
                    ) : (
                      selectedReview.content || '(내용 없음)'
                    )}
                  </div>
                </div>
                
                {selectedReview.images && selectedReview.images.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">칭찬 사진 ({selectedReview.images.length}장)</label>
                    <div className="mt-1 grid grid-cols-3 gap-3">
                      {selectedReview.images.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.image_url}
                            alt={`칭찬 이미지 ${img.image_order + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(img.image_url, '_blank')}
                          />
                          <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                            {img.image_order + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-700">작성일</label>
                  <div className="mt-1 text-gray-900">{formatDate(selectedReview.created_at)}</div>
                </div>
                
                <div className="flex gap-3 pt-4 border-t">
                  {selectedReview.is_hidden ? (
                    <Button
                      variant="outline"
                      onClick={() => handleUnhideReview(selectedReview)}
                      disabled={processingId === selectedReview.id}
                      className="flex-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      숨김 해제
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleHideReview(selectedReview)}
                      disabled={processingId === selectedReview.id}
                      className="flex-1 text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      숨김
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteReview(selectedReview)}
                    disabled={processingId === selectedReview.id}
                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

