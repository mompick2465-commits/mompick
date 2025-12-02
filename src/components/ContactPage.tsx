import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ContactPage = () => {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newImages = Array.from(files)
    const maxImages = 5
    const currentImageCount = selectedImages.length + imagePreviews.length

    if (currentImageCount + newImages.length > maxImages) {
      setError(`최대 ${maxImages}장까지만 업로드할 수 있습니다.`)
      return
    }

    // 파일 크기 검증 (5MB 제한)
    const oversizedFiles = newImages.filter(file => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      setError('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    setSelectedImages(prev => [...prev, ...newImages])
    
    // 미리보기 생성
    newImages.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    setError(null)
    // input 초기화
    if (event.target) {
      event.target.value = ''
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return []

    const uploadedUrls: string[] = []

    for (const file of selectedImages) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `contact/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('community-images') // 기존 버킷 사용 또는 별도 버킷 생성 필요
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('이미지 업로드 오류:', uploadError)
          throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
        }

        // 업로드된 이미지의 공개 URL 가져오기
        const { data: { publicUrl } } = supabase.storage
          .from('community-images')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      } catch (err) {
        console.error('이미지 업로드 중 오류:', err)
        throw err
      }
    }

    return uploadedUrls
  }

  const handleSubmit = async () => {
    if (!category) {
      setError('문의 카테고리를 선택해주세요.')
      return
    }

    if (!content.trim()) {
      setError('문의 내용을 입력해주세요.')
      return
    }

    if (content.trim().length < 10) {
      setError('문의 내용은 최소 10자 이상 작성해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 이미지 업로드
      const imageUrls = await uploadImages()

      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      const userProfile = localStorage.getItem('userProfile')
      
      let userId: string | null = null
      let userName: string = '익명'

      if (user) {
        // 프로필에서 ID와 이름 가져오기 (profiles 테이블의 id를 사용)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, nickname')
          .eq('auth_user_id', user.id)
          .single()
        
        if (profile) {
          userId = profile.id  // profiles 테이블의 id 사용
          userName = profile.nickname || profile.full_name || '익명'
        } else {
          // 프로필이 없는 경우 auth user id를 사용하지 않고 null로 설정
          userName = user.user_metadata?.full_name || user.user_metadata?.nickname || user.email?.split('@')[0] || '익명'
        }
      } else if (isLoggedIn === 'true' && userProfile) {
        const profile = JSON.parse(userProfile)
        userId = profile.id
        userName = profile.nickname || profile.full_name || '익명'
      }

      // 문의사항을 contacts 테이블에 저장
      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          user_name: userName,
          category: category,
          content: content.trim(),
          images: imageUrls,
          status: 'pending'
        })

      if (insertError) {
        console.error('문의사항 저장 오류:', insertError)
        throw new Error(`문의사항 저장 실패: ${insertError.message}`)
      }

      // 팝업 메시지 표시 후 바로 리스트 페이지로 이동
      alert('문의하기 전송하였습니다.')
      navigate('/contact/list')
    } catch (err: any) {
      console.error('문의하기 실패:', err)
      setError(err.message || '문의하기 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate('/contact/list')}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">문의하기</h1>
          <div className="w-10" /> {/* 중앙 정렬을 위한 빈 공간 */}
        </div>
      </div>

      {/* 내용 */}
      <div className="space-y-6">
        {/* 카테고리 선택 */}
        <div className="px-2 pt-4">
          <label className="block text-base font-bold text-gray-600 mb-2 px-1">
            문의 카테고리
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
          >
            <option value="">카테고리를 선택해주세요</option>
            <option value="account">계정 관련</option>
            <option value="bug">버그 신고</option>
            <option value="suggestion">기능 제안</option>
            <option value="content">콘텐츠 관련</option>
            <option value="payment">결제 관련</option>
            <option value="other">기타</option>
          </select>
        </div>

        {/* 내용 입력 */}
        <div className="px-2">
          <label className="block text-base font-bold text-gray-600 mb-2 px-1">
            문의 내용
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="궁금한 사항이나 불편한 점이 있으시면 문의해주세요. 빠르게 답변드리겠습니다."
            rows={8}
            maxLength={500}
            className="w-full h-60 px-2 py-2 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-sm leading-relaxed"
          />
          <div className="flex justify-between text-xs font-semibold text-gray-400 mt-1">
            <span>최대 텍스트 길이</span>
            <span>{content.length}/500</span>
          </div>
        </div>

        {/* 이미지 첨부 */}
        <div className="px-2">
          <label className="block text-base font-bold text-gray-600 mb-2 px-1">
            사진 추가
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {/* 이미지 미리보기 */}
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={preview}
                  alt={`미리보기 ${index + 1}`}
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  onClick={() => removeImage(index)}
                  disabled={isSubmitting}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {/* 이미지 추가 버튼 */}
            {imagePreviews.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
            disabled={isSubmitting}
          />
          <div className="flex justify-between text-xs font-semibold text-gray-400 mt-2">
            <span>선택사항 (사진은 최대 5장까지)</span>
            <span>{imagePreviews.length}/5</span>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="px-2">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div className="px-2">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-600">문의사항이 접수되었습니다. 감사합니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-white/50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-1px_rgba(0,0,0,0.06)] h-20 flex items-center p-3">
        <div className="flex space-x-3 w-full">
          <button
            onClick={() => navigate('/contact/list')}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!category || !content.trim() || isSubmitting}
            className="flex-1 py-3 px-4 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#fb8678]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                제출 중...
              </>
            ) : (
              '문의하기'
            )}
          </button>
        </div>
      </div>
      <div className="h-20"></div>
    </div>
  )
}

export default ContactPage

