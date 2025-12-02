'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Send, AlertCircle } from 'lucide-react'

export default function SendNotificationPage() {
  const [formData, setFormData] = useState({ title: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.body.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    if (!confirm('모든 사용자에게 알림을 전송하시겠습니까?')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
        setFormData({ title: '', body: '' })
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
        <Bell className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold">알림 보내기</h1>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-semibold mb-1">긴급 알림 전송</p>
            <p className="text-sm text-blue-700">
              이 기능은 모든 사용자에게 긴급 알림(광고, 시스템, 업데이트, 점검 등)을 전송합니다.
              알림은 사용자의 <strong>받은 알림</strong> 탭에 표시되며, 메인 페이지 알림 아이콘 배지에도 카운트됩니다.
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="예: 시스템 점검 안내"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                required
                placeholder="예: 2024년 1월 1일 00:00 ~ 06:00 시스템 점검으로 인해 서비스가 일시 중단됩니다."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.body.length}/500자
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
                  setFormData({ title: '', body: '' })
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

