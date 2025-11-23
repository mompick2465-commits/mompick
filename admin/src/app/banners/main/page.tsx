'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react'

interface Banner {
  id: string
  title: string
  image_url: string
  link_url?: string
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function MainBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
    order_index: 0,
    is_active: true
  })

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/banners/main')
      if (response.ok) {
        const data = await response.json()
        setBanners(data.banners || [])
      } else {
        console.error('배너 가져오기 실패')
        setBanners([])
      }
    } catch (error) {
      console.error('배너 조회 오류:', error)
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingBanner 
        ? `/api/banners/main/${editingBanner.id}`
        : '/api/banners/main'
      
      const method = editingBanner ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert(editingBanner ? '배너가 수정되었습니다.' : '배너가 추가되었습니다.')
        setShowAddModal(false)
        setEditingBanner(null)
        setFormData({
          title: '',
          image_url: '',
          link_url: '',
          order_index: 0,
          is_active: true
        })
        fetchBanners()
      } else {
        const errorData = await response.json()
        alert(`오류: ${errorData.error}`)
      }
    } catch (error) {
      console.error('배너 저장 오류:', error)
      alert('배너 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (bannerId: string) => {
    if (!confirm('정말 이 배너를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/banners/main/${bannerId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('배너가 삭제되었습니다.')
        fetchBanners()
      } else {
        const errorData = await response.json()
        alert(`삭제 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('배너 삭제 오류:', error)
      alert('배너 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleToggleActive = async (banner: Banner) => {
    try {
      const response = await fetch(`/api/banners/main/${banner.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...banner,
          is_active: !banner.is_active
        })
      })

      if (response.ok) {
        fetchBanners()
      } else {
        const errorData = await response.json()
        alert(`상태 변경 실패: ${errorData.error}`)
      }
    } catch (error) {
      console.error('배너 상태 변경 오류:', error)
      alert('배너 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      order_index: banner.order_index,
      is_active: banner.is_active
    })
    setShowAddModal(true)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">메인페이지 배너 관리</h1>
        <p className="text-sm text-gray-600">메인페이지에 표시될 배너를 관리하세요</p>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">배너 목록</CardTitle>
            <Button
              onClick={() => {
                setEditingBanner(null)
                setFormData({
                  title: '',
                  image_url: '',
                  link_url: '',
                  order_index: banners.length,
                  is_active: true
                })
                setShowAddModal(true)
              }}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>배너 추가</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              등록된 배너가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((banner) => (
                <div 
                  key={banner.id}
                  className="rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors p-4"
                >
                  <div className="flex items-start space-x-4">
                    {/* 배너 이미지 미리보기 */}
                    <div className="w-48 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {banner.image_url ? (
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-xs">이미지 없음</span>
                        </div>
                      )}
                    </div>

                    {/* 배너 정보 */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-1">
                            {banner.title}
                          </h3>
                          {banner.link_url && (
                            <p className="text-xs text-blue-600 mb-2">
                              링크: {banner.link_url}
                            </p>
                          )}
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-600">
                              순서: {banner.order_index}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              banner.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-300 text-gray-700'
                            }`}>
                              {banner.is_active ? '활성' : '비활성'}
                            </span>
                          </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(banner)}
                            title={banner.is_active ? '비활성화' : '활성화'}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {banner.is_active ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(banner)}
                            title="수정"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(banner.id)}
                            title="삭제"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 배너 추가/수정 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingBanner ? '배너 수정' : '배너 추가'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingBanner(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  배너 제목 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="배너 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.image_url && (
                  <div className="mt-2 w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={formData.image_url}
                      alt="미리보기"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 URL (선택)
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com (배너 클릭 시 이동할 주소)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  순서
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  활성화
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingBanner(null)
                  }}
                >
                  취소
                </Button>
                <Button type="submit">
                  {editingBanner ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

