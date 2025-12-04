import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, Image, Smile, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface PostData {
  content: string
  location: string
  hashtags: string[]
  images: string[]
  emojis: string[]
  category: string
  author_id: string
  author_name: string
  author_profile_image: string
}

interface ImageData {
  id: string
  url: string
  aspectRatio: 'original' | '16:9' | '4:3' | '9:16'
  orientation: 'landscape' | 'portrait'
}

const PostWrite = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [postData, setPostData] = useState<PostData>({
    content: '',
    location: '',
    hashtags: [],
    images: [],
    emojis: [],
    category: '',
    author_id: '',
    author_name: '',
    author_profile_image: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [currentImage, setCurrentImage] = useState<File | null>(null)
  const [processedImages, setProcessedImages] = useState<ImageData[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'original' | '16:9' | '4:3' | '9:16' | null>(null)
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // URL에서 카테고리 정보를 가져오기
  const category = searchParams.get('category') || '어린이집,유치원'

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        // 먼저 Supabase Auth에서 사용자 확인 (OAuth 사용자용)
        const { data: { user } } = await supabase.auth.getUser()
        console.log('🔐 현재 인증된 사용자:', user)
        
        if (user) {
          // OAuth 사용자인 경우 profiles 테이블에서 사용자 정보 가져오기
          const { data: profileData } = await supabase
            .from('profiles')
            .select('auth_user_id, full_name, nickname, profile_image_url')
            .eq('auth_user_id', user.id)
            .single()

          console.log('👤 OAuth 사용자 프로필 데이터:', profileData)

          if (profileData) {
            setPostData(prev => ({
              ...prev,
              author_id: profileData.auth_user_id, // auth_user_id 사용 (RLS 정책에 맞춤)
              author_name: profileData.nickname || profileData.full_name,
              author_profile_image: profileData.profile_image_url,
              category: category
            }))
          }
        } else {
          // Supabase Auth에 사용자가 없는 경우, 전화번호 가입 사용자 확인
          console.log('📱 휴대전화 가입 사용자 확인 중...')
          const isLoggedIn = localStorage.getItem('isLoggedIn')
          const userProfile = localStorage.getItem('userProfile')
          
          if (isLoggedIn === 'true' && userProfile) {
            try {
              const profile = JSON.parse(userProfile)
              console.log('📱 localStorage에서 파싱된 프로필:', profile)
              
              // profiles 테이블에서 user_type 정보 가져오기
              const { data: profileData } = await supabase
                .from('profiles')
                .select('auth_user_id, full_name, nickname, profile_image_url')
                .eq('auth_user_id', profile.id)
                .single()
              
              if (profileData) {
                console.log('✅ profiles 테이블에서 가져온 정보:', profileData)
                setPostData(prev => ({
                  ...prev,
                  author_id: profileData.auth_user_id,
                  author_name: profileData.nickname || profileData.full_name,
                  author_profile_image: profileData.profile_image_url,
                  category: category
                }))
                             } else {
                 console.log('⚠️ profiles 테이블에 정보 없음, localStorage 정보 사용')
                 setPostData(prev => ({
                   ...prev,
                   author_id: profile.id, // profiles 테이블의 id 사용
                   author_name: profile.nickname || profile.full_name || '',
                   author_profile_image: profile.profile_image_url || '',
                   category: category
                 }))
               }
            } catch (parseError) {
              console.error('프로필 파싱 오류:', parseError)
            }
          } else {
            console.log('❌ 로그인 상태가 아니거나 프로필 정보 없음')
          }
        }
      } catch (error) {
        console.error('사용자 정보 조회 오류:', error)
      }
    }

    getUserInfo()
  }, [category])

  const handleGoBack = () => {
    navigate(`/main?category=${encodeURIComponent(category)}`)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value
    setPostData(prev => ({ ...prev, content }))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 스페이스바나 엔터를 눌렀을 때 해시태그 처리
    if (e.key === ' ' || e.key === 'Enter') {
      const content = e.currentTarget.value
      
      // 해시태그 자동 추출
      const hashtagRegex = /#[가-힣a-zA-Z0-9_]+/g
      const matches = content.match(hashtagRegex)
      
      if (matches) {
        const extractedHashtags = matches.map(tag => tag.slice(1)) // # 제거
        
        // 입력칸에서 해시태그 제거하고 일반 텍스트만 남기기
        const cleanContent = content.replace(hashtagRegex, '').trim()
        
        setPostData(prev => ({ 
          ...prev, 
          content: cleanContent,
          hashtags: [...prev.hashtags, ...extractedHashtags]
        }))
      }
    }
  }

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostData(prev => ({ ...prev, location: e.target.value }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    
    // 이미지 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있습니다.')
      // input 초기화
      if (e.target) {
        e.target.value = ''
      }
      return
    }
    
    setCurrentImage(file)
    setSelectedAspectRatio(null)
    setShowImageEditor(true)
    setError('') // 이전 에러 메시지 초기화
  }

  const createPreview = (aspectRatio: 'original' | '16:9' | '4:3' | '9:16') => {
    if (!currentImage) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.onload = () => {
      let { width, height } = img
      let offsetX = 0
      let offsetY = 0

      // 비율에 따른 캔버스 크기 설정
      switch (aspectRatio) {
        case '16:9':
          if (width / height > 16 / 9) {
            // 가로가 더 긴 경우 - 세로 기준으로 크롭
            height = (width * 9) / 16
            offsetY = (img.height - height) / 2
          } else {
            // 세로가 더 긴 경우 - 가로 기준으로 크롭
            width = (height * 16) / 9
            offsetX = (img.width - width) / 2
          }
          break
        case '4:3':
          if (width / height > 4 / 3) {
            // 가로가 더 긴 경우 - 세로 기준으로 크롭
            height = (width * 3) / 4
            offsetY = (img.height - height) / 2
          } else {
            // 세로가 더 긴 경우 - 가로 기준으로 크롭
            width = (height * 4) / 3
            offsetX = (img.width - width) / 2
          }
          break
        case '9:16':
          if (width / height > 9 / 16) {
            // 가로가 더 긴 경우 - 가로 기준으로 크롭
            width = (height * 9) / 16
            offsetX = (img.width - width) / 2
          } else {
            // 세로가 더 긴 경우 - 세로 기준으로 크롭
            height = (width * 16) / 9
            offsetY = (img.height - height) / 2
          }
          break
        default:
          // 원본 비율 유지
          break
      }

      // 원본 이미지 크기로 캔버스 설정 (크롭된 영역을 표시하기 위해)
      canvas.width = img.width
      canvas.height = img.height

      // 배경을 어두운 색으로 채우기
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 크롭된 이미지 그리기
      ctx.drawImage(img, offsetX, offsetY, width, height, offsetX, offsetY, width, height)
      
      setPreviewCanvas(canvas)
      setSelectedAspectRatio(aspectRatio)
    }

    img.src = URL.createObjectURL(currentImage)
  }

  const processImage = (aspectRatio: 'original' | '16:9' | '4:3' | '9:16') => {
    if (!currentImage) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.onload = () => {
      let { width, height } = img
      let offsetX = 0
      let offsetY = 0

      // 비율에 따른 캔버스 크기 설정
      switch (aspectRatio) {
        case '16:9':
          if (width / height > 16 / 9) {
            // 가로가 더 긴 경우 - 세로 기준으로 크롭
            height = (width * 9) / 16
            offsetY = (img.height - height) / 2
          } else {
            // 세로가 더 긴 경우 - 가로 기준으로 크롭
            width = (height * 16) / 9
            offsetX = (img.width - width) / 2
          }
          break
        case '4:3':
          if (width / height > 4 / 3) {
            // 가로가 더 긴 경우 - 세로 기준으로 크롭
            height = (width * 3) / 4
            offsetY = (img.height - height) / 2
          } else {
            // 세로가 더 긴 경우 - 가로 기준으로 크롭
            width = (height * 4) / 3
            offsetX = (img.width - width) / 2
          }
          break
        case '9:16':
          if (width / height > 9 / 16) {
            // 가로가 더 긴 경우 - 가로 기준으로 크롭
            width = (height * 9) / 16
            offsetX = (img.width - width) / 2
          } else {
            // 세로가 더 긴 경우 - 세로 기준으로 크롭
            height = (width * 16) / 9
            offsetY = (img.height - height) / 2
          }
          break
        default:
          // 원본 비율 유지
          break
      }

      canvas.width = width
      canvas.height = height

      // 이미지 그리기
      ctx.drawImage(img, offsetX, offsetY, width, height, 0, 0, width, height)

      // 캔버스를 Blob으로 변환
      canvas.toBlob(async (blob) => {
        if (!blob) return

        try {
          // Supabase Storage에 업로드
          const fileExt = currentImage.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
          const filePath = `${fileName}`

          console.log('📤 업로드 시도:', {
            bucket: 'community-images',
            filePath,
            fileSize: blob.size,
            fileType: blob.type,
            currentUser: postData.author_id,
            currentUserName: postData.author_name
          })

          // 현재 인증 상태 확인
          const { data: { user } } = await supabase.auth.getUser()
          console.log('🔐 업로드 시점 인증 상태:', user)

          const { error: uploadError } = await supabase.storage
            .from('community-images')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Supabase Storage 오류 상세:', uploadError)
            throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
          }

          console.log('업로드 성공:', filePath)

          // 업로드된 이미지의 공개 URL 가져오기
          const { data: { publicUrl } } = supabase.storage
            .from('community-images')
            .getPublicUrl(filePath)

          // 처리된 이미지 정보 저장
          const newImageData: ImageData = {
            id: fileName,
            url: publicUrl,
            aspectRatio,
            orientation: width > height ? 'landscape' : 'portrait'
          }

          setProcessedImages(prev => [...prev, newImageData])
          setPostData(prev => ({
            ...prev,
            images: [...prev.images, publicUrl]
          }))

          // 이미지 에디터 닫기
          setShowImageEditor(false)
          setCurrentImage(null)
          setSelectedAspectRatio(null)
          setPreviewCanvas(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } catch (error) {
          console.error('이미지 업로드 오류:', error)
          if (error instanceof Error) {
            if (error.message.includes('row-level security policy')) {
              setError('이미지 업로드 권한이 없습니다. 휴대전화 가입 사용자는 Storage 접근 권한이 제한됩니다.')
            } else if (error.message.includes('bucket')) {
              setError('Storage 버킷을 찾을 수 없습니다. Supabase 설정을 확인해주세요.')
            } else {
              setError(`이미지 업로드 실패: ${error.message}`)
            }
          } else {
            setError('이미지 업로드에 실패했습니다. Supabase 설정을 확인해주세요.')
          }
        }
      }, 'image/jpeg', 0.8)
    }

    img.src = URL.createObjectURL(currentImage)
  }

  const handleEmojiSelect = (emoji: string) => {
    setPostData(prev => ({
      ...prev,
      emojis: [...prev.emojis, emoji]
    }))
  }

  const removeImage = (index: number) => {
    setProcessedImages(prev => prev.filter((_, i) => i !== index))
    setPostData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const removeEmoji = (index: number) => {
    setPostData(prev => ({
      ...prev,
      emojis: prev.emojis.filter((_: string, i: number) => i !== index)
    }))
  }

  const nextImage = () => {
    setCurrentImageIndex(prev => 
      prev === processedImages.length - 1 ? 0 : prev + 1
    )
  }

  const prevImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? processedImages.length - 1 : prev - 1
    )
  }

  const handleSubmitPost = async () => {
    if (!postData.content.trim()) {
      setError('내용을 입력해주세요.')
      return
    }

    if (!postData.location.trim()) {
      setError('지역을 입력해주세요.')
      return
    }

    if (!postData.author_id || postData.author_id === 'local-user') {
      setError('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.')
      return
    }

    console.log('📝 게시글 작성 시도:', {
      content: postData.content.substring(0, 50) + '...',
      location: postData.location,
      author_id: postData.author_id,
      author_name: postData.author_name,
      category: postData.category
    })

    setIsSubmitting(true)
    setError('')

    try {
      // 디버깅 로그 추가
      console.log('🔍 게시글 저장 시도:')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('auth.uid():', user?.id)
      console.log('postData.author_id:', postData.author_id)
      console.log('postData.author_id 타입:', typeof postData.author_id)
      console.log('전체 postData:', postData)
      
      // author_id가 비어있는지 확인
      if (!postData.author_id) {
        throw new Error('작성자 ID가 설정되지 않았습니다. 다시 시도해주세요.')
      }
      
      // community_posts 테이블에 게시글 저장
      const { error: insertError } = await supabase
        .from('community_posts')
        .insert({
          content: postData.content,
          location: postData.location,
          hashtags: postData.hashtags,
          images: postData.images,
          emojis: postData.emojis,
          category: postData.category,
          author_id: postData.author_id,
          author_name: postData.author_name,
          author_profile_image: postData.author_profile_image,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('게시글 저장 오류 상세:', insertError)
        throw new Error(`게시글 저장 실패: ${insertError.message}`)
      }

      console.log('✅ 게시글 작성 성공!')
      // 성공 시 커뮤니티로 이동
      navigate(`/main?category=${encodeURIComponent(category)}`)
    } catch (error) {
      console.error('게시글 작성 오류:', error)
      if (error instanceof Error) {
        setError(`게시글 작성 실패: ${error.message}`)
      } else {
        setError('게시글 작성에 실패했습니다.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelPost = () => {
    navigate(`/main?category=${encodeURIComponent(category)}`)
  }

  const cuteEmojis = ['🌟', '💖', '✨', '🎉', '👍', '💯', '🌺', '🌈', '🎈', '🥰', '😍', '🤗', '💕', '💝', '🎊', '🎁']

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleGoBack}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-700"><path d="m15 18-6-6 6-6"></path></svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">새 게시글 작성</h1>
            <div className="w-9"></div>
          </div>
        </div>
      </div>

      {/* Post Writing Form */}
      <div>
        <div className="bg-white/90 backdrop-blur-sm py-6 border border-white/50 shadow-lg">
          {/* Category Display */}
          <div className="mb-6 mx-4 p-4 bg-[#fb8678]/10 border border-[#fb8678]/20 rounded-xl">
            <div className="flex items-center">
              <span className="text-sm font-medium text-[#fb8678] mr-2">카테고리:</span>
              <span className="text-base font-semibold text-[#fb8678]">{category}</span>
            </div>
          </div>

          {/* Content Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3 ml-4">내용</label>
            <textarea
              value={postData.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="무엇을 공유하고 싶으신가요? #해시태그 띄워쓰기를 활용해 생성해 보세요 (예: #어린이집 #육아팁)"
              className="w-full p-4 border-t border-b border-gray-300 focus:ring-2 focus:ring-[#fb8678] focus:border-transparent resize-none text-gray-800 text-base leading-relaxed"
              rows={12}
            />
            
            {/* Content Action Icons */}
            <div className="flex items-center justify-center py-3 mx-4 space-x-16">
              <label className="flex flex-col items-center text-gray-500 hover:text-[#fb8678] hover:scale-105 transition-all duration-200 group cursor-pointer">
                <div className="p-3 rounded-xl bg-[#fb8678] shadow-sm group-hover:shadow-md transition-all">
                  <Image className="w-5 h-5 text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex flex-col items-center text-gray-500 hover:text-[#fb8678] hover:scale-105 transition-all duration-200 group"
              >
                <div className={`p-3 rounded-xl shadow-sm group-hover:shadow-md transition-all ${
                  showEmojiPicker ? 'bg-[#e67567]' : 'bg-[#fb8678]'
                }`}>
                  <Smile className="w-5 h-5 text-white" />
                </div>
              </button>
              
              {/* 어린이집/유치원 선택 (카테고리가 어린이집,유치원일 경우에만 표시) */}
              {category === '어린이집,유치원' && (
                <button className="flex flex-col items-center text-gray-500 hover:text-[#fb8678] hover:scale-105 transition-all duration-200 group">
                  <div className="w-11 h-11 rounded-xl bg-[#fb8678] shadow-sm group-hover:shadow-md transition-all flex items-center justify-center">
                    <span className="text-white text-lg font-medium">🏫</span>
                  </div>
                </button>
              )}
            </div>



            {/* Hashtags Display */}
            {postData.hashtags.length > 0 && (
              <div className="mt-4 mx-4">
                <div className="flex flex-wrap gap-2">
                  {postData.hashtags.map((tag, index) => (
                    <span key={index} className="px-3 py-2 bg-[#fb8678]/10 text-[#fb8678] text-sm rounded-full border border-[#fb8678]/20 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Images Display - Instagram Style */}
            {processedImages.length > 0 && (
              <div className="mt-4 mx-4">
                <div className="relative">
                  {/* Main Image */}
                  <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden">
                    <img
                      src={processedImages[currentImageIndex].url}
                      alt={`게시글 이미지 ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Navigation Arrows */}
                    {processedImages.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    
                    {/* Image Counter */}
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                      {currentImageIndex + 1} / {processedImages.length}
                    </div>
                  </div>
                  
                  {/* Thumbnail Navigation */}
                  {processedImages.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {processedImages.map((image, index) => (
                        <button
                          key={image.id}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentImageIndex 
                              ? 'border-[#fb8678]' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={image.url}
                            alt={`썸네일 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(currentImageIndex)}
                    className="absolute top-2 left-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Emojis Display */}
            {postData.emojis.length > 0 && (
              <div className="mt-4 mx-4">
                <div className="flex flex-wrap gap-2">
                  {postData.emojis.map((emoji, index) => (
                    <div key={index} className="relative">
                      <span className="text-2xl">{emoji}</span>
                      <button
                        onClick={() => removeEmoji(index)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="mt-3 mx-4 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
                <div className="flex flex-wrap gap-1">
                  {cuteEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-xl hover:scale-110 transition-transform cursor-pointer p-1 hover:bg-[#fb8678]/10 rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Location Input */}
          <div className="mb-8 mx-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">지역</label>
            <input
              type="text"
              value={postData.location}
              onChange={handleLocationChange}
              placeholder="예: 강남구"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-gray-800 text-base"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 mx-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 하단 여백 (고정 버튼 공간) */}
          <div className="h-[70px]"></div>
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-white/50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-1px_rgba(0,0,0,0.06)] h-[70px] flex items-center py-2 px-3">
        <div className="flex space-x-3 w-full max-w-md mx-auto">
          <button
            onClick={handleCancelPost}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmitPost}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#fb8678]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                게시 중...
              </>
            ) : (
              '게시하기'
            )}
          </button>
        </div>
      </div>

      {/* Image Editor Modal */}
      {showImageEditor && currentImage && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="w-full h-full flex flex-col" style={{ maxHeight: '100vh', height: '100%' }}>
            {/* Header - Instagram Style */}
            <div className="bg-black/90 backdrop-blur-md border-b border-white/10 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowImageEditor(false)
                    setCurrentImage(null)
                    setSelectedAspectRatio(null)
                    setPreviewCanvas(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
                <h3 className="text-lg font-semibold text-white">편집</h3>
                <button
                  onClick={() => {
                    if (selectedAspectRatio) {
                      processImage(selectedAspectRatio)
                    }
                  }}
                  disabled={!selectedAspectRatio}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedAspectRatio
                      ? 'bg-[#fb8678] text-white hover:bg-[#e67567]'
                      : 'bg-white/20 text-white/50 cursor-not-allowed'
                  }`}
                >
                  다음
                </button>
              </div>
            </div>
            
            {/* Image Preview - Full Screen with Instagram Style */}
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black p-4 relative min-h-0 overflow-hidden">
              {selectedAspectRatio && previewCanvas ? (
                <div className="relative">
                  <canvas
                    ref={(canvas) => {
                      if (canvas && previewCanvas) {
                        const ctx = canvas.getContext('2d')
                        if (ctx) {
                          canvas.width = previewCanvas.width
                          canvas.height = previewCanvas.height
                          ctx.drawImage(previewCanvas, 0, 0)
                        }
                      }
                    }}
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                    style={{
                      maxWidth: '90vw',
                      maxHeight: 'calc(100vh - 280px - env(safe-area-inset-bottom))'
                    }}
                  />
                  {/* Aspect Ratio Badge */}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium border border-white/20">
                    {selectedAspectRatio === 'original' ? '원본' : 
                     selectedAspectRatio === '16:9' ? '16:9' : 
                     selectedAspectRatio === '4:3' ? '4:3' : '9:16'}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(currentImage)}
                    alt="편집할 이미지"
                    className="max-w-full max-h-full object-contain rounded-2xl"
                    style={{
                      maxWidth: '90vw',
                      maxHeight: 'calc(100vh - 280px - env(safe-area-inset-bottom))'
                    }}
                  />
                  {/* Original Badge */}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium border border-white/20">
                    원본
                  </div>
                </div>
              )}
            </div>
            
            {/* Bottom Controls - Soda Camera Style */}
            <div className="bg-black/95 backdrop-blur-md border-t border-white/10 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 flex-shrink-0 overflow-visible" style={{ paddingBottom: `max(1rem, calc(1rem + env(safe-area-inset-bottom)))` }}>
              {/* Aspect Ratio Options - Instagram Story Style */}
              <div className="mb-4 sm:mb-6 overflow-visible">
                <h4 className="text-sm font-medium text-white/80 mb-4 text-center">비율 선택</h4>
                <div className="flex justify-center space-x-2 sm:space-x-4 overflow-x-auto overflow-y-visible pb-2 pt-3 -mx-2 px-2">
                  <button
                    onClick={() => createPreview('original')}
                    className={`flex flex-col items-center p-3 sm:p-4 rounded-2xl transition-all duration-300 flex-shrink-0 ${
                      selectedAspectRatio === 'original'
                        ? 'bg-[#fb8678] text-white shadow-lg shadow-[#fb8678]/30 scale-105'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 hover:scale-105 border border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-lg mb-2 flex items-center justify-center">
                      <div className="w-6 h-4 bg-white rounded-sm"></div>
                    </div>
                    <div className="font-medium text-sm">원본</div>
                  </button>
                  
                  <button
                    onClick={() => createPreview('16:9')}
                    className={`flex flex-col items-center p-3 sm:p-4 rounded-2xl transition-all duration-300 flex-shrink-0 ${
                      selectedAspectRatio === '16:9'
                        ? 'bg-[#fb8678] text-white shadow-lg shadow-[#fb8678]/30 scale-105'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 hover:scale-105 border border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-lg mb-2 flex items-center justify-center">
                      <div className="w-6 h-3 bg-white rounded-sm"></div>
                    </div>
                    <div className="font-medium text-sm">16:9</div>
                  </button>
                  
                  <button
                    onClick={() => createPreview('4:3')}
                    className={`flex flex-col items-center p-3 sm:p-4 rounded-2xl transition-all duration-300 flex-shrink-0 ${
                      selectedAspectRatio === '4:3'
                        ? 'bg-[#fb8678] text-white shadow-lg shadow-[#fb8678]/30 scale-105'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 hover:scale-105 border border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-lg mb-2 flex items-center justify-center">
                      <div className="w-5 h-4 bg-white rounded-sm"></div>
                    </div>
                    <div className="font-medium text-sm">4:3</div>
                  </button>

                  <button
                    onClick={() => createPreview('9:16')}
                    className={`flex flex-col items-center p-3 sm:p-4 rounded-2xl transition-all duration-300 flex-shrink-0 ${
                      selectedAspectRatio === '9:16'
                        ? 'bg-[#fb8678] text-white shadow-lg shadow-[#fb8678]/30 scale-105'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 hover:scale-105 border border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-lg mb-2 flex items-center justify-center">
                      <div className="w-4 h-8 bg-white rounded-sm"></div>
                    </div>
                    <div className="font-medium text-sm">9:16</div>
                  </button>
                </div>
              </div>
              

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostWrite
