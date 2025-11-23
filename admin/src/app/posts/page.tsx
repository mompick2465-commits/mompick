'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Search, Filter, Trash2, Heart, MessageCircle, AlertTriangle } from 'lucide-react'
import { SortButtons } from '@/components/ui/sort-buttons'

interface CommunityPost {
  id: string
  content: string
  location: string
  hashtags: string[]
  images: string[]
  emojis: string[]
  category: string
  author_id: string
  author_name: string
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  author_profile_image?: string
  actual_comments_count?: number
  actual_likes_count?: number
  reports_count?: number
  reports?: any[]
}

export default function PostsPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'comments'>('date')
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [showPostDetail, setShowPostDetail] = useState(false)
  const [postDetailTab, setPostDetailTab] = useState<'info' | 'comments' | 'likes'>('info')
  const [postComments, setPostComments] = useState<any[]>([])
  const [postLikes, setPostLikes] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // 커뮤니티 카테고리
  const categories = [
    { value: 'all', label: '전체' },
    { value: '어린이집,유치원', label: '어린이집,유치원' },
    { value: '소아과 후기', label: '소아과 후기' },
    { value: '지역 정보', label: '지역 정보' },
    { value: '육아 팁', label: '육아 팁' }
  ]

  useEffect(() => {
    fetchPosts()
  }, [filterCategory])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      
      const url = filterCategory === 'all' 
        ? '/api/posts'
        : `/api/posts?category=${filterCategory}`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (response.ok) {
        setPosts(result.posts || [])
        console.log('게시글 데이터 로드됨:', result.count, '개')
      } else {
        console.error('API 오류:', result.error)
        setPosts([])
      }
      
    } catch (error) {
      console.error('게시글 목록 조회 오류:', error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.hashtags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'likes':
        return (b.likes_count || 0) - (a.likes_count || 0)
      case 'comments':
        return (b.comments_count || 0) - (a.comments_count || 0)
      default:
        return 0
    }
  })

  const sortOptions = [
    { value: 'date', label: '최신순' },
    { value: 'likes', label: '좋아요순' },
    { value: 'comments', label: '댓글순' }
  ]

  const getReportTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'spam': '스팸/광고',
      'inappropriate': '부적절한 내용',
      'harassment': '괴롭힘/폭력',
      'other': '기타'
    }
    return typeMap[type] || type
  }

  const fetchPostDetails = async (postId: string) => {
    try {
      setLoadingDetails(true)
      const response = await fetch(`/api/posts/${postId}/details`)
      if (response.ok) {
        const data = await response.json()
        setPostComments(data.comments || [])
        setPostLikes(data.likes || [])
        console.log('게시글 상세 정보 조회 성공:', data.commentsCount, '댓글,', data.likesCount, '좋아요')
      } else {
        console.error('게시글 상세 정보 조회 실패')
        setPostComments([])
        setPostLikes([])
      }
    } catch (error) {
      console.error('게시글 상세 정보 조회 오류:', error)
      setPostComments([])
      setPostLikes([])
    } finally {
      setLoadingDetails(false)
    }
  }

  const handlePostAction = async (postId: string, action: 'view' | 'delete') => {
    try {
      switch (action) {
        case 'view':
          const post = posts.find(p => p.id === postId)
          if (post) {
            setSelectedPost(post)
            setShowPostDetail(true)
            setPostDetailTab('info')
            fetchPostDetails(postId)
          }
          break
        case 'delete':
          if (confirm('정말 이 게시글을 삭제하시겠습니까?')) {
            console.log('게시글 삭제:', postId)
            // TODO: 삭제 API 구현
          }
          break
      }
    } catch (error) {
      console.error('게시글 액션 오류:', error)
    }
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
        <h1 className="text-xl font-bold text-gray-900">게시글 관리</h1>
        <p className="text-sm text-gray-600">커뮤니티 게시글을 관리하세요</p>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">게시글 목록</CardTitle>
          <div className="flex items-center space-x-3 mt-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="내용, 작성자, 해시태그로 검색..."
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
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <SortButtons
                options={sortOptions}
                activeSort={sortBy}
                onSortChange={(sort) => setSortBy(sort as 'date' | 'likes' | 'comments')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <div key={post.id} className="rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors overflow-hidden">
                <div 
                  className="p-3 cursor-pointer"
                  onClick={() => handlePostAction(post.id, 'view')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                    {/* 작성자 정보 */}
                    <div className="flex items-center space-x-2 mb-2">
                      {post.author_profile_image ? (
                        <img
                          src={post.author_profile_image}
                          alt={post.author_name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {post.author_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-xs">{post.author_name}</p>
                        <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">
                          {formatDate(post.created_at)}
                          {post.location && ` • ${post.location}`}
                        </p>
                        {post.category && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                            {post.category}
                          </span>
                        )}
                        {post.reports_count && post.reports_count > 0 ? (
                          <span className="flex items-center space-x-1 px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-medium">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>신고 {post.reports_count}회</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px]">
                            신고없음
                          </span>
                        )}
                      </div>
                      </div>
                    </div>

                    {/* 게시글 내용 */}
                    <p className="text-sm text-gray-900 mb-2 line-clamp-2">{post.content}</p>

                    {/* 해시태그 */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {post.hashtags.map((tag, index) => (
                          <span key={index} className="text-xs text-blue-600">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 이미지 미리보기 */}
                    {post.images && post.images.length > 0 && (
                      <div className="flex gap-1.5 mb-2">
                        {post.images.slice(0, 4).map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`이미지 ${index + 1}`}
                            className="w-14 h-14 object-cover rounded"
                          />
                        ))}
                        {post.images.length > 4 && (
                          <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-600">
                            +{post.images.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 통계 */}
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Heart className="w-3.5 h-3.5 text-red-500" fill="currentColor" />
                        <span className="font-medium">{post.actual_likes_count || post.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-medium">{post.actual_comments_count || post.comments_count || 0}</span>
                      </div>
                      {post.emojis && post.emojis.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-gray-500 mr-0.5">반응:</span>
                          {post.emojis.slice(0, 5).map((emoji, index) => (
                            <span key={index} className="text-sm">{emoji}</span>
                          ))}
                          {post.emojis.length > 5 && (
                            <span className="text-[10px] text-gray-500">+{post.emojis.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 (별도 영역) */}
                <div className="px-3 py-1.5 bg-gray-200/50 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePostAction(post.id, 'delete')
                    }}
                    title="삭제"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs p-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredPosts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 게시글 상세보기 모달 */}
      {showPostDetail && selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">게시글 상세</h2>
                <button
                  onClick={() => {
                    setShowPostDetail(false)
                    setSelectedPost(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 작성자 정보 */}
              <div className="flex items-center space-x-3 mb-4 p-4 bg-gray-50 rounded-lg">
                {selectedPost.author_profile_image ? (
                  <img
                    src={selectedPost.author_profile_image}
                    alt={selectedPost.author_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-600">
                      {selectedPost.author_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedPost.author_name}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedPost.created_at)}
                    {selectedPost.location && ` • ${selectedPost.location}`}
                    {selectedPost.category && ` • ${selectedPost.category}`}
                  </p>
                </div>
              </div>

              {/* 게시글 내용 */}
              <div className="mb-4">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              {/* 해시태그 */}
              {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedPost.hashtags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 이미지 */}
              {selectedPost.images && selectedPost.images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {selectedPost.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`이미지 ${index + 1}`}
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* 통계 */}
              <div className="flex items-center space-x-6 pt-4 border-t mb-4">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
                  <span className="font-medium">{selectedPost.actual_likes_count || selectedPost.likes_count || 0}</span>
                  <span className="text-sm text-gray-600">좋아요</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{selectedPost.actual_comments_count || selectedPost.comments_count || 0}</span>
                  <span className="text-sm text-gray-600">댓글</span>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedPost.reports_count && selectedPost.reports_count > 0 ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-red-600">{selectedPost.reports_count}</span>
                      <span className="text-sm text-gray-600">신고</span>
                    </>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      신고없음
                    </span>
                  )}
                </div>
              </div>

              {/* 탭 네비게이션 */}
              <div className="flex border-b mb-4">
                <button
                  onClick={() => setPostDetailTab('info')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    postDetailTab === 'info'
                      ? 'border-b-2 border-gray-600 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  게시글 정보
                </button>
                <button
                  onClick={() => setPostDetailTab('comments')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    postDetailTab === 'comments'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  댓글 ({postComments.length})
                </button>
                <button
                  onClick={() => setPostDetailTab('likes')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    postDetailTab === 'likes'
                      ? 'border-b-2 border-red-600 text-red-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  좋아요 ({postLikes.length})
                </button>
              </div>

              {/* 게시글 정보 탭 */}
              {postDetailTab === 'info' && selectedPost.reports && selectedPost.reports.length > 0 && (
                <div className="mt-6 p-4 bg-red-50/50 rounded-lg">
                  <h4 className="font-bold text-red-800 mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    신고 내역 ({selectedPost.reports.length}건)
                  </h4>
                  <div className="space-y-2">
                    {selectedPost.reports.map((report: any, index: number) => (
                      <div key={report.id} className="bg-red-50/30 p-3 rounded backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            신고 #{index + 1}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            report.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800'
                              : report.status === 'reviewed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {report.status === 'pending' ? '대기중' : report.status === 'reviewed' ? '검토중' : '처리완료'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mb-1">
                          <span className="font-medium">사유:</span> {report.report_reason || '-'}
                        </p>
                        <p className="text-sm text-gray-800 mb-1">
                          <span className="font-medium">유형:</span> {getReportTypeText(report.report_type)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(report.created_at)}
                        </p>
                        {report.admin_notes && (
                          <p className="text-sm text-gray-800 mt-2 pt-2">
                            <span className="font-medium">관리자 메모:</span> {report.admin_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 댓글 탭 */}
              {postDetailTab === 'comments' && (
                <div>
                  {loadingDetails ? (
                    <div className="text-center py-8 text-gray-500">
                      댓글을 불러오는 중...
                    </div>
                  ) : postComments.length > 0 ? (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto">
                      {postComments.map((comment) => (
                        <div key={comment.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex items-start space-x-2 mb-2">
                            {comment.user_profile_image ? (
                              <img
                                src={comment.user_profile_image}
                                alt={comment.user_name}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {comment.user_name?.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-medium">{comment.user_name}</span>
                                <span className="text-[10px] text-gray-500">
                                  {new Date(comment.created_at).toLocaleString('ko-KR')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-900">{comment.content}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-2 pt-2 border-t">
                            {comment.is_edited && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">수정됨</span>
                            )}
                            {comment.parent_id && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">답글</span>
                            )}
                            {comment.replies_count > 0 && (
                              <span className="text-[10px] text-gray-600">답글 {comment.replies_count}개</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      댓글이 없습니다.
                    </div>
                  )}
                </div>
              )}

              {/* 좋아요 탭 */}
              {postDetailTab === 'likes' && (
                <div>
                  {loadingDetails ? (
                    <div className="text-center py-8 text-gray-500">
                      좋아요 목록을 불러오는 중...
                    </div>
                  ) : postLikes.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {postLikes.map((like) => (
                        <div key={like.id} className="border rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            {like.user?.profile_image_url ? (
                              <img
                                src={like.user.profile_image_url}
                                alt={like.user.full_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {like.user?.full_name?.charAt(0) || like.username?.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{like.user?.full_name || like.username}</p>
                              {like.user?.nickname && (
                                <p className="text-xs text-gray-500">@{like.user.nickname}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500">
                                {new Date(like.created_at).toLocaleString('ko-KR')}
                              </p>
                              {like.user?.user_type && (
                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                  like.user.user_type === 'parent' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {like.user.user_type === 'parent' ? '부모' : '교사'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      좋아요가 없습니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

