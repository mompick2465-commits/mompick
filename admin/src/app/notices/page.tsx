'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, Megaphone } from 'lucide-react'
import dynamic from 'next/dynamic'

// React Quill을 동적으로 import (SSR 방지)
const QuillEditor = dynamic(() => import('./quill-editor'), { ssr: false })

interface Notice {
  id: string
  notification_id?: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '' })
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchNotices()
  }, [])

  const fetchNotices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notices')
      const result = await response.json()

      if (response.ok) {
        setNotices(result.notices || [])
      } else {
        console.error('API 오류:', result.error)
        setNotices([])
      }
    } catch (error) {
      console.error('공지사항 목록 조회 오류:', error)
      setNotices([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const deleteId = editingNotice?.notification_id || editingNotice?.id
      const url = editingNotice 
        ? `/api/notices/${deleteId}`
        : '/api/notices'
      
      const method = editingNotice ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        alert(editingNotice ? '공지사항이 수정되었습니다.' : '공지사항이 작성되었습니다.')
        setShowForm(false)
        setEditingNotice(null)
        setFormData({ title: '', content: '' })
        fetchNotices()
      } else {
        alert(result.error || '오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('공지사항 저장 오류:', error)
      alert('공지사항 저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice)
    setFormData({ title: notice.title, content: notice.content })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 공지사항을 삭제하시겠습니까? 모든 사용자에게 발송된 알림이 삭제됩니다.')) {
      return
    }

    try {
      // notification_id가 있으면 그것을 사용, 없으면 id 사용
      const notice = notices.find(n => n.id === id)
      const deleteId = notice?.notification_id || id

      const response = await fetch(`/api/notices/${deleteId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        alert('공지사항이 삭제되었습니다.')
        fetchNotices()
      } else {
        alert(result.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('공지사항 삭제 오류:', error)
      alert('공지사항 삭제 중 오류가 발생했습니다.')
    }
  }


  const filteredNotices = notices.filter(notice =>
    notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notice.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">공지사항 관리</h1>
        <Button
          onClick={() => {
            setShowForm(!showForm)
            setEditingNotice(null)
            setFormData({ title: '', content: '' })
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showForm ? '목록 보기' : '공지사항 작성'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingNotice ? '공지사항 수정' : '공지사항 작성'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="공지사항 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">내용</label>
                <QuillEditor
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="공지사항 내용을 입력하세요"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingNotice ? '수정하기' : '작성하기'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingNotice(null)
                    setFormData({ title: '', content: '' })
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>공지사항 목록</CardTitle>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="검색..."
                    className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : filteredNotices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  공지사항이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotices.map((notice) => (
                    <Card 
                      key={notice.id} 
                      className="border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedNotice(notice)
                        setShowDetailModal(true)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
                          <h3 className="text-sm font-semibold line-clamp-2 flex-1">{notice.title}</h3>
                        </div>
                        <div 
                          className="text-xs text-gray-600 mb-3 line-clamp-3 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: notice.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' 
                          }}
                        />
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-400">
                            {formatDate(notice.created_at)}
                          </p>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(notice)
                              }}
                              className="h-6 px-2"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(notice.id)
                              }}
                              className="h-6 px-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 상세보기 모달 */}
      {showDetailModal && selectedNotice && (
        <div 
          className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <Card 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="sticky top-0 bg-white z-10 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-blue-500" />
                  <CardTitle className="text-2xl">{selectedNotice.title}</CardTitle>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                작성일: {formatDate(selectedNotice.created_at)}
                {selectedNotice.updated_at !== selectedNotice.created_at && (
                  <span className="ml-2">수정일: {formatDate(selectedNotice.updated_at)}</span>
                )}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
              />
            </CardContent>
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  handleEdit(selectedNotice)
                  setShowDetailModal(false)
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleDelete(selectedNotice.id)
                  setShowDetailModal(false)
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
              <Button
                onClick={() => setShowDetailModal(false)}
              >
                닫기
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

