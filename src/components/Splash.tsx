import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Splash = () => {
  const [isVisible, setIsVisible] = useState(true)
  const [isSliding, setIsSliding] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        // 2초 후 스플래시 애니메이션 시작
        const timer = setTimeout(() => {
          setIsSliding(true)
          
                  setTimeout(() => {
          if (session) {
            // 기존 사용자면 메인 페이지로
            navigate('/main')
          } else {
            // 새 사용자면 로그인 페이지로 (사용자가 회원가입할지 로그인할지 선택할 수 있음)
            navigate('/login')
          }
        }, 500)
        }, 2000)

        return () => clearTimeout(timer)
      } catch (error) {
        console.error('세션 확인 오류:', error)
        // 오류 발생 시 기본적으로 회원가입 페이지로
        const timer = setTimeout(() => {
          setIsSliding(true)
          setTimeout(() => navigate('/signup'), 500)
        }, 2000)
        
        return () => clearTimeout(timer)
      }
    }

    checkUserSession()
  }, [navigate])

  return (
    <div 
      className={`fixed inset-0 bg-gradient-to-br from-white via-orange-50 to-pink-50 flex items-center justify-center transition-transform duration-500 ease-in-out z-[9999] ${
        isSliding ? '-translate-x-full' : 'translate-x-0'
      }`}
    >
      <div className="w-full h-full flex items-center justify-center">
        <img 
          src="/mompicksplash.png" 
          alt="맘픽 스플래시" 
          className="w-full h-full object-cover"
          style={{ maxWidth: '400px', maxHeight: '824px' }}
        />
      </div>
    </div>
  )
}

export default Splash
