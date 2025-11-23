import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Heart, Camera, X } from 'lucide-react'
import { createChildcareReview } from '../utils/childcareReviewApi'
import { fetchChildcareDetail } from '../utils/childcareDetailApi'
import { ChildcareDetailSummary } from '../utils/childcareDetailApi'

const WriteChildcareReviewPage: React.FC = () => {
  const { stcode } = useParams<{ stcode: string }>()
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [childcareName, setChildcareName] = useState<string>('')
  const [showInfoModal, setShowInfoModal] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadInfo = async () => {
      if (!stcode) return
      try {
        const detail = await fetchChildcareDetail(stcode)
        if (detail) setChildcareName(detail.name || '')
      } catch {}
    }
    loadInfo()
  }, [stcode])

  const handleStarClick = (v: number) => setRating(v)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const maxImages = 5
    if (selectedImages.length + files.length > maxImages) {
      setError(`최대 ${maxImages}장까지만 업로드할 수 있습니다.`)
      return
    }
    const newImages = Array.from(files)
    const overs = newImages.filter(f => f.size > 5 * 1024 * 1024)
    if (overs.length > 0) {
      setError('파일 크기는 5MB 이하여야 합니다.')
      return
    }
    setSelectedImages(prev => [...prev, ...newImages])
    newImages.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
    setError(null)
  }

  const removeImage = (i: number) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== i))
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
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
    if (!stcode) return
    setIsSubmitting(true)
    setError(null)
    try {
      await createChildcareReview({
        childcare_code: stcode,
        childcare_name: childcareName,
        rating,
        content: content.trim(),
        images: selectedImages.length > 0 ? selectedImages : undefined
      })
      navigate(`/childcare/${stcode}`, { state: { activeTab: 'reviews' } })
    } catch (err: any) {
      setError(err?.message || '칭찬 작성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
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

      <div className="bg-white sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className=" text-lg font-semibold text-gray-900">칭찬 작성</h1>
          <div className="w-9"></div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="text-center pt-4">
          <div className="flex justify-center space-x-2">
            {[1,2,3,4,5].map(st => (
              <button key={st} onClick={() => handleStarClick(st)} disabled={isSubmitting} className="p-2 transition-colors disabled:opacity-50">
                <Heart className={`w-8 h-8 ${st <= rating ? 'text-[#fb8678] fill-current' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          <label className="block text-xs font-semibold text-gray-400 mt-2">별점을 선택해주세요 *</label>
          {rating > 0 && (
            <p className="text-sm text-gray-600 mt-3 font-medium">
              {rating === 1 && '💗 매우 별로예요'}
              {rating === 2 && '💗💗 별로예요'}
              {rating === 3 && '💗💗💗 보통이에요'}
              {rating === 4 && '💗💗💗💗 좋아요'}
              {rating === 5 && '💗💗💗💗💗 매우 좋아요'}
            </p>
          )}
        </div>

        <div className="px-2">
          <label className="block text-base font-bold text-gray-600 mb-2 px-1">칭찬</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            placeholder="어린이집에 대한 칭찬을 작성해주세요 (선택사항)"
            className="w-full h-60 px-2 py-2 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-[#fb8678] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-relaxed"
            maxLength={500}
          />
          <div className="flex justify-between text-xs font-semibold text-gray-400">
            <span>선택사항</span>
            <span>{content.length}/500</span>
          </div>
        </div>

        <div className="px-2">
          <label className="block text-base font-bold text-gray-600 mb-2 px-1">사진 추가</label>
          <div className="grid grid-cols-4 gap-1.5">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square">
                <img src={preview} alt={`미리보기 ${index+1}`} className="w-full h-full object-cover rounded-xl" />
                <button onClick={() => removeImage(index)} disabled={isSubmitting} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {imagePreviews.length < 5 && (
              <button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50">
                <Camera className="w-6 h-6 text-gray-400" />
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" disabled={isSubmitting} />
          <div className="flex justify-between text-xs font-semibold text-gray-400 mt-2">
            <span>선택사항 (사진은 최대 5장까지)</span>
            <span>{imagePreviews.length}/5</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <button onClick={() => navigate(-1)} disabled={isSubmitting} className="flex-1 py-4 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">취소</button>
          <button onClick={handleSubmit} disabled={isSubmitting || rating === 0} className="flex-1 py-4 px-4 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#fb8678]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                작성 중...
              </>
            ) : '칭찬 작성하기'}
          </button>
        </div>
      </div>
      <div className="h-24"></div>
    </div>
  )
}

export default WriteChildcareReviewPage


