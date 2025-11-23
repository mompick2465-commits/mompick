import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { getUnreadNotificationCount } from '../utils/notifications'

interface NotificationContextType {
  unreadCount: number
  setUnreadCount: (count: number) => void
  refreshUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [hasInitialized, setHasInitialized] = useState<boolean>(false)

  // 현재 사용자 정보 가져오기
  const getCurrentUser = async () => {
    if (isLoading) {
      console.log('🔍 NotificationContext - 이미 로딩 중이므로 중복 호출 방지')
      return
    }

    setIsLoading(true)
    
    try {
      console.log('🔍 NotificationContext - 사용자 정보 조회 시작')
      
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔍 NotificationContext - auth user:', user?.id)
      
      if (user) {
        // OAuth 사용자인 경우
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        
        console.log('🔍 NotificationContext - OAuth profile:', profileData)
        console.log('🔍 NotificationContext - OAuth profile error:', profileError)
        
        if (profileError) {
          console.error('🔍 NotificationContext - 프로필 조회 오류:', profileError)
          // RLS 정책 오류인 경우 무시하고 계속 진행
          if (profileError.code === 'PGRST301' || 
              profileError.message?.includes('406') || 
              profileError.message?.includes('Not Acceptable')) {
            console.log('🔍 NotificationContext - RLS 정책 오류 무시')
          }
        } else if (profileData) {
          console.log('🔍 NotificationContext - 설정할 currentUser:', profileData)
          setCurrentUser(profileData)
        }
      } else {
        // 전화번호 가입 사용자인 경우
        const isLoggedIn = localStorage.getItem('isLoggedIn')
        const userProfile = localStorage.getItem('userProfile')
        
        console.log('🔍 NotificationContext - 전화번호 가입 사용자 확인:', { isLoggedIn, userProfile: userProfile ? '있음' : '없음' })
        
        if (isLoggedIn === 'true' && userProfile) {
          const profile = JSON.parse(userProfile)
          console.log('🔍 NotificationContext - localStorage profile:', profile)
          console.log('🔍 NotificationContext - 설정할 currentUser (전화번호):', profile)
          setCurrentUser(profile)
        } else {
          // 로그인되지 않은 경우 currentUser를 null로 설정
          console.log('🔍 NotificationContext - 로그인되지 않음, currentUser를 null로 설정')
          setCurrentUser(null)
        }
      }
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error)
      setCurrentUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // 초기 사용자 정보 로드 (한 번만 실행)
  useEffect(() => {
    if (!hasInitialized) {
      getCurrentUser()
      setHasInitialized(true)
    }
  }, [hasInitialized])

  // Supabase 인증 상태 변경 감지 (SIGNED_OUT만 처리)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔍 NotificationContext - 인증 상태 변경:', event, session?.user?.id)
      
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setUnreadCount(0)
        setHasInitialized(false) // 재초기화 허용
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 알림 개수 새로고침
  const refreshUnreadCount = async () => {
    if (!currentUser) {
      console.log('🔍 refreshUnreadCount - currentUser가 없음')
      return
    }

    try {
      // profiles 테이블의 id를 사용해야 함 (notifications.to_user_id가 profiles.id를 참조)
      const userId = currentUser.id
      console.log('🔍 알림 개수 조회 - currentUser:', currentUser)
      console.log('🔍 알림 개수 조회 - 사용자 ID:', userId)
      const count = await getUnreadNotificationCount(userId)
      console.log('🔍 알림 개수 조회 결과:', count)
      setUnreadCount(count)
    } catch (error) {
      console.error('알림 개수 조회 오류:', error)
    }
  }

  // 초기 알림 개수 로드 및 주기적 업데이트
  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0)
      return
    }

    // 즉시 알림 개수 조회
    refreshUnreadCount()

    // 30초마다 알림 개수 업데이트
    const interval = setInterval(() => {
      if (currentUser) {
        refreshUnreadCount()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [currentUser?.id]) // currentUser.id만 의존성으로 설정

  // Supabase 실시간 구독 설정
  useEffect(() => {
    if (!currentUser?.id) return

    const userId = currentUser.id

    console.log('🔔 실시간 구독 설정 - 사용자 ID:', userId)

    // notifications 테이블 변경 감지
    const subscription = supabase
      .channel(`notifications_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `to_user_id=eq.${userId}`
        },
        () => {
          console.log('🔔 알림 변경 감지! 개수 새로고침 실행')
          // 알림 변경 시 개수 새로고침
          refreshUnreadCount()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentUser?.id]) // currentUser.id만 의존성으로 설정

  const value: NotificationContextType = {
    unreadCount,
    setUnreadCount,
    refreshUnreadCount
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
