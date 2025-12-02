'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, truncateText } from '@/lib/utils'
import { Search, Filter, Eye, CheckCircle, XCircle, AlertCircle, MessageSquare, Clock, Image as ImageIcon, User, Bell } from 'lucide-react'
import { SortButtons } from '@/components/ui/sort-buttons'

interface Contact {
  id: string
  user_id?: string
  user_name: string
  category: string
  content: string
  images: string[]
  status: string
  admin_response?: string
  admin_notes?: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    full_name: string
    nickname?: string
    profile_image_url?: string
    user_type?: string
    email?: string
  }
}

const categoryLabels: Record<string, string> = {
  account: '계정 관련',
  bug: '버그 신고',
  suggestion: '기능 제안',
  content: '콘텐츠 관련',
  payment: '결제 관련',
  other: '기타'
}

const statusLabels: Record<string, string> = {
  pending: '대기중',
  in_progress: '처리중',
  resolved: '해결완료',
  closed: '종료'
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'closed'>('all')
  const [filterCategory, setFilterCategory] = useState<'all' | 'account' | 'bug' | 'suggestion' | 'content' | 'payment' | 'other'>('all')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'category'>('date')
  const [adminResponse, setAdminResponse] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [sendingNotification, setSendingNotification] = useState<string | null>(null)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/contacts')
      const result = await response.json()
      
      if (response.ok) {
        setContacts(result.contacts || [])
        console.log('문의사항 데이터 로드됨:', result.count, '건')
      } else {
        console.error('API 오류:', result.error)
        setContacts([])
      }
      
    } catch (error) {
      console.error('문의사항 목록 조회 오류:', error)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contact.user?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contact.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus
    const matchesCategory = filterCategory === 'all' || contact.category === filterCategory
    return matchesSearch && matchesStatus && matchesCategory
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'status':
        const statusOrder = { 'pending': 0, 'in_progress': 1, 'resolved': 2, 'closed': 3 }
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
      case 'category':
        return a.category.localeCompare(b.category)
      default:
        return 0
    }
  })

  const handleStatusUpdate = async (contactId: string, newStatus: string) => {
    try {
      setUpdating(true)
      
      const response = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: contactId,
          status: newStatus,
          admin_response: adminResponse || undefined,
          admin_notes: adminNotes || undefined
        })
      })

      const result = await response.json()

      if (response.ok) {
        await fetchContacts()
        if (selectedContact?.id === contactId) {
          setSelectedContact(result.contact)
        }
        setAdminResponse('')
        setAdminNotes('')
        alert('상태가 업데이트되었습니다.')
      } else {
        alert(`업데이트 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('상태 업데이트 오류:', error)
      alert('상태 업데이트 중 오류가 발생했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact)
    setAdminResponse(contact.admin_response || '')
    setAdminNotes(contact.admin_notes || '')
  }

  const handleCloseModal = () => {
    setSelectedContact(null)
    setAdminResponse('')
    setAdminNotes('')
  }

  const handleSendNotification = async (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    
    if (!contact.user_id) {
      alert('사용자 ID가 없어 알림을 보낼 수 없습니다.')
      return
    }

    if (!confirm('해당 사용자에게 "문의하신 내용에 대한 답변이 완료되었습니다." 알림을 보내시겠습니까?')) {
      return
    }

    try {
      setSendingNotification(contact.id)
      
      // Supabase Edge Function 호출
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase 설정이 없습니다.')
      }

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data, error } = await supabase.functions.invoke('send-fcm-push', {
        body: {
          userId: contact.user_id,
          title: '문의 답변 완료',
          body: '문의하신 내용에 대한 답변이 완료되었습니다.',
          data: {
            type: 'contact_response',
            contactId: contact.id
          }
        }
      })

      if (error) {
        throw error
      }

      alert('알림이 성공적으로 전송되었습니다.')
    } catch (error: any) {
      console.error('알림 전송 오류:', error)
      alert(`알림 전송 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`)
    } finally {
      setSendingNotification(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">문의 사항 관리</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            총 {filteredContacts.length}건
          </span>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <Card className="border-0 shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="문의 내용, 사용자 이름, 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체 상태</option>
                <option value="pending">대기중</option>
                <option value="in_progress">처리중</option>
                <option value="resolved">해결완료</option>
                <option value="closed">종료</option>
              </select>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체 카테고리</option>
                <option value="account">계정 관련</option>
                <option value="bug">버그 신고</option>
                <option value="suggestion">기능 제안</option>
                <option value="content">콘텐츠 관련</option>
                <option value="payment">결제 관련</option>
                <option value="other">기타</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <SortButtons
              options={[
                { value: 'date', label: '최신순' },
                { value: 'status', label: '상태순' },
                { value: 'category', label: '카테고리순' }
              ]}
              value={sortBy}
              onChange={setSortBy}
            />
          </div>
        </CardContent>
      </Card>

      {/* 문의사항 목록 */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">문의사항을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">문의사항이 없습니다.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredContacts.map((contact) => (
            <Card 
              key={contact.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewDetails(contact)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[contact.status] || statusColors.pending}`}>
                        {statusLabels[contact.status] || contact.status}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {categoryLabels[contact.category] || contact.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {contact.user?.full_name || contact.user_name}
                      </span>
                      {contact.user?.email && (
                        <span className="text-sm text-gray-500">
                          ({contact.user.email})
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {truncateText(contact.content, 150)}
                    </p>
                    
                    {contact.images && contact.images.length > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          이미지 {contact.images.length}장
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(contact.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={(e) => handleSendNotification(contact, e)}
                      variant="outline"
                      size="sm"
                      disabled={sendingNotification === contact.id || !contact.user_id}
                      className="flex items-center gap-2"
                    >
                      {sendingNotification === contact.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          전송중
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4" />
                          알림 전송
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 상세보기 모달 */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>문의사항 상세</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseModal}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">상태</label>
                  <div className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[selectedContact.status] || statusColors.pending}`}>
                      {statusLabels[selectedContact.status] || selectedContact.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">카테고리</label>
                  <div className="mt-1">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {categoryLabels[selectedContact.category] || selectedContact.category}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">작성자</label>
                  <p className="mt-1 text-sm">{selectedContact.user?.full_name || selectedContact.user_name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">이메일</label>
                  <p className="mt-1 text-sm">{selectedContact.user?.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">작성일</label>
                  <p className="mt-1 text-sm">{formatDate(selectedContact.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">수정일</label>
                  <p className="mt-1 text-sm">{formatDate(selectedContact.updated_at)}</p>
                </div>
              </div>

              {/* 문의 내용 */}
              <div>
                <label className="text-sm font-semibold text-gray-600">문의 내용</label>
                <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedContact.content}</p>
                </div>
              </div>

              {/* 이미지 */}
              {selectedContact.images && selectedContact.images.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">첨부 이미지</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {selectedContact.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`첨부 이미지 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => window.open(image, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 관리자 답변 */}
              <div>
                <label className="text-sm font-semibold text-gray-600">관리자 답변</label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="사용자에게 보여질 답변을 입력하세요..."
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              {/* 관리자 메모 */}
              <div>
                <label className="text-sm font-semibold text-gray-600">관리자 메모 (사용자에게 보이지 않음)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="내부 메모를 입력하세요..."
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* 상태 변경 버튼 */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleStatusUpdate(selectedContact.id, 'pending')}
                  disabled={updating || selectedContact.status === 'pending'}
                  variant={selectedContact.status === 'pending' ? 'default' : 'outline'}
                  size="sm"
                >
                  대기중
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedContact.id, 'in_progress')}
                  disabled={updating || selectedContact.status === 'in_progress'}
                  variant={selectedContact.status === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                >
                  처리중
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedContact.id, 'resolved')}
                  disabled={updating || selectedContact.status === 'resolved'}
                  variant={selectedContact.status === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                >
                  해결완료
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedContact.id, 'closed')}
                  disabled={updating || selectedContact.status === 'closed'}
                  variant={selectedContact.status === 'closed' ? 'default' : 'outline'}
                  size="sm"
                >
                  종료
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

