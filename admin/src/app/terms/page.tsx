'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, FileCheck, CheckCircle, XCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

// React Quill을 동적으로 import (SSR 방지)
const QuillEditor = dynamic(() => import('../notices/quill-editor'), { ssr: false })

interface Term {
  id: string
  category: string
  title: string
  content: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

const TERM_CATEGORIES = [
  { value: 'service', label: '맘픽 서비스 이용약관', required: true },
  { value: 'privacy', label: '개인정보처리방침', required: true },
  { value: 'data', label: '데이터 활용 동의', required: true },
  { value: 'marketing', label: '마케팅 정보 수신 및 활용 동의', required: false },
]

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingTerm, setEditingTerm] = useState<Term | null>(null)
  const [formData, setFormData] = useState({ 
    category: '', 
    title: '', 
    content: '',
    is_active: true 
  })
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchTerms()
  }, [])

  const fetchTerms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/terms')
      const result = await response.json()

      if (response.ok) {
        setTerms(result.terms || [])
      } else {
        console.error('API 오류:', result.error)
        setTerms([])
      }
    } catch (error) {
      console.error('약관 목록 조회 오류:', error)
      setTerms([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category || !formData.title || !formData.content) {
      alert('모든 필수 항목을 입력해주세요.')
      return
    }
    
    try {
      const url = editingTerm 
        ? `/api/terms/${editingTerm.id}`
        : '/api/terms'
      
      const method = editingTerm ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        alert(editingTerm ? '약관이 수정되었습니다.' : '약관이 작성되었습니다.')
        setShowForm(false)
        setEditingTerm(null)
        setFormData({ category: '', title: '', content: '', is_active: true })
        fetchTerms()
      } else {
        alert(result.error || '오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('약관 저장 오류:', error)
      alert('약관 저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (term: Term) => {
    setEditingTerm(term)
    setFormData({ 
      category: term.category, 
      title: term.title, 
      content: term.content,
      is_active: term.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 약관을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/terms/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        alert('약관이 삭제되었습니다.')
        fetchTerms()
      } else {
        alert(result.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('약관 삭제 오류:', error)
      alert('약관 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleToggleActive = async (term: Term) => {
    try {
      const response = await fetch(`/api/terms/${term.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...term,
          is_active: !term.is_active
        }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(term.is_active ? '약관이 비활성화되었습니다.' : '약관이 활성화되었습니다.')
        fetchTerms()
      } else {
        alert(result.error || '상태 변경 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('약관 상태 변경 오류:', error)
      alert('약관 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const filteredTerms = terms.filter(term => {
    const matchesSearch = 
      term.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || term.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryLabel = (category: string) => {
    return TERM_CATEGORIES.find(c => c.value === category)?.label || category
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">약관 사항 관리</h1>
        <Button
          onClick={() => {
            setShowForm(!showForm)
            setEditingTerm(null)
            setFormData({ category: '', title: '', content: '', is_active: true })
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showForm ? '목록 보기' : '약관 작성'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingTerm ? '약관 수정' : '약관 작성'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!!editingTerm}
                >
                  <option value="">카테고리 선택</option>
                  {TERM_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label} {cat.required && '(필수)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">제목 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="약관 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">내용 <span className="text-red-500">*</span></label>
                <QuillEditor
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="약관 내용을 입력하세요"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  활성화
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingTerm ? '수정하기' : '작성하기'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingTerm(null)
                    setFormData({ category: '', title: '', content: '', is_active: true })
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
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>약관 목록</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체 카테고리</option>
                    {TERM_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
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
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : filteredTerms.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  약관이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTerms.map((term) => (
                    <Card 
                      key={term.id} 
                      className={`border transition-all cursor-pointer ${
                        term.is_active 
                          ? 'border-gray-200 hover:border-blue-500 hover:shadow-lg' 
                          : 'border-gray-300 bg-gray-50 opacity-75'
                      }`}
                      onClick={() => {
                        setSelectedTerm(term)
                        setShowDetailModal(true)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <FileCheck className={`w-4 h-4 flex-shrink-0 mt-1 ${
                            term.is_active ? 'text-blue-500' : 'text-gray-400'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                {getCategoryLabel(term.category)}
                              </span>
                              {term.is_active ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <h3 className="text-sm font-semibold line-clamp-2">{term.title}</h3>
                          </div>
                        </div>
                        <div 
                          className="text-xs text-gray-600 mb-3 line-clamp-3 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: term.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' 
                          }}
                        />
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-400">
                            <p>버전: {term.version}</p>
                            <p>{formatDate(term.updated_at)}</p>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleActive(term)
                              }}
                              className={`h-6 px-2 ${
                                term.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'
                              }`}
                              title={term.is_active ? '비활성화' : '활성화'}
                            >
                              {term.is_active ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(term)
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
                                handleDelete(term.id)
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
      {showDetailModal && selectedTerm && (
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
                  <FileCheck className="w-6 h-6 text-blue-500" />
                  <div>
                    <CardTitle className="text-2xl">{selectedTerm.title}</CardTitle>
                    <span className="text-sm text-gray-500 mt-1 block">
                      {getCategoryLabel(selectedTerm.category)} (버전 {selectedTerm.version})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                작성일: {formatDate(selectedTerm.created_at)}
                {selectedTerm.updated_at !== selectedTerm.created_at && (
                  <span className="ml-2">수정일: {formatDate(selectedTerm.updated_at)}</span>
                )}
                <span className={`ml-2 px-2 py-0.5 rounded ${
                  selectedTerm.is_active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedTerm.is_active ? '활성화' : '비활성화'}
                </span>
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedTerm.content }}
              />
            </CardContent>
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  handleToggleActive(selectedTerm)
                  setShowDetailModal(false)
                }}
              >
                {selectedTerm.is_active ? (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    비활성화
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    활성화
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleEdit(selectedTerm)
                  setShowDetailModal(false)
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleDelete(selectedTerm.id)
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

