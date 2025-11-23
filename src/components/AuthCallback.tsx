import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  
  // 중복 실행 방지를 위한 ref
  const isProcessing = useRef(false)

  useEffect(() => {
    let isMounted = true

    const handleAuthCallback = async () => {
      // 중복 실행 방지
      if (isProcessing.current) {
        console.log('OAuth 콜백 처리 중, 중복 실행 방지')
        return
      }

      isProcessing.current = true

      try {
        console.log('OAuth 콜백 처리 시작')
        
        // URL 파라미터 확인
        const urlParams = new URLSearchParams(window.location.search)
        console.log('URL 파라미터:', Object.fromEntries(urlParams))
        
        // URL 해시 확인 (OAuth 응답이 해시에 있을 수 있음)
        if (window.location.hash) {
          console.log('URL 해시:', window.location.hash)
          
          // 해시에서 에러 정보 추출
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const error = hashParams.get('error')
          const errorDescription = hashParams.get('error_description')
          
          if (error) {
            console.error('OAuth 에러 발생:', error, errorDescription)
            
            if (error === 'server_error' && errorDescription?.includes('email')) {
              if (isMounted) {
                setStatus('error')
                setMessage('이메일 정보를 가져올 수 없습니다. 카카오톡 설정을 확인해주세요.')
              }
            } else {
              if (isMounted) {
                setStatus('error')
                setMessage('OAuth 인증 중 오류가 발생했습니다.')
              }
            }
            
            if (isMounted) {
              setTimeout(() => {
                navigate('/signup?step=auth-method&error=oauth_error')
              }, 2000)
            }
            return
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
            // 에러가 발생해도 프로필이 없는 것으로 간주
          } else {
            hasProfile = profileData && profileData.auth_user_id ? true : false
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
          
          if (hasProfile) {
            // 프로필이 이미 완성된 경우 FCM 초기화 후 메인 페이지로
            if (isMounted) {
              setStatus('success')
              setMessage('로그인되었습니다!')
              
              // FCM 초기화
              const { initializeFCM } = await import('../utils/fcm')
              await initializeFCM()
              
              setTimeout(() => {
                if (isMounted) {
                  navigate('/main')
                }
              }, 1500)
            }
          } else {
            // 프로필이 완성되지 않은 경우 프로필 입력 단계로
            let providerName = '소셜'
            if (provider === 'kakao') providerName = '카카오톡'
            else if (provider === 'google') providerName = '구글'
            else if (provider === 'apple') providerName = '애플'
            
            if (isMounted) {
              setStatus('success')
              setMessage(`${providerName} 계정 연동되었습니다! 프로필을 완성해주세요.`)
              
              setTimeout(() => {
                if (isMounted) {
                  navigate('/signup?step=type&oauth=success')
                }
              }, 1500)
            }
          }
        } else {
          // 세션이 없음 - 인증 실패
          console.log('세션이 없음 - 인증 실패')
          if (isMounted) {
            setStatus('error')
            setMessage('인증에 실패했습니다.')
            
            setTimeout(() => {
              if (isMounted) {
                navigate('/signup?step=auth-method&error=auth_failed')
              }
            }, 2000)
          }
        }
      } catch (error: any) {
        console.error('OAuth 콜백 처리 오류:', error)
        if (isMounted) {
          setStatus('error')
          setMessage('인증 처리 중 오류가 발생했습니다.')
          
          setTimeout(() => {
            if (isMounted) {
              navigate('/signup?step=auth-method&error=callback_error')
            }
          }, 2000)
        }
      } finally {
        isProcessing.current = false
      }
    }

    handleAuthCallback()

    // Cleanup function
    return () => {
      isMounted = false
      isProcessing.current = false
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              인증 처리 중...
            </h2>
            <p className="text-gray-600">
              잠시만 기다려주세요
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-[#fb8678] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {message.includes('로그인되었습니다') ? '로그인 완료!' : '계정 연동 완료!'}
            </h2>
            <p className="text-gray-600">
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              인증 실패
            </h2>
            <p className="text-gray-600">
              {message}
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}

export default AuthCallback
