'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserProfile } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Search, Filter, MoreHorizontal, UserX, FileText, Trash2, MessageSquare, Users } from 'lucide-react'
import { SortButtons } from '@/components/ui/sort-buttons'

interface UserWithImages extends UserProfile {
  current_profile_image?: string
  profile_image_history?: Array<{
    name: string
    url: string
    created_at: string
    size: number
  }>
  children_image_history?: Array<{
    name: string
    url: string
    created_at: string
    size: number
  }>
  posts_count?: number
  comments_count?: number
  is_active?: boolean
}

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
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithImages[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'parent' | 'teacher'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type'>('date')
  const [selectedUser, setSelectedUser] = useState<UserWithImages | null>(null)
  const [showImageHistory, setShowImageHistory] = useState(false)
  const [showUserDetail, setShowUserDetail] = useState(false)
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [userComments, setUserComments] = useState<any[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [deletingImage, setDeletingImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'comments' | 'children'>('posts')
  const [showChildrenInfo, setShowChildrenInfo] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      console.log('API 라우트를 통해 사용자 데이터를 가져옵니다...')
      
      // API 라우트를 통해 데이터 가져오기
      const response = await fetch('/api/users')
      const result = await response.json()
      
      if (response.ok) {
        setUsers(result.users || [])
        console.log('사용자 데이터 로드됨:', result.count, '명')
      } else {
        console.error('API 오류:', result.error)
        setUsers([])
      }
      
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm)
    const matchesFilter = filterType === 'all' || user.user_type === filterType
    return matchesSearch && matchesFilter
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.full_name.localeCompare(b.full_name)
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'type':
        return a.user_type.localeCompare(b.user_type)
      default:
        return 0
    }
  })

  const sortOptions = [
    { value: 'name', label: '이름순' },
    { value: 'date', label: '가입일순' },
    { value: 'type', label: '타입순' }
  ]

  const fetchUserPosts = async (userId: string) => {
    try {
      setLoadingPosts(true)
      const response = await fetch(`/api/users/${userId}/posts`)
      if (response.ok) {
        const data = await response.json()
        setUserPosts(data.posts || [])
        console.log('게시글 조회 성공:', data.count, '개')
      } else {
        const errorData = await response.json()
        console.error('게시글 조회 실패:', errorData)
        alert(`게시글 조회 실패: ${errorData.error}`)
        setUserPosts([])
      }
    } catch (error) {
      console.error('게시글 조회 오류:', error)
      setUserPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }

  const fetchUserComments = async (userId: string) => {
    try {
      setLoadingComments(true)
      const response = await fetch(`/api/users/${userId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setUserComments(data.comments || [])
        console.log('댓글 조회 성공:', data.count, '개')
      } else {
        const errorData = await response.json()
        console.error('댓글 조회 실패:', errorData)
        setUserComments([])
      }
    } catch (error) {
      console.error('댓글 조회 오류:', error)
      setUserComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handleDeleteImage = async (userId: string, filename: string) => {
    if (!confirm('이 프로필 이미지를 삭제하시겠습니까?')) {
      return
    }

    try {
      setDeletingImage(filename)
      const response = await fetch(`/api/users/${userId}/images/${filename}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('이미지가 삭제되었습니다.')
        // 사용자 목록 새로고침
        await fetchUsers()
        // 선택된 사용자 정보 업데이트
        if (selectedUser) {
          const updatedUser = users.find(u => u.id === selectedUser.id)
          if (updatedUser) {
            setSelectedUser(updatedUser)
          }
        }
      } else {
        const errorData = await response.json()
        alert(`이미지 삭제 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('이미지 삭제 오류:', error)
      alert('이미지 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingImage(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const confirmMessage = `정말로 "${user.full_name}" 사용자를 삭제하시겠습니까?\n\n다음 데이터가 모두 삭제됩니다:\n- 작성한 게시글\n- 작성한 댓글\n- 좋아요\n- 리뷰\n- 찜 목록\n- 프로필 이미지\n- 계정 정보\n\n이 작업은 되돌릴 수 없습니다.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('사용자가 성공적으로 삭제되었습니다.')
        // 사용자 목록 새로고침
        await fetchUsers()
      } else {
        const errorData = await response.json()
        alert(`사용자 삭제 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('사용자 삭제 오류:', error)
      alert('사용자 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const newStatus = !currentStatus
    const action = newStatus ? '활성화' : '비활성화'

    if (!confirm(`"${user.full_name}" 사용자를 ${action}하시겠습니까?${!newStatus ? '\n\n비활성화된 사용자는 로그인할 수 없습니다.' : ''}`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: newStatus })
      })

      if (response.ok) {
        alert(`사용자가 ${action}되었습니다.`)
        // 사용자 목록 새로고침
        await fetchUsers()
      } else {
        const errorData = await response.json()
        alert(`사용자 ${action} 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('사용자 상태 변경 오류:', error)
      alert('사용자 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleUserAction = async (userId: string, action: 'view') => {
    try {
      if (action === 'view') {
        // 사용자 상세 보기
        const user = users.find(u => u.id === userId)
          if (user) {
            setSelectedUser(user)
            setShowUserDetail(true)
            // auth_user_id를 사용하여 게시글과 댓글 조회
            fetchUserPosts(user.auth_user_id || userId)
            fetchUserComments(userId)
          }
      }
    } catch (error) {
      console.error('사용자 액션 오류:', error)
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
        <h1 className="text-xl font-bold text-gray-900">사용자 관리</h1>
        <p className="text-sm text-gray-600">등록된 사용자들을 관리하세요</p>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">사용자 목록</CardTitle>
          <div className="flex items-center space-x-3 mt-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="이름, 이메일, 전화번호로 검색..."
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
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'parent' | 'teacher')}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체</option>
                  <option value="parent">부모</option>
                  <option value="teacher">교사</option>
                </select>
              </div>
              <SortButtons
                options={sortOptions}
                activeSort={sortBy}
                onSortChange={(sort) => setSortBy(sort as 'name' | 'date' | 'type')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b text-xs">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">이름</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">인증</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">타입</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">이메일</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">전화번호</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">가입일</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">게시글</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">댓글</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">자녀</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50 text-sm">
                    <td className="py-2 px-3">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="cursor-pointer relative group"
                          onClick={() => {
                            if (user.profile_image_history && user.profile_image_history.length > 0) {
                              setSelectedUser(user)
                              setShowImageHistory(true)
                            }
                          }}
                          title={user.profile_image_history && user.profile_image_history.length > 0 ? "클릭하여 이미지 기록 보기" : ""}
                        >
                          {user.current_profile_image ? (
                            <img
                              src={user.current_profile_image}
                              alt={user.full_name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
                              onError={(e) => {
                                // 이미지 로드 실패시 기본 아바타 표시
                                e.currentTarget.style.display = 'none'
                                const parent = e.currentTarget.parentElement
                                if (parent) {
                                  const fallback = document.createElement('div')
                                  fallback.className = 'w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center'
                                  fallback.innerHTML = `<span class="text-xs font-medium text-gray-600">${user.full_name.charAt(0)}</span>`
                                  parent.appendChild(fallback)
                                }
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                              <span className="text-xs font-medium text-gray-600">
                                {user.full_name.charAt(0)}
                              </span>
                            </div>
                          )}
                          {user.profile_image_history && user.profile_image_history.length > 0 && (
                            <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                              {user.profile_image_history.length}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{user.full_name}</div>
                          {user.nickname && (
                            <div className="text-xs text-gray-500">@{user.nickname}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-1.5 py-0.5 text-[11px] font-medium rounded-full ${
                        user.auth_method === 'kakao' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : user.auth_method === 'google'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.auth_method === 'kakao' ? '카카오' : user.auth_method === 'google' ? '구글' : '전화'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-1.5 py-0.5 text-[11px] font-medium rounded-full ${
                        user.user_type === 'parent' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.user_type === 'parent' ? '부모' : '교사'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-600">
                      {user.email || '-'}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-600">
                      {user.phone || '-'}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleUserAction(user.id, 'view')}
                        className="flex items-center space-x-1.5 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                        title="게시글 보기"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-gray-900">{user.posts_count || 0}</span>
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleUserAction(user.id, 'view')}
                        className="flex items-center space-x-1.5 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                        title="댓글 보기"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs font-medium text-gray-900">{user.comments_count || 0}</span>
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      {user.user_type === 'parent' && (
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowChildrenInfo(true)
                          }}
                          className="flex items-center space-x-1.5 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                          title="자녀 정보 보기"
                        >
                          <Users className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs font-medium text-gray-900">{user.children_info?.length || 0}</span>
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.is_active !== false)}
                          className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                            user.is_active !== false
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title={user.is_active !== false ? '클릭하여 비활성화' : '클릭하여 활성화'}
                        >
                          {user.is_active !== false ? '활성' : '비활성'}
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          title="사용자 영구 삭제"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 이미지 기록 모달 */}
      {showImageHistory && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {selectedUser.full_name}님의 프로필 이미지 기록
                </h2>
                <button
                  onClick={() => {
                    setShowImageHistory(false)
                    setSelectedUser(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                총 {selectedUser.profile_image_history?.length || 0}개의 이미지
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedUser.profile_image_history?.map((image, index) => (
                  <div key={image.name} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group relative">
                    <div className="aspect-square relative">
                      <img
                        src={image.url}
                        alt={`프로필 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      {selectedUser.current_profile_image === image.url && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          현재
                        </div>
                      )}
                      {/* 삭제 버튼 (hover 시 표시) */}
                      <button
                        onClick={() => handleDeleteImage(selectedUser.auth_user_id || selectedUser.id, image.name)}
                        disabled={deletingImage === image.name}
                        className="absolute top-2 left-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:bg-gray-400"
                        title="이미지 삭제"
                      >
                        {deletingImage === image.name ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="p-2 bg-gray-50">
                      <div className="text-xs text-gray-600 truncate" title={image.name}>
                        {image.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(image.created_at).toLocaleDateString('ko-KR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(image.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(!selectedUser.profile_image_history || selectedUser.profile_image_history.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  프로필 이미지 기록이 없습니다.
                </div>
              )}

              {/* 자녀 프로필 이미지 기록 섹션 (학부모인 경우) */}
              {selectedUser.user_type === 'parent' && selectedUser.children_image_history && selectedUser.children_image_history.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold mb-2">자녀 프로필 이미지 기록</h3>
                  
                  <div className="mb-4 text-sm text-gray-600">
                    총 {selectedUser.children_image_history.length}개의 이미지
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedUser.children_image_history.map((image, index) => (
                      <div key={image.name} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group relative">
                        <div className="aspect-square relative">
                          <img
                            src={image.url}
                            alt={`자녀 프로필 이미지 ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                            }}
                          />
                          {/* 삭제 버튼 (hover 시 표시) */}
                          <button
                            onClick={() => handleDeleteImage(selectedUser.auth_user_id || selectedUser.id, `children/${image.name}`)}
                            disabled={deletingImage === `children/${image.name}`}
                            className="absolute top-2 left-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:bg-gray-400"
                            title="이미지 삭제"
                          >
                            {deletingImage === `children/${image.name}` ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="p-2 bg-gray-50">
                          <div className="text-xs text-gray-600 truncate" title={image.name}>
                            {image.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(image.created_at).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(image.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 자녀 정보 모달 */}
      {showChildrenInfo && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {selectedUser.full_name}님의 자녀 정보
                </h2>
                <button
                  onClick={() => {
                    setShowChildrenInfo(false)
                    setSelectedUser(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedUser.children_info && selectedUser.children_info.length > 0 ? (
                <div className="space-y-4">
                  {selectedUser.children_info.map((child: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="mb-3">
                        <h4 className="text-base font-semibold text-gray-900">
                          {index === 0 ? '첫 번째 자녀' : `${index + 1}번째 자녀`}
                        </h4>
                      </div>
                      
                      {/* 자녀 프로필 사진 */}
                      {child.profile_image_url && (
                        <div className="flex justify-center mb-4">
                          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                            <img 
                              src={child.profile_image_url} 
                              alt={`${child.name} 프로필`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">이름</p>
                          <p className="font-medium">{child.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">성별</p>
                          <p className="font-medium">
                            {child.gender === 'male' || child.gender === '남자' ? '남아' : 
                             child.gender === 'female' || child.gender === '여자' ? '여아' : child.gender}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">생년월일</p>
                          <p className="font-medium">{child.birth_date}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">보호자 관계</p>
                          <p className="font-medium">
                            {child.relationship === 'mother' ? '엄마' : 
                             child.relationship === 'father' ? '아빠' : 
                             child.relationship === 'grandmother' ? '할머니' : 
                             child.relationship === 'grandfather' ? '할아버지' : 
                             child.relationship === 'uncle' ? '삼촌' :
                             child.relationship === 'aunt' ? '이모/고모' :
                             child.relationship}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  등록된 자녀 정보가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 사용자 상세보기 모달 */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {selectedUser.current_profile_image ? (
                    <img
                      src={selectedUser.current_profile_image}
                      alt={selectedUser.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-base font-medium text-gray-600">
                        {selectedUser.full_name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold">{selectedUser.full_name}</h2>
                    {selectedUser.nickname && (
                      <p className="text-sm text-gray-600">@{selectedUser.nickname}</p>
                    )}
                    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full mt-0.5 ${
                      selectedUser.user_type === 'parent' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedUser.user_type === 'parent' ? '부모' : '교사'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserDetail(false)
                    setSelectedUser(null)
                    setUserPosts([])
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 사용자 정보 */}
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-[10px] text-gray-600">이메일</p>
                  <p className="text-xs font-medium">{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600">전화번호</p>
                  <p className="text-xs font-medium">{selectedUser.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600">가입일</p>
                  <p className="text-xs font-medium">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600">인증 방법</p>
                  <p className="text-xs font-medium">{selectedUser.auth_method || '-'}</p>
                </div>
              </div>

              {/* 탭 네비게이션 */}
              <div className="flex border-b mb-4">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'posts'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  게시글 ({userPosts.length})
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'comments'
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  댓글 ({userComments.length})
                </button>
                {selectedUser.user_type === 'parent' && (
                  <button
                    onClick={() => setActiveTab('children')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'children'
                        ? 'border-b-2 border-green-600 text-green-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    자녀 정보 ({selectedUser.children_info?.length || 0})
                  </button>
                )}
              </div>

              {/* 게시글 목록 */}
              {activeTab === 'posts' && (
                <div>
                
                {loadingPosts ? (
                  <div className="text-center py-8 text-gray-500">
                    게시글을 불러오는 중...
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto">
                    {userPosts.map((post) => (
                      <div key={post.id} className="border rounded-lg p-3 hover:bg-gray-50">
                        <div className="mb-1.5">
                          <p className="text-xs text-gray-600 mb-1">
                            {new Date(post.created_at).toLocaleString('ko-KR')}
                            {post.location && ` • ${post.location}`}
                            {post.category && (
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                                {post.category}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap line-clamp-3">{post.content}</p>
                        </div>

                        {/* 해시태그 */}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {post.hashtags.map((tag, index) => (
                              <span key={index} className="text-xs text-blue-600">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 이미지 */}
                        {post.images && post.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-1.5 mt-2">
                            {post.images.slice(0, 4).map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt={`게시글 이미지 ${index + 1}`}
                                className="w-full h-16 object-cover rounded"
                              />
                            ))}
                            {post.images.length > 4 && (
                              <div className="w-full h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">
                                +{post.images.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 좋아요, 댓글 수 */}
                        <div className="flex items-center space-x-3 mt-2 pt-2 border-t">
                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="font-medium">{post.actual_likes_count || post.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    작성한 게시글이 없습니다.
                  </div>
                )}
                </div>
              )}

              {/* 댓글 목록 */}
              {activeTab === 'comments' && (
                <div>
                
                {loadingComments ? (
                  <div className="text-center py-8 text-gray-500">
                    댓글을 불러오는 중...
                  </div>
                ) : userComments.length > 0 ? (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto">
                    {userComments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-3 hover:bg-gray-50">
                        <div className="mb-1.5">
                          <p className="text-xs text-gray-600 mb-1">
                            {new Date(comment.created_at).toLocaleString('ko-KR')}
                            {comment.post && (
                              <span className="ml-2 text-blue-600 text-[11px]">
                                게시글: {comment.post.content.substring(0, 25)}...
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{comment.content}</p>
                        </div>

                        {/* 댓글 정보 */}
                        <div className="flex items-center space-x-3 mt-1.5 pt-1.5 border-t text-xs text-gray-600">
                          {comment.is_edited && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">(수정됨)</span>
                          )}
                          {comment.parent_id && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">답글</span>
                          )}
                          {comment.replies_count > 0 && (
                            <div className="flex items-center space-x-1">
                              <MessageSquare className="w-3 h-3" />
                              <span className="text-[11px]">답글 {comment.replies_count}개</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    작성한 댓글이 없습니다.
                  </div>
                )}
                </div>
              )}

              {/* 자녀 정보 */}
              {activeTab === 'children' && (
                <div>
                {selectedUser.children_info && selectedUser.children_info.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedUser.children_info.map((child: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {index === 0 ? '첫 번째 자녀' : `${index + 1}번째 자녀`}
                          </h4>
                        </div>
                        
                        {/* 자녀 프로필 사진 */}
                        {child.profile_image_url && (
                          <div className="flex justify-center mb-3">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                              <img 
                                src={child.profile_image_url} 
                                alt={`${child.name} 프로필`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-600">이름</p>
                            <p className="font-medium">{child.name}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">성별</p>
                            <p className="font-medium">{child.gender === 'male' || child.gender === '남자' ? '남아' : child.gender === 'female' || child.gender === '여자' ? '여아' : child.gender}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">생년월일</p>
                            <p className="font-medium">{child.birth_date}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">보호자 관계</p>
                            <p className="font-medium">
                              {child.relationship === 'mother' ? '엄마' : 
                               child.relationship === 'father' ? '아빠' : 
                               child.relationship === 'grandmother' ? '할머니' : 
                               child.relationship === 'grandfather' ? '할아버지' : 
                               child.relationship}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    등록된 자녀 정보가 없습니다.
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
