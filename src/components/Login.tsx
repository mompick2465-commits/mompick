import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'

const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const oauthTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 전화번호 로그인 페이지로 이동
  const handlePhoneLoginClick = () => {
    navigate('/phone-login')
  }

  const handleKakaoLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { Capacitor } = await import('@capacitor/core')
      const isWeb = Capacitor.getPlatform() === 'web' || !Capacitor.isNativePlatform()
      
      // 웹과 앱 모두 redirectTo를 명시적으로 설정
      const options: any = {}
      if (isWeb) {
        // 웹 환경: 현재 웹사이트의 /auth/callback으로 리다이렉트
        options.redirectTo = `${window.location.origin}/auth/callback`
        console.log('카카오 로그인 시작 (웹), 리다이렉트 URL:', options.redirectTo)
      } else {
        // 앱 환경: 딥링크 사용
        const { getOAuthRedirectUrl } = await import('../utils/oauthRedirect')
        options.redirectTo = getOAuthRedirectUrl()
        console.log('카카오 로그인 시작 (앱), 리다이렉트 URL:', options.redirectTo)
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options
      })

      if (error) {
        console.error('카카오 OAuth 오류:', error)
        throw error
      }
    } catch (error: any) {
      console.error('카카오 로그인 오류:', error)
      setError(`카카오 로그인에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { Capacitor } = await import('@capacitor/core')
      const isWeb = Capacitor.getPlatform() === 'web' || !Capacitor.isNativePlatform()
      
      // 웹과 앱 모두 redirectTo를 명시적으로 설정
      const options: any = {}
      if (isWeb) {
        // 웹 환경: 현재 웹사이트의 /auth/callback으로 리다이렉트
        options.redirectTo = `${window.location.origin}/auth/callback`
        console.log('구글 로그인 시작 (웹), 리다이렉트 URL:', options.redirectTo)
      } else {
        // 앱 환경: 딥링크 사용
        const { getOAuthRedirectUrl } = await import('../utils/oauthRedirect')
        options.redirectTo = getOAuthRedirectUrl()
        console.log('구글 로그인 시작 (앱), 리다이렉트 URL:', options.redirectTo)
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options
      })

      if (error) {
        console.error('구글 OAuth 오류:', error)
        throw error
      }
    } catch (error: any) {
      console.error('구글 로그인 오류:', error)
      setError(`구글 로그인에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
      setLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { Capacitor } = await import('@capacitor/core')
      const isWeb = Capacitor.getPlatform() === 'web' || !Capacitor.isNativePlatform()
      
      // 웹과 앱 모두 redirectTo를 명시적으로 설정
      const options: any = {}
      if (isWeb) {
        // 웹 환경: 현재 웹사이트의 /auth/callback으로 리다이렉트
        options.redirectTo = `${window.location.origin}/auth/callback`
        console.log('애플 로그인 시작 (웹), 리다이렉트 URL:', options.redirectTo)
      } else {
        // 앱 환경: 딥링크 사용
        const { getOAuthRedirectUrl } = await import('../utils/oauthRedirect')
        options.redirectTo = getOAuthRedirectUrl()
        console.log('애플 로그인 시작 (앱), 리다이렉트 URL:', options.redirectTo)
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options
      })

      if (error) {
        console.error('애플 OAuth 오류:', error)
        throw error
      }
    } catch (error: any) {
      console.error('애플 로그인 오류:', error)
      setError(`애플 로그인에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
      setLoading(false)
    }
  }

  const handleSignUpClick = () => {
    navigate('/signup')
  }

  // OAuth 취소 감지 및 상태 리셋
  useEffect(() => {
    // 페이지가 다시 포커스를 받았을 때 OAuth 상태 확인
    const handleFocus = async () => {
      // OAuth 프로세스가 진행 중이었다면 세션 확인
      if (loading) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          // 세션이 없으면 OAuth가 취소된 것으로 간주
          if (!session) {
            setLoading(false)
            if (oauthTimeoutRef.current) {
              clearTimeout(oauthTimeoutRef.current)
              oauthTimeoutRef.current = null
            }
          }
        } catch (error) {
          console.error('세션 확인 오류:', error)
          setLoading(false)
        }
      }
    }

    // visibilitychange 이벤트로 페이지가 다시 보일 때 확인
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && loading) {
        handleFocus()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (oauthTimeoutRef.current) {
        clearTimeout(oauthTimeoutRef.current)
      }
    }
  }, [loading])

  // OAuth 시작 후 일정 시간이 지나면 자동으로 리셋 (안전장치)
  useEffect(() => {
    if (loading) {
      oauthTimeoutRef.current = setTimeout(() => {
        setLoading(false)
        oauthTimeoutRef.current = null
      }, 30000) // 30초 후 자동 리셋
    }

    return () => {
      if (oauthTimeoutRef.current) {
        clearTimeout(oauthTimeoutRef.current)
        oauthTimeoutRef.current = null
      }
    }
  }, [loading])

  return (
    <motion.div 
      className="h-screen bg-white flex items-center justify-center overflow-hidden relative"
    >
      <div className="w-full max-w-md px-4 relative z-10">
        {/* 헤더 */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center mb-24"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <img 
              src="/headericon.png" 
              alt="MomPick" 
              className="w-40 h-40 object-contain drop-shadow-lg"
            />
          </motion.div>
        </motion.div>

        {/* 메인 컨텐츠 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {/* 원형 로그인 버튼들 */}
          <div className="flex items-center justify-center gap-6 mb-8">
            {/* 전화번호 로그인 */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.4, type: "spring" }}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePhoneLoginClick}
              disabled={loading}
              className="w-16 h-16 bg-gradient-to-br from-[#fb8678] to-[#e67567] rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg relative overflow-hidden"
              title="전화번호로 로그인"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
            >
              <motion.div 
                className="absolute inset-0 bg-white rounded-full"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.2 }}
                transition={{ duration: 0.2 }}
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              />
              <Phone className="w-8 h-8 text-white relative z-10" />
            </motion.button>

            {/* 카카오톡 로그인 */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4, type: "spring" }}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleKakaoLogin}
              disabled={loading}
              className="w-16 h-16 bg-gradient-to-br from-[#FEE500] to-[#FDD835] rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg relative overflow-hidden"
              title="카카오톡으로 로그인"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
            >
              <motion.div 
                className="absolute inset-0 bg-white rounded-full"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.2 }}
                transition={{ duration: 0.2 }}
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              />
              <svg className="w-9 h-9 relative z-10" viewBox="0 0 24 24" fill="#3C1E1E">
                <path d="M12.0009 3C17.7999 3 22.501 6.66445 22.501 11.1847C22.501 15.705 17.7999 19.3694 12.0009 19.3694C11.4127 19.3694 10.8361 19.331 10.2742 19.2586L5.86611 22.1419C5.36471 22.4073 5.18769 22.3778 5.39411 21.7289L6.28571 18.0513C3.40572 16.5919 1.50098 14.0619 1.50098 11.1847C1.50098 6.66445 6.20194 3 12.0009 3ZM17.908 11.0591L19.3783 9.63617C19.5656 9.45485 19.5705 9.15617 19.3893 8.96882C19.2081 8.78172 18.9094 8.77668 18.7219 8.95788L16.7937 10.8239V9.28226C16.7937 9.02172 16.5825 8.81038 16.3218 8.81038C16.0613 8.81038 15.8499 9.02172 15.8499 9.28226V11.8393C15.8321 11.9123 15.8325 11.9879 15.8499 12.0611V13.5C15.8499 13.7606 16.0613 13.9719 16.3218 13.9719C16.5825 13.9719 16.7937 13.7606 16.7937 13.5V12.1373L17.2213 11.7236L18.6491 13.7565C18.741 13.8873 18.8873 13.9573 19.0357 13.9573C19.1295 13.9573 19.2241 13.9293 19.3066 13.8714C19.5199 13.7217 19.5713 13.4273 19.4215 13.214L17.908 11.0591ZM14.9503 12.9839H13.4904V9.29702C13.4904 9.03648 13.2791 8.82514 13.0184 8.82514C12.7579 8.82514 12.5467 9.03648 12.5467 9.29702V13.4557C12.5467 13.7164 12.7579 13.9276 13.0184 13.9276H14.9503C15.211 13.9276 15.4222 13.7164 15.4222 13.4557C15.4222 13.1952 15.211 12.9839 14.9503 12.9839ZM9.09318 11.8925L9.78919 10.1849L10.4265 11.8925H9.09318ZM11.6159 12.3802C11.6161 12.3748 11.6175 12.3699 11.6175 12.3645C11.6175 12.2405 11.5687 12.1287 11.4906 12.0445L10.4452 9.24376C10.3468 8.9639 10.1005 8.77815 9.81761 8.77028C9.53948 8.76277 9.28066 8.93672 9.16453 9.21669L7.50348 13.2924C7.40519 13.5337 7.52107 13.8092 7.76242 13.9076C8.00378 14.006 8.2792 13.89 8.37749 13.6486L8.70852 12.8364H10.7787L11.077 13.6356C11.1479 13.8254 11.3278 13.9426 11.5193 13.9425C11.5741 13.9425 11.6298 13.9329 11.6842 13.9126C11.9284 13.8216 12.0524 13.5497 11.9612 13.3054L11.6159 12.3802ZM8.29446 9.30194C8.29446 9.0414 8.08312 8.83006 7.82258 8.83006H4.57822C4.31755 8.83006 4.10622 9.0414 4.10622 9.30194C4.10622 9.56249 4.31755 9.77382 4.57822 9.77382H5.73824V13.5099C5.73824 13.7705 5.94957 13.9817 6.21012 13.9817C6.47078 13.9817 6.68212 13.7705 6.68212 13.5099V9.77382H7.82258C8.08312 9.77382 8.29446 9.56249 8.29446 9.30194Z"></path>
              </svg>
            </motion.button>

            {/* 구글 로그인 */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4, type: "spring" }}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-200 shadow-lg relative overflow-hidden"
              title="구글로 로그인"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
            >
              <motion.div 
                className="absolute inset-0 bg-gray-100 rounded-full"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              />
              <svg className="w-8 h-8 relative z-10" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </motion.button>

            {/* 애플 로그인 */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.4, type: "spring" }}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAppleLogin}
              disabled={loading}
              className="w-16 h-16 bg-gradient-to-br from-black to-gray-800 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg relative overflow-hidden"
              title="애플로 로그인"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
            >
              <motion.div 
                className="absolute inset-0 bg-white rounded-full"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.1 }}
                transition={{ duration: 0.2 }}
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              />
              <svg className="w-8 h-8 relative z-10" viewBox="0 0 24 24" fill="white">
                <path d="M11.6734 7.22198C10.7974 7.22198 9.44138 6.22598 8.01338 6.26198C6.12938 6.28598 4.40138 7.35397 3.42938 9.04597C1.47338 12.442 2.92538 17.458 4.83338 20.218C5.76938 21.562 6.87338 23.074 8.33738 23.026C9.74138 22.966 10.2694 22.114 11.9734 22.114C13.6654 22.114 14.1454 23.026 15.6334 22.99C17.1454 22.966 18.1054 21.622 19.0294 20.266C20.0974 18.706 20.5414 17.194 20.5654 17.11C20.5294 17.098 17.6254 15.982 17.5894 12.622C17.5654 9.81397 19.8814 8.46998 19.9894 8.40998C18.6694 6.47798 16.6414 6.26198 15.9334 6.21398C14.0854 6.06998 12.5374 7.22198 11.6734 7.22198ZM14.7934 4.38998C15.5734 3.45398 16.0894 2.14598 15.9454 0.849976C14.8294 0.897976 13.4854 1.59398 12.6814 2.52998C11.9614 3.35798 11.3374 4.68998 11.5054 5.96198C12.7414 6.05798 14.0134 5.32598 14.7934 4.38998Z"></path>
              </svg>
            </motion.button>
          </div>

          {/* 회원가입 링크 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center mt-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-gray-500 text-sm">처음이신가요?</span>
              <button
                onClick={handleSignUpClick}
                className="text-[#fb8678] hover:text-[#e67567] transition-colors text-sm font-bold relative group"
              >
                회원가입하기
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#fb8678] group-hover:w-full transition-all duration-300"></span>
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default Login
