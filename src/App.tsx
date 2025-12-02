import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom'
import { StatusBar, Style } from '@capacitor/status-bar'
import Splash from './components/Splash'
import SignUp from './components/SignUp'
import Login from './components/Login'
import PhoneLogin from './components/PhoneLogin'
import Header from './components/Header'
import Hero from './components/Hero'
import Services from './components/Services'
import Community from './components/Community'

import AuthCallback from './components/AuthCallback'
import Profile from './components/Profile'
import ProfilePosts from './components/ProfilePosts'
import ProfileFavorites from './components/ProfileFavorites'
import PostDetail from './components/PostDetail'
import PostWrite from './components/PostWrite'
import Notifications from './components/Notifications'
import NotificationSettings from './components/NotificationSettings'
import Application from './components/Application'
import ChildcareApplication from './components/ChildcareApplication'
import KindergartenMapPage from './components/KindergartenMapPage'
import KindergartenDetailPage from './components/KindergartenDetailPage'
import ChildcareDetailPage from './components/ChildcareDetailPage'
import PlaygroundDetailPage from './components/PlaygroundDetailPage'
import MealCalendar from './components/MealCalendar'
import WriteReviewPage from './components/WriteReviewPage'
import WriteChildcareReviewPage from './components/WriteChildcareReviewPage'
import WritePlaygroundReviewPage from './components/WritePlaygroundReviewPage'
import PlaygroundReviewPhotosPage from './components/PlaygroundReviewPhotosPage'
import ContactPage from './components/ContactPage'
import ContactListPage from './components/ContactListPage'
import ContactDetailPage from './components/ContactDetailPage'
import { PageProvider, usePageContext } from './contexts/PageContext'
import { LikeProvider } from './contexts/LikeContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { supabase } from './lib/supabase'
import { initializeFCM } from './utils/fcm'

// 인증 상태 확인 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 로컬 스토리지에서 로그인 상태 확인 (전화번호 가입 사용자용)
        const isLoggedIn = localStorage.getItem('isLoggedIn')
        const userProfile = localStorage.getItem('userProfile')
        
        if (isLoggedIn === 'true' && userProfile) {
          // 전화번호 가입 사용자로 로그인된 경우 - is_active 확인
          const profile = JSON.parse(userProfile)
          
          // profiles 테이블에서 is_active 확인
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_active')
            .eq('id', profile.id)
            .single()
          
          if (profileError || !profileData) {
            console.error('프로필 조회 오류:', profileError)
            localStorage.removeItem('isLoggedIn')
            localStorage.removeItem('userProfile')
            alert('계정 정보를 불러올 수 없습니다. 다시 로그인해주세요.')
            window.location.href = '/login'
            return
          }
          
          // 비활성화된 계정 체크
          if (profileData.is_active === false) {
            localStorage.removeItem('isLoggedIn')
            localStorage.removeItem('userProfile')
            alert('이 계정은 비활성화 조치되었습니다.\n고객센터에 문의해주세요.')
            window.location.href = '/login'
            return
          }
          
          setHasProfile(true)
          setLoading(false)
          return
        }

        // Supabase 세션 확인 (OAuth 사용자용)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // profiles 테이블에서 사용자 프로필 존재 여부 및 활성화 상태 확인
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('auth_user_id, is_active')
            .eq('auth_user_id', session.user.id)
            .maybeSingle()
          
          if (profileError) {
            console.error('프로필 조회 오류:', profileError)
            // 에러가 발생해도 프로필이 없는 것으로 간주하여 회원가입으로 이동
            window.location.href = '/signup?step=profile&oauth=success'
            return
          }
          
          if (profileData && profileData.auth_user_id) {
            // 비활성화된 계정 체크
            if (profileData.is_active === false) {
              await supabase.auth.signOut()
              alert('이 계정은 비활성화 조치되었습니다.\n고객센터에 문의해주세요.')
              window.location.href = '/login'
              return
            }
            
            // 프로필이 존재하고 활성화된 경우
            setHasProfile(true)
          } else {
            // 프로필이 존재하지 않는 경우 회원가입 페이지로
            window.location.href = '/signup?step=profile&oauth=success'
            return
          }
        } else {
          // 로그인되지 않은 경우 로그인 페이지로
          window.location.href = '/login'
          return
        }
      } catch (error) {
        console.error('인증 확인 오류:', error)
        window.location.href = '/login'
        return
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return hasProfile ? <>{children}</> : null
}

