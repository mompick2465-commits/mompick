'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Send, AlertCircle, Calendar, Clock, XCircle, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ScheduledNotification {
  id: string
  title: string
  body: string
  scheduled_at: string
  status: 'pending' | 'processing' | 'sent' | 'cancelled'
  created_at: string
  updated_at: string
}

export default function ScheduledNotificationsPage() {
  const [formData, setFormData] = useState({ 
    title: '', 
    body: '',
    scheduledDate: '',
    scheduledTime: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.body.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    if (!formData.scheduledDate || !formData.scheduledTime) {
      alert('예약 날짜와 시간을 모두 선택해주세요.')
      return
    }

    // 예약 시간이 과거인지 확인
    const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
    if (scheduledDateTime <= new Date()) {
      alert('예약 시간은 현재 시간보다 미래여야 합니다.')
      return
    }

    if (!confirm('예약 알림을 등록하시겠습니까?')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/notifications/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          body: formData.body,
          scheduledAt: scheduledDateTime.toISOString()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
        setFormData({ title: '', body: '', scheduledDate: '', scheduledTime: '' })
        fetchScheduledNotifications() // 목록 새로고침
      } else {
        setResult({ success: false, message: data.error || '예약 알림 등록 중 오류가 발생했습니다.' })
      }
    } catch (error) {
      console.error('예약 알림 등록 오류:', error)
      setResult({ success: false, message: '예약 알림 등록 중 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScheduledNotifications()
    
    // 5초마다 목록 새로고침 (실시간 상태 업데이트)
    const refreshInterval = setInterval(() => {
      fetchScheduledNotifications()
    }, 5000)
    
    return () => {
      clearInterval(refreshInterval)
    }
  }, [])

  const fetchScheduledNotifications = async () => {
    try {
      setLoadingList(true)
      const response = await fetch('/api/notifications/scheduled')
      const data = await response.json()
      
      if (response.ok) {
        // sent 상태인 알림은 제외하고 표시
        const filtered = (data.scheduled || []).filter((item: ScheduledNotification) => 
          item.status !== 'sent'
        )
        setScheduledNotifications(filtered)
      }
    } catch (error) {
      console.error('예약 알림 목록 조회 오류:', error)
    } finally {
      setLoadingList(false)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('이 예약 알림을 취소하시겠습니까?')) {
      return
    }

    try {
      setCancellingId(id)
      const response = await fetch(`/api/notifications/scheduled/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        alert('예약 알림이 취소되었습니다.')
        fetchScheduledNotifications()
      } else {
        alert(data.error || '취소 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('예약 알림 취소 오류:', error)
      alert('예약 알림 취소 중 오류가 발생했습니다.')
    } finally {
      setCancellingId(null)
    }
  }

  const processScheduledNotifications = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/notifications/scheduled/process', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.processed > 0) {
        console.log(`예약 알림 ${data.processed}개 발송 완료`)
        fetchScheduledNotifications() // 목록 새로고침
      }
    } catch (error) {
      console.error('예약 알림 처리 오류:', error)
    } finally {
      setProcessing(false)
    }
  }

  // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
  const today = new Date().toISOString().split('T')[0]
  // 현재 시간 + 1시간을 HH:MM 형식으로 가져오기
  const defaultTime = new Date(Date.now() + 60 * 60 * 1000).toTimeString().slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-8 h-8 text-green-500" />
        <h1 className="text-3xl font-bold">예약 알림</h1>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-green-800 font-semibold mb-1">예약 알림 등록</p>
            <p className="text-sm text-green-700">
              지정한 날짜와 시간에 모든 사용자에게 자동으로 알림을 전송합니다.
              예약 시간이 되면 자동으로 전체 발송되며, 예약된 알림은 관리에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>예약 알림 작성</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                placeholder="예: 예약된 알림"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100자
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[200px]"
                required
                placeholder="알림 내용을 입력하세요."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.body.length}/500자
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  예약 날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  min={today}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  알림을 전송할 날짜를 선택하세요.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  예약 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  알림을 전송할 시간을 선택하세요.
                </p>
              </div>
            </div>

            {formData.scheduledDate && formData.scheduledTime && (() => {
              const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
              const isPast = scheduledDateTime <= new Date()
              return (
                <div className={`p-3 rounded-md ${isPast ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm ${isPast ? 'text-red-800' : 'text-blue-800'}`}>
                    {isPast ? (
                      <strong>경고:</strong>
                    ) : (
                      <strong>예약 시간:</strong>
                    )}{' '}
                    {scheduledDateTime.toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {isPast && ' (과거 시간입니다. 미래 시간을 선택해주세요.)'}
                  </p>
                </div>
              )
            })()}

            {result && (
              <div className={`p-4 rounded-md ${
                result.success 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm font-semibold mb-1">
                  {result.success ? '✓ 등록 완료' : '✗ 등록 실패'}
                </p>
                <p className="text-sm">{result.message}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    등록 중...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    예약 등록
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({ title: '', body: '', scheduledDate: '', scheduledTime: '' })
                  setResult(null)
                }}
                disabled={loading}
              >
                초기화
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 등록된 예약 알림 목록 */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>등록된 예약 알림 ({scheduledNotifications.length}개)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={processScheduledNotifications}
              disabled={processing}
              className="text-sm"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                  처리 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  예약 알림 처리
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">로딩 중...</p>
            </div>
          ) : scheduledNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              등록된 예약 알림이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledNotifications.map((notification) => {
                const scheduledDate = new Date(notification.scheduled_at)
                const isPast = scheduledDate <= new Date()
                const statusLabels = {
                  pending: '대기중',
                  processing: '발송중',
                  sent: '발송완료',
                  cancelled: '취소됨'
                }
                const statusColors = {
                  pending: 'bg-yellow-100 text-yellow-800',
                  processing: 'bg-blue-100 text-blue-800',
                  sent: 'bg-green-100 text-green-800',
                  cancelled: 'bg-gray-100 text-gray-800'
                }

                return (
                  <div
                    key={notification.id}
                    className={`border rounded-lg p-4 ${isPast ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[notification.status]}`}>
                            {statusLabels[notification.status]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{notification.body}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              예약: {scheduledDate.toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>등록: {formatDate(notification.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      {notification.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(notification.id)}
                          disabled={cancellingId === notification.id}
                          className="ml-4 text-red-600 border-red-600 hover:bg-red-50"
                        >
                          {cancellingId === notification.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                              취소 중...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              취소
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

