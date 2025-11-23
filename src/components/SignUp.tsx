import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, User, Shield, ArrowLeft } from 'lucide-react'
import { supabase, uploadProfileImage } from '../lib/supabase'

const SignUp = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<'auth-method' | 'type' | 'phone' | 'verify' | 'profile'>('auth-method')
  const [userType, setUserType] = useState<'parent' | 'teacher' | null>(null)
  const [phone, setPhone] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [isNicknameChecked, setIsNicknameChecked] = useState(false)
  const [isNicknameAvailable, setIsNicknameAvailable] = useState(false)
  const [nicknameCheckLoading, setNicknameCheckLoading] = useState(false)
  const [nicknameMessage, setNicknameMessage] = useState('')
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [children, setChildren] = useState<Array<{
    name: string
    gender: string
    birthDate: string
    relationship: string
    profileImage?: File | null
    profileImagePreview?: string
    profileImageUrl?: string
  }>>([{ name: '', gender: '', birthDate: '', relationship: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authMethod, setAuthMethod] = useState<'kakao' | 'google' | 'apple' | 'phone' | null>(null)
  
  // 중복 실행 방지를 위한 ref
  const isProcessingOAuth = useRef(false)
  
  // 교사 관련 추가 상태
  const [schoolName, setSchoolName] = useState('')
  const [subject, setSubject] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [introduction, setIntroduction] = useState('')

  // 인증번호 카운트다운 관련 상태
  const [countdown, setCountdown] = useState(180)
  const [canResend, setCanResend] = useState(false)


  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    console.log('formatPhoneNumber 입력값:', value) // 디버깅 로그
    
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '')
    console.log('숫자만 추출:', numbers) // 디버깅 로그
    
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

  // 전화번호를 E.164 형식으로 변환하는 함수
  const convertToE164 = (phoneNumber: string) => {
    console.log('convertToE164 입력값:', phoneNumber)
    
    // 이미 +로 시작하는 경우 그대로 반환
    if (phoneNumber.startsWith('+')) {
      console.log('이미 E.164 형식:', phoneNumber)
      return phoneNumber
    }
    
    // 하이픈 제거하고 숫자만 추출
    const numbers = phoneNumber.replace(/[^0-9]/g, '')
    console.log('숫자만 추출:', numbers)
    
    // 한국 전화번호인 경우 (+82)
    if (numbers.length === 11 && numbers.startsWith('010')) {
      // 010 제거하고 +82 추가
      const result = `+82${numbers.slice(1)}`
      console.log('한국 전화번호 변환 결과:', result)
      return result
    }
    
    // 기본적으로 한국 전화번호로 가정하고 +82 추가
    const result = `+82${numbers}`
    console.log('기본 변환 결과:', result)
    return result
  }

  // 전화번호 입력 핸들러
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== handlePhoneChange 호출됨 ===')
    console.log('현재 authMethod:', authMethod)
    console.log('현재 step:', step)
    
    const value = e.target.value
    console.log('전화번호 입력 값:', value) // 디버깅 로그
    
    // 포맷팅 적용
    const formatted = formatPhoneNumber(value)
    console.log('포맷팅된 전화번호:', formatted) // 디버깅 로그
    
    setPhone(formatted)
    console.log('setPhone 호출 완료')
    console.log('=== handlePhoneChange 완료 ===')
  }

  // 페이지 진입 시 애니메이션 및 초기화
  React.useEffect(() => {
    
    // 회원가입 페이지 진입 시 기존 세션 로그아웃 (세션 충돌 방지)
    // 단, OAuth 콜백이나 전화번호 인증 후에는 세션 유지
    const clearExistingSession = async () => {
      try {
        const oauthParam = searchParams.get('oauth')
        const phoneParam = searchParams.get('phone')
        
        // OAuth나 전화번호 인증 후에는 세션 유지
        if (oauthParam === 'success' || phoneParam === 'success') {
          console.log('OAuth/전화번호 인증 성공 - 세션 유지')
          return
        }
        
        // 기존 세션이 있는지 확인
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('기존 세션 발견, 로그아웃 처리')
          await supabase.auth.signOut()
          localStorage.removeItem('isLoggedIn')
          localStorage.removeItem('userProfile')
        }
      } catch (error) {
        console.error('세션 정리 오류:', error)
      }
    }
    
    clearExistingSession()
  }, [])

  // authMethod 상태 디버깅
  useEffect(() => {
    console.log('authMethod 상태 변경:', authMethod)
  }, [authMethod])

  // 인증번호 카운트다운 관리
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    if (step === 'verify' && countdown > 0) {
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
  }, [step, countdown])

  // URL 파라미터 처리
  useEffect(() => {
    let isMounted = true

    const processUrlParams = () => {
      const stepParam = searchParams.get('step')
      const oauthParam = searchParams.get('oauth')
      const phoneParam = searchParams.get('phone')
      const errorParam = searchParams.get('error')

      if (stepParam && ['auth-method', 'type', 'phone', 'verify', 'profile'].includes(stepParam)) {
        setStep(stepParam as any)
      }

      if (oauthParam === 'success') {
        // OAuth 인증 성공 시 사용자 타입 선택 단계로 (auth-method는 이미 완료됨)
        setStep('type')
        if (isMounted) {
          handleOAuthSuccess()
        }
      }

      if (phoneParam === 'success') {
        // 전화번호 로그인 성공 시 사용자 타입 선택 단계로
        setStep('type')
        setAuthMethod('phone')
        if (isMounted) {
          handlePhoneAuthSuccess()
        }
      }

      if (errorParam) {
        // OAuth 인증 실패 시 에러 메시지 표시
        if (errorParam === 'auth_failed') {
          setError('소셜 로그인에 실패했습니다. 다시 시도해주세요.')
        } else if (errorParam === 'callback_error') {
          setError('인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
        } else if (errorParam === 'oauth_error') {
          setError('OAuth 인증 중 오류가 발생했습니다. 카카오톡 설정을 확인해주세요.')
        }
      }
    }

    processUrlParams()

    return () => {
      isMounted = false
    }
  }, [searchParams])

  // OAuth 인증 성공 시 사용자 정보 가져오기
  const handleOAuthSuccess = async () => {
    // 이미 authMethod가 설정된 경우 중복 실행 방지
    if (authMethod) {
      console.log('authMethod가 이미 설정됨, 중복 실행 방지:', authMethod)
      return
    }

    // 중복 실행 방지
    if (isProcessingOAuth.current) {
      console.log('OAuth 처리 중, 중복 실행 방지')
      return
    }

    isProcessingOAuth.current = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log('OAuth 사용자 정보:', user.user_metadata)
        
        // OAuth 제공자 정보 확인
        let provider = user.app_metadata?.provider
        if (!provider) {
          provider = user.user_metadata?.provider
        }
        if (!provider) {
          const identities = user.app_metadata?.identities
          if (identities && identities.length > 0) {
            provider = identities[0]?.provider
          }
        }
        
        // authMethod만 설정 (userType은 사용자가 선택하도록)
        if (provider === 'kakao') {
          setAuthMethod('kakao')
        } else if (provider === 'google') {
          setAuthMethod('google')
        } else if (provider === 'apple') {
          setAuthMethod('apple')
        }
        
        console.log('설정된 authMethod:', provider)
        console.log('userType은 사용자가 선택해야 함')
        console.log('setAuthMethod 호출됨:', provider)
      }
    } catch (error) {
      console.error('OAuth 사용자 정보 가져오기 오류:', error)
    } finally {
      isProcessingOAuth.current = false
    }
  }

  // 전화번호 인증 성공 시 사용자 정보 가져오기
  const handlePhoneAuthSuccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log('전화번호 인증 사용자 정보:', user)
        // 전화번호 인증 사용자는 이미 인증이 완료된 상태
        // authMethod는 이미 'phone'으로 설정됨
        console.log('전화번호 인증 사용자 - 사용자 타입 선택 단계로 이동')
      }
    } catch (error) {
      console.error('전화번호 인증 사용자 정보 가져오기 오류:', error)
    }
  }

  // 사용자 타입 선택
  const handleUserTypeSelect = (type: 'parent' | 'teacher') => {
    setUserType(type)
    
    // 모든 가입 방법에서 바로 프로필 작성으로 이동
    setStep('profile')
  }

  // 프로필 사진 업로드 핸들러
  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 파일 크기 검증 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        setError('프로필 사진은 5MB 이하로 업로드해주세요.')
        return
      }

      // 파일 타입 검증 (이미지 파일만)
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.')
        return
      }

      setProfileImage(file)
      
      // 미리보기 생성
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      setError('') // 에러 메시지 초기화
    }
  }

  // 프로필 사진 제거 핸들러
  const handleRemoveProfileImage = () => {
    setProfileImage(null)
    setProfileImagePreview('')
  }

  // 자녀 정보 추가 핸들러
  const handleAddChild = () => {
    setChildren([...children, { name: '', gender: '', birthDate: '', relationship: '', profileImage: null, profileImagePreview: undefined }])
  }

  // 자녀 정보 제거 핸들러
  const handleRemoveChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index))
    }
  }

  // 자녀 정보 업데이트 핸들러
  const handleChildChange = (index: number, field: string, value: string) => {
    const newChildren = [...children]
    newChildren[index] = { ...newChildren[index], [field]: value }
    setChildren(newChildren)
  }

  // 자녀 프로필 사진 업로드 핸들러
  const handleChildProfileImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 파일 크기 검증 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        setError('프로필 사진은 5MB 이하로 업로드해주세요.')
        return
      }

      // 파일 타입 검증 (이미지 파일만)
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.')
        return
      }

      const newChildren = [...children]
      newChildren[index] = { ...newChildren[index], profileImage: file }
      
      // 미리보기 생성
      const reader = new FileReader()
      reader.onload = (e) => {
        const updatedChildren = [...children]
        updatedChildren[index] = { ...updatedChildren[index], profileImage: file, profileImagePreview: e.target?.result as string }
        setChildren(updatedChildren)
      }
      reader.readAsDataURL(file)
      
      setError('') // 에러 메시지 초기화
    }
  }

  // 자녀 프로필 사진 제거 핸들러
  const handleRemoveChildProfileImage = (index: number) => {
    const newChildren = [...children]
    newChildren[index] = { 
      ...newChildren[index], 
      profileImage: null, 
      profileImagePreview: undefined,
      profileImageUrl: undefined
    }
    setChildren(newChildren)
  }

  // 닉네임 입력 핸들러 (8자 제한)
  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // 8자 이내로 제한
    if (value.length <= 8) {
      setNickname(value)
      // 닉네임이 변경되면 중복확인 상태 초기화
      setIsNicknameChecked(false)
      setIsNicknameAvailable(false)
      setNicknameMessage('')
    }
  }

  // 닉네임 중복확인
  const handleNicknameCheck = async () => {
    if (!nickname.trim()) {
      setNicknameMessage('닉네임을 입력해주세요')
      return
    }

    if (nickname.trim().length < 2) {
      setNicknameMessage('닉네임은 2자 이상이어야 합니다')
      return
    }

    setNicknameCheckLoading(true)
    setNicknameMessage('')

    try {
      // profiles 테이블에서 닉네임 중복 확인
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname.trim())
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('닉네임 중복확인 오류:', error)
        setNicknameMessage('중복확인 중 오류가 발생했습니다')
        setIsNicknameChecked(false)
        setIsNicknameAvailable(false)
        return
      }

      if (data) {
        // 중복된 닉네임
        setNicknameMessage('이미 사용 중인 닉네임입니다')
        setIsNicknameChecked(true)
        setIsNicknameAvailable(false)
      } else {
        // 사용 가능한 닉네임
        setNicknameMessage('사용 가능한 닉네임입니다')
        setIsNicknameChecked(true)
        setIsNicknameAvailable(true)
      }
    } catch (error) {
      console.error('닉네임 중복확인 오류:', error)
      setNicknameMessage('중복확인 중 오류가 발생했습니다')
      setIsNicknameChecked(false)
      setIsNicknameAvailable(false)
    } finally {
      setNicknameCheckLoading(false)
    }
  }

  // 카카오톡 OAuth 로그인
  const handleKakaoLogin = async () => {
    setLoading(true)
    setError('')
    setAuthMethod('kakao')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      // 카카오 OAuth가 성공적으로 시작되면 리다이렉트됨
      console.log('카카오 OAuth 시작됨:', data)
      
    } catch (error: any) {
      console.error('카카오 로그인 오류:', error)
      setError('카카오 로그인에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  // 구글 OAuth 로그인
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    setAuthMethod('google')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      // 구글 OAuth가 성공적으로 시작되면 리다이렉트됨
      console.log('구글 OAuth 시작됨:', data)
      
    } catch (error: any) {
      console.error('구글 로그인 오류:', error)
      setError('구글 로그인에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  // 애플 OAuth 로그인
  const handleAppleLogin = async () => {
    setLoading(true)
    setError('')
    setAuthMethod('apple')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      // 애플 OAuth가 성공적으로 시작되면 리다이렉트됨
      console.log('애플 OAuth 시작됨:', data)
      
    } catch (error: any) {
      console.error('애플 로그인 오류:', error)
      setError('애플 로그인에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  // 전화번호 인증 시작
  const handlePhoneAuth = () => {
    setAuthMethod('phone')
    setStep('phone')
  }

  // 전화번호 제출 및 인증번호 전송
  const handlePhoneSubmit = async () => {
    console.log('=== 전화번호 인증 시작 ===')
    console.log('입력된 전화번호:', phone)
    console.log('사용자 타입:', userType)
    console.log('사용자 이름:', fullName)
    
    if (!phone || phone.length < 10) {
      setError('올바른 전화번호를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 하이픈 제거하고 숫자만 추출
      const cleanPhone = phone.replace(/[^0-9]/g, '')
      console.log('정리된 전화번호 (하이픈 제거):', cleanPhone)
      
      // 전화번호 가입자의 경우에만 중복 확인 (profiles 테이블의 phone 컬럼 사용 안함)
      // 전화번호 인증은 Supabase Auth에서 처리하므로 별도 중복 확인 불필요
      
      // E.164 형식으로 변환
      const e164Phone = convertToE164(cleanPhone)
      console.log('E.164 형식 전화번호:', e164Phone)
      
      console.log('Supabase OTP 요청 시작...')
      
      // Supabase 전화번호 인증
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: e164Phone,
        options: {
          shouldCreateUser: true,
          data: {
            // user_type은 나중에 사용자가 선택하도록 설정하지 않음
            full_name: fullName || ''
          }
        }
      })

      console.log('Supabase 응답:', { data, error })

      if (error) throw error

      console.log('인증번호 전송 성공!')
      // 인증번호가 전송되었습니다
      setStep('verify')
      setCountdown(180) // 카운트다운 시작 (3분)
      setCanResend(false) // 재전송 버튼 숨김
      setLoading(false)
      
    } catch (error: any) {
      console.error('=== 전화번호 인증 오류 상세 ===')
      console.error('에러 객체:', error)
      console.error('에러 메시지:', error.message)
      console.error('에러 코드:', error.status)
      console.error('에러 상세:', error.details)
      
      // 더 구체적인 에러 메시지 표시
      if (error.message === 'Unsupported phone provider') {
        setError('SMS 인증 서비스가 설정되지 않았습니다. 관리자에게 문의해주세요.')
      } else if (error.message === 'Invalid phone number format (E.164 required)') {
        setError('전화번호 형식이 올바르지 않습니다. 010으로 시작하는 11자리 번호를 입력해주세요.')
      } else if (error.message?.includes('phone')) {
        setError('전화번호 형식이 올바르지 않습니다. 다시 확인해주세요.')
      } else {
        setError(`인증번호 전송에 실패했습니다: ${error.message}`)
      }
      
      setLoading(false)
    }
  }

  // 인증번호 확인
  const handleVerificationSubmit = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('6자리 인증번호를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 하이픈 제거하고 숫자만 추출
      const cleanPhone = phone.replace(/[^0-9]/g, '')
      
      // Supabase 인증번호 확인 및 로그인
      const { data, error } = await supabase.auth.verifyOtp({
        phone: convertToE164(cleanPhone), // E.164 형식으로 변환
        token: verificationCode,
        type: 'sms'
      })

      if (error) throw error

      console.log('인증번호 확인 성공!')
      console.log('인증된 사용자:', data.user?.id)
      
      // 인증 성공 후 profiles 테이블에서 기존 사용자 확인
      try {
        console.log('프로필 조회 시작 - auth_user_id:', data.user?.id)
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', data.user?.id)
          .maybeSingle()
        
        console.log('프로필 조회 결과:', { profileData, profileError })
        
        if (profileError) {
          console.error('프로필 조회 오류:', profileError)
          // RLS 정책 오류나 406 에러인 경우 신규 사용자로 처리
          if (profileError.code === 'PGRST301' || 
              profileError.message?.includes('406') || 
              profileError.message?.includes('Not Acceptable')) {
            console.log('RLS 정책 오류 - 신규 사용자로 처리')
            setStep('type')
            return
          }
          throw profileError
        }
        
        if (profileData) {
          // 기존 사용자인 경우 - 프로필 정보를 localStorage에 저장하고 메인 페이지로 이동
          console.log('기존 사용자 발견:', profileData)
          localStorage.setItem('isLoggedIn', 'true')
          localStorage.setItem('userProfile', JSON.stringify(profileData))
          
          // FCM 초기화
          const { initializeFCM } = await import('../utils/fcm')
          await initializeFCM()
          
          // 메인 페이지로 이동
          window.location.href = '/main'
          return
        } else {
          // 신규 사용자인 경우 - 사용자 타입 선택 단계로
          console.log('신규 사용자 - 프로필 작성 단계로 이동')
          setStep('type')
        }
      } catch (profileError) {
        console.error('프로필 확인 중 오류:', profileError)
        // 프로필 조회 실패 시에도 사용자 타입 선택 단계로 진행
        setStep('type')
      }
      
      setLoading(false)
      
    } catch (error: any) {
      console.error('인증번호 확인 오류:', error)
      
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
      
      setLoading(false)
    }
  }

  // 인증번호 재전송
  const handleResendCode = async () => {
    if (!canResend) return
    
    setLoading(true)
    setError('')
    setCountdown(180) // 3분으로 설정
    setCanResend(false)

    try {
      // 하이픈 제거하고 숫자만 추출
      const cleanPhone = phone.replace(/[^0-9]/g, '')
      
      // Supabase 전화번호 인증 재전송
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: convertToE164(cleanPhone),
        options: {
          shouldCreateUser: true,
          data: {
            // user_type은 나중에 사용자가 선택하도록 설정하지 않음
            full_name: fullName || ''
          }
        }
      })

      if (error) throw error

      console.log('인증번호 재전송 성공!')
      setError('')
      
    } catch (error: any) {
      console.error('인증번호 재전송 오류:', error)
      setError('인증번호 재전송에 실패했습니다. 다시 시도해주세요.')
      setCountdown(0)
      setCanResend(true)
    } finally {
      setLoading(false)
    }
  }


  // 프로필 제출 및 회원가입 완료
  const handleProfileSubmit = async () => {
    if (!fullName.trim()) {
      setError('이름을 입력해주세요')
      return
    }

    // 학부모인 경우 닉네임 중복확인 필수
    if (userType === 'parent') {
      if (!nickname.trim()) {
        setError('닉네임을 입력해주세요')
        return
      }

      if (!isNicknameChecked || !isNicknameAvailable) {
        setError('닉네임 중복확인을 해주세요')
        return
      }
    }

    if (!userType) {
      setError('사용자 타입을 선택해주세요')
      return
    }

    if (!authMethod) {
      console.error('authMethod가 설정되지 않음:', authMethod)
      console.error('현재 상태 - userType:', userType, 'authMethod:', authMethod)
      setError('인증 방법을 확인할 수 없습니다. 다시 시도해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      let user: any = null
      
      if (authMethod === 'phone') {
        // 전화번호 가입자의 경우 기존 인증된 세션 사용
        console.log('전화번호 가입자 - 기존 인증된 세션 사용')
        
        // 현재 세션에서 사용자 정보 가져오기
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          throw new Error('인증된 사용자 정보를 찾을 수 없습니다.')
        }
        
        user = currentUser
        console.log('전화번호 가입자 세션 확인:', user.id)
        
        // 사용자 메타데이터 업데이트
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            user_type: userType,
            full_name: fullName.trim(),
            auth_method: authMethod
          }
        })
        
        if (updateError) throw updateError
        console.log('✅ 전화번호 가입자 메타데이터 업데이트 성공')
      } else {
        // OAuth 가입자의 경우 기존 사용자 정보 가져오기
        const { data: { user: existingUser } } = await supabase.auth.getUser()
        if (!existingUser) {
          throw new Error('사용자 정보를 찾을 수 없습니다.')
        }
        user = existingUser
      }

      // 사용자 메타데이터 업데이트 (전화번호 가입자는 이미 위에서 업데이트됨)
      if (authMethod !== 'phone') {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            user_type: userType,
            full_name: fullName.trim(),
            nickname: userType === 'parent' ? nickname.trim() || '' : undefined
          }
        })

        if (updateError) throw updateError
      }

      // 프로필 이미지 업로드 (있는 경우)
      let profileImageUrl = null
      if (profileImage) {
        try {
          profileImageUrl = await uploadProfileImage(profileImage, user.id)
        } catch (error) {
          console.error('프로필 이미지 업로드 실패:', error)
          // 이미지 업로드 실패는 치명적이지 않으므로 계속 진행
        }
      }

      // 자녀 프로필 이미지 업로드 (학부모인 경우)
      let childrenWithImages = children
      if (userType === 'parent') {
        childrenWithImages = await Promise.all(
          children.map(async (child, index) => {
            if (child.profileImage) {
              try {
                // 자녀별로 고유한 경로 생성: userId/children/childIndex_timestamp
                const timestamp = Date.now()
                const fileName = `${user.id}/children/${index}_${timestamp}`
                const { data, error } = await supabase.storage
                  .from('profile-images')
                  .upload(fileName, child.profileImage, {
                    cacheControl: '3600',
                    upsert: false
                  })

                if (error) throw error

                // 공개 URL 가져오기
                const { data: { publicUrl } } = supabase.storage
                  .from('profile-images')
                  .getPublicUrl(fileName)

                return { ...child, profileImageUrl: publicUrl }
              } catch (error) {
                console.error(`자녀 ${index + 1} 프로필 이미지 업로드 실패:`, error)
                return child
              }
            }
            return child
          })
        )
      }

      // 프로필 테이블에 정보 저장 (모든 사용자)
      // username을 UUID 기반으로 생성하여 중복 방지
      const uniqueUsername = `user_${user.id.substring(0, 8)}_${Date.now()}`
      
      const profileData = {
        auth_user_id: user.id, // Supabase Auth 사용자 ID
        user_type: userType,
        full_name: fullName.trim(),
        auth_method: authMethod as 'kakao' | 'google' | 'apple' | 'phone',
        email: user.email || null,
        username: uniqueUsername,
        nickname: userType === 'parent' ? nickname.trim() || '' : null,
        profile_image_url: profileImageUrl,
        children_info: userType === 'parent' ? childrenWithImages.filter(child => child.name.trim()).map(child => ({
          name: child.name.trim(),
          gender: child.gender,
          birth_date: child.birthDate,
          relationship: child.relationship,
          profile_image_url: child.profileImageUrl || null
        })) : null,
        school_name: userType === 'teacher' ? schoolName.trim() || '' : null,
        subject: userType === 'teacher' ? subject.trim() || '' : null,
        experience_years: userType === 'teacher' ? parseInt(experienceYears) || 0 : null
        // introduction: userType === 'teacher' ? introduction.trim() || '' : null  // TODO: 데이터베이스에 introduction 컬럼 추가 후 활성화
      }

      // 디버깅을 위한 로그 출력
      console.log('저장할 프로필 데이터:', profileData)
      console.log('userType:', userType)
      console.log('authMethod:', authMethod)
      console.log('현재 인증된 사용자:', user)
      
      // 최종 인증 상태 확인
      const { data: { user: currentUser }, error: currentUserError } = await supabase.auth.getUser()
      console.log('최종 확인 - 현재 auth.uid():', currentUser?.id)
      console.log('최종 확인 - 프로필 auth_user_id:', profileData.auth_user_id)
      console.log('최종 확인 - 일치 여부:', currentUser?.id === profileData.auth_user_id)
      
      if (currentUserError) {
        console.error('인증 상태 확인 오류:', currentUserError)
        throw new Error('인증 상태를 확인할 수 없습니다.')
      }
      
      if (!currentUser) {
        throw new Error('인증된 사용자가 없습니다.')
      }
      
      if (currentUser.id !== profileData.auth_user_id) {
        throw new Error('인증 상태가 일치하지 않습니다. 다시 시도해주세요.')
      }
      
      console.log('✅ 최종 인증 상태 확인 완료')
      
      console.log('교사 관련 데이터:', {
        schoolName: schoolName.trim(),
        subject: subject.trim(),
        experienceYears: experienceYears,
        introduction: introduction.trim()
      })

      console.log('프로필 저장 시도...')
      // auth_user_id를 기준으로 upsert (onConflict 설정)
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .upsert([profileData], { onConflict: 'auth_user_id' })
        .select()

      if (profileError) {
        console.error('프로필 저장 오류 상세:', profileError)
        console.error('에러 코드:', profileError.code)
        console.error('에러 메시지:', profileError.message)
        console.error('에러 상세:', profileError.details)
        console.error('에러 힌트:', profileError.hint)
        throw new Error(`프로필 저장에 실패했습니다: ${profileError.message}`)
      }

      console.log('프로필 저장 성공:', profileResult)

      // FCM 초기화
      const { initializeFCM } = await import('../utils/fcm')
      await initializeFCM()

      // 성공 시 메인 페이지로 이동
      navigate('/main')
      
    } catch (error: any) {
      console.error('프로필 저장 오류:', error)
      setError('회원가입에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    if (step === 'auth-method') {
      navigate('/login')
    } else {
      goBack()
    }
  }

  const goBack = () => {
    if (step === 'type') {
      // OAuth 가입인 경우 인증 방법 선택으로, 전화번호 가입인 경우 인증번호 확인으로
      if (authMethod === 'phone') {
        setStep('verify')
      } else {
        setStep('auth-method')
      }
    }
    else if (step === 'phone') setStep('auth-method')
    else if (step === 'verify') setStep('phone')
    else if (step === 'profile') {
      // 모든 경우에 사용자 타입 선택으로 이동
      setStep('type')
    }
  }



  return (
    <motion.div 
      className="h-screen bg-white overflow-hidden"
    >
      <div className="container mx-auto px-4 py-8 h-full overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleGoBack}
            className="p-2 rounded-full bg-transparent transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          </div>
          <div className="w-10"></div>
        </div>

        {/* 진행 단계 표시 */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {['auth-method', 'phone', 'verify', 'type', 'profile'].map((stepName, index) => (
              <div
                key={stepName}
                className={`w-3 h-3 rounded-full ${
                  step === stepName
                    ? 'bg-orange-500'
                    : index < ['auth-method', 'phone', 'verify', 'type', 'profile'].indexOf(step)
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>



        {/* 메인 컨텐츠 */}
        <div
          key={step}
          className="max-w-md mx-auto"
        >
          {/* 사용자 타입 선택 */}
          {step === 'type' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-6 pt-16"
            >
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  어떤 분이신가요?
                </h2>
                <div className="text-sm text-gray-600 text-center">
                  <p>서비스 이용 목적에 맞게 선택해주세요</p>
                </div>
              </motion.div>

              <div className="space-y-4">
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  onClick={() => handleUserTypeSelect('parent')}
                  className="w-full p-8 bg-orange-50 rounded-2xl shadow-lg border-2 border-transparent hover:border-orange-200 hover:shadow-xl transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center">
                      <img src="/icons/parants.svg" alt="학부모" className="w-16 h-16" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">학부모</h3>
                      <p className="text-sm text-gray-600">자녀의 교육 서비스를 찾는 분</p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  onClick={() => handleUserTypeSelect('teacher')}
                  className="w-full p-8 bg-blue-50 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-200 hover:shadow-xl transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center">
                      <img src="/icons/schoolmaster.svg" alt="교사" className="w-16 h-16" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">교사</h3>
                      <p className="text-sm text-gray-600">교육 서비스를 제공하는 분</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* 인증 방법 선택 */}
          {step === 'auth-method' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-6 pt-12"
            >
              <div className="text-center mb-8">
                <p className="text-sm text-gray-600 font-medium">
                  원하시는 가입 방법을 선택해주세요
                </p>
              </div>

              {/* 원형 가입 버튼들 */}
              <div className="flex items-center justify-center gap-6">
                {/* 전화번호 가입 */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.4, type: "spring" }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePhoneAuth}
                  disabled={loading}
                  className="w-16 h-16 bg-gradient-to-br from-[#fb8678] to-[#e67567] rounded-full flex items-center justify-center hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg relative overflow-hidden group"
                  title="전화번호 인증으로 간편가입하기"
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-full"></div>
                  <Phone className="w-8 h-8 text-white relative z-10" />
                </motion.button>

                {/* 카카오톡 가입 */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, type: "spring" }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleKakaoLogin}
                  disabled={loading}
                  className="w-16 h-16 bg-gradient-to-br from-[#FEE500] to-[#FDD835] rounded-full flex items-center justify-center hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg relative overflow-hidden group"
                  title="카카오톡으로 간편가입하기"
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-full"></div>
                  <svg className="w-9 h-9 relative z-10" viewBox="0 0 24 24" fill="#3C1E1E">
                    <path d="M12.0009 3C17.7999 3 22.501 6.66445 22.501 11.1847C22.501 15.705 17.7999 19.3694 12.0009 19.3694C11.4127 19.3694 10.8361 19.331 10.2742 19.2586L5.86611 22.1419C5.36471 22.4073 5.18769 22.3778 5.39411 21.7289L6.28571 18.0513C3.40572 16.5919 1.50098 14.0619 1.50098 11.1847C1.50098 6.66445 6.20194 3 12.0009 3ZM17.908 11.0591L19.3783 9.63617C19.5656 9.45485 19.5705 9.15617 19.3893 8.96882C19.2081 8.78172 18.9094 8.77668 18.7219 8.95788L16.7937 10.8239V9.28226C16.7937 9.02172 16.5825 8.81038 16.3218 8.81038C16.0613 8.81038 15.8499 9.02172 15.8499 9.28226V11.8393C15.8321 11.9123 15.8325 11.9879 15.8499 12.0611V13.5C15.8499 13.7606 16.0613 13.9719 16.3218 13.9719C16.5825 13.9719 16.7937 13.7606 16.7937 13.5V12.1373L17.2213 11.7236L18.6491 13.7565C18.741 13.8873 18.8873 13.9573 19.0357 13.9573C19.1295 13.9573 19.2241 13.9293 19.3066 13.8714C19.5199 13.7217 19.5713 13.4273 19.4215 13.214L17.908 11.0591ZM14.9503 12.9839H13.4904V9.29702C13.4904 9.03648 13.2791 8.82514 13.0184 8.82514C12.7579 8.82514 12.5467 9.03648 12.5467 9.29702V13.4557C12.5467 13.7164 12.7579 13.9276 13.0184 13.9276H14.9503C15.211 13.9276 15.4222 13.7164 15.4222 13.4557C15.4222 13.1952 15.211 12.9839 14.9503 12.9839ZM9.09318 11.8925L9.78919 10.1849L10.4265 11.8925H9.09318ZM11.6159 12.3802C11.6161 12.3748 11.6175 12.3699 11.6175 12.3645C11.6175 12.2405 11.5687 12.1287 11.4906 12.0445L10.4452 9.24376C10.3468 8.9639 10.1005 8.77815 9.81761 8.77028C9.53948 8.76277 9.28066 8.93672 9.16453 9.21669L7.50348 13.2924C7.40519 13.5337 7.52107 13.8092 7.76242 13.9076C8.00378 14.006 8.2792 13.89 8.37749 13.6486L8.70852 12.8364H10.7787L11.077 13.6356C11.1479 13.8254 11.3278 13.9426 11.5193 13.9425C11.5741 13.9425 11.6298 13.9329 11.6842 13.9126C11.9284 13.8216 12.0524 13.5497 11.9612 13.3054L11.6159 12.3802ZM8.29446 9.30194C8.29446 9.0414 8.08312 8.83006 7.82258 8.83006H4.57822C4.31755 8.83006 4.10622 9.0414 4.10622 9.30194C4.10622 9.56249 4.31755 9.77382 4.57822 9.77382H5.73824V13.5099C5.73824 13.7705 5.94957 13.9817 6.21012 13.9817C6.47078 13.9817 6.68212 13.7705 6.68212 13.5099V9.77382H7.82258C8.08312 9.77382 8.29446 9.56249 8.29446 9.30194Z"></path>
                  </svg>
                </motion.button>

                {/* 구글 가입 */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.4, type: "spring" }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 border-2 border-gray-200 shadow-lg relative overflow-hidden group"
                  title="구글로 간편가입하기"
                >
                  <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
                  <svg className="w-8 h-8 relative z-10" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </motion.button>

                {/* 애플 가입 */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.4, type: "spring" }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAppleLogin}
                  disabled={loading}
                  className="w-16 h-16 bg-gradient-to-br from-black to-gray-800 rounded-full flex items-center justify-center hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg relative overflow-hidden group"
                  title="애플로 간편가입하기"
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-full"></div>
                  <svg className="w-8 h-8 relative z-10" viewBox="0 0 24 24" fill="white">
                    <path d="M11.6734 7.22198C10.7974 7.22198 9.44138 6.22598 8.01338 6.26198C6.12938 6.28598 4.40138 7.35397 3.42938 9.04597C1.47338 12.442 2.92538 17.458 4.83338 20.218C5.76938 21.562 6.87338 23.074 8.33738 23.026C9.74138 22.966 10.2694 22.114 11.9734 22.114C13.6654 22.114 14.1454 23.026 15.6334 22.99C17.1454 22.966 18.1054 21.622 19.0294 20.266C20.0974 18.706 20.5414 17.194 20.5654 17.11C20.5294 17.098 17.6254 15.982 17.5894 12.622C17.5654 9.81397 19.8814 8.46998 19.9894 8.40998C18.6694 6.47798 16.6414 6.26198 15.9334 6.21398C14.0854 6.06998 12.5374 7.22198 11.6734 7.22198ZM14.7934 4.38998C15.5734 3.45398 16.0894 2.14598 15.9454 0.849976C14.8294 0.897976 13.4854 1.59398 12.6814 2.52998C11.9614 3.35798 11.3374 4.68998 11.5054 5.96198C12.7414 6.05798 14.0134 5.32598 14.7934 4.38998Z"></path>
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* 전화번호 입력 */}
          {step === 'phone' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                {/* 전화번호 가입자 안내 */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-sm text-gray-600 text-center"
                >
                  <p>입력하신 전화번호가 아이디로 사용됩니다</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="relative"
                >
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="010-0000-0000"
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fb8678] focus:border-[#fb8678]"
                  />
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  onClick={handlePhoneSubmit}
                  disabled={loading}
                  className="w-full bg-[#fb8678] text-white py-4 rounded-xl font-semibold hover:bg-[#e67567] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '전송 중...' : '인증번호 받기'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* 인증번호 확인 */}
          {step === 'verify' && (
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
                  />
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  onClick={handleVerificationSubmit}
                  disabled={loading}
                  className="w-full bg-[#fb8678] text-white py-4 rounded-xl font-semibold hover:bg-[#e67567] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '확인 중...' : '인증하기'}
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
                    {loading ? '재전송 중...' : `인증번호 재전송 (${countdown}초 후 가능)`}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}


          {/* 프로필 입력 */}
          {step === 'profile' && (
            <div className="space-y-6">

              {userType === 'teacher' ? (
                // 교사 프로필 입력 폼
                <div className="space-y-2">
                  {/* 프로필 사진 업로드 */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div 
                        className="w-24 h-24 rounded-xl bg-gray-200 border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden"
                        onClick={() => document.getElementById('profile-image-input')?.click()}
                      >
                        {profileImagePreview ? (
                          <img 
                            src={profileImagePreview} 
                            alt="프로필 사진" 
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      
                      {/* 사진 제거 버튼 */}
                      {profileImagePreview && (
                        <button
                          onClick={handleRemoveProfileImage}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* 숨겨진 파일 입력 */}
                    <input
                      id="profile-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* 교사 이름 입력 */}
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="교사 이름(실명) *"
                      className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* 소속 기관명 입력 */}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <input
                      type="text"
                      placeholder="소속 기관명 * (예: ○○유치원, ○○어린이집)"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>



                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="기관 위치(주소) *"
                      className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <input
                      type="text"
                      placeholder="담당 반/학급 이름 * (예: 별님반, 5세반)"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                    </svg>
                    <input
                      type="number"
                      placeholder="교사 경력 연수 (예: 5)"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      min="0"
                      max="50"
                      className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <textarea
                      placeholder="간단한 소개/인사말 (선택)"
                      rows={3}
                      value={introduction}
                      onChange={(e) => setIntroduction(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                    />
                  </div>
                </div>
              ) : (
                // 학부모 프로필 입력 폼
                <div className="space-y-2">
                  {/* 프로필 사진 업로드 */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div 
                        className="w-24 h-24 rounded-xl bg-gray-200 border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden"
                        onClick={() => document.getElementById('profile-image-input')?.click()}
                      >
                        {profileImagePreview ? (
                          <img 
                            src={profileImagePreview} 
                            alt="프로필 사진" 
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      
                      {/* 사진 제거 버튼 */}
                      {profileImagePreview && (
                        <button
                          onClick={handleRemoveProfileImage}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* 숨겨진 파일 입력 */}
                    <input
                      id="profile-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* 이름 입력 */}
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="학부모 이름(실명) *"
                      className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* 닉네임 입력 */}
                  <div>
                    <div className="relative flex items-center space-x-2">
                      <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="닉네임 * (8자 이내)"
                          value={nickname}
                          onChange={handleNicknameChange}
                          className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm ${
                            isNicknameChecked 
                              ? isNicknameAvailable 
                                ? 'border-green-500' 
                                : 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleNicknameCheck}
                        disabled={nicknameCheckLoading || !nickname.trim()}
                        className="px-4 py-4 bg-[#fb8678] text-white text-sm font-semibold rounded-xl hover:bg-[#e67567] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {nicknameCheckLoading ? '확인 중...' : '중복확인'}
                      </button>
                    </div>
                    {nicknameMessage && (
                      <p className={`mt-2 text-xs ${
                        isNicknameAvailable ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {nicknameMessage}
                      </p>
                    )}
                  </div>



                  {/* 자녀 정보 섹션 */}
                  <div className="space-y-2">
                    {children.map((child, index) => (
                      <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* 헤더 */}
                        <div className="bg-gray-50 px-3 py-2 relative flex items-center justify-center">
                          <div className="text-xs text-gray-500 font-semibold">
                            {index === 0 ? '첫 번째 자녀 정보' : `${index + 1}번째 자녀 정보`}
                          </div>
                          {children.length > 1 && (
                            <button
                              onClick={() => handleRemoveChild(index)}
                              className="absolute right-3 text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              제거
                            </button>
                          )}
                        </div>
                        
                        {/* 입력 필드들 */}
                        <div className="p-3">
                          <div className="bg-white rounded-lg">
                            {/* 자녀 프로필 사진 */}
                            <div className="flex justify-center">
                              <div className="relative">
                                <div 
                                  className="w-20 h-20 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden"
                                  onClick={() => document.getElementById(`child-profile-image-${index}`)?.click()}
                                >
                                  {child.profileImagePreview ? (
                                    <img 
                                      src={child.profileImagePreview} 
                                      alt={`${child.name} 프로필`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  )}
                                </div>
                                
                                {/* 사진 제거 버튼 */}
                                {child.profileImagePreview && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveChildProfileImage(index)
                                    }}
                                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              
                              {/* 숨겨진 파일 입력 */}
                              <input
                                id={`child-profile-image-${index}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleChildProfileImageUpload(index, e)}
                                className="hidden"
                              />
                            </div>

                            <div className="space-y-3 text-xs">
                              {/* 이름 */}
                              <div>
                                <label className="block text-gray-500 font-semibold mb-1">이름</label>
                                <input
                                  type="text"
                                  placeholder="자녀 이름 *"
                                  value={child.name}
                                  onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                                />
                              </div>

                              {/* 성별 */}
                              <div>
                                <label className="block text-gray-500 font-semibold mb-1">성별</label>
                                <select 
                                  value={child.gender}
                                  onChange={(e) => handleChildChange(index, 'gender', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs appearance-none"
                                >
                                  <option value="">성별 선택 *</option>
                                  <option value="남자">남아</option>
                                  <option value="여자">여아</option>
                                </select>
                              </div>

                              {/* 생년월일 */}
                              <div>
                                <label className="block text-gray-500 font-semibold mb-1">생년월일</label>
                                <input
                                  type="date"
                                  value={child.birthDate}
                                  onChange={(e) => handleChildChange(index, 'birthDate', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                                />
                              </div>

                              {/* 보호자 관계 */}
                              <div>
                                <label className="block text-gray-500 font-semibold mb-1">보호자 관계</label>
                                <select 
                                  value={child.relationship}
                                  onChange={(e) => handleChildChange(index, 'relationship', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs appearance-none"
                                >
                                  <option value="">선택해주세요</option>
                                  <option value="엄마">엄마</option>
                                  <option value="아빠">아빠</option>
                                  <option value="할머니">할머니</option>
                                  <option value="할아버지">할아버지</option>
                                  <option value="삼촌">삼촌</option>
                                  <option value="이모/고모">이모/고모</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button 
                      onClick={handleAddChild}
                      className="w-full text-sm text-[#fb8678] hover:text-[#e67567] font-medium py-2 border border-[#fb8678] rounded-lg hover:bg-[#fb8678] hover:text-white transition-colors"
                    >
                      + 자녀 추가하기
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleProfileSubmit}
                disabled={loading}
                className="w-full bg-[#fb8678] text-white py-4 rounded-xl font-semibold hover:bg-[#e67567] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '가입 중...' : '회원가입 완료'}
              </button>
            </div>
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
      </div>


    </motion.div>
  )
}

export default SignUp
