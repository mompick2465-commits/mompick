import { useState, useEffect } from 'react'
import { Heart, MessageCircle, X, ArrowLeft, Bell, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'

interface Notification {
  id: string
  to_user_id: string
  type: 'like' | 'reply' | 'comment' | 'review_like'
  post_id: string
  comment_id?: string
  from_user_id: string
  payload: {
    from_user_name: string
    from_user_profile_image: string
    post_title?: string
    comment_content?: string
    kindergarten_name?: string
    message?: string
  }
  created_at: string
  is_read: boolean
  from_user_type?: string
  from_user_children_images?: string[]
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const navigate = useNavigate()
  const { refreshUnreadCount } = useNotification()
  
  // 스와이프 관련 상태
  const [swipeStates, setSwipeStates] = useState<{ [key: string]: { startX: number; currentX: number; isDragging: boolean } }>({})


  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // OAuth 사용자인 경우
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()
          
          if (profileData) {
            setCurrentUser(profileData)
          }
        } else {
          // 전화번호 가입 사용자인 경우
          const isLoggedIn = localStorage.getItem('isLoggedIn')
          const userProfile = localStorage.getItem('userProfile')
          
          if (isLoggedIn === 'true' && userProfile) {
            const profile = JSON.parse(userProfile)
            setCurrentUser(profile)
          }
        }
      } catch (error) {
        console.error('사용자 정보 조회 오류:', error)
      }
    }

    getCurrentUser()
  }, [])

  // 알림 목록 가져오기
  const fetchNotifications = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      // Profile ID를 우선적으로 사용
      const userId = currentUser.id || currentUser.auth_user_id
      
      console.log('=== 알림 조회 디버깅 ===')
      console.log('currentUser:', currentUser)
      console.log('사용할 userId:', userId)
      
      // 알림 데이터 가져오기 (새로운 스키마)
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          posts:post_id(content)
        `)
        .eq('to_user_id', userId) // 새로운 스키마: to_user_id
        .order('created_at', { ascending: false })

      console.log('알림 조회 결과:', { data, error })

      if (error) {
        console.error('알림 조회 오류:', error)
        return
      }

      // 데이터 구조 변환 (새로운 스키마)
      const formattedNotifications: Notification[] = await Promise.all((data || []).map(async (notification: any) => {
        // from_user_id로 프로필 정보 조회
        let profileData = null
        
        // 먼저 id로 조회
        const { data: profileById } = await supabase
          .from('profiles')
          .select('user_type, children_info')
          .eq('id', notification.from_user_id)
          .maybeSingle()
        
        if (profileById) {
          profileData = profileById
        } else {
          // id로 못 찾으면 auth_user_id로 조회
          const { data: profileByAuthId } = await supabase
            .from('profiles')
            .select('user_type, children_info')
            .eq('auth_user_id', notification.from_user_id)
            .maybeSingle()
          
          profileData = profileByAuthId
        }
        
        const childrenImages = profileData?.user_type === 'parent' && profileData?.children_info
          ? profileData.children_info.map((child: any) => child.profile_image_url || null)
          : []
        
        return {
          id: notification.id,
          to_user_id: notification.to_user_id,
          type: notification.type,
          post_id: notification.post_id,
          comment_id: notification.comment_id,
          from_user_id: notification.from_user_id,
          payload: {
            from_user_name: notification.payload?.from_user_name || '알 수 없음',
            from_user_profile_image: notification.payload?.from_user_profile_image || '',
            post_title: notification.posts?.content || notification.payload?.post_title || '',
            comment_content: notification.payload?.comment_content || '',
            kindergarten_name: notification.payload?.kindergarten_name || '',
            message: notification.payload?.message || ''
          },
          created_at: notification.created_at,
          is_read: notification.is_read,
          from_user_type: profileData?.user_type,
          from_user_children_images: childrenImages
        }
      }))

      setNotifications(formattedNotifications)
    } catch (error) {
      console.error('알림 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      fetchNotifications()
    }
  }, [currentUser])



  // 알림 삭제 처리
  const deleteNotification = async (notificationId: string) => {
    try {
      console.log('알림 삭제 처리:', notificationId)
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('알림 삭제 오류:', error)
        return
      }

      console.log('알림 삭제 성공')

      // 로컬 상태에서 제거
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      )

      // 전역 알림 개수 업데이트
      await refreshUnreadCount()
    } catch (error) {
      console.error('알림 삭제 오류:', error)
    }
  }
  
  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.touches[0]
    setSwipeStates(prev => ({
      ...prev,
      [notificationId]: {
        startX: touch.clientX,
        currentX: 0,
        isDragging: true
      }
    }))
  }
  
  const handleTouchMove = (e: React.TouchEvent, notificationId: string) => {
    const state = swipeStates[notificationId]
    if (!state || !state.isDragging) return
    
    const touch = e.touches[0]
    const diff = touch.clientX - state.startX
    
    // 왼쪽으로만 스와이프 허용
    if (diff < 0) {
      setSwipeStates(prev => ({
        ...prev,
        [notificationId]: {
          ...state,
          currentX: diff
        }
      }))
    }
  }
  
  const handleTouchEnd = (notificationId: string) => {
    const state = swipeStates[notificationId]
    if (!state) return
    
    const deleteThreshold = -100 // 100px 이상 왼쪽으로 밀면 삭제
    
    if (state.currentX < deleteThreshold) {
      // 삭제 실행
      deleteNotification(notificationId)
    }
    
    // 상태 초기화
    setSwipeStates(prev => ({
      ...prev,
      [notificationId]: {
        startX: 0,
        currentX: 0,
        isDragging: false
      }
    }))
  }

  // 알림 클릭 처리 (현재 비활성화)
  // const handleNotificationClick = async (notification: Notification) => {
  //   // 해당 게시글로 이동
  //   navigate(`/post/${notification.post_id}`)
  // }

  // 시간 포맷팅
  const formatTime = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return '방금 전'
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}시간 전`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}일 전`
    
    return created.toLocaleDateString('ko-KR')
  }

  // 알림 타입에 따른 아이콘과 메시지
  const getNotificationContent = (notification: Notification) => {
    if (notification.type === 'like') {
      return {
        icon: <Heart className="w-5 h-5 text-red-500 fill-current" />,
        message: (
          <span>
            <span className="font-semibold text-gray-900">{notification.payload.from_user_name}</span>
            님이 회원님의 게시글에 <span className="text-red-500 font-semibold">하트</span>를 눌렀습니다.
          </span>
        )
      }
    } else if (notification.type === 'reply') {
      return {
        icon: <MessageCircle className="w-5 h-5 text-green-500" />,
        message: (
          <span>
            <span className="font-semibold text-gray-900">{notification.payload.from_user_name}</span>
            님이 회원님의 댓글에 <span className="text-green-500 font-semibold">답글</span>을 달았습니다.
          </span>
        )
      }
    } else if (notification.type === 'comment') {
      return {
        icon: <MessageCircle className="w-5 h-5 text-blue-500" />,
        message: (
          <span>
            <span className="font-semibold text-gray-900">{notification.payload.from_user_name}</span>
            님이 회원님의 게시글에 <span className="text-blue-500 font-semibold">댓글</span>을 달았습니다.
          </span>
        )
      }
    } else if (notification.type === 'review_like') {
      return {
        icon: <Heart className="w-5 h-5 text-red-500 fill-current" />,
        message: (
          <span>
            <span className="font-semibold text-gray-900">{notification.payload.from_user_name}</span>
            님이 <span className="text-[#fb8678] font-semibold">{notification.payload.kindergarten_name}</span> 칭찬에 <span className="text-red-500 font-semibold">하트</span>를 눌렀습니다.
          </span>
        )
      }
    }
    return {
      icon: <MessageCircle className="w-5 h-5 text-gray-500" />,
      message: '새로운 알림이 있습니다.'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-600 hover:text-[#fb8678] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">알림</h1>
            </div>
            <button
              onClick={() => navigate('/notifications/settings')}
              className="p-2 text-gray-600 hover:text-[#fb8678] transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#fb8678]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-[#fb8678]" />
            </div>
            <p className="text-gray-500 text-sm">새로운 알림이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const content = getNotificationContent(notification)
              const swipeState = swipeStates[notification.id]
              const translateX = swipeState?.currentX || 0
              
              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border transition-all ${
                    !notification.is_read 
                      ? 'border-[#fb8678] bg-[#fb8678]/10 shadow-md ring-1 ring-[#fb8678]/20' 
                      : 'border-gray-100'
                  }`}
                  style={{
                    transform: `translateX(${translateX}px)`,
                    transition: swipeState?.isDragging ? 'none' : 'transform 0.3s ease-out'
                  }}
                  onTouchStart={(e) => handleTouchStart(e, notification.id)}
                  onTouchMove={(e) => handleTouchMove(e, notification.id)}
                  onTouchEnd={() => handleTouchEnd(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    {/* 프로필 이미지 */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-[#fb8678] rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                        {notification.payload.from_user_profile_image ? (
                          <img
                            src={notification.payload.from_user_profile_image}
                            alt="프로필"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('프로필 이미지 로딩 실패:', notification.payload.from_user_profile_image)
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <span className={`text-white font-bold text-sm ${notification.payload.from_user_profile_image ? 'hidden' : ''}`}>👤</span>
                      </div>
                      
                      {/* 자녀 프로필 사진 배지 (학부모) 또는 교사 배지 (교사) */}
                      {notification.from_user_type === 'teacher' ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[0.5px] border-blue-500 bg-white flex items-center justify-center cursor-pointer">
                          <svg className="w-2 h-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                          </svg>
                        </div>
                      ) : notification.from_user_children_images && notification.from_user_children_images.length > 0 && (
                        <div className="absolute -bottom-0.5 -right-0.5 flex items-center flex-row-reverse">
                          {/* 3명 이상일 경우 +N 표시 */}
                          {notification.from_user_children_images.length > 2 && (
                            <div className="w-3.5 h-3.5 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center cursor-pointer relative z-30">
                              <span className="text-white text-[6px] font-bold">
                                +{notification.from_user_children_images.length - 2}
                              </span>
                            </div>
                          )}
                          
                          {/* 두 번째 자녀 */}
                          {notification.from_user_children_images.length >= 2 && (
                            <div className={`w-3.5 h-3.5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-20 ${notification.from_user_children_images.length > 2 ? '-mr-[4px]' : ''}`}>
                              {notification.from_user_children_images[1] ? (
                                <img
                                  src={notification.from_user_children_images[1]}
                                  alt="자녀 프로필 2"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const parent = e.currentTarget.parentElement
                                    if (parent) {
                                      const icon = document.createElement('span')
                                      icon.className = 'text-gray-400 text-[8px]'
                                      icon.textContent = '👤'
                                      parent.appendChild(icon)
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-gray-400 text-[8px]">👤</span>
                              )}
                            </div>
                          )}
                          
                          {/* 첫 번째 자녀 */}
                          <div className={`w-3.5 h-3.5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-10 ${notification.from_user_children_images.length >= 2 ? '-mr-[4px]' : ''}`}>
                            {notification.from_user_children_images[0] ? (
                              <img
                                src={notification.from_user_children_images[0]}
                                alt="자녀 프로필"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent) {
                                    const icon = document.createElement('span')
                                    icon.className = 'text-gray-400 text-[8px]'
                                    icon.textContent = '👤'
                                    parent.appendChild(icon)
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-gray-400 text-[8px]">👤</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 알림 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 mb-1">
                          {content.icon}
                          <span className="text-sm font-semibold text-gray-900">
                            {notification.payload.from_user_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatTime(notification.created_at)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="알림 삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {content.message}
                      </p>

                      {/* 게시글 제목 또는 댓글 내용 미리보기 */}
                      {notification.payload.post_title && (
                        <div className="bg-gray-50 rounded-lg p-2 mb-2">
                          <p className="text-xs text-gray-600 font-medium">게시글</p>
                          <p className="text-xs text-gray-800 line-clamp-2">
                            {notification.payload.post_title.length > 100 
                              ? notification.payload.post_title.substring(0, 100) + '...' 
                              : notification.payload.post_title}
                          </p>
                        </div>
                      )}

                      {notification.payload.comment_content && (
                        <div className="bg-[#fb8678]/10 rounded-lg p-2">
                          <p className="text-xs text-gray-600 font-medium">댓글</p>
                          <p className="text-xs text-gray-800 line-clamp-2 font-semibold">
                            {notification.payload.comment_content}
                          </p>
                        </div>
                      )}

                      {notification.type === 'review_like' && notification.payload.kindergarten_name && (
                        <div className="bg-orange-50 rounded-lg p-2">
                          <p className="text-xs text-gray-600 font-medium">유치원</p>
                          <p className="text-xs text-gray-800 font-semibold">
                            {notification.payload.kindergarten_name}
                          </p>
                        </div>
                      )}


                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications
