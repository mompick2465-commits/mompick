import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Heart, Camera, X } from 'lucide-react'
import { createReview, CreateReviewData } from '../utils/kindergartenReviewApi'
import { fetchKindergartenDetail } from '../utils/kindergartenDetailApi'
import { KindergartenDetailSummary } from '../types/kindergartenDetail'

const WriteReviewPage: React.FC = () => {
  const { kindercode } = useParams<{ kindercode: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // URL에서 지역 코드 가져오기
  const sidoCode = searchParams.get('sidoCode')
  const sggCode = searchParams.get('sggCode')
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kindergartenName, setKindergartenName] = useState<string>('')
  const [showInfoModal, setShowInfoModal] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 유치원 정보 로드
  useEffect(() => {
    const loadKindergartenInfo = async () => {
      if (kindercode) {
        try {
          const kindergarten = await fetchKindergartenDetail(kindercode)
          if (kindergarten) {
            setKindergartenName(kindergarten.name || '')
          }
        } catch (error) {
          console.error('유치원 정보 로드 실패:', error)
        }
      }
    }

    loadKindergartenInfo()
  }, [kindercode])

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
  }

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
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('별점을 선택해주세요.')
      return
    }

    if (content.trim().length > 0 && content.trim().length < 10) {
      setError('칭찬은 최소 10자 이상 작성해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const reviewData: CreateReviewData = {
        kindergarten_code: kindercode!,
        kindergarten_name: kindergartenName,
        rating,
        content: content.trim(),
        images: selectedImages.length > 0 ? selectedImages : undefined
      }

      await createReview(reviewData)
      
      // 성공 시 유치원 상세 페이지의 리뷰(현재는 '칭찬' 탭)로 돌아가기
      const returnUrl = `/kindergarten/${kindercode}${sidoCode && sggCode ? `?sidoCode=${sidoCode}&sggCode=${sggCode}` : ''}`
      navigate(returnUrl, { 
        state: { activeTab: 'reviews' }
      })
    } catch (err: any) {
      console.error('칭찬 작성 실패:', err)
      setError(err.message || '칭찬 작성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoBack = () => {
    const returnUrl = `/kindergarten/${kindercode}${sidoCode && sggCode ? `?sidoCode=${sidoCode}&sggCode=${sggCode}` : ''}`
    navigate(returnUrl)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 안내 팝업 */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                아이를 위한 따뜻한 칭찬 문화를 응원합니다
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                작성하시는 리뷰는 실제 기관(유치원·어린이집·놀이시설) 관계자에게 직접적인 영향을 줄 수 있습니다.
              </p>
              <p>
                허위 사실, 과도한 비난 등은 해당 기관의 요청으로 제재나 법적 문제가 발생할 수 있으니
              </p>
              <p className="font-semibold text-gray-900">
                부모님의 신중한 작성 부탁드립니다.
              </p>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-6 py-3 px-4 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#fb8678]/90 transition-colors"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">칭찬 작성</h1>
          <div className="w-9"></div> {/* 공간 맞추기 */}
        </div>
      </div>

      {/* 내용 */}
      <div className="space-y-6">
        {/* 별점 선택 */}
        <div className="text-center pt-4">
          <div className="flex justify-center space-x-2 pt-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                onClick={() => handleStarClick(val)}
                disabled={isSubmitting}
                className="p-2 transition-colors disabled:opacity-50"
              >
                <Heart
                  className={`w-8 h-8 ${
                    val <= rating
                      ? 'text-[#fb8678] fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <label className="block text-xs font-semibold text-gray-400 mt-2">
            칭찬을 선택해주세요
          </label>
          {rating > 0 && (
            <p className="text-sm text-[#fb8678] mt-3 font-bold">
              {rating === 1 && '매우 별로예요'}
              {rating === 2 && '별로예요'}
              {rating === 3 && '보통이에요'}
              {rating === 4 && '좋아요'}
              {rating === 5 && '매우 좋아요'}
            </p>
          )}
        </div>

        {/* 칭찬 내용 */}
        <div className="px-2">
          <label className="block text-base font-bold text-gray-600 mb-2 px-1">
            칭찬
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            placeholder="유치원에 대한 칭찬을 작성해주세요 (선택사항)&#10;예: 선생님이 친절하고 시설이 깨끗해요. 아이가 매일 즐겁게 다니고 있습니다."
            className="w-full h-60 px-2 py-2 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-[#fb8678] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-relaxed"
            maxLength={500}
          />
          <div className="flex justify-between text-xs font-semibold text-gray-400">
            <span>선택사항</span>
            <span>{content.length}/500</span>
          </div>
        </div>

        {/* 사진 업로드 */}
        <div className="px-2">
          <label className="block text-base font-bold text-gray-600 mb-2 px-1">
            사진 추가
          </label>
          
          {/* 이미지 그리드 */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* 기존 이미지들 */}
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
            
            {/* 사진 추가 버튼 */}
            {imagePreviews.length < 5 && (
              <button
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

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-white/50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-1px_rgba(0,0,0,0.06)] h-[70px] flex items-center py-2 px-3">
        <div className="flex space-x-3 w-full">
          <button
            onClick={handleGoBack}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="flex-1 py-3 px-4 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#fb8678]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                작성 중...
              </>
            ) : (
              '칭찬 작성하기'
            )}
          </button>
        </div>
      </div>

      {/* 하단 여백 (고정 버튼 공간) */}
      <div className="h-[70px]"></div>
    </div>
  )
}

export default WriteReviewPage
