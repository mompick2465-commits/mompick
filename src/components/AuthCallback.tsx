import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2, Heart } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

// 전역 플래그로 중복 실행 방지 (컴포넌트 인스턴스 간 공유)
let globalIsProcessing = false
let globalProcessedUrl: string | null = null

const AuthCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  
  // 중복 실행 방지를 위한 ref (컴포넌트 인스턴스별)
  const isProcessing = useRef(false)

  useEffect(() => {
    let isMounted = true
    let navigationTimeout: NodeJS.Timeout | null = null

    const handleAuthCallback = async () => {
      // 현재 URL을 고유 식별자로 사용
      const currentUrl = window.location.href
      
      // 전역 플래그로 중복 실행 방지
      if (globalIsProcessing) {
        console.log('⚠️ OAuth 콜백 전역 처리 중, 중복 실행 방지')
        return
      }
      
      // 이미 처리된 URL이면 중복 실행 방지
      if (globalProcessedUrl === currentUrl) {
        console.log('⚠️ 이미 처리된 URL, 중복 실행 방지:', currentUrl)
        return
      }
      
      // 컴포넌트 인스턴스별 중복 실행 방지
      if (isProcessing.current) {
        console.log('⚠️ OAuth 콜백 처리 중 (인스턴스별), 중복 실행 방지')
        return
      }

      globalIsProcessing = true
      globalProcessedUrl = currentUrl
      isProcessing.current = true

      try {
        console.log('OAuth 콜백 처리 시작')
        
        // URL 파라미터 확인
        const urlParams = new URLSearchParams(window.location.search)
        console.log('URL 파라미터:', Object.fromEntries(urlParams))
        
        // URL 해시 확인 (OAuth 응답이 해시에 있을 수 있음)
        // 웹 환경에서 해시가 이미 제거되었는지 확인 (중복 처리 방지)
        const { Capacitor } = await import('@capacitor/core')
        const isWeb = Capacitor.getPlatform() === 'web' || !Capacitor.isNativePlatform()
        
        if (window.location.hash) {
          console.log('URL 해시:', window.location.hash)
          
          // 해시에서 파라미터 추출
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const error = hashParams.get('error')
          const errorDescription = hashParams.get('error_description')
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          // 웹 환경에서 해시가 이미 처리되었는지 확인 (전역 플래그로 확인)
          if (isWeb && accessToken && refreshToken) {
            // 해시를 기반으로 한 고유 식별자 생성
            const hashIdentifier = `${accessToken.substring(0, 20)}...${refreshToken.substring(0, 10)}`
            if ((window as any).__processedOAuthHash === hashIdentifier) {
              console.log('⚠️ 이미 처리된 OAuth 해시, 중복 실행 방지')
              globalIsProcessing = false
              globalProcessedUrl = null
              isProcessing.current = false
              return
            }
            // 처리된 해시로 기록
            ;(window as any).__processedOAuthHash = hashIdentifier
          }
          
          // 해시에 토큰이 있는 경우 (Supabase가 Site URL로 리다이렉트한 경우)
          if (accessToken && refreshToken) {
            console.log('🔍 해시에서 토큰 발견, 세션 설정 시도')
            
            try {
              // Supabase에 세션 설정
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              
              if (sessionError) {
                console.error('세션 설정 오류:', sessionError)
                throw sessionError
              }
              
              if (sessionData.session) {
                console.log('✅ 해시에서 토큰으로 세션 설정 성공')
                
                // 웹 환경에서 해시 제거 (중복 처리 방지)
                // hashchange 이벤트가 발생하지 않도록 history.replaceState 사용
                if (isWeb && window.location.hash) {
                  // 해시를 제거하되 hashchange 이벤트를 발생시키지 않도록 history.replaceState 사용
                  const urlWithoutHash = window.location.pathname + window.location.search
                  window.history.replaceState(null, '', urlWithoutHash)
                  console.log('✅ 웹: 해시 제거 완료 (중복 처리 방지)')
                }
                
                // 세션 확인으로 넘어감 (아래 코드 계속 실행)
              }
            } catch (tokenError) {
              console.error('토큰으로 세션 설정 실패:', tokenError)
              // 에러가 있어도 계속 진행 (아래 세션 확인 코드 실행)
            }
          }
          
          if (error) {
            console.error('OAuth 에러 발생:', error, errorDescription)
            
            // 에러 타입별 메시지 설정
            let errorMessage = 'OAuth 인증 중 오류가 발생했습니다.'
            let errorCode = 'oauth_error'
            
            if (error === 'server_error') {
              if (errorDescription?.includes('exchange external code') || errorDescription?.includes('Unable to exchange')) {
                // Apple OAuth 설정 문제
                errorMessage = '애플 로그인 설정 오류입니다.'
                errorCode = 'apple_config_error'
              } else if (errorDescription?.includes('email')) {
                errorMessage = '이메일 정보를 가져올 수 없습니다. 카카오톡 설정을 확인해주세요.'
              } else {
                errorMessage = `서버 오류가 발생했습니다: ${errorDescription || error}`
              }
            } else if (error === 'access_denied') {
              errorMessage = '로그인이 취소되었습니다.'
              errorCode = 'access_denied'
            } else if (error === 'invalid_request') {
              // invalid_request 에러는 해시에 토큰이 있으면 무시할 수 있음
              if (!accessToken) {
                errorMessage = '잘못된 요청입니다. 다시 시도해주세요.'
              } else {
                // 토큰이 있으면 에러를 무시하고 계속 진행
                console.log('⚠️ invalid_request 에러이지만 토큰이 있어 계속 진행')
              }
            }
            
            // 토큰이 없고 에러가 있는 경우에만 에러 처리
            if (error && !accessToken) {
              console.log('⚠️ OAuth 에러 발생 - 로그인 페이지로 리다이렉트')
              
              // 플래그 먼저 리셋
              globalIsProcessing = false
              globalProcessedUrl = null
              isProcessing.current = false
              
              setStatus('error')
              setMessage(errorMessage)
              
              // 짧은 딜레이 후 네비게이션 (에러 메시지를 보여주기 위해)
              setTimeout(() => {
                console.log('✅ 로그인 페이지로 네비게이션 시작')
                navigate(`/signup?step=auth-method&error=${errorCode}`)
              }, 2000)
              
              return
            }
            
            // 토큰이 있으면 에러를 무시하고 계속 진행
            if (accessToken) {
              console.log('💡 해시에 토큰이 있어 에러를 무시하고 계속 진행')
            }
          }
        }
        
        // 세션 확인
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('세션 확인 오류:', error)
          throw error
        }

        console.log('세션 데이터:', data)

        if (data.session) {
          // OAuth 인증 성공
          console.log('OAuth 인증 성공:', data.session.user)
          
          // 사용자 프로필 완성 여부 확인 (profiles 테이블에서 확인)
          const user = data.session.user
          
          // profiles 테이블에서 사용자 프로필 존재 여부 확인
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('auth_user_id')
            .eq('auth_user_id', user.id)
            .maybeSingle()
          
          let hasProfile = false
          if (profileError) {
            console.error('프로필 조회 오류:', profileError)
            // 네트워크 오류인 경우 재시도하지 않고 에러로 처리
            if (profileError.message?.includes('Load failed') || profileError.message?.includes('TypeError')) {
              console.log('⚠️ 네트워크 오류로 프로필 조회 실패, 잠시 후 재시도')
              // 네트워크 오류는 잠시 후 재시도
              setTimeout(() => {
                if (isMounted && !globalIsProcessing) {
                  globalIsProcessing = false
                  globalProcessedUrl = null
                  isProcessing.current = false
                  handleAuthCallback()
                }
              }, 2000)
              return
            }
            // 에러가 발생해도 프로필이 없는 것으로 간주
          } else {
            hasProfile = profileData && profileData.auth_user_id ? true : false
            console.log('프로필 존재 여부:', hasProfile, {
              profileData,
              hasAuthUserId: profileData?.auth_user_id,
              userId: user.id
            })
          }
          
          // 프로필이 없어도 세션이 있으면 계속 진행 (신규 사용자 처리)
          if (!hasProfile) {
            console.log('⚠️ 프로필이 없음 - 신규 사용자로 처리')
          }
          
          // OAuth 제공자 정보 확인 (여러 방법으로 시도)
          let provider = user.app_metadata?.provider
          if (!provider) {
            // user_metadata에서 provider 정보 확인
            provider = user.user_metadata?.provider
          }
          if (!provider) {
            // identities 배열에서 provider 정보 확인
            const identities = user.app_metadata?.identities
            if (identities && identities.length > 0) {
              provider = identities[0]?.provider
            }
          }
          
          // 디버깅을 위한 로그 출력
          console.log('사용자 정보:', {
            app_metadata: user.app_metadata,
            user_metadata: user.user_metadata,
            provider: provider
          })
          
          console.log('프로필 존재 여부 확인:', {
            hasProfile,
            profileData,
            userId: user.id
          })
          
          if (hasProfile) {
            console.log('✅ 프로필이 존재함 - 메인 페이지로 이동')
            // 프로필이 이미 완성된 경우 FCM 초기화 후 메인 페이지로
            
            // 이미 메인 페이지에 있으면 바로 리턴
            if (window.location.pathname === '/main') {
              console.log('⚠️ 이미 메인 페이지에 있음, 리다이렉트 생략')
              globalIsProcessing = false
              globalProcessedUrl = null
              isProcessing.current = false
              return
            }
            
            console.log('✅ 상태를 success로 변경하고 메인 페이지로 이동')
            
            // 플래그 먼저 리셋 (네비게이션 전에 리셋하여 다음 처리 가능하도록)
            globalIsProcessing = false
            globalProcessedUrl = null
            isProcessing.current = false
            
            // FCM 초기화 (비동기이지만 await하지 않고 바로 진행)
            const fcmInitPromise = (async () => {
              try {
                const { initializeFCM } = await import('../utils/fcm')
                await initializeFCM()
              } catch (fcmError) {
                console.error('FCM 초기화 오류:', fcmError)
                // FCM 초기화 실패해도 계속 진행
              }
            })()
            
            // 상태 변경과 네비게이션을 즉시 실행
            setStatus('success')
            setMessage('로그인되었습니다!')
            
            // 짧은 딜레이 후 네비게이션 (UI 업데이트를 위해)
            // isMounted 체크 제거 - 컴포넌트가 언마운트되어도 네비게이션은 실행되어야 함
            navigationTimeout = setTimeout(() => {
              console.log('✅ 메인 페이지로 네비게이션 시작')
              navigate('/main')
              // FCM 초기화 완료 대기 (선택적)
              fcmInitPromise.catch(() => {})
            }, 1500)
          } else {
            // 프로필이 완성되지 않은 경우 약관 동의 단계로 (신규 사용자)
            console.log('⚠️ 프로필이 없음 - 약관 동의 페이지로 이동')
            let providerName = '소셜'
            if (provider === 'kakao') providerName = '카카오톡'
            else if (provider === 'google') providerName = '구글'
            else if (provider === 'apple') providerName = '애플'
            
            // 플래그 먼저 리셋
            globalIsProcessing = false
            globalProcessedUrl = null
            isProcessing.current = false
            
            setStatus('success')
            setMessage(`${providerName} 계정 연동되었습니다! 약관에 동의해주세요.`)
            
            navigationTimeout = setTimeout(() => {
              // isMounted 체크 제거 - 컴포넌트가 언마운트되어도 네비게이션은 실행되어야 함
              console.log('✅ 약관 동의 페이지로 네비게이션 시작')
              navigate('/signup?step=terms&oauth=success')
            }, 1500)
          }
        } else {
          // 세션이 없음 - 인증 실패
          console.log('세션이 없음 - 인증 실패')
          if (isMounted) {
            setStatus('error')
            setMessage('인증에 실패했습니다.')
            
            setTimeout(() => {
              if (isMounted) {
                globalIsProcessing = false
                globalProcessedUrl = null
                isProcessing.current = false
                navigate('/signup?step=auth-method&error=auth_failed')
              }
            }, 2000)
          } else {
            globalIsProcessing = false
            globalProcessedUrl = null
            isProcessing.current = false
          }
        }
      } catch (error: any) {
        console.error('OAuth 콜백 처리 오류:', error)
        if (isMounted) {
          setStatus('error')
          setMessage('인증 처리 중 오류가 발생했습니다.')
          
          setTimeout(() => {
            if (isMounted) {
              globalIsProcessing = false
              globalProcessedUrl = null
              isProcessing.current = false
              navigate('/signup?step=auth-method&error=callback_error')
            }
          }, 2000)
        } else {
          globalIsProcessing = false
          globalProcessedUrl = null
          isProcessing.current = false
        }
      } finally {
        // 처리 완료 후 플래그는 각 분기에서 리셋하므로 여기서는 리셋하지 않음
        // 네비게이션이 완료된 후에만 리셋하도록 변경
      }
    }

    handleAuthCallback()

    // Cleanup function
    return () => {
      isMounted = false
      // 네비게이션 타임아웃이 있으면 정리하지 않음 (네비게이션이 실행되어야 함)
      // 컴포넌트 언마운트 시에도 전역 플래그는 유지 (다른 인스턴스가 처리 중일 수 있음)
      // 대신 짧은 시간 후 리셋
      if (!navigationTimeout) {
        setTimeout(() => {
          isProcessing.current = false
        }, 2000)
      }
    }
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/30 to-pink-50/30 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md w-full"
      >
        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 to-pink-400/30 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center shadow-lg">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              인증 처리 중...
            </h2>
            <p className="text-gray-600 text-base">
              잠시만 기다려주세요
            </p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="text-center"
          >
            <div className="relative inline-block mb-8">
              {/* 원형 배경 그라데이션 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#fb8678] to-[#e67567] rounded-full blur-xl opacity-30 animate-pulse"></div>
              
              {/* 하트 컨테이너 */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* 빈 하트 (배경) */}
                <Heart className="absolute w-24 h-24 text-gray-300" strokeWidth={2} fill="none" />
                
                {/* 채워지는 하트 - 클리핑으로 구현 */}
                <div className="absolute w-24 h-24 overflow-hidden">
                  <motion.div
                    className="w-full h-full flex items-center justify-center"
                    initial={{ clipPath: 'inset(100% 0 0 0)' }}
                    animate={{ clipPath: 'inset(0% 0 0 0)' }}
                    transition={{ 
                      duration: 1.2,
                      ease: [0.4, 0, 0.2, 1],
                      delay: 0.2
                    }}
                  >
                    <Heart className="w-24 h-24 text-[#fb8678] fill-[#fb8678]" strokeWidth={2} />
                  </motion.div>
                </div>
                
                {/* 게이지 바 (하트 아래) */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-40 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#fb8678] to-[#e67567] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ 
                      duration: 1.2,
                      ease: [0.4, 0, 0.2, 1],
                      delay: 0.2
                    }}
                  />
                </div>
              </div>
              
              {/* 펄스 효과 */}
              <motion.div
                className="absolute inset-0 bg-[#fb8678] rounded-full opacity-20"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0, 0.2]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.5
                }}
              />
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="text-center"
          >
            <div className="relative inline-block mb-8">
              {/* 원형 배경 그라데이션 */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
              
              {/* 하트 컨테이너 */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* 빈 하트 (배경) */}
                <Heart className="absolute w-24 h-24 text-gray-300" strokeWidth={2} fill="none" />
                
                {/* 빨간 하트가 흰색으로 변하는 애니메이션 - 클리핑으로 구현 */}
                <div className="absolute w-24 h-24 overflow-hidden">
                  <motion.div
                    className="w-full h-full flex items-center justify-center"
                    initial={{ clipPath: 'inset(0% 0 0 0)' }}
                    animate={{ clipPath: 'inset(100% 0 0 0)' }}
                    transition={{ 
                      duration: 1.2,
                      ease: [0.4, 0, 0.2, 1],
                      delay: 0.2
                    }}
                  >
                    <Heart className="w-24 h-24 text-red-500 fill-red-500" strokeWidth={2} />
                  </motion.div>
                </div>
                
                {/* 실패 바 (하트 아래) - 풀로 차있다가 빠지는 애니메이션 */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-40 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ 
                      duration: 1.2,
                      ease: [0.4, 0, 0.2, 1],
                      delay: 0.2
                    }}
                  />
                </div>
              </div>
              
              {/* 펄스 효과 */}
              <motion.div
                className="absolute inset-0 bg-red-500 rounded-full opacity-20"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0, 0.2]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.5
                }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default AuthCallback