// MainContent를 별도 컴포넌트로 분리
const MainContentWrapper = () => {
  const { currentPage, setCurrentPage } = usePageContext()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [showAdModal, setShowAdModal] = useState(false)
  const [adImages, setAdImages] = useState<string[]>([])
  const [adBanners, setAdBanners] = useState<any[]>([])
  const [adIndex, setAdIndex] = useState(0)
  const [adLoadError, setAdLoadError] = useState(false)
  const [adUserKey, setAdUserKey] = useState<string>('')

  // URL 경로에 따라 currentPage 상태 업데이트
  useEffect(() => {
    const currentPath = location.pathname
    const categoryParam = searchParams.get('category')
    
    if (currentPath === '/application') {
      setCurrentPage('apply')
    } else if (currentPath === '/search') {
      setCurrentPage('search')
    } else if (currentPath === '/main' || currentPath === '/') {
      // URL에 category 파라미터가 있으면 community로, 없으면 home으로
      if (categoryParam) {
        setCurrentPage('community')
      } else {
        setCurrentPage('home')
      }
    } else if (currentPath === '/community') {
      setCurrentPage('community')
    }
  }, [location.pathname, searchParams, setCurrentPage])

  // 초기 진입 시(스플래시 이후 메인) 하단 광고 모달 표시 (로그인 상태 전제: ProtectedRoute)
  useEffect(() => {
    try {
      const currentPath = location.pathname
      const key = adUserKey ? `adModalShown:${adUserKey}` : 'adModalShown'
      const shown = sessionStorage.getItem(key) === '1'
      if (!shown && (currentPath === '/main')) {
        setShowAdModal(true)
      }
    } catch {}
  }, [location.pathname, adUserKey])

  // 사용자 기준 키 파생 (다른 아이디 로그인 시 별도 표시)
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          setAdUserKey(`supabase:${user.id}`)
          return
        }
      } catch {}
      try {
        const lp = localStorage.getItem('userProfile')
        if (lp) {
          try {
            const parsed = JSON.parse(lp)
            const pid = parsed?.id || parsed?.user_id || parsed?.phone || String(parsed)
            setAdUserKey(`local:${pid}`)
            return
          } catch {
            setAdUserKey(`local:${lp}`)
            return
          }
        }
      } catch {}
      setAdUserKey('anonymous')
    })()
  }, [])

  // 광고 배너 데이터 초기화 - API에서 가져오기
  useEffect(() => {
    const fetchModalAds = async () => {
      try {
        const { data, error } = await supabase
          .from('ad_banners')
          .select('*')
          .eq('banner_type', 'modal')
          .eq('is_active', true)
          .order('order_index', { ascending: true })

        if (error) {
          console.error('모달 광고 조회 오류:', error)
          setAdBanners([])
          setAdImages([])
        } else if (data && data.length > 0) {
          setAdBanners(data)
          const imageUrls = data.map(ad => ad.image_url).filter(url => url)
          setAdImages(imageUrls)
          setAdIndex(0)
          setAdLoadError(false)
        } else {
          // 광고가 없으면 모달 표시 안함
          setAdBanners([])
          setAdImages([])
        }
      } catch (error) {
        console.error('모달 광고 가져오기 오류:', error)
        setAdBanners([])
        setAdImages([])
      }
    }

    fetchModalAds()
  }, [])

  // 슬라이드 변경 시 에러 상태 리셋
  useEffect(() => { setAdLoadError(false) }, [adIndex])

  const renderMainContent = () => {
    // URL 경로 확인
    const currentPath = location.pathname
    
    if (currentPath === '/application') {
      return <Application />
    }

    // currentPage에 따라 적절한 컴포넌트 렌더링
    switch (currentPage) {
      case 'home':
        return <Hero />
      case 'search':
        return (
          <div className="p-6 bg-white m-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔍 시설 검색</h2>
            <p className="text-gray-600">검색 기능이 곧 추가될 예정입니다.</p>
          </div>
        )
      case 'apply':
        return <Application />
      case 'community':
        return <Community />
      default:
        return <Hero />
    }
  }

  return (
    <>
      <Header />
      <main>
        {renderMainContent()}
      </main>

      {/* 하단 광고 모달 (뷰포트 30%) */}
      {showAdModal && adImages.length > 0 && (
        <div className="fixed inset-0 z-50">
          {/* 배경 오버레이 */}
          <div className="absolute inset-0 bg-black/40" onClick={() => { try { const k = adUserKey ? `adModalShown:${adUserKey}` : 'adModalShown'; sessionStorage.setItem(k, '1') } catch {}; setShowAdModal(false) }} />
          {/* 바텀 시트 */}
          <div className="absolute left-0 right-0 bottom-0 h-[30vh] rounded-t-2xl overflow-hidden z-10">
            <div className="relative w-full h-full">
              {/* 페이지 인디케이터 (여러 개일 경우) */}
              {adImages.length > 1 && (
                <div className="absolute top-2 left-2 z-20 px-3 py-1 bg-black/50 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                  {adIndex + 1} / {adImages.length}
                </div>
              )}
              
              <button
                onClick={() => { try { const k = adUserKey ? `adModalShown:${adUserKey}` : 'adModalShown'; sessionStorage.setItem(k, '1') } catch {}; setShowAdModal(false) }}
                className="absolute top-2 right-2 z-20 w-12 h-12 flex items-center justify-center text-white text-3xl font-bold bg-transparent hover:bg-transparent drop-shadow-lg"
                aria-label="닫기"
              >
                ×
              </button>
              <div className="absolute inset-0">
                {(() => {
                  const currentBanner = adBanners[adIndex]
                  const src = adImages[adIndex] || ''
                  const isDefault = !src || src === '/headericon.png'
                  
                  if (adLoadError || isDefault) {
                    return <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">사진없음</div>
                  }
                  
                  return (
                    <div 
                      className="relative w-full h-full cursor-pointer"
                      onClick={() => {
                        if (currentBanner?.link_url) {
                          window.open(currentBanner.link_url, '_blank')
                        }
                      }}
                    >
                      <img 
                        src={src} 
                        alt="프로모션" 
                        className="w-full h-full object-cover select-none" 
                        draggable={false} 
                        onError={() => setAdLoadError(true)} 
                      />
                      {/* 어두운 오버레이 */}
                      <div className="absolute inset-0 bg-black/20"></div>
                      
                      {/* 제목과 설명 표시 - 제목, 설명, 클릭문구 중 하나라도 있을 때만 */}
                      {currentBanner && (currentBanner.title || currentBanner.description || currentBanner.show_click_text) && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                          <div className="text-white">
                            {currentBanner.title && (
                              <h3 className="font-bold text-lg mb-1 drop-shadow-lg">
                                {currentBanner.title}
                              </h3>
                            )}
                            {currentBanner.description && (
                              <p className="text-sm text-white/95 drop-shadow-md">
                                {currentBanner.description}
                              </p>
                            )}
                            {currentBanner.show_click_text && (
                              <p className="text-xs text-white/80 mt-1 drop-shadow-md">
                                클릭하여 자세히 보기
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
                {adImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setAdIndex((prev) => (prev - 1 + adImages.length) % adImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/40 text-white flex items-center justify-center z-10"
                      aria-label="이전"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setAdIndex((prev) => (prev + 1) % adImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/40 text-white flex items-center justify-center z-10"
                      aria-label="다음"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 z-10">
                      {adImages.map((_, i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${i === adIndex ? 'bg-[#fb8678]' : 'bg-white/70'}`}></span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  // FCM 초기화는 로그인 후에만 실행되도록 변경됨
  // (PhoneLogin, AuthCallback에서 로그인 성공 시 호출)

  // StatusBar 초기화 - Capacitor 플러그인으로 Safe Area 처리
  useEffect(() => {
    const initStatusBar = async () => {
      try {
        // Capacitor 플랫폼 확인
        const { Capacitor } = await import('@capacitor/core')
        
        if (Capacitor.isNativePlatform()) {
          // StatusBar가 사용 가능한지 확인
          if (StatusBar) {
            // StatusBar가 WebView를 밀어내도록 설정 (overlay: false)
            // 이렇게 하면 StatusBar 배경이 불투명하게 보입니다
            await StatusBar.setOverlaysWebView({ overlay: false })
            // StatusBar 스타일 설정
            await StatusBar.setStyle({ style: Style.Light })
            // StatusBar 배경색 설정
            await StatusBar.setBackgroundColor({ color: '#ffffff' })
            console.log('✅ StatusBar 플러그인 초기화 완료 (overlay: false)')
          }
        }
      } catch (error) {
        console.error('StatusBar 초기화 오류:', error)
      }
    }
    initStatusBar()
  }, [])

  return (
    <PageProvider>
      <LikeProvider>
        <NotificationProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {/* iOS StatusBar 배경을 위한 고정 영역 */}
            <div 
              className="fixed top-0 left-0 right-0 bg-white z-[9998]"
              style={{ height: 'env(safe-area-inset-top)' }}
            />
            <div className="App bg-white min-h-screen">
              <Routes>
                <Route path="/" element={<Splash />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/login" element={<Login />} />
                <Route path="/phone-login" element={<PhoneLogin />} />
                <Route path="/main" element={
                  <ProtectedRoute>
                    <MainContentWrapper />
                  </ProtectedRoute>
                } />
                <Route path="/community" element={
                  <ProtectedRoute>
                    <MainContentWrapper />
                  </ProtectedRoute>
                } />
                <Route path="/search" element={
                  <ProtectedRoute>
                    <MainContentWrapper />
                  </ProtectedRoute>
                } />
                <Route path="/community/post/:postId" element={
                  <ProtectedRoute>
                    <PostDetail />
                  </ProtectedRoute>
                } />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/profile/posts" element={
                  <ProtectedRoute>
                    <ProfilePosts />
                  </ProtectedRoute>
                } />
                <Route path="/profile/favorites" element={
                  <ProtectedRoute>
                    <ProfileFavorites />
                  </ProtectedRoute>
                } />
                <Route path="/post/write" element={
                  <ProtectedRoute>
                    <PostWrite />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                } />
                <Route path="/notifications/settings" element={
                  <ProtectedRoute>
                    <NotificationSettings />
                  </ProtectedRoute>
                } />
                <Route path="/kindergarten-map" element={
                  <ProtectedRoute>
                    <KindergartenMapPage />
                  </ProtectedRoute>
                } />
                <Route path="/kindergarten/:kindercode" element={
                  <ProtectedRoute>
                    <KindergartenDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="/childcare/:stcode" element={
                  <ProtectedRoute>
                    <ChildcareDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="/playground/:playgroundId" element={
                  <ProtectedRoute>
                    <PlaygroundDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="/kindergarten/:kindercode/meal-calendar" element={
                  <ProtectedRoute>
                    <MealCalendar />
                  </ProtectedRoute>
                } />
                <Route path="/childcare/:stcode/meal-calendar" element={
                  <ProtectedRoute>
                    <MealCalendar />
                  </ProtectedRoute>
                } />
                <Route path="/kindergarten/:kindercode/review" element={
                  <ProtectedRoute>
                    <WriteReviewPage />
                  </ProtectedRoute>
                } />
                <Route path="/childcare/:stcode/review" element={
                  <ProtectedRoute>
                    <WriteChildcareReviewPage />
                  </ProtectedRoute>
                } />
                <Route path="/playground/:playgroundId/review/write" element={
                  <ProtectedRoute>
                    <WritePlaygroundReviewPage />
                  </ProtectedRoute>
                } />
                <Route path="/playground/:playgroundId/review/photos" element={
                  <ProtectedRoute>
                    <PlaygroundReviewPhotosPage />
                  </ProtectedRoute>
                } />
                <Route path="/application" element={
                  <ProtectedRoute>
                    <MainContentWrapper />
                  </ProtectedRoute>
                } />
                <Route path="/childcare-apply" element={
                  <ProtectedRoute>
                    <ChildcareApplication />
                  </ProtectedRoute>
                } />
                <Route path="/contact" element={
                  <ProtectedRoute>
                    <ContactPage />
                  </ProtectedRoute>
                } />
                <Route path="/contact/list" element={
                  <ProtectedRoute>
                    <ContactListPage />
                  </ProtectedRoute>
                } />
                <Route path="/contact/:contactId" element={
                  <ProtectedRoute>
                    <ContactDetailPage />
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </Router>
        </NotificationProvider>
      </LikeProvider>
    </PageProvider>
  )
}

export default App
