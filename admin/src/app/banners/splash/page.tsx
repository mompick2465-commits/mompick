'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, Eye, EyeOff, Upload } from 'lucide-react'

interface Banner {
  id: string
  banner_type: 'splash' | 'modal'
  title: string
  description?: string
  image_url: string
  link_url?: string
  order_index: number
  is_active: boolean
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

export default function SplashBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    order_index: 0,
    is_active: true,
    show_click_text: false,
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/banners/main?type=splash')
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 이미지 파일인지 확인
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }
      // 파일 크기 확인 (10MB 제한)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.')
        return
      }
      setSelectedFile(file)
      // 미리보기를 위해 임시 URL 생성
      const tempUrl = URL.createObjectURL(file)
      setFormData({ ...formData, image_url: tempUrl })
    }
  }

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      
      // 파일명 생성 (타임스탬프 + 원본 파일명)
      const timestamp = Date.now()
      const fileName = `splash_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', fileName)
      formData.append('bannerType', 'splash')

      const response = await fetch('/api/banners/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        return data.url
      } else {
        const errorData = await response.json()
        alert(`업로드 실패: ${errorData.error}`)
        return null
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 확인 문구
    const confirmMessage = editingBanner 
      ? '스플래시 광고를 수정하시겠습니까?'
      : '스플래시 광고를 추가하시겠습니까?'
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    try {
      let imageUrl = formData.image_url

      // 파일이 선택되었으면 업로드
      if (selectedFile) {
        const uploadedUrl = await uploadImageToStorage(selectedFile)
        if (!uploadedUrl) {
          return // 업로드 실패 시 중단
        }
        imageUrl = uploadedUrl
      }

      // 이미지 URL이 없으면 에러
      if (!imageUrl || imageUrl.startsWith('blob:')) {
        alert('이미지를 업로드하거나 URL을 입력해주세요.')
        return
      }

      const url = editingBanner 
        ? `/api/banners/main/${editingBanner.id}`
        : '/api/banners/main'
      
      const method = editingBanner ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl,
          banner_type: 'splash'
        })
      })

      if (response.ok) {
        alert(editingBanner ? '스플래시 광고가 수정되었습니다.' : '스플래시 광고가 추가되었습니다.')
        setShowAddModal(false)
        setEditingBanner(null)
        setSelectedFile(null)
        setFormData({
          title: '',
          description: '',
          image_url: '',
          link_url: '',
          order_index: 0,
          is_active: true,
          show_click_text: false,
          start_date: '',
          end_date: ''
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
      description: banner.description || '',
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      order_index: banner.order_index,
      is_active: banner.is_active,
      show_click_text: (banner as any).show_click_text || false,
      start_date: banner.start_date ? banner.start_date.split('T')[0] : '',
      end_date: banner.end_date ? banner.end_date.split('T')[0] : ''
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
        <h1 className="text-xl font-bold text-gray-900">스플래시 광고 관리</h1>
        <p className="text-sm text-gray-600">메인페이지 상단에 표시될 스플래시 광고를 관리하세요 (캐러셀 형태)</p>
      </div>

      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">스플래시 광고 목록</CardTitle>
            <Button
              onClick={() => {
                setEditingBanner(null)
                setFormData({
                  title: '',
                  description: '',
                  image_url: '',
                  link_url: '',
                  order_index: banners.length,
                  is_active: true,
                  show_click_text: false,
                  start_date: '',
                  end_date: ''
                })
                setShowAddModal(true)
              }}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>광고 추가</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              등록된 스플래시 광고가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((banner) => (
                <div 
                  key={banner.id}
                  className="rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors overflow-hidden"
                >
                  {/* 클릭 가능한 메인 영역 */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => handleEdit(banner)}
                  >
                    <div className="flex items-start space-x-4">
                      {/* 배너 이미지 미리보기 */}
                      <div className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
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
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {banner.title}
                        </h3>
                        {banner.description && (
                          <p className="text-sm text-gray-700 mb-2">
                            {banner.description}
                          </p>
                        )}
                        {banner.link_url && (
                          <p className="text-xs text-blue-600 mb-2">
                            링크: {banner.link_url}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
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
                          {banner.start_date && (
                            <span className="text-xs text-gray-600">
                              시작: {new Date(banner.start_date).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                          {banner.end_date && (
                            <span className="text-xs text-gray-600">
                              종료: {new Date(banner.end_date).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 (별도 영역) */}
                  <div className="px-4 py-2 bg-gray-200/50 flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleActive(banner)
                      }}
                      title={banner.is_active ? '비활성화' : '활성화'}
                      className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1"
                    >
                      {banner.is_active ? (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          활성
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-1" />
                          비활성
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(banner.id)
                      }}
                      title="삭제"
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      삭제
                    </Button>
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
          <div className="bg-white rounded-lg max-w-xl w-full p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">
                {editingBanner ? '스플래시 광고 수정' : '스플래시 광고 추가'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingBanner(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  광고 제목 (선택)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 라이프 스탠다드"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  광고 설명 (선택)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 냄새먹는 달걀"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  이미지 *
                </label>
                
                {/* 권장 해상도 안내 */}
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-[10px] text-blue-800 font-medium mb-0.5">📐 권장 해상도</p>
                  <div className="text-[9px] text-blue-700 space-y-0.5">
                    <p>• 최적: <span className="font-semibold">1200 x 480 픽셀</span> (2.5:1 비율)</p>
                    <p>• 권장: 900 x 360 픽셀 이상</p>
                    <p>• 최소: 720 x 288 픽셀</p>
                  </div>
                </div>

                {/* 파일 업로드 옵션 */}
                <div className="mb-2">
                  <label className="cursor-pointer">
                    <div className="flex items-center justify-center w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 transition-colors">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Upload className="w-4 h-4" />
                        <span className="text-xs">
                          {selectedFile ? selectedFile.name : '이미지 파일 선택'}
                        </span>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    JPG, PNG, GIF, WebP (최대 10MB)
                  </p>
                </div>

                {/* 구분선 */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px]">
                    <span className="px-2 bg-white text-gray-500">또는 URL 입력</span>
                  </div>
                </div>

                {/* URL 입력 옵션 */}
                <input
                  type="text"
                  value={selectedFile ? '' : formData.image_url}
                  onChange={(e) => {
                    setSelectedFile(null)
                    setFormData({ ...formData, image_url: e.target.value })
                  }}
                  disabled={!!selectedFile}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="https://example.com/image.jpg"
                />

                {/* 미리보기 */}
                {formData.image_url && (
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-600 mb-1">미리보기 (앱 실제 크기):</p>
                    <div className="w-full aspect-[2.5/1] bg-gray-100 rounded-lg overflow-hidden border border-gray-300 relative">
                      {/* 페이지 인디케이터 (여러 개일 경우 표시 예시) */}
                      {banners.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 z-10">
                          <span className="w-2 h-2 rounded-full bg-[#fb8678]"></span>
                          {banners.slice(0, 4).map((_, i) => (
                            <span key={i} className="w-2 h-2 rounded-full bg-white/60"></span>
                          ))}
                        </div>
                      )}
                      
                      <img
                        src={formData.image_url}
                        alt="미리보기"
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      {/* 어두운 오버레이 */}
                      <div className="absolute inset-0 bg-black/10"></div>
                      
                      {/* 제목과 설명 오버레이 - 제목, 설명, 클릭문구 중 하나라도 있을 때만 표시 */}
                      {(formData.title || formData.description || formData.show_click_text) && (
                        <div className="absolute inset-0 flex items-center p-4">
                          <div className="text-white w-full">
                            {formData.title && (
                              <h3 className="font-bold text-white text-base mb-1 drop-shadow-lg">
                                {formData.title}
                              </h3>
                            )}
                            {formData.description && (
                              <p className="text-xs text-white/95 mb-2 line-clamp-2 drop-shadow-md">
                                {formData.description}
                              </p>
                            )}
                            {formData.show_click_text && (
                              <div className="text-xs text-white/80 drop-shadow-md">
                                클릭하여 자세히 보기
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1">
                      ※ 이미지가 잘리는 부분을 확인하세요 {banners.length > 1 && `(여러 광고 중 ${formData.order_index + 1}번째)`}
                    </p>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null)
                          setFormData({ ...formData, image_url: '' })
                        }}
                        className="mt-1 text-[10px] text-red-600 hover:text-red-800"
                      >
                        선택 취소
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  링크 URL (선택)
                </label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
                
                {/* "클릭하여 자세히 보기" 표시 옵션 */}
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    id="show_click_text"
                    checked={formData.show_click_text}
                    onChange={(e) => setFormData({ ...formData, show_click_text: e.target.checked })}
                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="show_click_text" className="text-xs text-gray-700">
                    "클릭하여 자세히 보기" 문구 표시
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    순서
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center space-x-2 pb-1.5">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-xs font-medium text-gray-700">
                      활성화
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    시작일 (선택)
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    종료일 (선택)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingBanner(null)
                  }}
                  className="text-sm px-3 py-1.5"
                >
                  취소
                </Button>
                <Button type="submit" className="text-sm px-3 py-1.5">
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

