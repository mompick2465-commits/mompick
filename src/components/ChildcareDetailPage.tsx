import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ChevronLeft, 
  Star, 
  MapPin, 
  Phone, 
  Clock, 
  Users, 
  Shield, 
  Utensils, 
  Bus, 
  GraduationCap,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Check,
  Info,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Camera,
  X,
  MoreHorizontal,
  Flag
} from 'lucide-react'
import { fetchChildcareDetail, formatChildcareDate } from '../utils/childcareDetailApi'
import { 
  getChildcareReviews,
  getChildcareReviewStats,
  toggleChildcareReviewHelpful,
  toggleChildcareReviewHelpfulWithNotification,
  getUserChildcareReview,
  deleteChildcareReview,
  requestChildcareReviewDeletion
} from '../utils/childcareReviewApi'
import { supabase } from '../lib/supabase'
import { addFavorite, removeFavorite, isFavorited } from '../utils/favorites'
import { ChildcareDetailSummary } from '../utils/childcareDetailApi'

const ChildcareDetailPage: React.FC = () => {
  const { stcode } = useParams<{ stcode: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [childcare, setChildcare] = useState<ChildcareDetailSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [xmlResponse, setXmlResponse] = useState<string | null>(null)
  const [jsonData, setJsonData] = useState<any[]>([])
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'detail' | 'meal' | 'reviews'>('detail')
  const [reviewsState, setReviewsState] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false)
  const [reviewStats, setReviewStats] = useState<{ total_reviews: number; average_rating: number; rating_distribution: Record<number, number> } | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [hasMoreReviews, setHasMoreReviews] = useState<boolean>(false)
  // 사용자가 도움됨을 누른 리뷰 ID들을 추적 (유치원과 동일)
  const [userHelpfulReviews, setUserHelpfulReviews] = useState<Set<string>>(new Set())
  // 대기중인 삭제요청이 있는 리뷰 ID들을 추적
  const [pendingDeleteRequestReviewIds, setPendingDeleteRequestReviewIds] = useState<Set<string>>(new Set())
  // 리뷰 옵션 및 모달 상태 (유치원과 동일 UX)
  const [showReviewMenu, setShowReviewMenu] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [pendingDeleteReviewId, setPendingDeleteReviewId] = useState<string | null>(null)
  const [deleteRequestReason, setDeleteRequestReason] = useState<string>('')
  const [showReportModal, setShowReportModal] = useState<boolean>(false)
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false)
  const [reportReason, setReportReason] = useState<string>('')
  const [reportType, setReportType] = useState<string>('spam')
  const [reportLoading, setReportLoading] = useState<boolean>(false)
  const [blockLoading, setBlockLoading] = useState<boolean>(false)
  const [pendingBlockUserId, setPendingBlockUserId] = useState<string | null>(null)
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [userReview, setUserReview] = useState<any>(null)
  const [showHeartBurst, setShowHeartBurst] = useState(false)
  
  // 어린이집알리미 API 정보 팝업 상태
  const [showApiInfoModal, setShowApiInfoModal] = useState<boolean>(false)
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserType, setCurrentUserType] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          
          // 사용자 타입 조회
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('auth_user_id', user.id)
            .maybeSingle()
          
          if (profileData) {
            setCurrentUserType(profileData.user_type)
          }
          
          if (stcode) {
            const fav = await isFavorited(user.id, 'childcare', String(stcode))
            setIsFavorite(fav)
          }
        }
      } catch {}
    })()
  }, [])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isUsingSampleData, setIsUsingSampleData] = useState(false)
  const [isStaffExperienceExpanded, setIsStaffExperienceExpanded] = useState(false)
  const [isClassDetailsExpanded, setIsClassDetailsExpanded] = useState(false)
  const [isWaitingListExpanded, setIsWaitingListExpanded] = useState(false)
  const [showPhotoGallery, setShowPhotoGallery] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [imageViewerPhotos, setImageViewerPhotos] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)
  const [currentImageViewerReview, setCurrentImageViewerReview] = useState<{ reviewId: string; reviewIndex: number } | null>(null)
  const [showImageViewerMenu, setShowImageViewerMenu] = useState<boolean>(false)
  const [showImageReportModal, setShowImageReportModal] = useState<boolean>(false)
  const [imageReportReason, setImageReportReason] = useState<string>('')
  const [imageReportType, setImageReportType] = useState<string>('wrong_purpose')
  const [imageReportLoading, setImageReportLoading] = useState<boolean>(false)
  const [isBuildingImageReport, setIsBuildingImageReport] = useState<boolean>(false)
  const [isMealImageReport, setIsMealImageReport] = useState<boolean>(false)
  const [currentBuildingImageIndex, setCurrentBuildingImageIndex] = useState<number>(0)
  
  // 급식 데이터 (어제, 오늘, 내일)
  const [mealPhotos, setMealPhotos] = useState<{
    yesterday: string[]
    today: string[]
    tomorrow: string[]
  }>({
    yesterday: [],
    today: [],
    tomorrow: []
  })
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const openImageViewer = (photos: string[], startIndex: number = 0, reviewId?: string, reviewIndex?: number, isMealImage: boolean = false) => {
    if (!photos || photos.length === 0) return
    setImageViewerPhotos(photos)
    setCurrentImageIndex(Math.min(Math.max(startIndex, 0), photos.length - 1))
    setShowImageViewer(true)
    setIsMealImageReport(isMealImage)
    setIsBuildingImageReport(false)
    if (reviewId !== undefined && reviewIndex !== undefined) {
      setCurrentImageViewerReview({ reviewId, reviewIndex })
    } else {
      setCurrentImageViewerReview(null)
    }
    setShowImageViewerMenu(false)
  }
  const closeImageViewer = () => {
    setShowImageViewer(false)
    setShowImageViewerMenu(false)
    setCurrentImageViewerReview(null)
    setIsMealImageReport(false)
    setIsBuildingImageReport(false)
  }
  const goPrevImage = () => {
    if (imageViewerPhotos.length === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + imageViewerPhotos.length) % imageViewerPhotos.length)
  }
  const goNextImage = () => {
    if (imageViewerPhotos.length === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % imageViewerPhotos.length)
  }
  const handleTouchStartViewer = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartXRef.current = t.clientX
    touchStartYRef.current = t.clientY
  }
  const handleTouchEndViewer = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartXRef.current
    const threshold = 50
    if (Math.abs(dx) > threshold) {
      if (dx > 0) goPrevImage()
      else goNextImage()
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }
  const [activeFilter, setActiveFilter] = useState('전체')
  
  // 공유 바텀시트 상태
  const [showShareSheet, setShowShareSheet] = useState<boolean>(false)
  const [shareDragStartY, setShareDragStartY] = useState<number | null>(null)
  const [shareDragY, setShareDragY] = useState<number>(0)
  const [shareIsDragging, setShareIsDragging] = useState<boolean>(false)
  const [showReviewOptions, setShowReviewOptions] = useState<boolean>(false)
  // 급식 캘린더 토글
  const [isMealCalendarOpen, setIsMealCalendarOpen] = useState<boolean>(false)
  
  // 상세 값 유무 판단용 플래그
  const staffHasBreakdown = !!childcare && (
    (childcare.staff.director || 0) > 0 ||
    (childcare.staff.teacher || 0) > 0 ||
    (childcare.staff.specialTeacher || 0) > 0 ||
    (childcare.staff.therapist || 0) > 0 ||
    (childcare.staff.nutritionist || 0) > 0 ||
    (childcare.staff.nurse || 0) > 0 ||
    (childcare.staff.nurseAssistant || 0) > 0 ||
    (childcare.staff.cook || 0) > 0 ||
    (childcare.staff.clerk || 0) > 0
  )
  
  // 사진 갤러리, API 정보 모달이 열렸을 때 body 스크롤 비활성화
  useEffect(() => {
    if (showPhotoGallery || showApiInfoModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showPhotoGallery, showApiInfoModal])
  
  // 공유 시트가 열릴 때 배경 스크롤 비활성화
  useEffect(() => {
    if (showShareSheet) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [showShareSheet])

  // 공유 핸들러들
  const getShareUrl = () => {
    try {
      const a = searchParams.get('arcode')
      const base = `${window.location.origin}/childcare/${stcode}`
      return a ? `${base}?arcode=${encodeURIComponent(a)}` : base
    } catch {
      return `${window.location.origin}/childcare/${stcode}`
    }
  }
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      alert('공유 링크가 복사되었습니다.')
    } catch {}
    setShowShareSheet(false)
  }

  const handleShareClick = async () => {
    try {
      const shareTitle = `맘픽 · ${childcare?.name || '어린이집'} 정보 공유`
      const shareText = `${childcare?.name || '어린이집'} 정보를 공유합니다.`
      const navWithShare = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> }
      if (navWithShare.share) {
        await navWithShare.share({ title: shareTitle, text: shareText, url: getShareUrl() })
        setShowShareSheet(false)
        return
      }
    } catch {}
    // 폴백: 복사
    await handleCopyLink()
  }

  const handleEmailShare = () => {
    const subject = `맘픽 · ${childcare?.name || '어린이집'} 정보 공유`
    const body = `${childcare?.name || '어린이집'} 정보를 공유합니다.\n\n${getShareUrl()}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setShowShareSheet(false)
  }

  const handleBandShare = () => {
    const text = `${childcare?.name || '어린이집'} 정보를 공유합니다.`
    const u = getShareUrl()
    const url = `https://band.us/plugin/share?body=${encodeURIComponent(text)}%0A${encodeURIComponent(u)}&route=${encodeURIComponent(u)}`
    window.open(url, '_blank')
    setShowShareSheet(false)
  }

  const handleKakaoShare = async () => {
    const Kakao = (window as any).Kakao
    try {
      if (Kakao?.isInitialized?.() && Kakao?.Share) {
        await Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: '맘픽 · 어린이집',
            description: childcare?.name || '어린이집 정보 공유',
            imageUrl: `${window.location.origin}/headericon.png`,
            link: { mobileWebUrl: getShareUrl(), webUrl: getShareUrl() }
          }
        })
        setShowShareSheet(false)
        return
      }
    } catch {}
    await handleShareClick()
    setShowShareSheet(false)
  }

  const handleSmsShare = () => {
    const body = `${childcare?.name || '어린이집'} 정보를 공유합니다.\n\n${getShareUrl()}`
    window.location.href = `sms:?&body=${encodeURIComponent(body)}`
    setShowShareSheet(false)
  }

  // 공유 시트 드래그 핸들러
  const handleShareSheetTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    setShareIsDragging(true)
    setShareDragStartY(t.clientY)
    setShareDragY(0)
  }
  const handleShareSheetTouchMove = (e: React.TouchEvent) => {
    if (!shareIsDragging || shareDragStartY === null) return
    const t = e.changedTouches[0]
    const dy = t.clientY - shareDragStartY
    if (dy > 0) setShareDragY(dy)
  }
  const handleShareSheetTouchEnd = () => {
    if (shareDragY > 60) {
      setShowShareSheet(false)
      setShareIsDragging(false)
      requestAnimationFrame(() => {
        setShareDragY(0)
        setShareDragStartY(null)
      })
      return
    }
    setShareIsDragging(false)
    requestAnimationFrame(() => {
      setShareDragY(0)
      setShareDragStartY(null)
    })
  }
  
  // 리뷰 데이터 로드
  const loadReviews = async (page = 1, append = false) => {
    if (!stcode) return
    try {
      setReviewsLoading(true)
      const result = await getChildcareReviews(stcode, page, 10, 'latest')
      const nextReviews = (result?.reviews || []).map((r: any) => ({
        id: r.id,
        user_profile: r.user_profile,
        user_id: r.user_id,
        created_at: r.created_at,
        rating: r.rating,
        content: r.content,
        images: (r.images || []).map((img: any) => img.image_url),
        helpful: r.helpful_count
      }))
      setReviewsState(prev => append ? [...prev, ...nextReviews] : nextReviews)
      setHasMoreReviews(result?.hasMore || false)
      setCurrentPage(page)
      // 현재 사용자 기준 도움됨 상태 및 대기중인 삭제요청 로드/병합
      try {
        // 현재 사용자 프로필 ID 조회
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle()
          if (profile?.id) {
            const reviewIds = nextReviews.map((r: any) => r.id)
            if (reviewIds.length > 0) {
              // 도움됨 목록 조회
              const { data: helpfulData } = await supabase
                .from('childcare_review_helpful')
                .select('review_id')
                .eq('user_id', profile.id)
                .in('review_id', reviewIds)
              const fetchedIds = new Set((helpfulData || []).map((h: any) => h.review_id))
              setUserHelpfulReviews(prev => {
                if (append) {
                  const merged = new Set(prev)
                  fetchedIds.forEach(id => merged.add(id))
                  return merged
                }
                return fetchedIds
              })

              // 대기중인 삭제요청 확인 (본인 리뷰만)
              const ownReviewIds = nextReviews
                .filter((r: any) => r.user_id === user.id)
                .map((r: any) => r.id)
              
              if (ownReviewIds.length > 0) {
                const { data: deleteRequests } = await supabase
                  .from('review_delete_requests')
                  .select('review_id')
                  .eq('review_type', 'childcare')
                  .eq('requester_id', profile.id)
                  .eq('status', 'pending')
                  .in('review_id', ownReviewIds)
                
                const pendingDeleteIds = new Set((deleteRequests || []).map((req: any) => req.review_id))
                setPendingDeleteRequestReviewIds(prev => {
                  if (append) {
                    const merged = new Set(prev)
                    pendingDeleteIds.forEach(id => merged.add(id))
                    return merged
                  }
                  return pendingDeleteIds
                })
              } else if (!append) {
                setPendingDeleteRequestReviewIds(new Set())
              }
            } else if (!append) {
              setUserHelpfulReviews(new Set())
              setPendingDeleteRequestReviewIds(new Set())
            }
          }
        }
      } catch {}
    } catch (e) {
      setReviewsState([])
      setHasMoreReviews(false)
    } finally {
      setReviewsLoading(false)
    }
  }

  const loadReviewStats = async () => {
    if (!stcode) return
    try {
      const stats = await getChildcareReviewStats(stcode)
      setReviewStats(stats as any)
    } catch {}
  }

  // 무한 스크롤을 위한 Intersection Observer
  useEffect(() => {
    if (!hasMoreReviews || reviewsLoading || !stcode) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreReviews && !reviewsLoading) {
          loadReviews(currentPage + 1, true)
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = document.getElementById('reviews-sentinel')
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel)
      }
    }
  }, [hasMoreReviews, reviewsLoading, currentPage, stcode])
  
  const ratingDistribution = reviewStats?.rating_distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  const averageRating = reviewStats?.average_rating ? reviewStats.average_rating.toFixed(1) : 0
  
  // 사진이 있는 리뷰들을 최신순으로 정렬 (유치원 페이지와 동일 로직)
  const photosWithReviews = reviewsState.filter((review: any) => !review.is_hidden)
    .filter((review: any) => (review.images?.length || 0) > 0)
    .sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
  
  // 표시할 사진 개수 (미리보기용)
  const displayPhotos = photosWithReviews.slice(0, 4)
  // 전체 사진 URL 플랫 배열 (뷰어용)
  const allPhotoUrls: string[] = photosWithReviews.flatMap((r: any) => (r.images || []))
  // 썸네일 표시용 평탄화 아이템 (유치원 스타일 유사: 평점 배지 유지)
  const photoItems: { imageUrl: string; rating: number; globalIndex: number }[] = (() => {
    const items: { imageUrl: string; rating: number; globalIndex: number }[] = []
    let idx = 0
    photosWithReviews.forEach((review: any) => {
      ;(review.images || []).forEach((url: string) => {
        items.push({ imageUrl: url, rating: review.rating, globalIndex: idx })
        idx++
      })
    })
    return items
  })()
  const totalPhotoCount = photoItems.length
  const displayPhotoItems = photoItems.slice(0, 4)
  
  // 중복 호출 방지를 위한 ref
  const isLoadingRef = useRef(false)
  
  // URL에서 지역 정보 가져오기
  const arcode = searchParams.get('arcode') || ''

  useEffect(() => {
    if (stcode && !isLoadingRef.current) {
      isLoadingRef.current = true
      loadChildcareDetail()
    }
    return () => { isLoadingRef.current = false }
  }, [stcode])

  // 리뷰 탭 진입 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'reviews' && stcode) {
      loadReviews(1, false)
      loadReviewStats()
      ;(async () => {
        try {
          const ur = await getUserChildcareReview(stcode)
          setUserReview(ur)
        } catch {}
      })()
    }
  }, [activeTab, stcode])

  // 현재 사용자 auth ID 및 profile ID 로드 (리뷰 메뉴 노출 분기용 및 건물사진 신고용)
  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentAuthUserId(user.id)
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle()
          if (profile?.id) setCurrentProfileId(profile.id)
          else setCurrentProfileId(null)
        } else {
          setCurrentAuthUserId(null)
          setCurrentProfileId(null)
        }
      } catch {
        setCurrentAuthUserId(null)
        setCurrentProfileId(null)
      }
    })()
  }, [stcode])

  const loadChildcareDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      setXmlResponse(null)
      setJsonData([])
      setDebugInfo(null)
      
      // console.log('🏢 어린이집 상세 정보 로딩:', { stcode, arcode }) // 중복 로그 방지
      
      const data = await fetchChildcareDetail(stcode!, arcode)
      if (data) {
        // 커스텀 정보 추가로 로드 (관리자가 업로드한 건물 사진 등)
        try {
          const { data: customInfo, error: customError } = await supabase
            .from('childcare_custom_info')
            .select('*')
            .eq('facility_code', stcode!)
            .eq('is_active', true)
            .maybeSingle()
          
          if (!customError && customInfo) {
            data.customInfo = {
              building_images: customInfo.building_images || [],
              meal_images: customInfo.meal_images || [],
              detailed_description: customInfo.detailed_description || undefined,
              facilities: customInfo.facilities || [],
              programs: customInfo.programs || []
            }
            console.log('✅ 커스텀 정보 로드:', customInfo.building_images?.length || 0, '개 건물 사진')
          }
        } catch (err) {
          console.log('커스텀 정보 없음:', err)
        }
        
        setChildcare(data)
        
        // API 실패로 샘플 데이터를 사용하는 경우 사용자에게 알림
        if (data.name.includes('샘플 어린이집 (') && data.address === '정보를 불러올 수 없습니다') {
          console.warn('⚠️ 실제 API 데이터를 불러올 수 없어 임시 데이터를 표시합니다.')
          setIsUsingSampleData(true)
        }
      } else {
        setError('어린이집 정보를 찾을 수 없습니다.')
      }
    } catch (err: any) {
      console.error('어린이집 상세 정보 로딩 오류:', err)
      
      // 404 에러인 경우 XML 응답 데이터가 포함되어 있을 수 있음
      if (err.response && err.response.status === 404) {
        try {
          const errorData = await err.response.json()
          if (errorData.xmlResponse) {
            setXmlResponse(errorData.xmlResponse)
            setJsonData(errorData.jsonData || [])
            setDebugInfo(errorData.debugInfo || null)
            console.log('🔍 XML 응답 데이터 저장됨:', errorData.xmlResponse.length, '문자')
          }
        } catch (parseErr) {
          console.error('에러 응답 파싱 실패:', parseErr)
        }
      }
      
      setError('어린이집 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      // 로딩 완료 후 ref 초기화
      isLoadingRef.current = false
    }
  }

  // 급식 탭이 활성화될 때 급식 사진 로드
  useEffect(() => {
    if (activeTab === 'meal' && stcode) {
      loadMealPhotos()
    }
  }, [activeTab, stcode])

  const loadMealPhotos = async () => {
    if (!stcode) return

    try {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const formatDate = (date: Date) => date.toISOString().split('T')[0]

      const { data: meals } = await supabase
        .from('childcare_meals')
        .select('meal_date, meal_images')
        .eq('childcare_code', stcode)
        .in('meal_date', [formatDate(yesterday), formatDate(today), formatDate(tomorrow)])
        .eq('is_active', true)

      const mealMap: any = {
        yesterday: [],
        today: [],
        tomorrow: []
      }

      meals?.forEach(meal => {
        if (meal.meal_date === formatDate(yesterday)) {
          mealMap.yesterday = meal.meal_images || []
        } else if (meal.meal_date === formatDate(today)) {
          mealMap.today = meal.meal_images || []
        } else if (meal.meal_date === formatDate(tomorrow)) {
          mealMap.tomorrow = meal.meal_images || []
        }
      })

      setMealPhotos(mealMap)
      console.log('✅ 급식 사진 로드:', mealMap)
    } catch (error) {
      console.error('급식 사진 로드 오류:', error)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case '정상': return 'text-green-600 bg-green-50'
      case '휴지': 
      case '폐지': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case '정상': return <Check className="w-3 h-3 text-green-500" strokeWidth={2.5} />
      case '휴지':
      case '폐지': return <XCircle className="w-3 h-3" />
      default: return <AlertCircle className="w-3 h-3" />
    }
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % 3)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + 3) % 3)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
          <p className="text-gray-600">어린이집 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !childcare) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate(`/kindergarten-map?type=childcare&selected=${stcode}`)}
              className="px-4 py-2 bg-[#fb8678] text-white rounded-lg hover:bg-[#fb8678]/90 transition-colors"
            >
              돌아가기
            </button>
          </div>

          {/* XML 응답 데이터 표시 */}
          {xmlResponse && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">🔍 API 응답 데이터 (1879줄)</h3>
                <p className="text-sm text-gray-600 mt-1">
                  개발키 사용으로 인해 더미 데이터가 반환되었습니다. 전체 XML 응답을 확인해보세요.
                </p>
              </div>
              
              <div className="p-4">
                {/* 디버그 정보 */}
                {debugInfo && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-2">📊 디버그 정보</h4>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <div>API URL: {debugInfo.apiUrl}</div>
                      <div>XML 길이: {debugInfo.xmlLength} 문자</div>
                      <div>개발키 사용: {debugInfo.isDevelopmentKey ? '예' : '아니오'}</div>
                      <div>메시지: {debugInfo.message}</div>
                    </div>
                  </div>
                )}

                {/* JSON 데이터 미리보기 */}
                {jsonData.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">
                      📋 파싱된 JSON 데이터 ({jsonData.length}개 항목)
                    </h4>
                    <div className="text-xs text-blue-700 max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(jsonData.slice(0, 3), null, 2)}</pre>
                      {jsonData.length > 3 && (
                        <div className="text-blue-600 mt-2">... 그리고 {jsonData.length - 3}개 더</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 전체 XML 응답 */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800">📄 전체 XML 응답</h4>
                  </div>
                  <div className="p-3 bg-gray-900 text-green-400 text-xs font-mono max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-all">{xmlResponse}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 통합 헤더 + 탭 네비게이션 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        {/* 헤더 부분 */}
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/kindergarten-map?type=childcare&selected=${stcode}`)}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate flex-1 mx-3">
            {childcare.name}
          </h1>
          <div className="flex items-center">
            <button
              onClick={() => setShowApiInfoModal(true)}
              className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="정보 출처 확인"
            >
              <Info className="w-4 h-4 text-gray-500 hover:text-[#fb8678] transition-colors" />
            </button>
            <span className="px-2 py-1 bg-[#fb8678]/10 text-[#fb8678] text-xs rounded-full font-medium">
              {childcare.type}
            </span>
          </div>
        </div>
        
        {/* 탭 네비게이션 부분 */}
        <div className="flex">
          {[
            { id: 'detail', label: '상세', icon: FileText },
            { id: 'meal', label: '급식', icon: Utensils },
            { id: 'reviews', label: '칭찬', icon: Heart }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
               className={`flex-1 flex items-center justify-center py-3 px-2 transition-colors ${
                 activeTab === id
                   ? 'text-[#fb8678] border-b-2 border-[#fb8678]'
                   : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               <Icon className="w-5 h-5" />
             </button>
          ))}
        </div>
      </div>

      {/* API 실패 알림 */}
      {isUsingSampleData && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>주의:</strong> 현재 어린이집 상세 정보를 불러올 수 없어 임시 데이터를 표시하고 있습니다. 
                잠시 후 다시 시도해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 탭 내용 */}
      <div>
        {activeTab === 'detail' && (
          <div className="space-y-4">
            <div className="bg-white pb-16 shadow-sm">
              {/* 어린이집 사진 영역 */}
              <div className="mb-4">
                {childcare?.customInfo?.building_images && childcare.customInfo.building_images.length > 0 ? (
                  <div 
                    className="relative bg-gray-100 h-40 cursor-pointer"
                    onClick={() => {
                      setImageViewerPhotos(childcare.customInfo!.building_images!)
                      setCurrentImageIndex(currentBuildingImageIndex || 0)
                      setShowImageViewer(true)
                    }}
                  >
                    <img 
                      src={childcare.customInfo.building_images[currentBuildingImageIndex || 0]} 
                      alt={`${childcare.name} 건물`}
                      className="w-full h-full object-cover"
                    />
                    {/* 이미지 카운터 */}
                    {childcare.customInfo.building_images.length > 1 && (
                      <>
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                          {(currentBuildingImageIndex || 0) + 1} / {childcare.customInfo.building_images.length}
                        </div>
                        {/* 이전/다음 버튼 */}
                        {(currentBuildingImageIndex || 0) > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentBuildingImageIndex((currentBuildingImageIndex || 0) - 1)
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        {(currentBuildingImageIndex || 0) < childcare.customInfo.building_images.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentBuildingImageIndex((currentBuildingImageIndex || 0) + 1)
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    {/* 클릭 안내 */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      클릭하여 크게보기
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 h-40 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">현재 사진없음</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-3 px-4">
                <h3 className="text-base font-semibold text-gray-900 mb-2">상세 설명</h3>
              </div>
              
              {/* 어린이집 기본 정보 */}
              <div className="mb-3 px-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-semibold">대표자명</span>
                      <span className="text-gray-900 font-medium">{childcare.director || '정보 없음'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-semibold">운영현황</span>
                      <div className="flex items-center">
                        {getStatusIcon(childcare.status)}
                        <span className={`ml-1 text-xs font-semibold ${getStatusColor(childcare.status)} px-1.5 py-0.5 rounded-full`}>
                          {childcare.status || '미상'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-500 font-semibold">인가일</span>
                      <span className="text-gray-900 font-medium ml-auto text-right">{formatChildcareDate(childcare.establishedDate)}</span>
                    </div>
                    
                    <div className="grid grid-cols-[auto,1fr] items-start col-span-2 gap-x-2">
                      <span className="text-gray-500 font-semibold">제공서비스</span>
                      <span className="text-gray-900 font-medium text-right whitespace-normal break-words pr-1">{childcare.services || '일반보육'}</span>
                    </div>
                    
                    <div className="grid grid-cols-[auto,1fr] items-center col-span-2 gap-x-2">
                      <span className="text-gray-500 font-semibold">홈페이지</span>
                      {childcare.homepage ? (
                        <a href={childcare.homepage} target="_blank" rel="noreferrer" className="justify-self-end text-[#fb8678] hover:underline font-semibold">바로가기</a>
                      ) : (
                        <span className="text-gray-900 font-medium justify-self-end">정보 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 주요 통계 */}
              <div className="mb-3 px-4">
                <div className="grid grid-cols-5 gap-2">
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">정원</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <Users className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{childcare.capacity}명</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">현원</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <Users className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{childcare.enrolled}명</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">교직원</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <GraduationCap className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{childcare.teacherCount}명</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">학급</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <Clock className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{childcare.classCount}개</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">CCTV</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <Camera className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{childcare.cctvCount}대</div>
                     </div>
                   </div>
                </div>
              </div>
              
              {/* 시설 정보 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-center">
                    <div className="text-xs text-gray-500 font-semibold">시설 정보</div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">보육실 수</span>
                      <span className="text-xs font-semibold text-gray-900">{childcare.facility.roomCount}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">보육실 면적</span>
                      <span className="text-xs font-semibold text-gray-900">{childcare.facility.roomSize}㎡</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">놀이터</span>
                      <span className="text-xs font-semibold text-gray-900">{childcare.facility.playgroundCount}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">CCTV 설치</span>
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                        {childcare.facility.cctvCount}대 설치
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 교직원 현황 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-semibold">교직원 현황</div>
                    <button
                      onClick={() => setIsStaffExperienceExpanded(!isStaffExperienceExpanded)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isStaffExperienceExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#fb8678]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#fb8678]" />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    {childcare.staff.total > 0 && staffHasBreakdown ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">원장</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.director}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">보육교사</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.teacher}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">특수교사</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.specialTeacher}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">치료교사</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.therapist}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">영양사</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.nutritionist}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">간호사</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.nurse}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">간호조무사</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.nurseAssistant}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">조리원</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.cook}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">사무직원</span>
                          <span className="text-gray-900 font-semibold">{childcare.staff.clerk}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 font-semibold">총계</span>
                          <span className="text-gray-900 font-bold">{childcare.staff.total}명</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">세부 직군별 인원 정보가 제공되지 않았습니다.</div>
                        {childcare.staff.total > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 font-semibold">총계</span>
                            <span className="text-gray-900 font-bold">{childcare.staff.total}명</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 근속연수현황 구분선 */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isStaffExperienceExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="border-t border-gray-200 my-3"></div>
                      
                      {/* 근속연수현황 */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">1년미만</span>
                          <span className="text-gray-900 font-semibold">{childcare.experience.under1Year}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">1년이상2년미만</span>
                          <span className="text-gray-900 font-semibold">{childcare.experience.year1To2}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">2년이상4년미만</span>
                          <span className="text-gray-900 font-semibold">{childcare.experience.year2To4}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">4년이상6년미만</span>
                          <span className="text-gray-900 font-semibold">{childcare.experience.year4To6}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">6년이상</span>
                          <span className="text-gray-900 font-semibold">{childcare.experience.over6Years}명</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 반별 현황 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-semibold">반별 현황</div>
                    <button
                      onClick={() => setIsClassDetailsExpanded(!isClassDetailsExpanded)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isClassDetailsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#fb8678]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#fb8678]" />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    {childcare.classCount > 0 ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">만0세반</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.age0}개 ({childcare.children.age0}명)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">만1세반</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.age1}개 ({childcare.children.age1}명)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">만2세반</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.age2}개 ({childcare.children.age2}명)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">만3세반</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.age3}개 ({childcare.children.age3}명)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">만4세반</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.age4}개 ({childcare.children.age4}명)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">만5세반</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.age5}개 ({childcare.children.age5}명)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">반별 현황 정보가 제공되지 않았습니다.</div>
                    )}
                    
                    {/* 상세 정보 구분선 */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isClassDetailsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="border-t border-gray-200 my-3"></div>
                      
                      {/* 혼합반 정보 */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">영아혼합반(0~2세)</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.mixed0To2}개 ({childcare.children.mixed0To2}명)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">유아혼합반(3~5세)</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.mixed3To5}개 ({childcare.children.mixed3To5}명)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">특수반</span>
                          <span className="text-gray-900 font-semibold">{childcare.classes.special}개 ({childcare.children.special}명)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 font-semibold">총계</span>
                          <span className="text-gray-900 font-bold">{childcare.classes.total}개 ({childcare.children.total}명)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 대기아동 현황 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-semibold">입소 대기아동 현황</div>
                    <button
                      onClick={() => setIsWaitingListExpanded(!isWaitingListExpanded)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isWaitingListExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#fb8678]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#fb8678]" />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="text-center mb-3">
                      {(() => {
                        const t = childcare.waitingList.total || 0
                        const style = t <= 5
                          ? 'bg-green-100 text-green-700'
                          : t <= 10
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                        const countClass = t <= 5
                          ? 'text-green-700'
                          : t <= 10
                          ? 'text-orange-700'
                          : 'text-red-500'
                        const label = t <= 5 ? '여유' : t <= 10 ? '보통' : '혼잡'
                        return (
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${style}`}>
                            <span className={`mr-1 text-base leading-none font-bold ${countClass}`}>{t}명</span>
                            <span className={`text-[11px] font-semibold ${countClass}`}>{label}</span>
                          </div>
                        )
                      })()}
                      <div className="text-[11px] text-gray-500 mt-1">총 대기아동수</div>
                    </div>
                    
                    {/* 상세 정보 구분선 */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isWaitingListExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="border-t border-gray-200 mb-3"></div>
                      
                      {/* 연령별 대기아동수 */}
                      {childcare.waitingList.total > 0 ? (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">만0세</span>
                            <span className="text-gray-900 font-semibold">{childcare.waitingList.age0}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">만1세</span>
                            <span className="text-gray-900 font-semibold">{childcare.waitingList.age1}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">만2세</span>
                            <span className="text-gray-900 font-semibold">{childcare.waitingList.age2}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">만3세</span>
                            <span className="text-gray-900 font-semibold">{childcare.waitingList.age3}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">만4세</span>
                            <span className="text-gray-900 font-semibold">{childcare.waitingList.age4}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">만5세</span>
                            <span className="text-gray-900 font-semibold">{childcare.waitingList.age5}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">6세 이상</span>
                            <span className="text-gray-900 font-semibold">{childcare.waitingList.over6}명</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">입소 대기아동 정보가 제공되지 않았습니다.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 통학차량 현황 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-center">
                    <div className="text-xs text-gray-500 font-semibold flex items-center justify-center">
                      <img src="/icons/schoolbusicon.svg" alt="통학 차량" className="w-4 h-4 mr-1" />
                      통학차량 현황
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {childcare.transportation.available ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-base leading-none font-bold bg-green-100 text-green-700">
                            <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                            {childcare.transportation.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-base leading-none font-bold bg-red-100 text-red-500">{childcare.transportation.status}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {childcare.transportation.available ? '통학차량을 운영하고 있습니다' : '통학차량을 운영하지 않습니다'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meal' && (
          <div className="min-h-screen bg-white">
            <div className="pt-4 px-4 pb-20">
              <div className="mb-4 bg-white rounded-xl">
                 <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center justify-between">
                   <div className="flex items-center">
                     <img src="/icons/foodicon.svg" alt="급식" className="w-8 h-8 mr-2" />
                     급식 운영
                   </div>
                   <button
                     onClick={() => navigate(`/childcare/${stcode}/meal-calendar${arcode ? `?arcode=${encodeURIComponent(arcode)}` : ''}`)}
                     className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                     aria-label="급식 캘린더로 이동"
                   >
                     <ChevronRight className="w-5 h-5 text-gray-500" />
                   </button>
                 </h3>
                  
                 {/* 급식 사진 슬라이드 */}
                 <div className="mb-4">
                   <div className="relative flex items-center justify-center">
                     {/* 왼쪽 슬라이드 버튼 */}
                     <button
                       onClick={prevSlide}
                       className="absolute left-0 z-10 p-1 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                     >
                       <ChevronLeft className="w-4 h-4 text-gray-600" />
                     </button>

                     {/* 사진 컨테이너 */}
                     <div className="flex justify-center space-x-2 mx-8">
                       {/* 어제 급식 */}
                       <div 
                         className={`flex-shrink-0 w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden shadow-sm transition-transform duration-300 ${
                           currentSlide === 0 ? 'scale-105' : 'scale-100'
                         } ${mealPhotos.yesterday.length > 0 ? 'cursor-pointer' : ''}`}
                         onClick={() => {
                          if (mealPhotos.yesterday.length > 0) {
                            openImageViewer(mealPhotos.yesterday, 0, undefined, undefined, true)
                          }
                         }}
                       >
                         {mealPhotos.yesterday.length > 0 ? (
                           <img 
                             src={mealPhotos.yesterday[0]} 
                             alt="어제 급식"
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center">
                             <Utensils className="w-8 h-8 text-gray-400" />
                           </div>
                         )}
                       </div>
                       
                       {/* 오늘 급식 */}
                       <div 
                         className={`flex-shrink-0 w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden shadow-sm transition-transform duration-300 ${
                           currentSlide === 1 ? 'scale-105' : 'scale-100'
                         } ${mealPhotos.today.length > 0 ? 'cursor-pointer' : ''}`}
                         onClick={() => {
                          if (mealPhotos.today.length > 0) {
                            openImageViewer(mealPhotos.today, 0, undefined, undefined, true)
                          }
                         }}
                       >
                         {mealPhotos.today.length > 0 ? (
                           <img 
                             src={mealPhotos.today[0]} 
                             alt="오늘 급식"
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center">
                             <Utensils className="w-8 h-8 text-gray-400" />
                           </div>
                         )}
                       </div>
                       
                       {/* 내일 급식 */}
                       <div 
                         className={`flex-shrink-0 w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden shadow-sm transition-transform duration-300 ${
                           currentSlide === 2 ? 'scale-105' : 'scale-100'
                         } ${mealPhotos.tomorrow.length > 0 ? 'cursor-pointer' : ''}`}
                         onClick={() => {
                          if (mealPhotos.tomorrow.length > 0) {
                            openImageViewer(mealPhotos.tomorrow, 0, undefined, undefined, true)
                          }
                         }}
                       >
                         {mealPhotos.tomorrow.length > 0 ? (
                           <img 
                             src={mealPhotos.tomorrow[0]} 
                             alt="내일 급식"
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center">
                             <Utensils className="w-8 h-8 text-gray-400" />
                           </div>
                         )}
                       </div>
                     </div>

                     {/* 오른쪽 슬라이드 버튼 */}
                     <button
                       onClick={nextSlide}
                       className="absolute right-0 z-10 p-1 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                     >
                       <ChevronRight className="w-4 h-4 text-gray-600" />
                     </button>
                   </div>
                 </div>

                 <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                   <div className="bg-gray-50 px-3 py-2 text-center">
                     <div className="text-xs text-gray-500 font-semibold">급식 정보</div>
                   </div>
                   <div className="p-4 space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-gray-600">급식 제공</span>
                       <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                         제공
                       </span>
                     </div>
                     
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-gray-600">간식 제공</span>
                       <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                         제공
                       </span>
                     </div>
                     
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-gray-600">영양사</span>
                       <span className="text-xs font-semibold text-gray-900">{childcare.staff.nutritionist > 0 ? '있음' : '없음'}</span>
                     </div>
                     
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-gray-600">조리원</span>
                       <span className="text-xs font-semibold text-gray-900">{childcare.staff.cook}명</span>
                     </div>
                  </div>
                  {/* 급식 캘린더 - 토글 영역 */}
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isMealCalendarOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="border-t border-gray-200" />
                    <div className="p-4">
                      {/* 유치원과 동일 패턴의 캘린더 자리 표시자 */}
                      <div className="text-sm text-gray-700 font-semibold mb-2">급식 캘린더</div>
                      <div className="rounded-lg border border-gray-200 p-3 text-xs text-gray-500">
                        캘린더 데이터 연동 예정입니다. (유치원과 동일한 컴포넌트/API 연결 가능)
                      </div>
                    </div>
                  </div>
                 </div>
               </div>
             </div>
           </div>
         )}

        {activeTab === 'reviews' && (
          <div className="min-h-screen bg-white">
            {/* 리뷰 헤더 */}
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-gray-900">칭찬 ({reviewStats?.total_reviews || 0})</h2>
              </div>
              
              {/* 평점 요약 */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{averageRating}</div>
                  <div className="flex items-center justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((heart) => (
                      <Heart
                        key={heart}
                        className={`w-4 h-4 ${
                          heart <= Math.floor(parseFloat(averageRating.toString()))
                            ? 'text-[#fb8678] fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
              <div className="text-xs text-gray-500 mt-1">총 {reviewStats?.total_reviews || 0}개</div>
                </div>
                
                {/* 별점 분포 게이지 */}
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 w-6 font-semibold">{rating}점</span>
                      <Heart className="w-3 h-3 text-[#fb8678] fill-current" />
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(reviewStats?.total_reviews || 0) > 0 ? ((ratingDistribution as any)[rating] / (reviewStats?.total_reviews || 0)) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-600 w-6 text-right">
                        ({ratingDistribution[rating as keyof typeof ratingDistribution]})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 사진 둘러보기 (유치원 스타일 동일) */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">칭찬 사진</h3>
                {totalPhotoCount > 4 && (
                  <button 
                    onClick={() => setShowPhotoGallery(true)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
              {/* 사진 한 줄 표시 (4장 미리보기 + 5장 이상일 때 +N 오버레이) */}
              <div className="flex space-x-3 overflow-x-auto">
                {displayPhotoItems.map((item, index) => (
                  <div 
                    key={index}
                    className="flex-shrink-0 w-20 h-20 aspect-square bg-gray-100 rounded-lg relative overflow-hidden cursor-zoom-in"
                    onClick={() => {
                      // photoItems에서 현재 이미지가 속한 리뷰 찾기
                      const reviewForPhoto = reviewsState.find((r: any) => 
                        !r.is_hidden && r.images && r.images.some((img: any) => (typeof img === 'string' ? img : img.image_url) === item.imageUrl)
                      )
                      const reviewIndex = reviewForPhoto ? reviewsState.findIndex((rev: any) => rev.id === reviewForPhoto.id) : -1
                      openImageViewer(allPhotoUrls, item.globalIndex, reviewForPhoto?.id, reviewIndex >= 0 ? reviewIndex : undefined)
                    }}
                  >
                    <img src={item.imageUrl} alt={`칭찬 이미지 ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded">{item.rating}점</div>
                    {index === 3 && totalPhotoCount > 4 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">+{totalPhotoCount - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
                {/* 사진이 없는 경우 */}
                {displayPhotoItems.length === 0 && (
                  <div className="flex items-center justify-center w-full h-20 text-gray-500 text-sm">
                    등록된 사진이 없습니다
                  </div>
                )}
              </div>
            </div>

            {/* 필터 및 정렬 */}
            <div className="px-4 py-3">
              <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setActiveFilter('전체')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      activeFilter === '전체' 
                        ? 'bg-[#fb8678] text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    전체
                  </button>
                  <button 
                    onClick={() => setActiveFilter('최신순')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      activeFilter === '최신순' 
                        ? 'bg-[#fb8678] text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    최신순
                  </button>
                </div>
              </div>
            </div>

            {/* 리뷰 목록 */}
            <div className="divide-y divide-gray-100">
              {reviewsLoading ? (
                <div className="px-4 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
                  <p className="text-gray-600">칭찬을 불러오는 중...</p>
                </div>
              ) : reviewsState.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-gray-600">아직 칭찬이 없습니다.</p>
                  <p className="text-gray-500 text-sm">첫 번째 칭찬을 남겨보세요!</p>
                </div>
              ) : (
                reviewsState.map((review) => (
                  <div key={review.id} className="px-4 py-4">
                    {/* 리뷰 헤더 (유치원 페이지와 동일 구조) */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {review.user_profile?.profile_image_url ? (
                            <img
                              src={review.user_profile.profile_image_url}
                              alt={review.user_profile?.nickname || '프로필'}
                              className="w-10 h-10 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {(review.user_profile?.nickname?.charAt(0)) || (review.user_profile?.full_name?.charAt(0)) || '?'}
                              </span>
                            </div>
                          )}
                          {/* 자녀 프로필 사진 배지 (학부모) */}
                          {Array.isArray(review.user_profile?.children_info) && review.user_profile.children_info.length > 0 && (
                            <div className="absolute -bottom-1 -right-1 flex items-center flex-row-reverse">
                              {review.user_profile.children_info.length > 2 && (
                                <div className="w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center relative z-30">
                                  <span className="text-white text-[7px] font-bold">+{review.user_profile.children_info.length - 2}</span>
                                </div>
                              )}
                              {review.user_profile.children_info.length >= 2 && (
                                <div className={`w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden relative z-20 ${review.user_profile.children_info.length > 2 ? '-mr-[5px]' : ''}`}>
                                  {review.user_profile.children_info[1]?.profile_image_url ? (
                                    <img src={review.user_profile.children_info[1].profile_image_url} alt="자녀 프로필 2" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-gray-400 text-[10px]">👤</span>
                                  )}
                                </div>
                              )}
                              <div className={`w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden relative z-10 ${review.user_profile.children_info.length >= 2 ? '-mr-[5px]' : ''}`}>
                                {review.user_profile.children_info[0]?.profile_image_url ? (
                                  <img src={review.user_profile.children_info[0].profile_image_url} alt="자녀 프로필" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-gray-400 text-[10px]">👤</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {review.user_profile?.nickname || review.user_profile?.full_name || '익명'}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((heart) => (
                                <Heart
                                  key={heart}
                                  className={`w-3 h-3 ${
                                    heart <= review.rating
                                      ? 'text-[#fb8678] fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">
                              {(() => {
                                const d = new Date(review.created_at || review.date)
                                const y = d.getFullYear()
                                const m = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                return `${y}.${m}.${day}`
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    <div className="relative">
                      <button 
                        onClick={() => setShowReviewMenu(prev => prev === review.id ? null : review.id)}
                        className="p-2 rounded-full hover:bg-black/5"
                        aria-label="칭찬 옵션"
                      >
                        <svg className="w-5 h-5 text-[#fb8678]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {showReviewMenu === review.id && (
                        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
                          {currentAuthUserId && review.user_id === currentAuthUserId ? (
                            <button
                              onClick={() => { 
                                setPendingDeleteReviewId(review.id)
                                setDeleteRequestReason('')
                                setShowDeleteConfirm(true)
                              }}
                              disabled={pendingDeleteRequestReviewIds.has(review.id)}
                              className={`w-full px-4 py-2 text-center text-sm ${
                                pendingDeleteRequestReviewIds.has(review.id)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {pendingDeleteRequestReviewIds.has(review.id) ? '삭제요청 대기중' : '삭제요청'}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => { setPendingBlockUserId(review.user_id); setShowBlockModal(true); }}
                                className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                              >
                                차단하기
                              </button>
                              <div className="border-t border-gray-200 mx-2"></div>
                              <button
                                onClick={() => { setReportReason(''); setReportType('spam'); setShowReportModal(true); setShowReviewMenu(null); setPendingDeleteReviewId(null); setPendingBlockUserId(null); /* reviewId 함께 저장 */ (window as any).__pendingReportReviewId = review.id; (window as any).__pendingReportAuthorAuthId = review.user_id; }}
                                className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                              >
                                신고하기
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 리뷰 내용 */}
                  <div className="text-gray-800 text-sm leading-relaxed mb-3">
                    {review.is_hidden ? '관리자에 의해 숨김처리된 칭찬입니다.' : review.content}
                  </div>
                  
                  {/* 리뷰 이미지 */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex space-x-3 overflow-x-auto mb-3">
                      {review.images.map((image: any, index: number) => (
                        <div 
                          key={index} 
                          className={`w-20 h-20 aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${review.is_hidden ? '' : 'cursor-zoom-in'}`}
                          onClick={review.is_hidden ? undefined : () => {
                            const reviewIndex = reviewsState.findIndex((rev: any) => rev.id === review.id)
                            openImageViewer(review.images!.map((im: any) => typeof im === 'string' ? im : im.image_url), index, review.id, reviewIndex)
                          }}
                        >
                          {review.is_hidden ? (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">숨김</span>
                            </div>
                          ) : (
                            <img 
                              src={image} 
                              alt={`칭찬 이미지 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 리뷰 액션 (도움됨만 표시) */}
                  <div className="flex items-center">
                    <button 
                      onClick={async () => {
                        try {
                          const result = await toggleChildcareReviewHelpfulWithNotification(review.id, childcare?.name || '어린이집')
                          setReviewsState(prev => prev.map(r => r.id === review.id ? { ...r, helpful: result.helpfulCount } : r))
                          setUserHelpfulReviews(prev => {
                            const next = new Set(prev)
                            if (result.isHelpful) next.add(review.id)
                            else next.delete(review.id)
                            return next
                          })
                        } catch {}
                      }}
                      className={`flex items-center space-x-1 transition-colors ${
                        userHelpfulReviews.has(review.id)
                          ? 'text-red-500 hover:text-red-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <svg 
                        className="w-4 h-4" 
                        fill={userHelpfulReviews.has(review.id) ? 'currentColor' : 'none'} 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-xs">도움됨 {review.helpful}</span>
                    </button>
                  </div>
                  </div>
                ))
              )}
            </div>

            {/* 무한 스크롤 Sentinel 및 로딩 인디케이터 */}
            {!reviewsLoading && reviewsState.length > 0 && (
              <>
                <div id="reviews-sentinel" className="h-1" />
                {reviewsLoading && hasMoreReviews && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fb8678] mx-auto mb-2"></div>
                    <p className="text-gray-500 text-xs">칭찬을 불러오는 중...</p>
                  </div>
                )}
                {!hasMoreReviews && reviewsState.length >= 10 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-xs">모든 칭찬을 불러왔습니다.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 리뷰 탭 플로팅 버튼 및 옵션 메뉴 (유치원 페이지와 동일 UX) */}
      {activeTab === 'reviews' && (
        <>
          {/* 삭제 확인 모달 */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">칭찬 삭제요청</h3>
                  <p className="text-sm text-gray-600 text-center mb-4">삭제요청을 하시면 관리자 검토 후 삭제됩니다.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      삭제요청 사유 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={deleteRequestReason}
                      onChange={(e) => setDeleteRequestReason(e.target.value)}
                      placeholder="삭제요청 사유를 구체적으로 작성해주세요..."
                      rows={6}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent resize-none text-sm"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>최소 10자 이상 입력해주세요</span>
                      <span className={deleteRequestReason.trim().length < 10 ? 'text-red-500' : ''}>
                        {deleteRequestReason.length}/500
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button 
                    onClick={() => { 
                      setShowDeleteConfirm(false)
                      setPendingDeleteReviewId(null)
                      setDeleteRequestReason('')
                    }} 
                    className="py-2 rounded-xl border hover:bg-gray-50 transition-colors font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (!pendingDeleteReviewId) return
                        
                        // 최소 길이 검증 (10자 이상)
                        const trimmedReason = deleteRequestReason.trim()
                        if (trimmedReason.length < 10) {
                          alert('삭제요청 사유를 최소 10자 이상 입력해주세요.')
                          return
                        }
                        
                        // 최대 길이 검증 (500자)
                        if (trimmedReason.length > 500) {
                          alert('삭제요청 사유는 최대 500자까지 입력 가능합니다.')
                          return
                        }
                        
                        await requestChildcareReviewDeletion(pendingDeleteReviewId, trimmedReason)
                        setShowDeleteConfirm(false)
                        setDeleteRequestReason('')
                        // 대기중인 삭제요청 목록에 추가
                        setPendingDeleteRequestReviewIds(prev => new Set(prev).add(pendingDeleteReviewId))
                        setPendingDeleteReviewId(null)
                        setShowReviewMenu(null)
                        alert('삭제요청이 접수되었습니다. 관리자 승인 후 삭제됩니다.')
                      } catch (err: any) {
                        console.error('삭제요청 실패:', err)
                        alert(err?.message || '삭제요청 중 오류가 발생했습니다.')
                      }
                    }}
                    disabled={deleteRequestReason.trim().length < 10 || deleteRequestReason.trim().length > 500}
                    className="py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    삭제요청
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* 신고 모달 (유치원과 동일 디자인) */}
          {showReportModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-4 max-w-lg w-full min-h-[500px] max-h-[95vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">칭찬 신고</h3>
                  <button onClick={() => setShowReportModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto mb-6">
                  <p className="text-gray-600 text-sm mb-4">선택한 칭찬을 신고합니다.</p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">신고 유형</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent">
                      <option value="spam">스팸/광고성 게시글</option>
                      <option value="inappropriate">부적절한 내용</option>
                      <option value="harassment">괴롭힘/폭력</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">신고 사유</label>
                    <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="신고 사유를 구체적으로 작성해주세요..." rows={6} maxLength={500} className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent resize-none text-sm" />
                    <div className="flex justify-between text-xs text-gray-400 font-semibold mt-1">
                      <span>최대 텍스트 길이</span>
                      <span>{reportReason.length}/500</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 flex-shrink-0">
                  <button onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">취소</button>
                  <button
                    onClick={async () => {
                      try {
                        if (!currentProfileId) { alert('로그인이 필요합니다.'); return }
                        const reviewId = (window as any).__pendingReportReviewId as string
                        const authorAuthUserId = (window as any).__pendingReportAuthorAuthId as string
                        if (!reviewId || !authorAuthUserId) { setShowReportModal(false); return }
                        setReportLoading(true)
                        const { error } = await supabase
                          .from('reports')
                          .insert({
                            reporter_id: currentProfileId,
                            report_reason: reportReason.trim(),
                            report_type: reportType,
                            status: 'pending',
                            target_type: 'childcare_review',
                            target_id: reviewId,
                            facility_type: 'childcare',
                            facility_code: stcode || null,
                            facility_name: childcare?.name || null
                          })
                        if (error) {
                          // 중복 키 오류 처리
                          if (error.code === '23505') {
                            alert('이미 신고한 칭찬글입니다.')
                            setShowReportModal(false)
                            setReportReason('')
                            setReportType('spam')
                            setShowReviewMenu(null)
                            delete (window as any).__pendingReportReviewId
                            delete (window as any).__pendingReportAuthorAuthId
                            return
                          }
                          throw error
                        }
                        setShowReportModal(false)
                        setReportReason('')
                        setReportType('spam')
                        setShowReviewMenu(null)
                        delete (window as any).__pendingReportReviewId
                        delete (window as any).__pendingReportAuthorAuthId
                        alert('신고가 접수되었습니다.')
                      } catch (err: any) {
                        // 중복 키 오류가 아닌 경우에만 일반 오류 메시지 표시
                        if (err?.code !== '23505') {
                          console.error('리뷰 신고 오류:', err)
                          alert('신고 처리 중 오류가 발생했습니다.')
                        } else {
                          alert('이미 신고한 칭찬글입니다.')
                          setShowReportModal(false)
                          setReportReason('')
                          setReportType('spam')
                          setShowReviewMenu(null)
                          delete (window as any).__pendingReportReviewId
                          delete (window as any).__pendingReportAuthorAuthId
                        }
                      } finally {
                        setReportLoading(false)
                      }
                    }}
                    disabled={reportLoading || !reportReason.trim()}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reportLoading ? '신고 중...' : '신고하기'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 차단 확인 모달 (유치원과 동일 디자인) */}
          {showBlockModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">사용자를 차단하시겠습니까?</h2>
                  <div className="text-sm text-gray-600 text-left space-y-2">
                    <p>• 차단하면 해당 사용자의 칭찬와 활동이 더 이상 보이지 않습니다.</p>
                    <p>• 상대방은 회원님의 글을 계속 볼 수 있습니다.</p>
                    <p>• 정말 차단하시겠습니까?</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button onClick={() => { setShowBlockModal(false); setPendingBlockUserId(null) }} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">취소</button>
                  <button
                    onClick={async () => {
                      try {
                        if (!pendingBlockUserId) return
                        setBlockLoading(true)
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) { alert('로그인이 필요합니다.'); return }
                        const { error } = await supabase
                          .from('blocked_users')
                          .insert({
                            blocker_id: user.id,
                            blocked_user_id: pendingBlockUserId,
                            created_at: new Date().toISOString()
                          })
                        if (error) throw error
                        setShowBlockModal(false)
                        setPendingBlockUserId(null)
                        setShowReviewMenu(null)
                        alert('차단되었습니다.')
                      } catch (err) {
                        console.error('차단 처리 중 오류:', err)
                        alert('차단 처리 중 오류가 발생했습니다.')
                      } finally {
                        setBlockLoading(false)
                      }
                    }}
                    disabled={blockLoading}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {blockLoading ? '차단 중...' : '차단하기'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* 배경 오버레이 */}
          {showReviewOptions && (
            <div 
              className="fixed inset-0 z-30"
              onClick={() => setShowReviewOptions(false)}
            />
          )}

          {/* 플로팅 옵션 메뉴 */}
          {showReviewOptions && (
            <div className="fixed bottom-40 right-4 bg-white rounded-2xl shadow-lg border border-gray-200 z-50 min-w-[160px]">
              <button
                onClick={() => {
                  if (userReview) {
                    alert('이미 칭찬을 작성한 어린이집입니다.')
                    setShowReviewOptions(false)
                    return
                  }
                  navigate(`/childcare/${stcode}/review`)
                  setShowReviewOptions(false)
                }}
                disabled={!!userReview}
                className={`w-full px-4 py-2 text-[#fb8678] rounded-xl shadow-lg border border-[#fb8678]/20 hover:bg-[#fb8678]/10 transition-all duration-300 whitespace-nowrap font-semibold ${
                  userReview 
                    ? 'text-gray-400 border-gray-200 cursor-not-allowed !bg-white' 
                    : ''
                }`}
              >
                {userReview ? '이미 칭찬 작성함' : '칭찬 남기기'}
              </button>
            </div>
          )}

          {/* 플로팅 + 버튼 (토글 시 X로 회전) - 학부모만 표시 */}
          {currentUserType !== 'teacher' && (
            <button
              onClick={() => setShowReviewOptions(!showReviewOptions)}
              className={`fixed bottom-24 right-4 w-14 h-14 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center z-40 ${
                showReviewOptions 
                  ? 'bg-gray-500 hover:bg-gray-600' 
                  : 'bg-[#fb8678] hover:bg-[#fb8678]/90'
              }`}
            >
              <svg className={`w-6 h-6 transition-transform duration-200 ${showReviewOptions ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
        </>
      )}
      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-white/50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-1px_rgba(0,0,0,0.06)] h-[70px] flex items-center py-2 px-3">
        <div className="flex space-x-3 w-full">
          <button onClick={() => setShowShareSheet(true)} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={async () => {
              const raw = childcare?.phone || ''
              const phone = raw.replace(/[^0-9+]/g, '')
              if (!phone) {
                alert('전화번호 정보가 없습니다.')
                return
              }
              try { await navigator.clipboard.writeText(phone) } catch {}
              window.location.href = `tel:${phone}`
            }}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            문의하기
          </button>
           <button 
            onClick={async () => {
              if (isUsingSampleData) {
                alert('API 데이터를 불러오지 못해 임시 정보를 표시 중입니다. 실제 데이터에서만 찜하기가 가능합니다.')
                return
              }
              const next = !isFavorite
              setIsFavorite(next)
              try {
                if (currentUserId && stcode) {
                  if (next) {
                    await addFavorite(
                      currentUserId, 
                      'childcare', 
                      String(stcode), 
                      childcare?.name,
                      {
                        arcode: arcode
                      }
                    )
                    setShowHeartBurst(true)
                    setTimeout(() => setShowHeartBurst(false), 700)
                  } else {
                    await removeFavorite(currentUserId, 'childcare', String(stcode))
                  }
                }
              } catch (e) {
                setIsFavorite(!next)
              }
            }}
             className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
               isFavorite 
                 ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                 : 'bg-[#fb8678] text-white hover:bg-[#fb8678]/90'
             }`}
           >
             <div className="relative">
               <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current animate-heart-bounce' : ''}`} />
               {showHeartBurst && (
                 <>
                   <div className="heart-particle left-[-14px] text-red-400">❤</div>
                   <div className="heart-particle left-0 text-pink-400" style={{ animationDelay: '60ms' }}>❤</div>
                   <div className="heart-particle left-[14px] text-rose-400" style={{ animationDelay: '120ms' }}>❤</div>
                 </>
               )}
             </div>
             <span>{isFavorite ? '찜완료' : '찜하기'}</span>
           </button>
        </div>
      </div>

      {/* 하단 여백 (고정 버튼 공간) */}
      <div className="h-[70px]"></div>

      {/* 링크 공유 바텀시트 */}
      {showShareSheet && (
        <div className="fixed inset-0 z-50">
          {/* 배경 오버레이 */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowShareSheet(false)} />
          {/* 시트 */}
          <div
            className={`absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl border-t border-gray-200 p-4 will-change-transform ${shareIsDragging ? 'transition-none' : 'transition-transform duration-200'}`}
            style={{ transform: `translate3d(0, ${shareDragY}px, 0)` }}
            onTouchMove={handleShareSheetTouchMove}
            onTouchEnd={handleShareSheetTouchEnd}
          >
            <div className="animate-[sheetSlideUp_0.28s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div className="w-full flex justify-center py-2 mb-1" onTouchStart={handleShareSheetTouchStart}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
              <div className="mb-2">
                <div className="text-base font-semibold text-black pl-1 pb-1">링크 공유</div>
                <div className="mt-1 text-xs text-gray-600 break-all bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{getShareUrl()}</div>
              </div>
              <div className="flex gap-3 py-2 overflow-x-auto scrollbar-hide">
                <button onClick={handleKakaoShare} className="w-1/4 flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <span className="w-10 h-10 rounded-full bg-yellow-300 flex items-center justify-center text-black font-bold">카</span>
                  <span className="mt-2 text-xs text-gray-700">카카오톡</span>
                </button>
                <button onClick={handleEmailShare} className="w-1/4 flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <span className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">G</span>
                  <span className="mt-2 text-xs text-gray-700">Gmail</span>
                </button>
                <button onClick={handleBandShare} className="w-1/4 flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <span className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">B</span>
                  <span className="mt-2 text-xs text-gray-700">BAND</span>
                </button>
                <button onClick={handleSmsShare} className="w-1/4 flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <span className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-bold">SMS</span>
                  <span className="mt-2 text-xs text-gray-700">문자</span>
                </button>
                <button onClick={handleCopyLink} className="w-1/4 flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <span className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold">🔗</span>
                  <span className="mt-2 text-xs text-gray-700">링크복사</span>
                </button>
                <button onClick={async () => { await handleShareClick(); setShowShareSheet(false) }} className="w-1/4 flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <span className="w-10 h-10 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center text-lg font-bold">⋯</span>
                  <span className="mt-2 text-xs text-gray-700">더보기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* 사진 갤러리 전체 화면 (유치원과 동일 로직) */}
            {showPhotoGallery && (
              <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setShowPhotoGallery(false)} className="p-2 hover:bg-gray-100 rounded-full">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900">칭찬 사진</h2>
                  </div>
                  <div className="text-sm text-gray-500">
                    {photosWithReviews.reduce((t: number, r: any) => t + (r.images?.length || 0), 0)}장
                  </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-3">
                    {photosWithReviews.map((review: any, reviewIndex: number) => (
                      (review.images || []).map((imageUrl: string, imageIndex: number) => (
                        <div key={`${reviewIndex}-${imageIndex}`} className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden group cursor-zoom-in" onClick={() => {
                          const offset = photosWithReviews
                            .slice(0, photosWithReviews.indexOf(review))
                            .reduce((sum: number, r: any) => sum + (r.images?.length || 0), 0)
                          const globalIndex = offset + imageIndex
                          openImageViewer(allPhotoUrls, globalIndex, review.id, reviewIndex)
                        }}>
                          <img src={imageUrl} alt={`칭찬 이미지 ${imageIndex + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">{review.rating}점</div>
                          <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="font-medium">{review.user_profile?.nickname || review.user_profile?.full_name || '익명'}</div>
                            <div className="text-[10px] opacity-75">{(() => { const d = new Date(review.created_at); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${y}.${m}.${day}` })()}</div>
                          </div>
                        </div>
                      ))
                    ))}
                  </div>
                  {photosWithReviews.reduce((t: number, r: any) => t + (r.images?.length || 0), 0) === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Camera className="w-16 h-16 mb-4 text-gray-300" />
                      <p className="text-lg font-medium">등록된 사진이 없습니다</p>
                      <p className="text-sm">첫 번째 칭찬 사진을 올려보세요!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 이미지 전체보기 뷰어 (유치원과 동일) */}
            {showImageViewer && (
              <div 
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center touch-pan-y"
                onTouchStart={handleTouchStartViewer}
                onTouchEnd={handleTouchEndViewer}
                onClick={(e) => {
                  // 메뉴 외부 클릭 시 메뉴 닫기
                  if (!(e.target as Element).closest('.image-viewer-menu-container')) {
                    setShowImageViewerMenu(false)
                  }
                }}
              >
                {/* 닫기 버튼 */}
                <button
                  onClick={closeImageViewer}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white z-10"
                  aria-label="닫기"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* 점 3개 메뉴 버튼 */}
                {currentImageViewerReview ? (() => {
                  // 현재 이미지가 속한 리뷰 찾기
                  const reviewForCurrentImage = reviewsState.find((r: any) => r.id === currentImageViewerReview.reviewId)
                  // 본인 사진이 아닐 때만 메뉴 표시
                  const isOwnPhoto = reviewForCurrentImage && currentAuthUserId && reviewForCurrentImage.user_id === currentAuthUserId
                  return !isOwnPhoto ? (
                    <div className="absolute top-4 right-16 image-viewer-menu-container z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowImageViewerMenu(!showImageViewerMenu)
                        }}
                        className="p-2 rounded-full hover:bg-white/10 text-white"
                        aria-label="옵션 메뉴"
                      >
                        <MoreHorizontal className="w-6 h-6" />
                      </button>
                      {showImageViewerMenu && (
                        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsBuildingImageReport(false)
                              setImageReportType('wrong_purpose')
                              setImageReportReason('')
                              setShowImageReportModal(true)
                              setShowImageViewerMenu(false)
                            }}
                            className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                          >
                            신고하기
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null
                })() : (
                  // 건물사진 또는 급식사진 신고 버튼 (currentImageViewerReview가 null일 때)
                  <div className="absolute top-4 right-16 image-viewer-menu-container z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowImageViewerMenu(!showImageViewerMenu)
                      }}
                      className="p-2 rounded-full hover:bg-white/10 text-white"
                      aria-label="옵션 메뉴"
                    >
                      <MoreHorizontal className="w-6 h-6" />
                    </button>
                    {showImageViewerMenu && (
                      <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isMealImageReport) {
                              // 급식 사진 신고
                              setIsMealImageReport(true)
                              setIsBuildingImageReport(false)
                              setImageReportType('wrong_purpose')
                            } else {
                              // 건물사진 신고
                              setIsBuildingImageReport(true)
                              setIsMealImageReport(false)
                              setImageReportType('wrong_purpose')
                            }
                            setImageReportReason('')
                            setShowImageReportModal(true)
                            setShowImageViewerMenu(false)
                          }}
                          className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                        >
                          신고하기
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 이전 버튼 */}
                {imageViewerPhotos.length > 1 && (
                  <button
                    onClick={goPrevImage}
                    className="absolute left-2 sm:left-4 p-3 rounded-full hover:bg-white/10 text-white"
                    aria-label="이전 이미지"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </button>
                )}

                {/* 이미지 */}
                <div className="max-w-full max-h-full">
                  <img
                    src={imageViewerPhotos[currentImageIndex]}
                    alt="리뷰 전체 이미지"
                    className="max-w-full max-h-[85vh] object-contain"
                  />
                  {imageViewerPhotos.length > 1 && (
                    <div className="mt-3 text-center text-xs text-white/70">
                      {currentImageIndex + 1} / {imageViewerPhotos.length}
                    </div>
                  )}
                </div>

                {/* 다음 버튼 */}
                {imageViewerPhotos.length > 1 && (
                  <button
                    onClick={goNextImage}
                    className="absolute right-2 sm:right-4 p-3 rounded-full hover:bg-white/10 text-white"
                    aria-label="다음 이미지"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </button>
                )}
              </div>
            )}

      {/* 이미지 신고 모달 */}
      {showImageReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full min-h-[500px] max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {isMealImageReport ? '급식사진 신고' : isBuildingImageReport ? '건물사진 신고' : '사진 신고'}
              </h3>
              <button
                onClick={() => {
                  setShowImageReportModal(false)
                  setImageReportReason('')
                  setImageReportType('wrong_purpose')
                  setIsBuildingImageReport(false)
                  setIsMealImageReport(false)
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6">
              <p className="text-gray-600 text-sm mb-4">
                {isMealImageReport 
                  ? '이 급식사진의 목적이나 사진이 다르거나 부적절한 경우 신고해주세요. 관리자가 확인 후 조치하겠습니다.'
                  : isBuildingImageReport 
                  ? '이 건물사진의 목적이나 사진이 다르거나 부적절한 경우 신고해주세요. 관리자가 확인 후 조치하겠습니다.'
                  : '선택한 사진을 신고합니다.'}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 유형
                </label>
                <select
                  value={imageReportType}
                  onChange={(e) => setImageReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
                >
                  {(isMealImageReport || isBuildingImageReport) ? (
                    <>
                      <option value="wrong_purpose">사진의 목적이 다름</option>
                      <option value="wrong_image">사진이 다름</option>
                      <option value="inappropriate">부적절한 내용</option>
                      <option value="other">기타</option>
                    </>
                  ) : (
                    <>
                      <option value="wrong_purpose">사진의 목적이 다름</option>
                      <option value="wrong_image">사진이 다름</option>
                      <option value="inappropriate">부적절한 내용</option>
                      <option value="other">기타</option>
                    </>
                  )}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 사유
                </label>
                <textarea
                  value={imageReportReason}
                  onChange={(e) => setImageReportReason(e.target.value)}
                      placeholder={isMealImageReport 
                        ? "급식사진이 왜 부적절한지 구체적으로 작성해주세요. 예: 사진의 목적이 다르거나, 잘못된 사진이 올라왔습니다..."
                        : isBuildingImageReport 
                        ? "건물사진이 왜 부적절한지 구체적으로 작성해주세요. 예: 사진의 목적이 다르거나, 잘못된 사진이 올라왔습니다..."
                        : "사진이 왜 부적절한지 구체적으로 작성해주세요. 예: 사진의 목적이 다르거나, 잘못된 사진이 올라왔습니다..."}
                  rows={6}
                  maxLength={500}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent resize-none text-sm"
                />
                <div className="flex justify-between text-xs text-gray-400 font-semibold mt-1">
                  <span>최대 텍스트 길이</span>
                  <span>{imageReportReason.length}/500</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowImageReportModal(false)
                  setImageReportReason('')
                  setImageReportType('wrong_purpose')
                  setIsBuildingImageReport(false)
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!currentProfileId) {
                    alert('로그인이 필요합니다.')
                    return
                  }

                  // 급식 사진 신고인 경우 (중복 신고 가능)
                  if (isMealImageReport) {
                    try {
                      setImageReportLoading(true)
                      
                      // 현재 보고 있는 이미지 URL 가져오기
                      const reportedImageUrl = imageViewerPhotos[currentImageIndex] || null
                      
                      // 시설 주소 정보
                      const facilityAddress = childcare?.address || null
                      
                      // admin_notes에 이미지 URL과 주소 정보를 JSON으로 저장
                      const adminNotesData = {
                        reported_image_url: reportedImageUrl,
                        facility_address: facilityAddress,
                        report_source: 'meal_tab' // 급식 탭에서 신고한 경우
                      }
                      
                      const { error } = await supabase
                        .from('reports')
                        .insert({
                          reporter_id: currentProfileId,
                          report_reason: imageReportReason.trim(),
                          report_type: imageReportType,
                          status: 'pending',
                          target_type: 'meal_image',
                          target_id: null, // 급식 사진 신고는 target_id를 사용하지 않음 (facility_code로 식별)
                          facility_type: 'childcare',
                          facility_code: stcode || null,
                          facility_name: childcare?.name || null,
                          admin_notes: JSON.stringify(adminNotesData)
                        })
                      
                      if (error) {
                        throw error
                      }
                      
                      setShowImageReportModal(false)
                      setImageReportReason('')
                      setImageReportType('wrong_purpose')
                      setIsMealImageReport(false)
                      alert('신고가 접수되었습니다.')
                    } catch (error: any) {
                      console.error('급식 사진 신고 오류:', error)
                      alert('신고 처리 중 오류가 발생했습니다.')
                    } finally {
                      setImageReportLoading(false)
                    }
                    return
                  }

                  // 건물사진 신고인 경우
                  if (isBuildingImageReport) {
                    try {
                      setImageReportLoading(true)
                      
                      // 현재 보고 있는 이미지 URL 가져오기
                      const reportedImageUrl = imageViewerPhotos[currentImageIndex] || null
                      
                      // 시설 주소 정보
                      const facilityAddress = childcare?.address || null
                      
                      // admin_notes에 이미지 URL과 주소 정보를 JSON으로 저장
                      const adminNotesData = {
                        reported_image_url: reportedImageUrl,
                        facility_address: facilityAddress
                      }
                      
                      const { error } = await supabase
                        .from('reports')
                        .insert({
                          reporter_id: currentProfileId,
                          report_reason: imageReportReason.trim(),
                          report_type: imageReportType,
                          status: 'pending',
                          target_type: 'building_image',
                          target_id: null, // 건물사진 신고는 target_id를 사용하지 않음 (facility_code로 식별)
                          facility_type: 'childcare',
                          facility_code: stcode || null,
                          facility_name: childcare?.name || null,
                          admin_notes: JSON.stringify(adminNotesData)
                        })
                      
                      if (error) {
                        throw error
                      }
                      
                      setShowImageReportModal(false)
                      setImageReportReason('')
                      setImageReportType('wrong_purpose')
                      setIsBuildingImageReport(false)
                      alert('신고가 접수되었습니다.')
                    } catch (error: any) {
                      console.error('건물사진 신고 오류:', error)
                      alert('신고 처리 중 오류가 발생했습니다.')
                    } finally {
                      setImageReportLoading(false)
                    }
                    return
                  }

                  // 리뷰 이미지 신고인 경우 (기존 로직)
                  if (!currentImageViewerReview) {
                    alert('로그인이 필요합니다.')
                    return
                  }
                  try {
                    setImageReportLoading(true)
                    
                    // 현재 보고 있는 이미지 URL 가져오기
                    const reportedImageUrl = imageViewerPhotos[currentImageIndex] || null
                    
                    // 시설 주소 정보
                    const facilityAddress = childcare?.address || null
                    
                    // admin_notes에 이미지 URL과 주소 정보를 JSON으로 저장
                    const adminNotesData = {
                      reported_image_url: reportedImageUrl,
                      facility_address: facilityAddress
                    }
                    
                    const { error } = await supabase
                      .from('reports')
                      .insert({
                        reporter_id: currentProfileId,
                        report_reason: imageReportReason.trim(),
                        report_type: imageReportType,
                        status: 'pending',
                        target_type: 'childcare_review_image',
                        target_id: currentImageViewerReview.reviewId,
                        facility_type: 'childcare',
                        facility_code: stcode || null,
                        facility_name: childcare?.name || null,
                        admin_notes: JSON.stringify(adminNotesData)
                      })
                    if (error) throw error
                    setShowImageReportModal(false)
                    setImageReportReason('')
                    setImageReportType('wrong_purpose')
                    setShowImageViewerMenu(false)
                    alert('신고가 접수되었습니다.')
                  } catch (error) {
                    console.error('이미지 신고 오류:', error)
                    alert('신고 처리 중 오류가 발생했습니다.')
                  } finally {
                    setImageReportLoading(false)
                  }
                }}
                disabled={imageReportLoading || !imageReportReason.trim()}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {imageReportLoading ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 어린이집알리미 API 정보 팝업 모달 */}
      {showApiInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 animate-[modalSlideUp_0.3s_cubic-bezier(0.22,0.61,0.36,1)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-[#fb8678]/10 rounded-full flex items-center justify-center mr-3">
                    <Info className="w-5 h-5 text-[#fb8678]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">정보 출처</h3>
                </div>
                <button
                  onClick={() => setShowApiInfoModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-800">어린이집 정보공개포털</span>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed mb-3">
                    이 어린이집 정보는 <strong>어린이집 정보공개포털</strong>에서 제공하는 공식 API를 통해 수집된 데이터입니다.
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-blue-900">정확한 정보</p>
                      <p className="text-[10px] text-blue-600">보건복지부에서 제공하는 공식 데이터</p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-blue-900">실시간 업데이트</p>
                      <p className="text-[10px] text-blue-600">정기적으로 최신 정보로 갱신</p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-blue-900">신뢰할 수 있는 출처</p>
                      <p className="text-[10px] text-blue-600">정부기관에서 검증된 정보</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 text-center">
                    더 자세한 정보는 <strong>어린이집 정보공개포털</strong> 공식 사이트에서 확인하실 수 있습니다.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowApiInfoModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  확인
                </button>
                <button
                  onClick={() => {
                    window.open('https://info.childcare.go.kr/info_html5/main.jsp', '_blank')
                    setShowApiInfoModal(false)
                  }}
                  className="flex-1 px-4 py-3 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] transition-colors"
                >
                  사이트 방문
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default ChildcareDetailPage
