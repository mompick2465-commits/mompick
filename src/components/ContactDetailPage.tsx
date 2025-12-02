import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ContactDetail {
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

const ContactDetailPage = () => {
  const navigate = useNavigate()
  const { contactId } = useParams<{ contactId: string }>()
  const [contact, setContact] = useState<ContactDetail | null>(null)
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
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()
          
          if (profileData) {
            setCurrentUser(profileData)
          } else if (isLoggedIn === 'true' && userProfile) {
            const profile = JSON.parse(userProfile)
            setCurrentUser(profile)
          }
        } else if (isLoggedIn === 'true' && userProfile) {
          const profile = JSON.parse(userProfile)
          setCurrentUser(profile)
        }
      } catch (error) {
        console.error('사용자 정보 조회 오류:', error)
      }
    }

    getCurrentUser()
  }, [])

  // 문의 상세 정보 가져오기
  useEffect(() => {
    const fetchContactDetail = async () => {
      if (!contactId || !currentUser?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', contactId)
          .eq('user_id', currentUser.id)
          .single()

        if (error) {
          console.error('문의 상세 조회 오류:', error)
          setContact(null)
        } else {
          setContact(data)
        }
      } catch (error) {
        console.error('문의 상세 조회 오류:', error)
        setContact(null)
      } finally {
        setLoading(false)
      }
    }

    fetchContactDetail()
  }, [contactId, currentUser])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678]"></div>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/contact/list')}
                className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <h1 className="text-lg font-bold text-gray-900 absolute left-1/2 transform -translate-x-1/2">문의상세</h1>
              <div className="w-10" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12 px-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">문의 내역을 찾을 수 없습니다</p>
            <button
              onClick={() => navigate('/contact/list')}
              className="px-4 py-2 text-sm bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] transition-colors mt-4"
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between relative">
            <button
              onClick={() => navigate('/contact/list')}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 absolute left-1/2 transform -translate-x-1/2">문의상세</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* 내용 */}
      <div className="pb-20">
        <div className="px-4 py-6">
          {/* 카테고리 및 상태 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#fb8678] bg-[#fb8678]/10 px-2 py-0.5 rounded-full">
                {getCategoryLabel(contact.category)}
              </span>
              {contact.images && contact.images.length > 0 && (
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  사진 {contact.images.length}장
                </span>
              )}
            </div>
            {(() => {
              const statusInfo = getStatusLabel(contact.status)
              return (
                <span className={`text-xs font-semibold ${statusInfo.color} ${statusInfo.bgColor} px-2 py-0.5 rounded-full`}>
                  {statusInfo.label}
                </span>
              )
            })()}
          </div>

          {/* 문의 내용 */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">문의 내용</h2>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {contact.content}
              </p>
            </div>
          </div>

          {/* 첨부 사진 */}
          {contact.images && contact.images.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">첨부 사진</h2>
              <div className="grid grid-cols-2 gap-2">
                {contact.images.map((imageUrl, index) => (
                  <div key={index} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={imageUrl}
                      alt={`첨부 사진 ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3E이미지%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 문의 일시 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>문의 일시: {formatDate(contact.created_at)}</span>
            </div>
          </div>

          {/* 관리자 답변 */}
          {contact.admin_response && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-sm font-semibold text-blue-800 mb-2">관리자 답변</h2>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                  {contact.admin_response}
                </p>
                {contact.updated_at && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <Clock className="w-3 h-3" />
                      <span>답변 일시: {formatDate(contact.updated_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContactDetailPage

