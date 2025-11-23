'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, truncateText } from '@/lib/utils'
import { Search, Filter, CheckCircle, XCircle, AlertCircle, Star, Heart, Image as ImageIcon, Trash2, Eye, EyeOff } from 'lucide-react'
import { SortButtons } from '@/components/ui/sort-buttons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DeleteRequest {
  id: string
  review_id: string
  review_type: 'playground' | 'kindergarten' | 'childcare'
  requester_id: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  request_reason?: string
  created_at: string
  updated_at: string
  requester?: {
    id: string
    full_name: string
    nickname?: string
    profile_image_url?: string
  }
  review?: {
    id: string
    content: string
    rating: number
    created_at: string
    playground_name?: string
    kindergarten_name?: string
    childcare_name?: string
    images?: Array<{
      id: string
      image_url: string
      image_order: number
    }>
  }
  reviewAuthor?: {
    id: string
    full_name: string
    nickname?: string
  }
}

interface LatestReview {
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

interface DailyReviewData {
  date: string
  count: number
}

export default function ReviewDeleteRequestsPage() {
  const [requests, setRequests] = useState<DeleteRequest[]>([])
  const [latestReviews, setLatestReviews] = useState<LatestReview[]>([])
  const [dailyReviewData, setDailyReviewData] = useState<DailyReviewData[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [filterReviewType, setFilterReviewType] = useState<'all' | 'playground' | 'kindergarten' | 'childcare'>('all')
  const [selectedRequest, setSelectedRequest] = useState<DeleteRequest | null>(null)
  const [selectedReview, setSelectedReview] = useState<LatestReview | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'type'>('date')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRequests()
    fetchLatestReviews()
    fetchDailyReviewData()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/review-delete-requests')
      const result = await response.json()
      
      if (response.ok) {
        setRequests(result.requests || [])
      } else {
        console.error('API 오류:', result.error)
        setRequests([])
      }
    } catch (error) {
      console.error('삭제요청 목록 조회 오류:', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const fetchLatestReviews = async () => {
    try {
      setReviewsLoading(true)
      const response = await fetch('/api/reviews/latest?limit=5')
      
      if (response.ok) {
        const data = await response.json()
        setLatestReviews(data.reviews || [])
      } else {
        console.error('최신 칭찬 목록 조회 실패')
        setLatestReviews([])
      }
    } catch (error) {
      console.error('최신 칭찬 목록 조회 오류:', error)
      setLatestReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchDailyReviewData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        // dailyContent에서 칭찬 작성 데이터 추출하여 일별 증가량 계산
        if (data.stats?.dailyContent && data.stats.dailyContent.length > 0) {
          const reviewData = data.stats.dailyContent.map((item: any, index: number) => {
            const currentCount = item['칭찬 작성[누적]'] || 0
            const previousCount = index > 0 
              ? (data.stats.dailyContent[index - 1]['칭찬 작성[누적]'] || 0)
              : 0
            return {
              date: item.date,
              count: currentCount - previousCount // 일별 증가량
            }
          })
          setDailyReviewData(reviewData)
        }
      }
    } catch (error) {
      console.error('일별 칭찬 데이터 조회 오류:', error)
    }
  }

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.review?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.reviewAuthor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus
    const matchesReviewType = filterReviewType === 'all' || req.review_type === filterReviewType
    return matchesSearch && matchesStatus && matchesReviewType
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'status':
        const statusOrder = { 'pending': 0, 'approved': 1, 'rejected': 2 }
        return statusOrder[a.status] - statusOrder[b.status]
      case 'type':
        return a.review_type.localeCompare(b.review_type)
      default:
        return 0
    }
  })

  const getReviewTypeLabel = (type: string): string => {
    if (type === 'playground') return '놀이시설'
    if (type === 'kindergarten') return '유치원'
    if (type === 'childcare') return '어린이집'
    return type
  }

  const handleApprove = async (requestId: string) => {
    if (!confirm('이 삭제요청을 승인하시겠습니까? 리뷰가 삭제됩니다.')) return
    
    try {
      setProcessingId(requestId)
      const response = await fetch(`/api/review-delete-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      })

      const result = await response.json()
      if (response.ok) {
        alert('삭제요청이 승인되었습니다.')
        fetchRequests()
        setSelectedRequest(null)
      } else {
        alert(result.error || '승인 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('승인 처리 오류:', error)
      alert('승인 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    const notes = prompt('거절 사유를 입력해주세요 (선택사항):')
    if (notes === null) return // 취소 버튼 클릭
    
    try {
      setProcessingId(requestId)
      const response = await fetch(`/api/review-delete-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'rejected',
          admin_notes: notes || undefined
        })
      })

      const result = await response.json()
      if (response.ok) {
        alert('삭제요청이 거절되었습니다.')
        fetchRequests()
        setSelectedRequest(null)
      } else {
        alert(result.error || '거절 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('거절 처리 오류:', error)
      alert('거절 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (requestId: string) => {
    if (!confirm('이 삭제요청 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    
    try {
      setProcessingId(requestId)
      const response = await fetch(`/api/review-delete-requests/${requestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = '삭제 처리 중 오류가 발생했습니다.'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        alert(errorMessage)
        return
      }

      const result = await response.json()
      alert(result.message || '삭제요청 내역이 삭제되었습니다.')
      fetchRequests()
      setSelectedRequest(null)
    } catch (error) {
      console.error('삭제 처리 오류:', error)
      alert('삭제 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleHideReview = async (review: LatestReview) => {
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
        fetchLatestReviews()
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

  const handleUnhideReview = async (review: LatestReview) => {
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
        fetchLatestReviews()
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

  const handleDeleteReview = async (review: LatestReview) => {
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
        fetchLatestReviews()
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">대기중</span>
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">승인됨</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">거절됨</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">{status}</span>
    }
  }

  if (loading) {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">칭찬관리</h1>
        <p className="text-gray-600">사용자가 요청한 칭찬 삭제요청을 검토하고 처리하세요.</p>
      </div>

      {/* 최신 칭찬 목록 */}
      {latestReviews.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>최신 칭찬 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* 왼쪽: 칭찬 목록 */}
              <div className="lg:col-span-3 space-y-2">
                {latestReviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedReview(review)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
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
                      <div className="flex items-center gap-2 mb-1.5">
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
                        <p className="text-sm text-gray-500 italic mb-1.5">관리자에 의해 숨김처리된 칭찬입니다.</p>
                      ) : (
                        <p className="text-sm text-gray-700 mb-1.5">
                          {truncateText(review.content, 100)}
                        </p>
                      )}
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 mb-1.5 flex-wrap">
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
              {/* 오른쪽: 일별 칭찬 작성 점 그래프 및 도넛 그래프 */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {/* 점 그래프 */}
                <div>
                  <h3 className="text-xs font-medium text-gray-700 mb-2">최근 7일간 칭찬 작성 추이</h3>
                  {dailyReviewData.length > 0 ? (
                    <div className="w-full" style={{ minHeight: '320px', height: '320px' }}>
                      <ResponsiveContainer width="100%" height={320}>
                      <LineChart
                        data={dailyReviewData}
                        margin={{ top: 10, right: 10, bottom: 10, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={10}
                          stroke="#6b7280"
                          tick={{ fill: '#6b7280' }}
                        />
                        <YAxis 
                          fontSize={10}
                          stroke="#6b7280"
                          tick={{ fill: '#6b7280' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '11px'
                          }}
                          formatter={(value: number) => [`${value}개`, '일별 칭찬 작성']}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center text-gray-400 border border-gray-200 rounded-lg text-xs" style={{ height: '320px' }}>
                      데이터 로딩 중...
                    </div>
                  )}
                </div>
                
                {/* 도넛 그래프 - 최근 5개 칭찬 타입별 분포 */}
                {latestReviews.length > 0 && (() => {
                  const reviewTypeCounts = latestReviews.reduce((acc, review) => {
                    const type = review.review_type
                    acc[type] = (acc[type] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                  
                  const pieData = [
                    { name: '놀이시설', value: reviewTypeCounts.playground || 0, color: '#6366f1' },
                    { name: '유치원', value: reviewTypeCounts.kindergarten || 0, color: '#8b5cf6' },
                    { name: '어린이집', value: reviewTypeCounts.childcare || 0, color: '#a78bfa' }
                  ].filter(item => item.value > 0)
                  
                  return (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <h3 className="text-xs font-medium text-gray-700 mb-3">최근 5개 칭찬 타입별 분포</h3>
                      <div className="flex items-center gap-4">
                        {/* 도넛 차트 */}
                        <div className="flex-shrink-0">
                          {pieData.length > 0 ? (
                            <ResponsiveContainer width={100} height={100}>
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={30}
                                  outerRadius={45}
                                  paddingAngle={2}
                                  dataKey="value"
                                  startAngle={90}
                                  endAngle={-270}
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    fontSize: '11px'
                                  }}
                                  formatter={(value: number) => `${value}개`}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="w-24 h-24 flex items-center justify-center text-gray-400 text-xs">데이터 없음</div>
                          )}
                        </div>
                        {/* 타입별 개수 정보 */}
                        <div className="flex-1">
                          <p className="text-2xl font-bold text-purple-700 mb-1">
                            {latestReviews.length}개
                          </p>
                          <p className="text-[10px] text-gray-500 mb-3">최근 칭찬 수</p>
                          <div className="space-y-1.5">
                            {pieData.map((item) => (
                              <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                  <p className="text-[10px] text-gray-600">{item.name}</p>
                                </div>
                                <p className="text-sm font-semibold" style={{ color: item.color }}>
                                  {item.value}개
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 삭제요청 목록 */}
      <Card className="border-0 bg-gray-50 shadow-none">
        <CardHeader>
          <CardTitle>삭제요청 목록 ({filteredRequests.length}건)</CardTitle>
        </CardHeader>

        {/* 필터 및 검색 */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 상태</option>
              <option value="pending">대기중</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거절됨</option>
            </select>
            <select
              value={filterReviewType}
              onChange={(e) => setFilterReviewType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 타입</option>
              <option value="playground">놀이시설</option>
              <option value="kindergarten">유치원</option>
              <option value="childcare">어린이집</option>
            </select>
            <SortButtons
              options={[
                { value: 'date', label: '요청일순' },
                { value: 'status', label: '상태순' },
                { value: 'type', label: '타입순' }
              ]}
              activeSort={sortBy}
              onSortChange={(sort) => setSortBy(sort as 'date' | 'status' | 'type')}
            />
          </div>
        </div>

        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              삭제요청이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedRequest(req)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold text-gray-900">
                          {getReviewTypeLabel(req.review_type)} 칭찬 삭제요청
                        </span>
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">요청자:</span> {req.requester?.full_name || req.requester?.nickname || '알 수 없음'}
                        {' | '}
                        <span className="font-medium">작성자:</span> {req.reviewAuthor?.full_name || req.reviewAuthor?.nickname || '알 수 없음'}
                        {req.review?.rating && (
                          <>
                            {' | '}
                            <span className="font-medium">평점:</span>
                            <span className="inline-flex items-center ml-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Heart
                                  key={i}
                                  className={`h-3 w-3 ${i <= req.review!.rating ? 'text-pink-500 fill-current' : 'text-gray-300'}`}
                                />
                              ))}
                              <span className="ml-1 text-gray-600">({req.review!.rating}점)</span>
                            </span>
                          </>
                        )}
                      </div>
                      {req.review?.content && (
                        <p className="text-sm text-gray-700 mb-2">
                          {truncateText(req.review.content, 100)}
                        </p>
                      )}
                      {req.request_reason && (
                        <div className="text-sm mb-2">
                          <span className="font-medium text-gray-700">삭제요청 사유:</span>
                          <span className="text-gray-600 ml-2">{truncateText(req.request_reason, 100)}</span>
                        </div>
                      )}
                      {req.review?.images && req.review.images.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {req.review!.images.slice(0, 3).map((img) => (
                            <img
                              key={img.id}
                              src={img.image_url}
                              alt={`리뷰 이미지 ${img.image_order + 1}`}
                              className="w-16 h-16 object-cover rounded border border-gray-200"
                            />
                          ))}
                          {req.review!.images.length > 3 && (
                            <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                              +{req.review!.images.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        요청일: {formatDate(req.created_at)}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      {req.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(req.id)}
                            disabled={processingId === req.id}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            거절
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                            disabled={processingId === req.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            승인
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(req.id)}
                          disabled={processingId === req.id}
                          className="text-gray-600 border-gray-300 hover:bg-gray-100"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          삭제
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세 모달 */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">삭제요청 상세</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">상태</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">리뷰 타입</label>
                  <div className="mt-1 text-gray-900">{getReviewTypeLabel(selectedRequest.review_type)}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">요청자</label>
                  <div className="mt-1 text-gray-900">
                    {selectedRequest.requester?.full_name || selectedRequest.requester?.nickname || '알 수 없음'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">리뷰 작성자</label>
                  <div className="mt-1 text-gray-900">
                    {selectedRequest.reviewAuthor?.full_name || selectedRequest.reviewAuthor?.nickname || '알 수 없음'}
                  </div>
                </div>
                
                {selectedRequest.review && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700">평점</label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Heart
                              key={i}
                              className={`h-4 w-4 ${i <= selectedRequest.review!.rating ? 'text-pink-500 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-gray-900 font-medium">{selectedRequest.review!.rating}점</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">리뷰 내용</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-900 whitespace-pre-wrap">
                        {selectedRequest.review.content || '(내용 없음)'}
                      </div>
                    </div>
                    
                    {selectedRequest.review.images && selectedRequest.review.images.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">리뷰 사진 ({selectedRequest.review.images.length}장)</label>
                        <div className="mt-1 grid grid-cols-3 gap-3">
                          {selectedRequest.review.images.map((img) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.image_url}
                                alt={`리뷰 이미지 ${img.image_order + 1}`}
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
                  </>
                )}
                
                {selectedRequest.request_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">삭제요청 사유</label>
                    <div className="mt-1 p-3 bg-blue-50 rounded-lg text-gray-900 whitespace-pre-wrap">
                      {selectedRequest.request_reason || '(사유 없음)'}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-700">요청일</label>
                  <div className="mt-1 text-gray-900">{formatDate(selectedRequest.created_at)}</div>
                </div>
                
                {selectedRequest.admin_notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">관리자 메모</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-900">
                      {selectedRequest.admin_notes}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4 border-t">
                  {selectedRequest.status === 'pending' ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(selectedRequest.id)}
                        disabled={processingId === selectedRequest.id}
                        className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                      >
                        거절
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={processingId === selectedRequest.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        승인
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(selectedRequest.id)}
                      disabled={processingId === selectedRequest.id}
                      className="flex-1 text-gray-600 border-gray-300 hover:bg-gray-100"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
