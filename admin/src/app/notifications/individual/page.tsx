'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Send, AlertCircle, Phone, Mail } from 'lucide-react'

export default function IndividualNotificationsPage() {
  const [formData, setFormData] = useState({ 
    title: '', 
    body: '',
    phone: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.body.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    if (!formData.phone.trim() && !formData.email.trim()) {
      alert('전화번호 또는 이메일 중 하나는 반드시 입력해주세요.')
      return
    }

    if (!confirm('개별 알림을 전송하시겠습니까?')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/notifications/individual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
        setFormData({ title: '', body: '', phone: '', email: '' })
      } else {
        setResult({ success: false, message: data.error || '알림 전송 중 오류가 발생했습니다.' })
      }
    } catch (error) {
      console.error('알림 전송 오류:', error)
      setResult({ success: false, message: '알림 전송 중 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-8 h-8 text-purple-500" />
        <h1 className="text-3xl font-bold">개별 알림</h1>
      </div>

      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-purple-800 font-semibold mb-1">개별 알림 전송</p>
            <p className="text-sm text-purple-700">
              특정 사용자에게 전화번호 또는 이메일로 알림을 전송합니다.
              사용자 관리에서 확인한 전화번호나 이메일을 입력하여 해당 사용자에게만 알림을 보낼 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>알림 작성</CardTitle>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                placeholder="예: 개별 안내"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[200px]"
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
                  <Phone className="inline w-4 h-4 mr-1" />
                  전화번호
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 010-1234-5678"
                />
                <p className="text-xs text-gray-500 mt-1">
                  전화번호로 알림을 전송합니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  이메일
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="예: user@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  이메일로 알림을 전송합니다.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-xs text-yellow-800">
                <strong>참고:</strong> 전화번호 또는 이메일 중 하나는 반드시 입력해야 합니다. 
                입력한 정보와 일치하는 사용자에게만 알림이 전송됩니다.
              </p>
            </div>

            {result && (
              <div className={`p-4 rounded-md ${
                result.success 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm font-semibold mb-1">
                  {result.success ? '✓ 전송 완료' : '✗ 전송 실패'}
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
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    알림 전송
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({ title: '', body: '', phone: '', email: '' })
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
    </div>
  )
}

