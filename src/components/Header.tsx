import { Baby, FileText, Users, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePageSync } from '../contexts/PageContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'

const Header = () => {
  const { currentPage, setCurrentPage } = usePageSync()
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const navigate = useNavigate()
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const { unreadCount } = useNotification()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [childrenImages, setChildrenImages] = useState<string[]>([])

  // 현재 카테고리 정보 가져오기
  const currentCategory = searchParams.get('category')


  // 현재 사용자 정보와 프로필 이미지 가져오기
  useEffect(() => {
    let isMounted = true
    let img: HTMLImageElement | null = null

    const fetchUserInfo = async () => {
      try {
        // 먼저 Supabase Auth에서 사용자 확인 (OAuth 사용자용)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user && isMounted) {
          // OAuth 사용자인 경우 profiles 테이블에서 프로필 정보 가져오기
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()

          if (profileData && isMounted) {
            setCurrentUser(profileData)
            if (profileData.profile_image_url) {
              console.log('Header에서 OAuth 사용자 프로필 이미지 URL:', profileData.profile_image_url)
              setProfileImage(profileData.profile_image_url)
            } else {
              console.log('Header에서 OAuth 사용자 프로필 이미지 없음')
              setProfileImage(null)
            }
            
            // 자녀 프로필 이미지들 설정 (학부모인 경우) - 사진이 없어도 표시
            if (profileData.user_type === 'parent' && profileData.children_info && profileData.children_info.length > 0) {
              const childImages = profileData.children_info.map((child: any) => child.profile_image_url || null)
              setChildrenImages(childImages)
            }
          }
        } else {
          // Supabase Auth에 사용자가 없는 경우, 전화번호 가입 사용자 확인
          const isLoggedIn = localStorage.getItem('isLoggedIn')
          const userProfile = localStorage.getItem('userProfile')
          
          if (isLoggedIn === 'true' && userProfile && isMounted) {
            try {
              const profile = JSON.parse(userProfile)
              setCurrentUser(profile)
              if (profile.profile_image_url && isMounted) {
                console.log('Header에서 전화번호 가입 사용자 프로필 이미지 URL:', profile.profile_image_url)
                setProfileImage(profile.profile_image_url)
              } else if (isMounted) {
                console.log('Header에서 전화번호 가입 사용자 프로필 이미지 없음')
                setProfileImage(null)
              }
              
              // 자녀 프로필 이미지들 설정 (학부모인 경우) - 사진이 없어도 표시
              if (profile.user_type === 'parent' && profile.children_info && profile.children_info.length > 0) {
                const childImages = profile.children_info.map((child: any) => child.profile_image_url || null)
                setChildrenImages(childImages)
              }
            } catch (parseError) {
              console.error('프로필 파싱 오류:', parseError)
              setProfileImage(null)
            }
          } else if (isMounted) {
            console.log('Header에서 로그인된 사용자 없음')
            setProfileImage(null)
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('사용자 정보 조회 오류:', error)
          setProfileImage(null)
        }
      }
    }

    fetchUserInfo()

    // Cleanup function
    return () => {
      isMounted = false
      if (img) {
        img.onload = null
        img.onerror = null
        img = null
      }
    }
  }, [])



  const navItems = [
    { id: 'home', label: '홈', icon: Baby },
    { id: 'apply', label: '신청', icon: FileText },
    { id: 'community', label: '커뮤니티', icon: Users },
  ]



  return (
    <header className="bg-white shadow-[0_2px_8px_rgba(251,134,120,0.15)] sticky top-0 z-50 overflow-hidden">
      <div className="px-4">
        {/* Top Bar */}
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center">
            <img 
              src="/headericon.png" 
              alt="맘픽" 
              className="h-12 object-contain"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => navigate('/notifications')}
              className="p-2 text-gray-600 hover:text-[#fb8678] transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {/* 알림 뱃지 */}
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <span className="text-white text-xs font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </div>
              )}
            </button>
            
            {/* Profile Picture */}
            <div className="relative">
              <div 
                onClick={() => navigate('/profile')}
                className="w-10 h-10 bg-[#fb8678] rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="프로필 사진"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('프로필 이미지 로딩 실패:', profileImage)
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <span className={`text-white font-bold text-sm ${profileImage ? 'hidden' : ''}`}>👤</span>
              </div>
              
              {/* 자녀 프로필 사진 배지 (학부모) 또는 교사 배지 (교사) */}
              {currentUser?.user_type === 'teacher' ? (
                <div 
                  onClick={() => navigate('/profile')}
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[1px] border-blue-500 bg-white flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-2.5 h-2.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                  </svg>
                </div>
              ) : childrenImages.length > 0 && (
                <div className="absolute -bottom-1 -right-1 flex items-center flex-row-reverse">
                  {/* 3명 이상일 경우 +N 표시 (가장 우측에 위치) */}
                  {childrenImages.length > 2 && (
                    <div 
                      onClick={() => navigate('/profile')}
                      className="w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center cursor-pointer relative z-30"
                    >
                      <span className="text-white text-[7px] font-bold">
                        +{childrenImages.length - 2}
                      </span>
                    </div>
                  )}
                  
                  {/* 두 번째 자녀 (우측에서 두 번째, +N이 없으면 가장 우측) */}
                  {childrenImages.length >= 2 && (
                    <div 
                      onClick={() => navigate('/profile')}
                      className={`w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-20 ${childrenImages.length > 2 ? '-mr-[5px]' : ''}`}
                    >
                      {childrenImages[1] ? (
                        <img
                          src={childrenImages[1]}
                          alt="자녀 프로필 2"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              const icon = document.createElement('span')
                              icon.className = 'text-gray-400 text-[10px]'
                              icon.textContent = '👤'
                              parent.appendChild(icon)
                            }
                          }}
                        />
                      ) : (
                        <span className="text-gray-400 text-[10px]">👤</span>
                      )}
                    </div>
                  )}
                  
                  {/* 첫 번째 자녀 (맨 왼쪽, 1명이면 가장 우측) */}
                  <div 
                    onClick={() => navigate('/profile')}
                    className={`w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-10 ${childrenImages.length >= 2 ? '-mr-[5px]' : ''}`}
                  >
                    {childrenImages[0] ? (
                      <img
                        src={childrenImages[0]}
                        alt="자녀 프로필"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            const icon = document.createElement('span')
                            icon.className = 'text-gray-400 text-[10px]'
                            icon.textContent = '👤'
                            parent.appendChild(icon)
                          }
                        }}
                      />
                    ) : (
                      <span className="text-gray-400 text-[10px]">👤</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex justify-center items-center h-14 -mt-1.5">
          <nav className="flex items-center space-x-12">
            {/* Home */}
            <button
              onClick={() => {
                console.log('Home button clicked')
                setCurrentPage('home')
                navigate('/main')
              }}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                currentPage === 'home'
                  ? 'bg-gradient-to-br from-[#fb8678] to-[#e67567] text-white border-2 border-[#fb8678] shadow-lg shadow-[#fb8678]/50 scale-110'
                  : 'text-gray-600 hover:text-[#fb8678] hover:bg-[#fb8678]/10 hover:scale-105'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M20 20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V11H1L11.3273 1.6115C11.7087 1.26475 12.2913 1.26475 12.6727 1.6115L23 11H20V20ZM18 19V9.15745L12 3.7029L6 9.15745V19H18ZM12 17L8.64124 13.6412C7.76256 12.7625 7.76256 11.3379 8.64124 10.4592C9.51992 9.58056 10.9445 9.58056 11.8232 10.4592L12 10.636L12.1768 10.4592C13.0555 9.58056 14.4801 9.58056 15.3588 10.4592C16.2374 11.3379 16.2374 12.7625 15.3588 13.6412L12 17Z"></path>
              </svg>
            </button>
            
            {/* Apply */}
            <button
              onClick={() => {
                console.log('Apply button clicked')
                setCurrentPage('apply')
                navigate('/application')
              }}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                currentPage === 'apply'
                  ? 'bg-gradient-to-br from-[#fb8678] to-[#e67567] text-white border-2 border-[#fb8678] shadow-lg shadow-[#fb8678]/50 scale-110'
                  : 'text-gray-600 hover:text-[#fb8678] hover:bg-[#fb8678]/10 hover:scale-105'
              }`}
            >
              <FileText className="w-5 h-5" />
            </button>
            
            {/* Community */}
            <button
              onClick={() => {
                console.log('=== Header Community 버튼 클릭 디버깅 ===')
                console.log('현재 URL의 카테고리 파라미터:', currentCategory)
                console.log('현재 페이지:', currentPage)
                
                setCurrentPage('community')
                
                // 현재 URL에 카테고리 파라미터가 있으면 그것을 사용, 없으면 localStorage에서 가져오기
                let categoryToNavigate = '어린이집,유치원' // 기본값
                
                if (currentCategory) {
                  // 현재 URL에 카테고리 파라미터가 있으면 그것을 사용
                  categoryToNavigate = currentCategory
                  console.log('현재 URL의 카테고리 사용:', currentCategory)
                } else {
                  // URL에 카테고리가 없으면 localStorage에서 저장된 카테고리 사용
                  const savedCategory = localStorage.getItem('selectedCommunityCategory')
                  console.log('localStorage에서 가져온 카테고리:', savedCategory)
                  
                  if (savedCategory) {
                    // 저장된 카테고리 ID를 카테고리명으로 변환
                    const categoryMapping: { [key: string]: string } = {
                      'kindergarten': '어린이집,유치원',
                      'hospital': '소아과 후기',
                      'location': '지역 정보',
                      'tips': '육아 팁'
                    }
                    categoryToNavigate = categoryMapping[savedCategory] || '어린이집,유치원'
                    console.log('localStorage의 카테고리 사용:', savedCategory, '→', categoryToNavigate)
                  } else {
                    console.log('저장된 카테고리 없음, 기본값 사용')
                  }
                }
                
                console.log('최종 이동할 카테고리:', categoryToNavigate)
                navigate(`/main?category=${encodeURIComponent(categoryToNavigate)}`)
              }}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                currentPage === 'community'
                  ? 'bg-gradient-to-br from-[#fb8678] to-[#e67567] text-white border-2 border-[#fb8678] shadow-lg shadow-[#fb8678]/50 scale-110'
                  : 'text-gray-600 hover:text-[#fb8678] hover:bg-[#fb8678]/10 hover:scale-105'
              }`}
            >
              <Users className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-3 border-t border-gray-200">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id)
                      setIsMenuOpen(false)
                    }}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      currentPage === item.id
                        ? 'bg-[#fb8678] text-white border border-[#fb8678]'
                        : 'text-gray-700 hover:text-[#fb8678] hover:bg-[#fb8678]/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
