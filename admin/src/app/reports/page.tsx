'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, truncateText } from '@/lib/utils'
import { Search, Filter, Eye, CheckCircle, XCircle, AlertCircle, Trash2, X, Image as ImageIcon, MessageSquare, FileText, Star } from 'lucide-react'
import { SortButtons } from '@/components/ui/sort-buttons'

interface Report {
  id: string
  post_id?: string
  reporter_id: string
  report_reason: string
  report_type: string
  status: string
  admin_notes?: string
  created_at: string
  updated_at: string
  target_type?: string
  target_id?: string
  facility_type?: string
  facility_code?: string
  facility_name?: string
  reporter?: {
    id: string
    full_name: string
    nickname?: string
    profile_image_url?: string
    user_type?: string
  }
  target?: any
  targetAuthor?: {
    id: string
    full_name: string
    nickname?: string
    profile_image_url?: string
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all')
  const [filterTargetType, setFilterTargetType] = useState<'all' | 'post' | 'comment' | 'review' | 'building_image' | 'meal_image'>('all')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'type'>('date')

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/reports')
      const result = await response.json()
      
      if (response.ok) {
        setReports(result.reports || [])
        console.log('신고 데이터 로드됨:', result.count, '건')
        console.log('신고 데이터 샘플:', result.reports?.[0])
      } else {
        console.error('API 오류:', result.error)
        setReports([])
      }
      
    } catch (error) {
      console.error('신고 목록 조회 오류:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.report_reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (report.target?.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.reporter?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.targetAuthor?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus
    const matchesTargetType = filterTargetType === 'all' || 
      (filterTargetType === 'post' && report.target_type === 'post') ||
      (filterTargetType === 'comment' && (report.target_type === 'comment' || report.target?.type === 'comment' || report.target?.type === 'reply')) ||
      (filterTargetType === 'review' && (report.target_type === 'review' || report.target_type === 'review_image')) ||
      (filterTargetType === 'building_image' && report.target_type === 'building_image') ||
      (filterTargetType === 'meal_image' && report.target_type === 'meal_image')
    return matchesSearch && matchesStatus && matchesTargetType
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'status':
        const statusOrder = { 'pending': 0, 'reviewed': 1, 'resolved': 2 }
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
      case 'type':
        return getTargetTypeLabel(a).localeCompare(getTargetTypeLabel(b))
      default:
        return 0
    }
  })

  const getTargetTypeLabel = (report: Report): string => {
    // target_type 정규화
    let targetType = report.target_type
    if (targetType === 'childcare_review' || targetType === 'kindergarten_review' || targetType === 'playground_review') {
      targetType = 'review'
    }
    
    // target_type이 없으면 post_id가 있으면 게시글로 간주
    if (!targetType) {
      targetType = report.post_id ? 'post' : undefined
    }
    
    if (targetType === 'post') return '게시글'
    if (targetType === 'comment') {
      if (report.target?.type === 'reply') return '답글'
      return '댓글'
    }
    if (targetType === 'review' || targetType === 'review_image') {
      // 원본 target_type에서 facility_type 추론
      let facilityType = report.facility_type
      if (!facilityType && report.target_type) {
        if (report.target_type === 'kindergarten_review' || report.target_type === 'kindergarten_review_image') facilityType = 'kindergarten'
        else if (report.target_type === 'childcare_review' || report.target_type === 'childcare_review_image') facilityType = 'childcare'
        else if (report.target_type === 'playground_review' || report.target_type === 'playground_review_image') facilityType = 'playground'
      }
      
      if (facilityType === 'kindergarten') return targetType === 'review_image' ? '유치원 칭찬 사진' : '유치원 칭찬'
      if (facilityType === 'childcare') return targetType === 'review_image' ? '어린이집 칭찬 사진' : '어린이집 칭찬'
      if (facilityType === 'playground') return targetType === 'review_image' ? '놀이시설 칭찬 사진' : '놀이시설 칭찬'
      return targetType === 'review_image' ? '칭찬 사진' : '칭찬'
    }
    if (targetType === 'building_image') {
      // facility_type에 따라 건물사진 라벨 반환
      let facilityType = report.facility_type
      if (facilityType === 'kindergarten') return '유치원 건물사진'
      if (facilityType === 'childcare') return '어린이집 건물사진'
      if (facilityType === 'playground') return '놀이시설 건물사진'
      return '건물사진'
    }
    if (targetType === 'meal_image') {
      // facility_type에 따라 급식사진 라벨 반환
      let facilityType = report.facility_type
      if (facilityType === 'kindergarten') return '유치원 급식사진'
      if (facilityType === 'childcare') return '어린이집 급식사진'
      if (facilityType === 'playground') return '놀이시설 급식사진'
      return '급식사진'
    }
    
    if (!targetType && !report.post_id) {
      console.warn('신고 유형을 알 수 없음:', report)
    }
    
    return '알 수 없음'
  }

  const getReportSource = (report: Report): string => {
    // target_type 정규화
    let targetType = report.target_type
    if (targetType === 'childcare_review' || targetType === 'kindergarten_review' || targetType === 'playground_review') {
      targetType = 'review'
    }
    
    // target_type이 없으면 post_id가 있으면 게시글로 간주
    if (!targetType) {
      targetType = report.post_id ? 'post' : undefined
    }
    
    if (targetType === 'post') return '커뮤니티 페이지'
    if (targetType === 'comment') return '커뮤니티 페이지'
    if (targetType === 'review' || targetType === 'review_image') {
      // 원본 target_type에서 facility_type 추론
      let facilityType = report.facility_type
      if (!facilityType && report.target_type) {
        if (report.target_type === 'kindergarten_review' || report.target_type === 'kindergarten_review_image') facilityType = 'kindergarten'
        else if (report.target_type === 'childcare_review' || report.target_type === 'childcare_review_image') facilityType = 'childcare'
        else if (report.target_type === 'playground_review' || report.target_type === 'playground_review_image') facilityType = 'playground'
      }
      
      if (facilityType === 'kindergarten') return '유치원 상세보기 페이지'
      if (facilityType === 'childcare') return '어린이집 상세보기 페이지'
      if (facilityType === 'playground') return '놀이시설 상세보기 페이지'
      return '상세보기 페이지'
    }
    if (targetType === 'building_image') {
      // facility_type에 따라 건물사진 신고 발생 위치 반환
      let facilityType = report.facility_type
      if (facilityType === 'kindergarten') return '유치원 상세보기 페이지'
      if (facilityType === 'childcare') return '어린이집 상세보기 페이지'
      if (facilityType === 'playground') return '놀이시설 상세보기 페이지'
      return '상세보기 페이지'
    }
    if (targetType === 'meal_image') {
      // admin_notes에서 report_source 확인
      let reportSource = null
      try {
        if (report.admin_notes) {
          const adminNotes = JSON.parse(report.admin_notes)
          reportSource = adminNotes.report_source
        }
      } catch (e) {
        // JSON 파싱 실패 시 무시
      }
      
      // facility_type에 따라 급식사진 신고 발생 위치 반환
      let facilityType = report.facility_type
      
      // 급식 캘린더에서 신고한 경우
      if (reportSource === 'meal_calendar') {
        if (facilityType === 'kindergarten') return '유치원 상세보기 페이지 (급식 캘린더 내부)'
        if (facilityType === 'childcare') return '어린이집 상세보기 페이지 (급식 캘린더 내부)'
        if (facilityType === 'playground') return '놀이시설 상세보기 페이지 (급식 캘린더 내부)'
        return '상세보기 페이지 (급식 캘린더 내부)'
      }
      
      // 급식 탭에서 신고한 경우 (기본값)
      if (facilityType === 'kindergarten') return '유치원 상세보기 페이지 (급식 탭)'
      if (facilityType === 'childcare') return '어린이집 상세보기 페이지 (급식 탭)'
      if (facilityType === 'playground') return '놀이시설 상세보기 페이지 (급식 탭)'
      return '상세보기 페이지 (급식 탭)'
    }
    
    // target_type이 없고 post_id도 없으면 알 수 없음
    if (!targetType && !report.post_id) {
      console.warn('신고 발생 위치를 알 수 없음:', report)
    }
    
    return '알 수 없음'
  }

  const getReportTargetName = (report: Report): string => {
    // target_type 정규화
    let targetType = report.target_type
    if (targetType === 'childcare_review' || targetType === 'kindergarten_review' || targetType === 'playground_review') {
      targetType = 'review'
    }
    
    // target_type이 없으면 post_id가 있으면 게시글로 간주
    if (!targetType) {
      targetType = report.post_id ? 'post' : undefined
    }
    
    // 건물사진인 경우 시설명
    if (targetType === 'building_image') {
      return report.target?.facility_name || report.facility_name || '알 수 없음'
    }
    // 급식사진인 경우 시설명
    if (targetType === 'meal_image') {
      return report.target?.facility_name || report.facility_name || '알 수 없음'
    }
    // 칭찬인 경우 시설명
    if (targetType === 'review' && report.target?.facility_name) {
      return report.target.facility_name
    }
    // 게시글인 경우 내용 요약
    if (targetType === 'post' && report.target?.content) {
      return truncateText(report.target.content, 50)
    }
    // 댓글/답글인 경우 속한 게시글 내용 요약
    if (targetType === 'comment' && report.target?.post?.content) {
      return truncateText(report.target.post.content, 50)
    }
    // 댓글/답글인 경우 댓글 내용 요약
    if (targetType === 'comment' && report.target?.content) {
      return truncateText(report.target.content, 50)
    }
    return '알 수 없음'
  }

  const getTargetTypeIcon = (report: Report) => {
    // target_type 정규화
    let targetType = report.target_type
    if (targetType === 'childcare_review' || targetType === 'kindergarten_review' || targetType === 'playground_review') {
      targetType = 'review'
    }
    
    if (!targetType) {
      targetType = report.post_id ? 'post' : undefined
    }
    
    if (targetType === 'post') return <FileText className="h-4 w-4" />
    if (targetType === 'comment') {
      if (report.target?.type === 'reply') return <MessageSquare className="h-4 w-4" />
      return <MessageSquare className="h-4 w-4" />
    }
    if (targetType === 'review' || targetType === 'review_image') return <Star className="h-4 w-4" />
    if (targetType === 'building_image') return <ImageIcon className="h-4 w-4" />
    if (targetType === 'meal_image') return <ImageIcon className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  const sortOptions = [
    { value: 'date', label: '신고일순' },
    { value: 'status', label: '상태순' },
    { value: 'type', label: '유형순' }
  ]

  const handleStatusUpdate = async (reportId: string, newStatus: 'reviewed' | 'resolved') => {
    try {
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus }
          : report
      ))
      if (selectedReport?.id === reportId) {
        setSelectedReport({ ...selectedReport, status: newStatus })
      }
    } catch (error) {
      console.error('신고 상태 업데이트 오류:', error)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('정말 이 신고를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('신고가 삭제되었습니다.')
        fetchReports()
        if (selectedReport?.id === reportId) {
          setSelectedReport(null)
        }
      } else {
        const errorData = await response.json()
        alert(`삭제 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('신고 삭제 오류:', error)
      alert('신고 삭제 중 오류가 발생했습니다.')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'reviewed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중'
      case 'reviewed':
        return '검토완료'
      case 'resolved':
        return '해결완료'
      default:
        return '알 수 없음'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'reviewed':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getReportTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'spam': '스팸/광고',
      'inappropriate': '부적절한 내용',
      'harassment': '괴롭힘/폭력',
      'wrong_purpose': '사진의 목적이 다름',
      'wrong_image': '사진이 다름',
      'other': '기타'
    }
    return typeMap[type] || type
  }

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
        <h1 className="text-xl font-bold text-gray-900">신고 관리</h1>
        <p className="text-sm text-gray-600">커뮤니티 게시글, 댓글, 답글, 칭찬 신고를 검토하고 처리하세요</p>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">신고 목록</CardTitle>
          <div className="flex items-center space-x-3 mt-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="신고 내용, 작성자, 신고자로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                <select
                  value={filterTargetType}
                  onChange={(e) => setFilterTargetType(e.target.value as any)}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체 유형</option>
                  <option value="post">게시글</option>
                  <option value="comment">댓글/답글</option>
                  <option value="review">칭찬</option>
                  <option value="building_image">건물사진</option>
                  <option value="meal_image">급식사진</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체 상태</option>
                  <option value="pending">대기중</option>
                  <option value="reviewed">검토완료</option>
                  <option value="resolved">해결완료</option>
                </select>
              </div>
              <SortButtons
                options={sortOptions}
                activeSort={sortBy}
                onSortChange={(sort) => setSortBy(sort as 'date' | 'status' | 'type')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div 
                key={report.id} 
                className="rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors overflow-hidden"
              >
                <div 
                  className="p-3 cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded-full ${getStatusColor(report.status)}`}>
                          {getStatusIcon(report.status)}
                          <span className="ml-1">{getStatusText(report.status)}</span>
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-purple-100 text-purple-800">
                          {getTargetTypeIcon(report)}
                          <span className="ml-1">{getTargetTypeLabel(report)}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(report.created_at)}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <h4 className="text-xs font-medium text-gray-900 mb-0.5">신고 사유</h4>
                        <p className="text-xs text-gray-600">{report.report_reason}</p>
                      </div>
                      
                      <div className="mb-2">
                        <h4 className="text-xs font-medium text-gray-900 mb-0.5">신고 발생 위치</h4>
                        <p className="text-xs text-blue-600 font-medium">{getReportSource(report)}</p>
                      </div>
                      
                      {report.target && (
                        <div className="mb-2">
                          <h4 className="text-xs font-medium text-gray-900 mb-0.5">
                            {(report.target_type === 'building_image' || report.target_type === 'meal_image') ? '시설명' : report.target_type === 'review' ? '시설명' : report.target_type === 'post' ? '게시글' : '댓글이 속한 게시글'}
                          </h4>
                          <p className="text-xs text-gray-700 font-medium">
                            {getReportTargetName(report)}
                          </p>
                          {(report.target.facility_name || report.target_type === 'building_image' || report.target_type === 'meal_image') && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              시설 코드: {report.target.facility_code || report.facility_code || 'N/A'}
                            </p>
                          )}
                          {(report.target_type === 'building_image' || report.target_type === 'meal_image') && report.facility_type && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              시설 유형: {
                                report.facility_type === 'kindergarten' ? '유치원' :
                                report.facility_type === 'childcare' ? '어린이집' :
                                report.facility_type === 'playground' ? '놀이시설' : '알 수 없음'
                              }
                            </p>
                          )}
                          {report.target_type === 'post' && report.target.category && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              카테고리: {report.target.category} | 위치: {report.target.location}
                            </p>
                          )}
                          {report.target_type === 'comment' && report.target.post && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              카테고리: {report.target.post.category} | 위치: {report.target.post.location}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* 건물사진 신고인 경우 건물사진 이미지 표시 */}
                      {report.target_type === 'building_image' && report.target?.reported_image_url && (
                        <div className="mb-2">
                          <h4 className="text-xs font-medium text-gray-900 mb-0.5">신고된 건물사진</h4>
                          <div className="mt-2">
                            <div className="w-24 h-24 rounded overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(report.target.reported_image_url, '_blank')}>
                              <img
                                src={report.target.reported_image_url}
                                alt="신고된 건물사진"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 급식사진 신고인 경우 급식사진 이미지 표시 */}
                      {report.target_type === 'meal_image' && report.target?.reported_image_url && (
                        <div className="mb-2">
                          <h4 className="text-xs font-medium text-gray-900 mb-0.5">신고된 급식사진</h4>
                          <div className="mt-2">
                            <div className="w-24 h-24 rounded overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(report.target.reported_image_url, '_blank')}>
                              <img
                                src={report.target.reported_image_url}
                                alt="신고된 급식사진"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {report.target && report.target.content && (
                        <div className="mb-2">
                          <h4 className="text-xs font-medium text-gray-900 mb-0.5">
                            {getTargetTypeLabel(report)} 내용
                          </h4>
                          <p className="text-xs text-gray-600">
                            {truncateText(report.target.content || '', 100)}
                          </p>
                          {/* 이미지 미리보기 (목록에서 - 게시글 또는 리뷰) */}
                          {report.target.images && Array.isArray(report.target.images) && report.target.images.length > 0 && (
                            <div className="mt-2 flex gap-1">
                              {report.target.images.slice(0, 3).map((image: string, idx: number) => (
                                <div key={idx} className="w-12 h-12 rounded overflow-hidden bg-gray-100">
                                  <img
                                    src={image}
                                    alt={`${report.target_type === 'review_image' || report.target_type?.endsWith('_review_image') ? '신고된 사진' : '이미지'} ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {report.target.images.length > 3 && (
                                <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                                  <span className="text-[10px] text-gray-600">+{report.target.images.length - 3}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {report.reporter?.profile_image_url ? (
                              <img
                                src={report.reporter.profile_image_url}
                                alt={report.reporter.full_name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-medium text-gray-600">
                                  {report.reporter?.full_name?.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-gray-700">
                                신고자: {report.reporter?.full_name || '알 수 없음'}
                              </p>
                              {report.reporter?.nickname && (
                                <p className="text-[10px] text-gray-500">@{report.reporter.nickname}</p>
                              )}
                            </div>
                          </div>
                          
                          {report.targetAuthor ? (
                            <div className="flex items-center space-x-2">
                              {report.targetAuthor.profile_image_url ? (
                                <img
                                  src={report.targetAuthor.profile_image_url}
                                  alt={report.targetAuthor.full_name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-[10px] font-medium text-gray-600">
                                    {report.targetAuthor.full_name?.charAt(0) || '?'}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-medium text-gray-700">
                                  피신고자: {report.targetAuthor.full_name}
                                </p>
                                {report.targetAuthor.nickname && (
                                  <p className="text-[10px] text-gray-500">@{report.targetAuthor.nickname}</p>
                                )}
                              </div>
                            </div>
                          ) : report.target && (
                            <div className="text-xs text-gray-500">
                              피신고자 정보 없음
                            </div>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {getReportTypeText(report.report_type)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-3 py-2 bg-gray-200/50 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {report.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusUpdate(report.id, 'reviewed')
                          }}
                          className="text-xs px-2 py-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          검토
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusUpdate(report.id, 'resolved')
                          }}
                          className="text-xs px-2 py-1"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          해결
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteReport(report.id)
                    }}
                    className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredReports.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 신고 상세 모달 */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">신고 상세 정보</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReport(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* 신고 정보 */}
              <div>
                <h4 className="font-medium mb-2">신고 정보</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>신고 유형:</strong> {getTargetTypeLabel(selectedReport)}
                    </div>
                    <div>
                      <strong>신고 사유:</strong> {getReportTypeText(selectedReport.report_type)}
                    </div>
                    <div>
                      <strong>신고일:</strong> {formatDate(selectedReport.created_at)}
                    </div>
                    <div>
                      <strong>상태:</strong> {getStatusText(selectedReport.status)}
                    </div>
                  </div>
                  <div className="mt-2">
                    <strong>신고 내용:</strong>
                    <p className="text-sm text-gray-700 mt-1">{selectedReport.report_reason}</p>
                  </div>
                </div>
              </div>

              {/* 신고자 정보 */}
              {selectedReport.reporter && (
                <div>
                  <h4 className="font-medium mb-2">신고자</h4>
                  <div className="bg-gray-50 p-3 rounded flex items-center space-x-3">
                    {selectedReport.reporter.profile_image_url ? (
                      <img
                        src={selectedReport.reporter.profile_image_url}
                        alt={selectedReport.reporter.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-600">
                          {selectedReport.reporter.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{selectedReport.reporter.full_name}</p>
                      {selectedReport.reporter.nickname && (
                        <p className="text-sm text-gray-500">@{selectedReport.reporter.nickname}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 신고 발생 위치 */}
              <div>
                <h4 className="font-medium mb-2">신고 발생 위치</h4>
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm font-medium text-blue-700">{getReportSource(selectedReport)}</p>
                </div>
              </div>

              {/* 신고 대상 (시설명 또는 게시글) */}
              {selectedReport.target && (
                <div>
                  <h4 className="font-medium mb-2">
                    {(selectedReport.target_type === 'building_image' || selectedReport.target_type === 'meal_image') ? '신고된 시설' : selectedReport.target_type === 'review' ? '신고된 시설' : selectedReport.target_type === 'post' ? '신고된 게시글' : '댓글이 속한 게시글'}
                  </h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-medium text-gray-900">{getReportTargetName(selectedReport)}</p>
                    {(selectedReport.target.facility_code || selectedReport.facility_code) && (
                      <p className="text-xs text-gray-500 mt-1">시설 코드: {selectedReport.target.facility_code || selectedReport.facility_code}</p>
                    )}
                    {(selectedReport.target_type === 'building_image' || selectedReport.target_type === 'meal_image') && selectedReport.facility_type && (
                      <p className="text-xs text-gray-500 mt-1">
                        시설 유형: {
                          selectedReport.facility_type === 'kindergarten' ? '유치원' :
                          selectedReport.facility_type === 'childcare' ? '어린이집' :
                          selectedReport.facility_type === 'playground' ? '놀이시설' : '알 수 없음'
                        }
                      </p>
                    )}
                    {selectedReport.target_type === 'post' && selectedReport.target.category && (
                      <p className="text-xs text-gray-500 mt-1">
                        카테고리: {selectedReport.target.category} | 위치: {selectedReport.target.location}
                      </p>
                    )}
                    {selectedReport.target_type === 'comment' && selectedReport.target.post && (
                      <p className="text-xs text-gray-500 mt-1">
                        카테고리: {selectedReport.target.post.category} | 위치: {selectedReport.target.post.location}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 피신고 대상 정보 */}
              {selectedReport.target && (
                <div>
                  <h4 className="font-medium mb-2">신고된 {getTargetTypeLabel(selectedReport)}</h4>
                  <div className="bg-gray-50 p-3 rounded space-y-3">
                    {/* 피신고자 정보 */}
                    {selectedReport.targetAuthor && (
                      <div className="flex items-center space-x-3 pb-3 border-b">
                        {selectedReport.targetAuthor.profile_image_url ? (
                          <img
                            src={selectedReport.targetAuthor.profile_image_url}
                            alt={selectedReport.targetAuthor.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {selectedReport.targetAuthor.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">작성자: {selectedReport.targetAuthor.full_name}</p>
                          {selectedReport.targetAuthor.nickname && (
                            <p className="text-xs text-gray-500">@{selectedReport.targetAuthor.nickname}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 건물사진 신고인 경우 건물사진 이미지 표시 */}
                    {selectedReport.target_type === 'building_image' && selectedReport.target?.reported_image_url && (
                      <div className="pb-3 border-b">
                        <p className="text-sm font-medium mb-2">신고된 건물사진</p>
                        <div className="mt-2">
                          <div className="w-48 h-48 rounded overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(selectedReport.target.reported_image_url, '_blank')}>
                            <img
                              src={selectedReport.target.reported_image_url}
                              alt="신고된 건물사진"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 급식사진 신고인 경우 급식사진 이미지 표시 */}
                    {selectedReport.target_type === 'meal_image' && selectedReport.target?.reported_image_url && (
                      <div className="pb-3 border-b">
                        <p className="text-sm font-medium mb-2">신고된 급식사진</p>
                        <div className="mt-2">
                          <div className="w-48 h-48 rounded overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(selectedReport.target.reported_image_url, '_blank')}>
                            <img
                              src={selectedReport.target.reported_image_url}
                              alt="신고된 급식사진"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 시설 정보 (칭찬, 건물사진 또는 급식사진인 경우) */}
                    {(selectedReport.target.facility_name || selectedReport.target_type === 'building_image' || selectedReport.target_type === 'meal_image') && (
                      <div className="pb-3 border-b">
                        <p className="text-sm">
                          <strong>시설 유형:</strong> {
                            selectedReport.facility_type === 'kindergarten' ? '유치원' :
                            selectedReport.facility_type === 'childcare' ? '어린이집' :
                            selectedReport.facility_type === 'playground' ? '놀이시설' : '알 수 없음'
                          }
                        </p>
                        <p className="text-sm">
                          <strong>시설명:</strong> {selectedReport.target.facility_name || selectedReport.facility_name || '알 수 없음'}
                        </p>
                        {(selectedReport.target.facility_code || selectedReport.facility_code) && (
                          <p className="text-sm">
                            <strong>시설 코드:</strong> {selectedReport.target.facility_code || selectedReport.facility_code}
                          </p>
                        )}
                        {selectedReport.target.facility_address && (
                          <p className="text-sm">
                            <strong>시설 주소:</strong> {selectedReport.target.facility_address}
                          </p>
                        )}
                        {selectedReport.target.rating && (
                          <p className="text-sm">
                            <strong>평점:</strong> {'⭐'.repeat(selectedReport.target.rating)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 게시글 정보 (댓글/답글인 경우) */}
                    {selectedReport.target.post && (
                      <div className="pb-3 border-b">
                        <p className="text-sm">
                          <strong>게시글:</strong> {truncateText(selectedReport.target.post.content || '', 100)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          위치: {selectedReport.target.post.location} | 카테고리: {selectedReport.target.post.category}
                        </p>
                      </div>
                    )}

                    {/* 내용 (건물사진 또는 급식사진 신고가 아닌 경우에만 표시) */}
                    {selectedReport.target_type !== 'building_image' && selectedReport.target_type !== 'meal_image' && (
                      <div>
                        <strong className="text-sm">내용:</strong>
                        <div className="mt-2 p-3 bg-white rounded border">
                          <p className="text-sm whitespace-pre-wrap">{selectedReport.target.content || '내용 없음'}</p>
                        </div>
                      </div>
                    )}

                    {/* 이미지 (게시글 또는 리뷰인 경우) */}
                    {selectedReport.target.images && Array.isArray(selectedReport.target.images) && selectedReport.target.images.length > 0 && (
                      <div>
                        <strong className="text-sm">
                          {selectedReport.target_type === 'review_image' || selectedReport.target_type?.endsWith('_review_image')
                            ? '신고된 사진'
                            : `이미지 (${selectedReport.target.images.length}개)`}
                        </strong>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {selectedReport.target.images.map((image: string, index: number) => (
                            <div key={index} className="relative aspect-square rounded overflow-hidden bg-gray-100">
                              <img
                                src={image}
                                alt={`이미지 ${index + 1}`}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(image, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                >
                  닫기
                </Button>
                {selectedReport.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedReport.id, 'reviewed')
                        setSelectedReport({ ...selectedReport, status: 'reviewed' })
                      }}
                    >
                      검토완료
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleStatusUpdate(selectedReport.id, 'resolved')
                        setSelectedReport({ ...selectedReport, status: 'resolved' })
                      }}
                    >
                      해결완료
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
