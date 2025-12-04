import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, MessageCircle, CheckCircle, Loader2, Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'

// 전화번호를 E.164 형식으로 변환하는 함수
const convertToE164 = (phoneNumber: string) => {
  // 하이픈 제거하고 숫자만 추출
  const numbers = phoneNumber.replace(/[^0-9]/g, '')
  
  // 한국 전화번호인 경우 (+82)
  if (numbers.length === 11 && numbers.startsWith('010')) {
    // 010 제거하고 +82 추가
    return `+82${numbers.slice(1)}`
  }
  
  // 이미 +로 시작하는 경우 그대로 반환
  if (phoneNumber.startsWith('+')) {
    return phoneNumber
  }
  
  // 기본적으로 한국 전화번호로 가정하고 +82 추가
  return `+82${numbers}`
}

// 전화번호 포맷팅 함수
const formatPhoneNumber = (value: string) => {
  // 숫자만 추출
  const numbers = value.replace(/[^0-9]/g, '')
  
  // 빈 문자열이면 빈 문자열 반환
  if (numbers.length === 0) {
    return ''
  }
  
  // 11자리 이하일 때만 포맷팅
  if (numbers.length <= 11) {
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
  }
  
  // 11자리 초과 시 11자리까지만
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
}

const PhoneLogin = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  
  // 전화번호 인증 관련 상태
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify' | 'success'>('input')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [canResend, setCanResend] = useState(false)

  // 카운트다운 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    if (phoneStep === 'verify' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [phoneStep, countdown])

  // 전화번호 입력 핸들러
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatPhoneNumber(value)
    setPhoneNumber(formatted)
    
    // 전화번호가 변경되면 상태 초기화
    setError('')
    setInfo('')
  }

  // 인증번호 발송
  const handleSendVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('올바른 전화번호를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')
    setInfo('')

    try {
      const e164Phone = convertToE164(phoneNumber)
      console.log('OTP 발송 시도:', e164Phone)
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: e164Phone
      })

      if (error) {
        // 전화번호가 등록되지 않은 경우
        if (error.message.includes('User not found') || error.message.includes('not found')) {
          setInfo('해당 전화번호로 가입된 계정이 없습니다. 회원가입을 먼저 진행해주세요.')
          setLoading(false)
          return
        }
        throw error
      }

      // OTP 발송 성공
      setPhoneStep('verify')
      setCountdown(180) // 3분 타이머
      setCanResend(false)
      setError('')
      setInfo('')
    } catch (error: any) {
      console.error('OTP 발송 오류:', error)
      
      // 더 구체적인 에러 메시지 표시
      if (error.message === 'Unsupported phone provider') {
        setError('SMS 인증 서비스가 설정되지 않았습니다. 관리자에게 문의해주세요.')
      } else if (error.message === 'Invalid phone number format (E.164 required)') {
        setError('전화번호 형식이 올바르지 않습니다. 010으로 시작하는 11자리 번호를 입력해주세요.')
      } else if (error.message?.includes('phone')) {
        setError('전화번호 형식이 올바르지 않습니다. 다시 확인해주세요.')
      } else {
        setError(`인증번호 발송에 실패했습니다: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // 인증번호 확인 및 로그인
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode || verificationCode.length !== 6) {
      setError('6자리 인증번호를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const e164Phone = convertToE164(phoneNumber)
      console.log('OTP 확인 시도:', e164Phone)
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: e164Phone,
        token: verificationCode,
        type: 'sms'
      })

      if (error) throw error

      // 로그인 성공 후 profiles 테이블에서 프로필 존재 여부 확인
      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('auth_user_id')
          .eq('auth_user_id', data.user.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('프로필 조회 오류:', profileError)
          // 에러가 발생해도 프로필이 없는 것으로 간주하여 회원가입으로 이동
          navigate('/signup?step=profile&phone=success')
          return
        }
        
        if (profileData && profileData.auth_user_id) {
          // 프로필이 존재하는 경우 성공 화면 표시 후 메인 페이지로 이동
          setPhoneStep('success')
          
          // FCM 초기화
          const { initializeFCM } = await import('../utils/fcm')
          await initializeFCM()
          
          // 2.5초 후 메인 페이지로 이동
          setTimeout(() => {
            navigate('/main')
          }, 2500)
        } else {
          // 프로필이 존재하지 않는 경우 약관 동의 페이지로 이동 (신규 사용자)
          navigate('/signup?step=terms&phone=success')
        }
      } else {
        // 사용자 정보가 없는 경우 에러
        setError('사용자 정보를 가져올 수 없습니다.')
      }
    } catch (error: any) {
      console.error('OTP 확인 오류:', error)
      
      // 더 구체적인 에러 메시지 표시
      if (error.message === 'Token has expired or is invalid') {
        setError('인증번호가 만료되었거나 올바르지 않습니다. 새로운 인증번호를 받아주세요.')
      } else if (error.message?.includes('expired')) {
        setError('인증번호가 만료되었습니다. 새로운 인증번호를 받아주세요.')
      } else if (error.message?.includes('invalid')) {
        setError('인증번호가 올바르지 않습니다. 정확히 입력해주세요.')
      } else {
        setError(`인증번호 확인에 실패했습니다: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // 인증번호 재발송
  const handleResendCode = async () => {
    if (!canResend) return

    setLoading(true)
    setError('')

    try {
      const e164Phone = convertToE164(phoneNumber)
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: e164Phone
      })

      if (error) throw error

      setCountdown(180) // 3분 타이머
      setCanResend(false)
      setError('')
    } catch (error: any) {
      console.error('OTP 재발송 오류:', error)
      setError(error.message || '인증번호 재발송에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 전화번호 입력 단계로 돌아가기
  const handleBackToPhone = () => {
    setPhoneStep('input')
    setVerificationCode('')
    setError('')
    setInfo('')
    setCountdown(0)
    setCanResend(false)
  }

  // 뒤로가기
  const handleBack = () => {
    navigate('/login')
  }

  // 로그인 성공 화면 표시
  if (phoneStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/30 to-pink-50/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center max-w-md w-full"
        >
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
            
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="text-2xl font-bold text-gray-900"
            >
              로그인 완료!
            </motion.h2>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div 
      className="h-screen bg-white overflow-hidden"
    >
      <div className="container mx-auto px-4 py-8 h-full overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-transparent transition-colors hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-600"><path d="m15 18-6-6 6-6"></path></svg>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-900">전화번호 로그인</h1>
          </div>
          <div className="w-10"></div>
        </div>

        {/* 메인 컨텐츠 */}
        <div
          key={phoneStep}
          className="max-w-md mx-auto"
        >
          {/* 전화번호 입력 폼 */}
          {phoneStep === 'input' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-6"
            >
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-sm text-gray-600 font-medium">
                  전화번호를 입력해주세요
                </p>
              </motion.div>

              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="relative"
                >
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="010-0000-0000"
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fb8678] focus:border-[#fb8678]"
                    required
                  />
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  onClick={handleSendVerificationCode}
                  disabled={loading || !phoneNumber}
                  className="w-full bg-[#fb8678] text-white py-4 rounded-xl font-semibold hover:bg-[#e67567] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '인증번호 발송 중...' : '인증번호 받기'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* 인증번호 확인 폼 */}
          {phoneStep === 'verify' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-6"
            >
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-gray-600 text-sm font-medium">
                  6자리 인증번호를 입력해주세요
                </p>
                {/* 카운트다운 표시 */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="mt-2 text-sm text-gray-500"
                >
                  {countdown > 0 ? (
                    <span>인증번호 만료까지 {countdown}초 남았습니다</span>
                  ) : (
                    <span className="text-red-500">인증번호가 만료되었습니다</span>
                  )}
                </motion.div>
              </motion.div>

              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="relative"
                >
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fb8678] focus:border-[#fb8678] text-center tracking-widest"
                    required
                  />
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  onClick={handleVerificationSubmit}
                  disabled={loading || !verificationCode}
                  className="w-full bg-[#fb8678] text-white py-4 rounded-xl font-semibold hover:bg-[#e67567] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '로그인 중...' : '로그인'}
                </motion.button>

                {/* 인증번호 재전송 버튼 */}
                {canResend && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    onClick={handleResendCode}
                    disabled={loading}
                    className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '재전송 중...' : '인증번호 재전송'}
                  </motion.button>
                )}

                {/* 전화번호 변경 버튼 */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.5 }}
                  type="button"
                  onClick={handleBackToPhone}
                  className="w-full text-[#fb8678] text-sm hover:underline py-2"
                >
                  전화번호 변경
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

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

        {/* 정보 메시지 */}
        {info && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mt-4 p-3 bg-[#fef2f2] border border-[#fb8678] rounded-xl text-[#fb8678] text-sm text-center"
          >
            {info}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default PhoneLogin
