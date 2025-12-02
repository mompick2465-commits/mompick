import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ContactItem {
  id: string
  user_id?: string
  user_name: string
  category: string
  content: string
  images: string[]
  status: string
  admin_response?: string
  created_at: string
  updated_at: string
}

const ContactListPage = () => {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const isLoggedIn = localStorage.getItem('isLoggedIn')
        const userProfile = localStorage.getItem('userProfile')
        
        if (user) {
          // OAuth 사용자 또는 전화번호 가입 사용자 (세션이 있는 경우)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()
          
          if (profileData) {
            console.log('✅ Supabase 세션에서 프로필 조회 성공:', profileData)
            setCurrentUser(profileData)
          } else {
            console.log('⚠️ Supabase 세션은 있지만 프로필이 없음')
            // 프로필이 없는 경우 localStorage 확인
            if (isLoggedIn === 'true' && userProfile) {
              const profile = JSON.parse(userProfile)
              console.log('📱 localStorage에서 프로필 사용:', profile)
              setCurrentUser(profile)
            }
          }
        } else if (isLoggedIn === 'true' && userProfile) {
          // 전화번호 가입 사용자 (세션이 없는 경우 - localStorage 사용)
          const profile = JSON.parse(userProfile)
          console.log('📱 localStorage에서 프로필 사용 (세션 없음):', profile)
          setCurrentUser(profile)
        } else {
          console.log('❌ 사용자 정보 없음')
        }
      } catch (error) {
        console.error('사용자 정보 조회 오류:', error)
      }
    }

    getCurrentUser()
  }, [])

  // 문의 목록 가져오기
  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true)
      try {
        const userId = currentUser?.id
        
        console.log('🔍 문의 목록 조회 - currentUser:', currentUser)
        console.log('🔍 문의 목록 조회 - userId:', userId)
        
        if (!userId) {
          // 사용자 ID가 없으면 빈 배열 반환
          console.log('⚠️ 사용자 ID가 없어서 문의 목록을 조회할 수 없습니다.')
          setContacts([])
          setLoading(false)
          return
        }
        
        // contacts 테이블에서 본인이 작성한 문의사항 가져오기
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ 문의 목록 조회 오류:', error)
          console.error('❌ 에러 코드:', error.code)
          console.error('❌ 에러 메시지:', error.message)
          console.error('❌ 에러 상세:', error.details)
          console.error('❌ 에러 힌트:', error.hint)
          setContacts([])
        } else {
          console.log('✅ 문의 목록 조회 성공:', data?.length || 0, '건')
          console.log('📋 문의 목록 데이터:', data)
          setContacts(data || [])
        }
      } catch (error) {
        console.error('❌ 문의 목록 조회 오류:', error)
        setContacts([])
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()
  }, [currentUser])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return `${minutes}분 전`
      }
      return `${hours}시간 전`
    } else if (days < 7) {
      return `${days}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

  const getCategoryLabel = (category?: string) => {
    const categoryMap: Record<string, string> = {
      account: '계정 관련',
      bug: '버그 신고',
      suggestion: '기능 제안',
      content: '콘텐츠 관련',
      payment: '결제 관련',
      other: '기타'
    }
    return categoryMap[category || ''] || '기타'
  }

  const getStatusLabel = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      pending: { label: '대기중', color: 'text-orange-600', bgColor: 'bg-orange-100' },
      in_progress: { label: '처리중', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      resolved: { label: '해결완료', color: 'text-green-600', bgColor: 'bg-green-100' },
      closed: { label: '종료', color: 'text-gray-600', bgColor: 'bg-gray-100' }
    }
    return statusMap[status || 'pending'] || statusMap.pending
  }

  return (
    <div className="min-h-screen bg-white overflow-y-auto">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/profile')}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">문의하기</h1>
            <button
              onClick={() => navigate('/contact')}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 text-[#fb8678]" />
            </button>
          </div>
        </div>
      </div>

      {/* 내용 */}
      <div className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678]"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-gray-600 mb-2">문의 내역이 없습니다</p>
            <p className="text-xs text-gray-500 mb-6">궁금한 사항이 있으시면 문의해주세요</p>
            <button
              onClick={() => navigate('/contact')}
              className="px-4 py-2 text-sm bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] transition-colors"
            >
              문의하기
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => navigate(`/contact/${contact.id}`)}
                className="bg-white border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#fb8678] bg-[#fb8678]/10 px-2 py-0.5 rounded-full">
                        {getCategoryLabel(contact.category)}
                      </span>
                      {contact.images && contact.images.length > 0 && (
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          사진 {contact.images.length}장
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {contact.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(contact.created_at)}</span>
                    </div>
                  </div>
                  {(() => {
                    const statusInfo = getStatusLabel(contact.status)
                    return (
                      <span className={`text-xs font-semibold ${statusInfo.color} ${statusInfo.bgColor} px-2 py-0.5 rounded-full whitespace-nowrap ml-2`}>
                        {statusInfo.label}
                      </span>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ContactListPage

