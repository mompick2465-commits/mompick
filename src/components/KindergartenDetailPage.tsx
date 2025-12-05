import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
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
  XCircle,
  X,
  Check,
  Info,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Camera,
  MoreVertical,
  Trash2,
  Flag,
  ThumbsUp,
  MoreHorizontal
} from 'lucide-react'
import { fetchKindergartenDetail, getDetailCacheStats } from '../utils/kindergartenDetailApi'
import { KindergartenDetailSummary } from '../types/kindergartenDetail'
import { 
  getKindergartenReviews, 
  getReviewStats, 
  toggleReviewHelpful,
  toggleReviewHelpfulWithNotification,
  getUserReview,
  deleteReview,
  requestKindergartenReviewDeletion,
  KindergartenReview 
} from '../utils/kindergartenReviewApi'
import { supabase } from '../lib/supabase'
import { addFavorite, removeFavorite, isFavorited } from '../utils/favorites'
import { getShareUrl } from '../utils/shareUrl'

const KindergartenDetailPage: React.FC = () => {
  const { kindercode } = useParams<{ kindercode: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [kindergarten, setKindergarten] = useState<KindergartenDetailSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'detail' | 'meal' | 'reviews'>('detail')
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showHeartBurst, setShowHeartBurst] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentBuildingImageIndex, setCurrentBuildingImageIndex] = useState(0)
  const [isUsingSampleData, setIsUsingSampleData] = useState(false)
  
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
  const [isTeacherExperienceExpanded, setIsTeacherExperienceExpanded] = useState(false)
  const [isTransportationDetailsExpanded, setIsTransportationDetailsExpanded] = useState(false)
  const [isAfterSchoolDetailsExpanded, setIsAfterSchoolDetailsExpanded] = useState(false)
  const [isSafetyEducationExpanded, setIsSafetyEducationExpanded] = useState(false)
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
  const [activeFilter, setActiveFilter] = useState('전체')
  
  // 유치원알리미 API 정보 팝업 상태
  const [showApiInfoModal, setShowApiInfoModal] = useState<boolean>(false)
  
  // 프로필 사진 전체보기 뷰어 상태
  const [showProfileImageViewer, setShowProfileImageViewer] = useState<boolean>(false)
  const [profileImageViewerImages, setProfileImageViewerImages] = useState<string[]>([])
  const [currentProfileImageIndex, setCurrentProfileImageIndex] = useState<number>(0)
  const [profileImageViewerUser, setProfileImageViewerUser] = useState<{ id: string; name: string } | null>(null)
  const [showProfileImageViewerMenu, setShowProfileImageViewerMenu] = useState<boolean>(false)
  
  // 프로필 신고 관련 상태
  const [showProfileReportModal, setShowProfileReportModal] = useState<boolean>(false)
  const [profileReportReason, setProfileReportReason] = useState<string>('')
  const [profileReportType, setProfileReportType] = useState<string>('spam')
  const [profileReportLoading, setProfileReportLoading] = useState<boolean>(false)
  
  // 사진 갤러리, 이미지 뷰어, API 정보 모달이 열렸을 때 body 스크롤 비활성화
  useEffect(() => {
    if (showPhotoGallery || showImageViewer || showApiInfoModal || showProfileImageViewer || showProfileReportModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showPhotoGallery, showImageViewer, showApiInfoModal, showProfileImageViewer, showProfileReportModal])
  
  // 리뷰 관련 상태
  const [reviews, setReviews] = useState<KindergartenReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviewOptions, setShowReviewOptions] = useState(false)
  const [userReview, setUserReview] = useState<KindergartenReview | null>(null)
  const [reviewStats, setReviewStats] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreReviews, setHasMoreReviews] = useState(false)
  // 신고/차단 모달 상태 (커뮤니티와 유사)
  const [showReportModal, setShowReportModal] = useState<boolean>(false)
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false)
  const [reportReason, setReportReason] = useState<string>('')
  const [reportType, setReportType] = useState<string>('spam')
  const [reportLoading, setReportLoading] = useState<boolean>(false)
  const [blockLoading, setBlockLoading] = useState<boolean>(false)
  const [pendingBlockUserId, setPendingBlockUserId] = useState<string | null>(null)
  const [pendingReport, setPendingReport] = useState<{ reviewId: string; authorAuthUserId: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [pendingDeleteReviewId, setPendingDeleteReviewId] = useState<string | null>(null)
  const [deleteRequestReason, setDeleteRequestReason] = useState<string>('')
  
  // 사용자가 도움됨을 누른 리뷰 ID들을 추적
  const [userHelpfulReviews, setUserHelpfulReviews] = useState<Set<string>>(new Set())
  // 대기중인 삭제요청이 있는 리뷰 ID들을 추적
  const [pendingDeleteRequestReviewIds, setPendingDeleteRequestReviewIds] = useState<Set<string>>(new Set())
  // 현재 로그인 사용자의 auth 사용자 ID (리뷰 작성자 비교용)
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null)
  // 현재 로그인 사용자의 profiles.id (reports.reporter_id에 사용)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  // 현재 사용자 타입 (teacher/parent)
  const [currentUserType, setCurrentUserType] = useState<string | null>(null)
  // 리뷰별 3점 메뉴 표시 상태
  const [showReviewMenu, setShowReviewMenu] = useState<string | null>(null)
  // 공유 바텀시트 표시 상태
  const [showShareSheet, setShowShareSheet] = useState<boolean>(false)
  // 공유 바텀시트 드래그 상태
  const [shareDragStartY, setShareDragStartY] = useState<number | null>(null)
  const [shareDragY, setShareDragY] = useState<number>(0)
  const [shareIsDragging, setShareIsDragging] = useState<boolean>(false)
  
  // 별점 분포 및 평균 계산 (reviewStats 사용)
  const ratingDistribution = reviewStats?.rating_distribution || {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  }
  
  const averageRating = reviewStats?.average_rating || 0
  const totalReviews = reviewStats?.total_reviews || 0
  
  // 사진이 있는 리뷰들을 최신순으로 정렬
  const photosWithReviews = reviews.filter(review => !review.is_hidden)
    .filter(review => review.images && review.images.length > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  // 표시할 사진 개수 (미리보기용)
  const displayPhotos = photosWithReviews.slice(0, 4)
  // 전체 사진 URL 플랫 배열 (뷰어용)
  const allPhotoUrls: string[] = photosWithReviews.flatMap(r => r.images?.map(img => img.image_url) || [])
  // 썸네일 표시용 평탄화 아이템 (칭찬 점수 배지 유지)
  const photoItems: { imageUrl: string; rating: number; globalIndex: number }[] = (() => {
    const items: { imageUrl: string; rating: number; globalIndex: number }[] = []
    let idx = 0
    photosWithReviews.forEach(review => {
      ;(review.images || []).forEach(img => {
        items.push({ imageUrl: img.image_url, rating: review.rating, globalIndex: idx })
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
  const sidoCode = searchParams.get('sidoCode') ? parseInt(searchParams.get('sidoCode')!) : undefined
  const sggCode = searchParams.get('sggCode') ? parseInt(searchParams.get('sggCode')!) : undefined

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          if (kindercode) {
            const fav = await isFavorited(user.id, 'kindergarten', String(kindercode))
            setIsFavorite(fav)
          }
        }
      } catch {}
    })()
    if (kindercode && !isLoadingRef.current) {
      isLoadingRef.current = true
      loadKindergartenDetail()
    }
    
    // cleanup 함수에서 ref 초기화
    return () => {
      isLoadingRef.current = false
    }
  }, [kindercode])

  // location state에서 activeTab 확인
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state])

  // 리뷰 탭이 활성화될 때 리뷰 데이터 로드
  useEffect(() => {
    if (activeTab === 'reviews' && kindercode) {
      loadReviews()
      loadUserReview()
      loadReviewStats()
    }
  }, [activeTab, kindercode])

  // 급식 탭이 활성화될 때 급식 사진 로드
  useEffect(() => {
    if (activeTab === 'meal' && kindercode) {
      loadMealPhotos()
    }
  }, [activeTab, kindercode])

  const loadMealPhotos = async () => {
    if (!kindercode) return

    try {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const formatDate = (date: Date) => date.toISOString().split('T')[0]

      const { data: meals } = await supabase
        .from('kindergarten_meals')
        .select('meal_date, meal_images')
        .eq('kindergarten_code', kindercode)
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

  // 현재 사용자 auth ID 로드 (리뷰 메뉴 노출 분기용 및 건물사진 신고용)
  useEffect(() => {
    const fetchAuthUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentAuthUserId(user?.id || null)
        // profiles.id, user_type 조회 (reports.reporter_id 용)
        if (user?.id) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, user_type')
              .eq('auth_user_id', user.id)
              .maybeSingle()
            if (!profileError && profile?.id) {
              setCurrentProfileId(profile.id)
              setCurrentUserType(profile.user_type)
            } else {
              setCurrentProfileId(null)
              setCurrentUserType(null)
            }
          } catch (e) {
            setCurrentProfileId(null)
            setCurrentUserType(null)
          }
        } else {
          setCurrentProfileId(null)
          setCurrentUserType(null)
        }
      } catch (e) {
        setCurrentAuthUserId(null)
        setCurrentProfileId(null)
        setCurrentUserType(null)
      }
    }
    // 건물사진 신고를 위해 항상 실행 (리뷰 탭뿐만 아니라 기본 탭에서도 필요)
    fetchAuthUser()
  }, [kindercode])

  // 모달 열릴 때 배경 스크롤 제어
  useEffect(() => {
    if (showReportModal || showBlockModal || showShareSheet) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showReportModal, showBlockModal, showShareSheet])

  const loadKindergartenDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📍 유치원 상세 정보 로딩:', { kindercode, sidoCode, sggCode })
      
      const data = await fetchKindergartenDetail(kindercode!, sidoCode, sggCode)
      if (data) {
        setKindergarten(data)
        
        // API 실패로 샘플 데이터를 사용하는 경우 사용자에게 알림
        if (data.name.includes('유치원 (') && data.address === '주소 정보를 불러올 수 없습니다') {
          console.warn('⚠️ 실제 API 데이터를 불러올 수 없어 임시 데이터를 표시합니다.')
          setIsUsingSampleData(true)
        }
      } else {
        setError('유치원 정보를 찾을 수 없습니다.')
      }
    } catch (err) {
      console.error('유치원 상세 정보 로딩 오류:', err)
      setError('유치원 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      // 로딩 완료 후 ref 초기화
      isLoadingRef.current = false
    }
  }

  const loadReviews = async (page: number = 1, append: boolean = false) => {
    if (!kindercode) return

    try {
      setReviewsLoading(true)
      const result = await getKindergartenReviews(
        kindercode,
        page,
        10,
        'latest'
      )

      if (result) {
        const { reviews: newReviews, hasMore } = result
        
        if (append) {
          setReviews(prev => [...prev, ...newReviews])
        } else {
          setReviews(newReviews)
          // 사용자가 도움됨을 누른 리뷰들 확인
          await loadUserHelpfulReviews(newReviews)
        }
        
        setHasMoreReviews(hasMore)
        setCurrentPage(page)
      } else {
        // API가 null을 반환한 경우 (테이블이 없는 경우)
        setReviews([])
        setHasMoreReviews(false)
      }
    } catch (err) {
      console.error('리뷰 로딩 오류:', err)
      setReviews([])
      setHasMoreReviews(false)
    } finally {
      setReviewsLoading(false)
    }
  }

  // 사용자가 도움됨을 누른 리뷰들 및 대기중인 삭제요청 로드
  const loadUserHelpfulReviews = async (reviews: KindergartenReview[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // 현재 사용자의 profile ID 가져오기
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (profileError || !profileData) {
        console.error('프로필 정보를 가져올 수 없습니다:', profileError)
        return
      }
      
      const reviewIds = reviews.map(review => review.id)
      
      // 도움됨 목록 조회
      const { data: helpfulData, error } = await supabase
        .from('kindergarten_review_helpful')
        .select('review_id')
        .eq('user_id', profileData.id) // profile ID 사용
        .in('review_id', reviewIds)
      
      if (!error && helpfulData) {
        const helpfulReviewIds = new Set(helpfulData.map(item => item.review_id))
        setUserHelpfulReviews(helpfulReviewIds)
      }

      // 대기중인 삭제요청 확인 (본인 리뷰만)
      const ownReviewIds = reviews
        .filter(review => review.user_id === user.id)
        .map(review => review.id)
      
      if (ownReviewIds.length > 0) {
        const { data: deleteRequests, error: deleteRequestError } = await supabase
          .from('review_delete_requests')
          .select('review_id')
          .eq('review_type', 'kindergarten')
          .eq('requester_id', profileData.id)
          .eq('status', 'pending')
          .in('review_id', ownReviewIds)
        
        if (!deleteRequestError && deleteRequests) {
          const pendingDeleteIds = new Set(deleteRequests.map(req => req.review_id))
          setPendingDeleteRequestReviewIds(pendingDeleteIds)
        }
      }
    } catch (error) {
      console.error('도움됨 리뷰 로드 오류:', error)
    }
  }

  const loadUserReview = async () => {
    if (!kindercode) return

    try {
      const review = await getUserReview(kindercode)
      setUserReview(review)
    } catch (err) {
      console.error('사용자 리뷰 로딩 오류:', err)
    }
  }

  const loadReviewStats = async () => {
    if (!kindercode) return

    try {
      const stats = await getReviewStats(kindercode)
      setReviewStats(stats)
    } catch (err) {
      console.error('리뷰 통계 로딩 오류:', err)
    }
  }

  const handleReviewCreated = async () => {
    // 리뷰 작성 후 데이터 새로고침
    await Promise.all([
      loadReviews(1, false), // 첫 페이지부터 다시 로드
      loadUserReview(),
      loadReviewStats()
    ])
  }

  const handleReviewHelpful = async (reviewId: string) => {
    try {
      // 유치원 이름을 사용하여 알림 기능이 포함된 함수 호출
      const result = await toggleReviewHelpfulWithNotification(
        reviewId, 
        kindergarten?.name || '유치원'
      )
      
      // 로컬 상태 업데이트
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpful_count: result.helpfulCount }
          : review
      ))
      
      // 사용자가 도움됨을 누른 리뷰 상태 업데이트
      setUserHelpfulReviews(prev => {
        const newSet = new Set(prev)
        if (result.isHelpful) {
          newSet.add(reviewId)
        } else {
          newSet.delete(reviewId)
        }
        return newSet
      })
    } catch (err) {
      console.error('도움됨 토글 오류:', err)
    }
  }

  const loadMoreReviews = () => {
    if (!reviewsLoading && hasMoreReviews) {
      loadReviews(currentPage + 1, true)
    }
  }

  // 무한 스크롤을 위한 Intersection Observer
  useEffect(() => {
    if (!hasMoreReviews || reviewsLoading || !kindercode) return

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
  }, [hasMoreReviews, reviewsLoading, currentPage, kindercode])

  const getStatusColor = (status?: string) => {
    switch (status) {
      case '적합': return 'text-green-600 bg-green-50'
      case '조치': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case '적합': return <Check className="w-3 h-3 text-green-500" strokeWidth={2.5} />
      case '조치': return <XCircle className="w-3 h-3" />
      default: return <AlertCircle className="w-3 h-3" />
    }
  }

  // 리뷰 3점 메뉴 토글
  const toggleReviewMenu = (reviewId: string) => {
    setShowReviewMenu(prev => (prev === reviewId ? null : reviewId))
  }

  // 리뷰 삭제요청 모달 오픈 (본인 리뷰만)
  const handleDeleteReviewClick = (reviewId: string) => {
    if (!reviewId) return
    setPendingDeleteReviewId(reviewId)
    setDeleteRequestReason('')
    setShowDeleteConfirm(true)
  }

  // 리뷰 삭제요청 확정 처리
  const handleConfirmDeleteReview = async () => {
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
    
    try {
      await requestKindergartenReviewDeletion(pendingDeleteReviewId, trimmedReason)
      setShowDeleteConfirm(false)
      setDeleteRequestReason('')
      // 대기중인 삭제요청 목록에 추가
      setPendingDeleteRequestReviewIds(prev => new Set(prev).add(pendingDeleteReviewId))
      setPendingDeleteReviewId(null)
      setShowReviewMenu(null)
      alert('삭제요청이 접수되었습니다. 관리자 승인 후 삭제됩니다.')
    } catch (error: any) {
      console.error('삭제요청 실패:', error)
      alert(error?.message || '삭제요청 중 오류가 발생했습니다.')
    }
  }

  const handleConfirmBlock = async () => {
    if (!pendingBlockUserId) return
    try {
      setBlockLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')
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
    } catch (error) {
      console.error('차단 처리 중 오류:', error)
      alert('차단 처리 중 오류가 발생했습니다.')
    } finally {
      setBlockLoading(false)
    }
  }

  const handleSubmitReportModal = async () => {
    if (!pendingReport || !currentProfileId) {
      alert('로그인이 필요합니다.')
      return
    }
    try {
      setReportLoading(true)
      
      // 중복 신고 확인
      const { data: existingReport } = await supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', currentProfileId)
        .eq('facility_type', 'kindergarten')
        .eq('facility_code', kindercode || '')
        .eq('target_type', 'kindergarten_review')
        .eq('target_id', pendingReport.reviewId)
        .maybeSingle()
      
      if (existingReport) {
        alert('이미 신고한 칭찬입니다.')
        setShowReportModal(false)
        setPendingReport(null)
        setShowReviewMenu(null)
        return
      }
      
      // 시설 주소 정보
      const facilityAddress = kindergarten?.address || null
      
      // admin_notes에 주소 정보를 JSON으로 저장
      const adminNotesData = {
        facility_address: facilityAddress
      }
      
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: currentProfileId,
          report_reason: reportReason.trim(),
          report_type: reportType,
          status: 'pending',
          target_type: 'kindergarten_review',
          target_id: pendingReport.reviewId,
          facility_type: 'kindergarten',
          facility_code: kindercode || null,
          facility_name: kindergarten?.name || null,
          admin_notes: JSON.stringify(adminNotesData)
        })
      
      if (error) {
        // 중복 키 오류 처리
        if (error.code === '23505') {
          alert('이미 신고한 칭찬입니다.')
          setShowReportModal(false)
          setPendingReport(null)
          setShowReviewMenu(null)
          return
        }
        throw error
      }
      
      setShowReportModal(false)
      setPendingReport(null)
      setReportReason('')
      setReportType('spam')
      setShowReviewMenu(null)
      alert('신고가 접수되었습니다.')
    } catch (error: any) {
      // 중복 키 오류 처리
      if (error?.code === '23505') {
        alert('이미 신고한 칭찬글입니다.')
        setShowReportModal(false)
        setPendingReport(null)
        setShowReviewMenu(null)
        setReportReason('')
        setReportType('spam')
      } else {
        console.error('리뷰 신고 오류:', error)
        alert('신고 처리 중 오류가 발생했습니다.')
      }
    } finally {
      setReportLoading(false)
    }
  }

  const handleSubmitImageReportModal = async () => {
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
        const facilityAddress = kindergarten?.address || null
        
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
            facility_type: 'kindergarten',
            facility_code: kindercode || null,
            facility_name: kindergarten?.name || null,
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
        const facilityAddress = kindergarten?.address || null
        
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
            facility_type: 'kindergarten',
            facility_code: kindercode || null,
            facility_name: kindergarten?.name || null,
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
      const facilityAddress = kindergarten?.address || null
      
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
          target_type: 'kindergarten_review_image',
          target_id: currentImageViewerReview.reviewId,
          facility_type: 'kindergarten',
          facility_code: kindercode || null,
          facility_name: kindergarten?.name || null,
          admin_notes: JSON.stringify(adminNotesData)
        })
      
      if (error) {
        throw error
      }
      
      setShowImageReportModal(false)
      setImageReportReason('')
      setImageReportType('wrong_purpose')
      setShowImageViewerMenu(false)
      alert('신고가 접수되었습니다.')
    } catch (error: any) {
      console.error('이미지 신고 오류:', error)
      alert('신고 처리 중 오류가 발생했습니다.')
    } finally {
      setImageReportLoading(false)
    }
  }

  // 리뷰 작성자 차단 (타인 리뷰에서만 노출)
  const handleBlockReviewAuthor = async (authorAuthUserId: string) => {
    if (!authorAuthUserId) return
    setPendingBlockUserId(authorAuthUserId)
    setShowBlockModal(true)
  }

  // 리뷰 신고 (간단 사유 입력)
  const handleReportReview = async (reviewId: string, authorAuthUserId: string) => {
    setPendingReport({ reviewId, authorAuthUserId })
    setShowReportModal(true)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % 3)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + 3) % 3)
  }

  // 리뷰 이미지 전체보기 뷰어 핸들러
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

  // 프로필 사진 전체보기 열기
  const openProfileImageViewer = (profileImage: string, childrenImages?: string[], user?: { id: string; name: string }) => {
    // 자녀 사진 필터링 (null, undefined, 빈 문자열 제거)
    const validChildrenImages = (childrenImages || []).filter(img => img && img.trim() !== '')
    
    // 프로필 사진과 자녀 사진이 모두 없는 경우 모달을 열지 않음
    if (!profileImage && validChildrenImages.length === 0) {
      return
    }
    
    // 프로필 사진이 있으면 첫 번째로, 없으면 자녀 사진만 사용
    const allImages = profileImage 
      ? [profileImage, ...validChildrenImages]
      : validChildrenImages
    
    if (allImages.length === 0) {
      return
    }
    
    setProfileImageViewerImages(allImages)
    setCurrentProfileImageIndex(0)
    setProfileImageViewerUser(user || null)
    setShowProfileImageViewerMenu(false)
    setShowProfileImageViewer(true)
  }
  
  // 프로필 사진 전체보기 닫기
  const closeProfileImageViewer = () => {
    setShowProfileImageViewer(false)
    setProfileImageViewerImages([])
    setCurrentProfileImageIndex(0)
    setProfileImageViewerUser(null)
    setShowProfileImageViewerMenu(false)
  }

  // 프로필 신고 모달 열기
  const handleOpenProfileReportModal = () => {
    setShowProfileReportModal(true)
    setProfileReportReason('')
    setProfileReportType('spam')
    setShowProfileImageViewerMenu(false)
  }
  
  // 프로필 신고 모달 닫기
  const handleCloseProfileReportModal = () => {
    setShowProfileReportModal(false)
    setProfileReportReason('')
    setProfileReportType('spam')
  }
  
  // 프로필 신고 처리 (중복 신고 허용)
  const handleSubmitProfileReport = async () => {
    if (!currentProfileId || !profileReportReason.trim() || !profileImageViewerUser) return
    
    setProfileReportLoading(true)
    try {
      // auth_user_id를 profiles.id로 변환
      let targetProfileId = profileImageViewerUser.id
      if (profileImageViewerUser.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', profileImageViewerUser.id)
          .single()
        
        if (!profileError && profileData) {
          targetProfileId = profileData.id
        } else {
          // auth_user_id로 못 찾으면 id로 직접 시도 (이미 profile_id인 경우)
          const { data: directProfileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', profileImageViewerUser.id)
            .single()
          
          if (directProfileData) {
            targetProfileId = directProfileData.id
          }
        }
      }
      
      // 시설 주소 정보
      const facilityAddress = kindergarten?.address || null
      
      // admin_notes에 주소 정보를 JSON으로 저장
      const adminNotesData = {
        facility_address: facilityAddress
      }
      
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: currentProfileId,
          report_reason: profileReportReason.trim(),
          report_type: profileReportType,
          status: 'pending',
          target_type: 'profile',
          target_id: targetProfileId,
          facility_type: 'kindergarten',
          facility_code: kindercode || null,
          facility_name: kindergarten?.name || null,
          admin_notes: JSON.stringify(adminNotesData)
        })

      // 프로필 신고는 중복 허용이므로, UNIQUE 제약조건 위반 에러(409 Conflict)는 성공으로 처리
      if (error) {
        const errorMessage = error.message?.toLowerCase() || ''
        const errorCode = error.code || ''
        const errorDetails = error.details?.toLowerCase() || ''
        const errorHint = (error as any)?.hint?.toLowerCase() || ''
        
        // 409 Conflict 오류 감지 (더 포괄적으로)
        const isDuplicateError = 
          errorCode === '23505' || 
          errorCode === 'PGRST116' || 
          errorMessage.includes('duplicate') || 
          errorMessage.includes('unique') ||
          errorMessage.includes('conflict') ||
          errorMessage.includes('already exists') ||
          errorDetails.includes('duplicate') ||
          errorDetails.includes('unique') ||
          errorDetails.includes('conflict') ||
          errorHint.includes('duplicate') ||
          errorHint.includes('unique') ||
          (error as any)?.status === 409 ||
          (error as any)?.statusCode === 409 ||
          (error as any)?.statusText === 'Conflict' ||
          String(error).includes('409') ||
          String(error).includes('Conflict')
        
        if (isDuplicateError) {
          // 중복 신고는 성공으로 처리
          alert('신고가 성공적으로 접수되었습니다.')
          handleCloseProfileReportModal()
          closeProfileImageViewer()
          return
        }
        console.error('신고 처리 오류:', error)
        alert('신고 처리 중 오류가 발생했습니다.')
        return
      }

      alert('신고가 성공적으로 접수되었습니다.')
      handleCloseProfileReportModal()
      closeProfileImageViewer()
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || ''
      const errorCode = error?.code || ''
      const errorString = String(error).toLowerCase()
      
      // 409 Conflict 오류 감지 (더 포괄적으로)
      const isDuplicateError = 
        error?.status === 409 ||
        error?.statusCode === 409 ||
        error?.statusText === 'Conflict' ||
        errorCode === '23505' || 
        errorCode === 'PGRST116' ||
        errorMessage.includes('duplicate') || 
        errorMessage.includes('unique') ||
        errorMessage.includes('conflict') ||
        errorMessage.includes('already exists') ||
        errorString.includes('409') ||
        errorString.includes('conflict')
      
      if (isDuplicateError) {
        // 중복 신고는 성공으로 처리
        alert('신고가 성공적으로 접수되었습니다.')
        handleCloseProfileReportModal()
        closeProfileImageViewer()
        return
      }
      console.error('신고 처리 오류:', error)
      alert('신고 처리 중 오류가 발생했습니다.')
    } finally {
      setProfileReportLoading(false)
    }
  }

  const goPrevImage = () => {
    if (imageViewerPhotos.length === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + imageViewerPhotos.length) % imageViewerPhotos.length)
  }

  const goNextImage = () => {
    if (imageViewerPhotos.length === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % imageViewerPhotos.length)
  }

  // 터치/휠 스와이프 제스처 지원
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const lastWheelTimeRef = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartXRef.current = t.clientX
    touchStartYRef.current = t.clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return
    // 스와이프 중 기본 스크롤 방지는 CSS touch-action으로 처리
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartXRef.current
    const threshold = 50
    if (Math.abs(dx) > threshold) {
      if (dx > 0) {
        goPrevImage()
      } else {
        goNextImage()
      }
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  const handleWheel = (e: React.WheelEvent) => {
    // 수평 스크롤에만 반응 (기본 스크롤 막지 않음: passive 오류 방지)
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    const now = Date.now()
    if (now - lastWheelTimeRef.current < 300) return
    lastWheelTimeRef.current = now
    if (e.deltaX > 0) {
      goNextImage()
    } else if (e.deltaX < 0) {
      goPrevImage()
    }
  }

  // 날짜 형식 변환 함수 (YYYYMMDD -> YYYY-MM-DD)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString || dateString === '정보 없음') return '정보 없음'
    if (dateString.length === 8 && /^\d{8}$/.test(dateString)) {
      return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`
    }
    return dateString
  }

  // 공유 버튼 클릭 핸들러: 안드로이드 기본 공유 시트 호출 (카카오톡/지메일/밴드 등)
  const handleShareClick = async () => {
    try {
      const shareUrl = getShareUrl(location.pathname, location.search)
      const shareTitle = `맘픽 · ${kindergarten?.name || '유치원'} 상세정보`
      const shareText = `${kindergarten?.name || '유치원'} 정보를 공유합니다.`

      // Web Share API 지원 시 (안드로이드 공유 시트 등장)
      const navWithShare = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> }
      if (navWithShare.share) {
        await navWithShare.share({ title: shareTitle, text: shareText, url: shareUrl })
        return
      }

      // 미지원 환경: 링크 복사로 대체
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        alert('공유 링크가 복사되었습니다.')
      } else {
        // 최후 fallback
        const dummy = document.createElement('input')
        dummy.value = shareUrl
        document.body.appendChild(dummy)
        dummy.select()
        document.execCommand('copy')
        document.body.removeChild(dummy)
        alert('공유 링크가 복사되었습니다.')
      }
    } catch (error) {
      // 사용자가 공유를 취소한 경우 등은 무시, 그 외에는 복사로 대체
      try {
        const shareUrl = getShareUrl(location.pathname, location.search)
        await navigator.clipboard.writeText(shareUrl)
        alert('공유 링크가 복사되었습니다.')
      } catch {}
    }
  }

  // 개별 공유 핸들러들
  const shareUrl = getShareUrl(location.pathname, location.search)
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('공유 링크가 복사되었습니다.')
    } catch {
      const dummy = document.createElement('input')
      dummy.value = shareUrl
      document.body.appendChild(dummy)
      dummy.select()
      document.execCommand('copy')
      document.body.removeChild(dummy)
      alert('공유 링크가 복사되었습니다.')
    }
    setShowShareSheet(false)
  }

  const handleEmailShare = () => {
    const subject = `맘픽 · ${kindergarten?.name || '유치원'} 정보 공유`
    const body = `${kindergarten?.name || '유치원'} 정보를 공유합니다.\n\n${shareUrl}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setShowShareSheet(false)
  }

  const handleBandShare = () => {
    const text = `${kindergarten?.name || '유치원'} 정보를 공유합니다.`
    const bandUrl = `https://band.us/plugin/share?body=${encodeURIComponent(text + '\n' + shareUrl)}&route=${encodeURIComponent(shareUrl)}`
    window.open(bandUrl, '_blank')
    setShowShareSheet(false)
  }

  const handleKakaoShare = async () => {
    const Kakao = (window as any).Kakao
    const title = `${kindergarten?.name || '유치원'} 정보`
    try {
      if (Kakao?.isInitialized?.() && Kakao?.Share) {
        await Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title,
            description: '맘픽 유치원 상세정보',
            imageUrl: `${getShareUrl('', '')}/headericon.png`,
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
          }
        })
        setShowShareSheet(false)
        return
      }
    } catch {
      // fallthrough to general share
    }
    await handleShareClick() // 일반 공유로 폴백
    setShowShareSheet(false)
  }

  const handleSmsShare = () => {
    const url = `${window.location.origin}${location.pathname}${location.search}`
    const body = `${kindergarten?.name || '유치원'} 정보를 공유합니다.\n\n${url}`
    // 안드로이드/대부분 브라우저 호환
    window.location.href = `sms:?body=${encodeURIComponent(body)}`
    setShowShareSheet(false)
  }

  // 공유 시트 드래그 핸들러 (아래로 스와이프 시 닫기)
  const handleShareSheetTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    setShareIsDragging(true)
    setShareDragStartY(t.clientY)
    setShareDragY(0)
  }

  const handleShareSheetTouchMove = (e: React.TouchEvent) => {
    if (!shareIsDragging || shareDragStartY === null) return
    const t = e.touches[0]
    const dy = t.clientY - shareDragStartY
    if (dy > 0) setShareDragY(dy)
  }

  const handleShareSheetTouchEnd = () => {
    if (!shareIsDragging) return
    const closeThreshold = 100
    if (shareDragY > closeThreshold) {
      // 닫기: 드래그 중 애니메이션 제거되어 있으므로, 먼저 드래그 종료로 전환 후 닫기
      setShareIsDragging(false)
      requestAnimationFrame(() => {
        setShowShareSheet(false)
        setShareDragY(0)
        setShareDragStartY(null)
      })
      return
    }
    // 복귀 애니메이션: 먼저 드래그 종료(transition 복원), 그 다음 프레임에 위치를 0으로
    setShareIsDragging(false)
    requestAnimationFrame(() => {
      setShareDragY(0)
      setShareDragStartY(null)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">유치원 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !kindergarten) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류 발생</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/kindergarten-map?type=kindergarten&selected=${kindercode}`)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isUsingSampleData ? 'pointer-events-none' : ''}`}>
      {/* 통합 헤더 + 탭 네비게이션 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        {/* 헤더 부분 */}
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/kindergarten-map?type=kindergarten&selected=${kindercode}`)}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate flex-1 mx-3">
            {kindergarten.name}
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
              {kindergarten.type}
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


      {/* 탭 내용 */}
      <div>
        {activeTab === 'detail' && (
          <div className="space-y-4">
            <div className="bg-white pb-16 shadow-sm">
              {/* 유치원 사진 영역 */}
              <div className="mb-4">
                {kindergarten?.customInfo?.building_images && kindergarten.customInfo.building_images.length > 0 ? (
                  <div 
                    className="relative bg-gray-100 h-40 cursor-pointer"
                    onClick={() => {
                      setImageViewerPhotos(kindergarten.customInfo!.building_images!)
                      setCurrentImageIndex(currentBuildingImageIndex || 0)
                      setShowImageViewer(true)
                    }}
                  >
                    <img 
                      src={kindergarten.customInfo.building_images[currentBuildingImageIndex || 0]} 
                      alt={`${kindergarten.name} 건물`}
                      className="w-full h-full object-cover"
                    />
                    {/* 이미지 카운터 */}
                    {kindergarten.customInfo.building_images.length > 1 && (
                      <>
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                          {(currentBuildingImageIndex || 0) + 1} / {kindergarten.customInfo.building_images.length}
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
                        {(currentBuildingImageIndex || 0) < kindergarten.customInfo.building_images.length - 1 && (
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
              {/* 유치원 기본 정보 */}
              <div className="mb-3 px-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-semibold">대표자명</span>
                      <span className="text-gray-900 font-medium">{kindergarten.rppnname || '정보 없음'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-semibold">원장명</span>
                      <span className="text-gray-900 font-medium">{kindergarten.ldgrname || '정보 없음'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-semibold">설립일</span>
                      <span className="text-gray-900 font-medium">{formatDate(kindergarten.edate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-semibold">개원일</span>
                      <span className="text-gray-900 font-medium">{formatDate(kindergarten.odate)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-3 px-4">
                <div className="grid grid-cols-5 gap-2">
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">정원</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <Users className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{kindergarten.capacity}명</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">현원</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <Users className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{kindergarten.enrolled}명</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">교사</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <GraduationCap className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{kindergarten.teacherCount}명</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">학급</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <Clock className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{kindergarten.classCount}개</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-2 py-1 text-center">
                       <div className="text-[10px] text-gray-500 font-semibold">CCTV</div>
                     </div>
                     <div className="flex flex-col items-center text-center p-2">
                       <Camera className="w-5 h-5 mb-1 text-[#fb8678]" />
                       <div className="text-xs font-semibold text-gray-900">{kindergarten.safety.cctvIstTotal || 0}대</div>
                     </div>
                   </div>
                </div>
              </div>
              {/* 환경위생 상세 정보 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-center">
                    <div className="text-xs text-gray-500 font-semibold">위생관리 점검일: {kindergarten.hygiene.lastCheckDate || '정보 없음'}</div>
                  </div>
                  <div className="p-4 space-y-2">
                    {/* 실내공기질 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">실내공기질</span>
                      <div className="flex items-center">
                        {getStatusIcon(kindergarten.hygiene.status)}
                        <span className={`ml-2 text-xs font-semibold ${getStatusColor(kindergarten.hygiene.status)} px-1.5 py-0.5 rounded-full`}>
                          {kindergarten.hygiene.status || '미상'}
                        </span>
                      </div>
                    </div>
                    
                    {/* 음용수 종류 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">음용수</span>
                      <span className="text-xs font-semibold text-gray-900">정수기 사용</span>
                    </div>
                    
                    {/* 정기소독 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">정기소독</span>
                      <div className="flex items-center">
                        {getStatusIcon('적합')}
                        <span className="ml-2 text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                          실시
                        </span>
                      </div>
                    </div>
                    
                    {/* 미세먼지 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">미세먼지</span>
                      <div className="flex items-center">
                        {getStatusIcon('적합')}
                        <span className="ml-2 text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                          점검 완료
                        </span>
                      </div>
                    </div>
                    
                    {/* 조도관리 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">조도관리</span>
                      <div className="flex items-center">
                        {getStatusIcon('적합')}
                        <span className="ml-2 text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                          점검 완료
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 안전점검 현황 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-center">
                    <div className="text-xs text-gray-500 font-semibold">안전점검 현황</div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* 소방대피훈련 */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">소방대피훈련</span>
                        <div className="flex items-center">
                          {kindergarten.safety.fireAvdYn === 'Y' && (
                            <Check className="w-3 h-3 text-green-500 mr-1" strokeWidth={2.5} />
                          )}
                          <span className={`font-semibold ${kindergarten.safety.fireAvdYn === 'Y' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full text-xs' : 'text-gray-500'}`}>
                            {kindergarten.safety.fireAvdYn === 'Y' ? '실시' : '미실시'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">훈련일자</span>
                        <span className="text-gray-900 font-semibold">
                          {kindergarten.safety.fireAvdYn === 'Y' && kindergarten.safety.fireAvdDt 
                            ? formatDate(kindergarten.safety.fireAvdDt) 
                            : '없음'}
                        </span>
                      </div>
                      
                      {/* 가스점검 */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">가스점검</span>
                        <div className="flex items-center">
                          {kindergarten.safety.gasCkYn === 'Y' && (
                            <Check className="w-3 h-3 text-green-500 mr-1" strokeWidth={2.5} />
                          )}
                          <span className={`font-semibold ${kindergarten.safety.gasCkYn === 'Y' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full text-xs' : 'text-gray-500'}`}>
                            {kindergarten.safety.gasCkYn === 'Y' ? '실시' : '미실시'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">점검일자</span>
                        <span className="text-gray-900 font-semibold">
                          {kindergarten.safety.gasCkYn === 'Y' && kindergarten.safety.gasCkDt 
                            ? formatDate(kindergarten.safety.gasCkDt) 
                            : '없음'}
                        </span>
                      </div>
                      
                      {/* 소방안전점검 */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">소방안전점검</span>
                        <div className="flex items-center">
                          {kindergarten.safety.fireSafeYn === 'Y' && (
                            <Check className="w-3 h-3 text-green-500 mr-1" strokeWidth={2.5} />
                          )}
                          <span className={`font-semibold ${kindergarten.safety.fireSafeYn === 'Y' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full text-xs' : 'text-gray-500'}`}>
                            {kindergarten.safety.fireSafeYn === 'Y' ? '실시' : '미실시'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">점검일자</span>
                        <span className="text-gray-900 font-semibold">
                          {kindergarten.safety.fireSafeYn === 'Y' && kindergarten.safety.fireSafeDt 
                            ? formatDate(kindergarten.safety.fireSafeDt) 
                            : '없음'}
                        </span>
                      </div>
                      
                      {/* 전기설비점검 */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">전기설비점검</span>
                        <div className="flex items-center">
                          {kindergarten.safety.electCkYn === 'Y' && (
                            <Check className="w-3 h-3 text-green-500 mr-1" strokeWidth={2.5} />
                          )}
                          <span className={`font-semibold ${kindergarten.safety.electCkYn === 'Y' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full text-xs' : 'text-gray-500'}`}>
                            {kindergarten.safety.electCkYn === 'Y' ? '실시' : '미실시'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">점검일자</span>
                        <span className="text-gray-900 font-semibold">
                          {kindergarten.safety.electCkYn === 'Y' && kindergarten.safety.electCkDt 
                            ? formatDate(kindergarten.safety.electCkDt) 
                            : '없음'}
                        </span>
                      </div>
                      
                      {/* 놀이시설 안전검사 */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">놀이시설 안전검사</span>
                        <div className="flex items-center">
                          {kindergarten.safety.plygCkYn === 'Y' && (
                            <Check className="w-3 h-3 text-green-500 mr-1" strokeWidth={2.5} />
                          )}
                          <span className={`font-semibold ${kindergarten.safety.plygCkYn === 'Y' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full text-xs' : 'text-gray-500'}`}>
                            {kindergarten.safety.plygCkYn === 'Y' ? '대상' : '비대상'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">점검일자</span>
                        <span className="text-gray-900 font-semibold">
                          {kindergarten.safety.plygCkYn === 'Y' && kindergarten.safety.plygCkDt 
                            ? formatDate(kindergarten.safety.plygCkDt) 
                            : '없음'}
                        </span>
                      </div>
                      
                      {/* CCTV 설치 */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">CCTV 설치</span>
                        <div className="flex items-center">
                          {kindergarten.safety.cctvIstYn === 'Y' && (
                            <Check className="w-3 h-3 text-green-500 mr-1" strokeWidth={2.5} />
                          )}
                          <span className={`font-semibold ${kindergarten.safety.cctvIstYn === 'Y' ? 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full text-xs' : 'text-gray-500'}`}>
                            {kindergarten.safety.cctvIstYn === 'Y' ? '설치' : '미설치'}
                          </span>
                        </div>
                      </div>
                      {kindergarten.safety.cctvIstTotal !== undefined && kindergarten.safety.cctvIstTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">총 설치수</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.safety.cctvIstTotal}대</span>
                        </div>
                      )}
                      {kindergarten.safety.cctvIstIn !== undefined && kindergarten.safety.cctvIstIn > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">건물 안</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.safety.cctvIstIn}대</span>
                        </div>
                      )}
                      {kindergarten.safety.cctvIstOut !== undefined && kindergarten.safety.cctvIstOut > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">건물 밖</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.safety.cctvIstOut}대</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 교사 현황 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-semibold">교사 현황</div>
                    <button
                      onClick={() => setIsTeacherExperienceExpanded(!isTeacherExperienceExpanded)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isTeacherExperienceExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#fb8678]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#fb8678]" />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">원장</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.teachers?.principal || 0}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">원감</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.teachers?.vicePrincipal || 0}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">일반교사</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.teachers?.generalTeacher || 0}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">특수교사</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.teachers?.specialTeacher || 0}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">보건교사</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.teachers?.healthTeacher || 0}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">영양교사</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.teachers?.nutritionTeacher || 0}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">기간제교사</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.teachers?.contractTeacher || 0}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">사무직원</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.teachers?.staff || 0}명</span>
                      </div>
                    </div>
                    
                    {/* 근속연수현황 구분선 */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isTeacherExperienceExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="border-t border-gray-200 my-3"></div>
                      
                      {/* 근속연수현황 */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">1년미만</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.teachers?.yy1UndrThcnt || 0}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">1년이상2년미만</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.teachers?.yy1AbvYy2UndrThcnt || 0}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">2년이상4년미만</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.teachers?.yy2AbvYy4UndrThcnt || 0}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">4년이상6년미만</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.teachers?.yy4AbvYy6UndrThcnt || 0}명</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">6년이상</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.teachers?.yy6AbvThcnt || 0}명</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 통학차량 현황 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-semibold flex items-center">
                      <img src="/icons/schoolbusicon.svg" alt="통학 차량" className="w-4 h-4 mr-1" />
                      통학차량 현황
                    </div>
                    <button
                      onClick={() => setIsTransportationDetailsExpanded(!isTransportationDetailsExpanded)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isTransportationDetailsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#fb8678]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#fb8678]" />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">운영 여부</span>
                        <span className={`font-semibold ${kindergarten.bus.inOperation ? 'text-green-600' : 'text-gray-500'}`}>
                          {kindergarten.bus.inOperation ? '운영' : '미운영'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">차량 수</span>
                        <span className="text-gray-900 font-semibold">{kindergarten.bus.vehicleCount}대</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">동승 보호자</span>
                        <span className={`font-semibold ${kindergarten.bus.hasGuardian ? 'text-green-600' : 'text-gray-500'}`}>
                          {kindergarten.bus.hasGuardian ? '있음' : '없음'}
                        </span>
                      </div>
                      {kindergarten.bus.dclrVhcnt !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">신고차량수</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.bus.dclrVhcnt}대</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 승차인원별 신고차량수 구분선 */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isTransportationDetailsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="border-t border-gray-200 my-3"></div>
                      
                      {/* 승차인원별 신고차량수 */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">9인승 신고차량</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.bus.psg9DclrVhcnt || 0}대</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">12인승 신고차량</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.bus.psg12DclrVhcnt || 0}대</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">15인승 신고차량</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.bus.psg15DclrVhcnt || 0}대</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* 방과후 과정 현황 */}
              <div className="mb-3 px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-semibold flex items-center">
                      <img src="/icons/schoolaftericon.svg" alt="방과후 과정" className="w-4 h-4 mr-1" />
                      방과후 과정 현황
                    </div>
                    <button
                      onClick={() => setIsAfterSchoolDetailsExpanded(!isAfterSchoolDetailsExpanded)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isAfterSchoolDetailsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#fb8678]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#fb8678]" />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">운영 여부</span>
                        <span className={`font-semibold ${kindergarten.afterSchool.inOperation ? 'text-green-600' : 'text-gray-500'}`}>
                          {kindergarten.afterSchool.inOperation ? '운영' : '미운영'}
                        </span>
                      </div>
                      {kindergarten.afterSchool.operTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">운영시간</span>
                          <span className="text-gray-900 font-semibold text-xs">{kindergarten.afterSchool.operTime}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 상세 정보 구분선 */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isAfterSchoolDetailsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="border-t border-gray-200 my-3"></div>
                      
                      {/* 상세 정보 */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {kindergarten.afterSchool.inorClcnt !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">독립편성학급수</span>
                            <span className="text-gray-900 font-semibold">{kindergarten.afterSchool.inorClcnt}학급</span>
                          </div>
                        )}
                        {kindergarten.afterSchool.pmRrgnClcnt !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">오후재편성학급수</span>
                            <span className="text-gray-900 font-semibold">{kindergarten.afterSchool.pmRrgnClcnt}학급</span>
                          </div>
                        )}
                        {kindergarten.afterSchool.inorPtcKpcnt !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">독립편성참여원아수</span>
                            <span className="text-gray-900 font-semibold">{kindergarten.afterSchool.inorPtcKpcnt}명</span>
                          </div>
                        )}
                        {kindergarten.afterSchool.pmRrgnPtcKpcnt !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">오후재편성참여원아수</span>
                            <span className="text-gray-900 font-semibold">{kindergarten.afterSchool.pmRrgnPtcKpcnt}명</span>
                          </div>
                        )}
                        {kindergarten.afterSchool.fxrlThcnt !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">정규교사수</span>
                            <span className="text-gray-900 font-semibold">{kindergarten.afterSchool.fxrlThcnt}명</span>
                          </div>
                        )}
                        {kindergarten.afterSchool.shcntThcnt !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">기간제교사수</span>
                            <span className="text-gray-900 font-semibold">{kindergarten.afterSchool.shcntThcnt}명</span>
                          </div>
                        )}
                        {kindergarten.afterSchool.incnt !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">전담사수</span>
                            <span className="text-gray-900 font-semibold">{kindergarten.afterSchool.incnt}명</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 안전교육 과정 현황 */}
              {kindergarten.safetyEducation && (
                <div className="mb-3 px-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                      <div className="text-xs text-gray-500 font-semibold">안전교육 과정 현황</div>
                      <button
                        onClick={() => setIsSafetyEducationExpanded(!isSafetyEducationExpanded)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {isSafetyEducationExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#fb8678]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#fb8678]" />
                        )}
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="text-center text-xs">
                        <div className="flex justify-center items-center">
                          <span className="text-gray-600 mr-2">학기</span>
                          <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.pbntSemScCd ? `${kindergarten.safetyEducation.pbntSemScCd}학기` : '정보 없음'}</span>
                        </div>
                      </div>
                      
                      {/* 접기/펼치기 가능한 안전교육 상세 정보 */}
                      <div 
                        className={`overflow-hidden transition-all duration-300 ${
                          isSafetyEducationExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">생활안전교육</span>
                              <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.safeTpCd1 ? `${kindergarten.safetyEducation.safeTpCd1}회` : '정보 없음'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">교통안전교육</span>
                              <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.safeTpCd2 ? `${kindergarten.safetyEducation.safeTpCd2}회` : '정보 없음'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">폭력예방 신변보호교육</span>
                              <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.safeTpCd3 ? `${kindergarten.safetyEducation.safeTpCd3}회` : '정보 없음'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">약물중독예방교육</span>
                              <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.safeTpCd4 ? `${kindergarten.safetyEducation.safeTpCd4}회` : '정보 없음'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">사이버중독예방교육</span>
                              <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.safeTpCd5 ? `${kindergarten.safetyEducation.safeTpCd5}회` : '정보 없음'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">재난안전교육</span>
                              <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.safeTpCd6 ? `${kindergarten.safetyEducation.safeTpCd6}회` : '정보 없음'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">직업안전교육</span>
                              <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.safeTpCd7 ? `${kindergarten.safetyEducation.safeTpCd7}회` : '정보 없음'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">응급처치교육</span>
                              <span className="text-gray-900 font-semibold">{kindergarten.safetyEducation.safeTpCd8 ? `${kindergarten.safetyEducation.safeTpCd8}회` : '정보 없음'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                     onClick={() => navigate(`/kindergarten/${kindercode}/meal-calendar`)}
                     className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-500">
                       <path d="m9 18 6-6-6-6"/>
                     </svg>
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
                    <div className="text-xs text-gray-500 font-semibold">급식 운영 정보</div>
                  </div>
                  <div className="p-4 space-y-2">
                    {/* 급식 형태 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">급식 형태</span>
                      <span className="text-xs font-semibold text-gray-900">{kindergarten.meal.mode}</span>
                    </div>
                    
                    {/* 위탁업체명 (위탁인 경우만) */}
                    {kindergarten.meal.mode === '위탁' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">위탁업체명</span>
                        <span className="text-xs font-semibold text-gray-900">{kindergarten.meal.consEntsNm || '정보 없음'}</span>
                      </div>
                    )}
                    
                    {/* 영양사 상주 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">영양사 상주</span>
                      <span className={`text-xs font-semibold ${kindergarten.meal.hasDietitian ? 'text-green-600' : 'text-gray-500'}`}>
                        {kindergarten.meal.hasDietitian ? '있음' : '없음'}
                      </span>
                    </div>
                    
                    {/* 영양교사 배치 */}
                    {kindergarten.meal.ntrtTchrAgmtYn && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">영양교사 배치</span>
                        <span className={`text-xs font-semibold ${kindergarten.meal.ntrtTchrAgmtYn === 'Y' ? 'text-green-600' : 'text-gray-500'}`}>
                          {kindergarten.meal.ntrtTchrAgmtYn === 'Y' ? '배치됨' : '미배치'}
                        </span>
                      </div>
                    )}
                    
                    {/* 영양교사 수 */}
                    {(kindergarten.meal.sngeAgmtNtrtThcnt !== undefined || kindergarten.meal.cprtAgmtNtrtThcnt !== undefined) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">영양교사 수</span>
                        <div className="flex gap-2">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            단독 {kindergarten.meal.sngeAgmtNtrtThcnt || 0}명
                          </span>
                          <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            공동 {kindergarten.meal.cprtAgmtNtrtThcnt || 0}명
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* 공동배치기관 */}
                    {kindergarten.meal.cprtAgmtIttNm && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">공동배치기관</span>
                        <span className="text-xs font-medium text-gray-900">{kindergarten.meal.cprtAgmtIttNm}</span>
                      </div>
                    )}
                    
                    {/* 조리 인력 */}
                    {(kindergarten.meal.ckcnt !== undefined || kindergarten.meal.cmcnt !== undefined) && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">조리 인력</span>
                        <div className="flex gap-2">
                          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                            조리사 {kindergarten.meal.ckcnt || 0}명
                          </span>
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            조리인력 {kindergarten.meal.cmcnt || 0}명
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* 집단급식소 신고 */}
                    {kindergarten.meal.masMsplDclrYn && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">집단급식소 신고</span>
                        <span className={`text-xs font-semibold ${kindergarten.meal.masMsplDclrYn === 'Y' ? 'text-green-600' : 'text-gray-500'}`}>
                          {kindergarten.meal.masMsplDclrYn === 'Y' ? '신고됨' : '미신고'}
                        </span>
                      </div>
                    )}
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
                <h2 className="text-lg font-semibold text-gray-900">칭찬 ({totalReviews})</h2>
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
                  <div className="text-xs text-gray-500 mt-1">총 {totalReviews}개</div>
                </div>
                
                {/* 별점 분포 게이지 (배달의민족 스타일) */}
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 w-6 font-semibold">{rating}점</span>
                      <Heart className="w-3 h-3 text-[#fb8678] fill-current" />
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${totalReviews > 0 ? (ratingDistribution[rating as keyof typeof ratingDistribution] / totalReviews) * 100 : 0}%` 
                          }}
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

            {/* 사진 둘러보기 (네이버 포토&동영상 스타일) */}
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
              
              {/* 사진 한 줄 표시 */}
              <div className="flex space-x-3 overflow-x-auto">
                {displayPhotoItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-20 h-20 aspect-square bg-gray-100 rounded-lg relative overflow-hidden cursor-zoom-in"
                    onClick={() => {
                      // photoItems에서 현재 이미지가 속한 리뷰 찾기
                      const reviewForPhoto = reviews.find((r: any) => 
                        !r.is_hidden && r.images && r.images.some((img: any) => img.image_url === item.imageUrl)
                      )
                      const reviewIndex = reviewForPhoto ? reviews.findIndex((rev: any) => rev.id === reviewForPhoto.id) : -1
                      openImageViewer(allPhotoUrls, item.globalIndex, reviewForPhoto?.id, reviewIndex >= 0 ? reviewIndex : undefined)
                    }}
                  >
                    <img src={item.imageUrl} alt={`칭찬 사진 ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded">{item.rating}점</div>
                    {index === 3 && totalPhotoCount > 4 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">+{totalPhotoCount - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
                {/* 사진이 없는 경우 */}
                {displayPhotos.length === 0 && (
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
              ) : reviews.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-gray-600">아직 칭찬이 없습니다.</p>
                  <p className="text-gray-500 text-sm">첫 번째 칭찬을 남겨보세요!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="px-4 py-4">
                    {/* 리뷰 헤더 */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {review.user_profile?.profile_image_url ? (
                            <img
                              src={review.user_profile.profile_image_url}
                              alt={review.user_profile?.nickname || '프로필'}
                              className="w-10 h-10 rounded-2xl object-cover cursor-pointer"
                              onClick={() => {
                                const profileImage = review.user_profile?.profile_image_url || ''
                                const childrenInfo = review.user_profile?.children_info
                                const childrenImages = Array.isArray(childrenInfo)
                                  ? childrenInfo
                                      .map((child: any) => child?.profile_image_url)
                                      .filter((url: any) => url && url.trim() !== '')
                                  : []
                                const userName = review.user_profile?.nickname || review.user_profile?.full_name || '익명'
                                const userId = review.user_id || ''
                                openProfileImageViewer(profileImage, childrenImages, { id: userId, name: userName })
                              }}
                            />
                          ) : (
                            <div 
                              className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center cursor-pointer"
                              onClick={() => {
                                const childrenInfo = review.user_profile?.children_info
                                const childrenImages = Array.isArray(childrenInfo)
                                  ? childrenInfo
                                      .map((child: any) => child?.profile_image_url)
                                      .filter((url: any) => url && url.trim() !== '')
                                  : []
                                if (childrenImages.length > 0) {
                                  const userName = review.user_profile?.nickname || review.user_profile?.full_name || '익명'
                                  const userId = review.user_id || ''
                                  openProfileImageViewer('', childrenImages, { id: userId, name: userName })
                                }
                              }}
                            >
                              <span className="text-sm font-medium text-gray-600">
                                {review.user_profile?.nickname?.charAt(0) || review.user_profile?.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                          {/* 자녀 프로필 사진 배지 (학부모) */}
                          {Array.isArray(review.user_profile?.children_info) && (review.user_profile?.children_info?.length ?? 0) > 0 && (
                            <div className="absolute -bottom-1 -right-1 flex items-center flex-row-reverse">
                              {(review.user_profile?.children_info?.length ?? 0) > 2 && (
                                <div className="w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center relative z-30">
                                  <span className="text-white text-[7px] font-bold">+{(review.user_profile?.children_info?.length ?? 0) - 2}</span>
                                </div>
                              )}
                              {(review.user_profile?.children_info?.length ?? 0) >= 2 && (
                                <div className={`w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden relative z-20 ${(review.user_profile?.children_info?.length ?? 0) > 2 ? '-mr-[5px]' : ''}`}>
                                  {review.user_profile?.children_info?.[1]?.profile_image_url ? (
                                    <img src={review.user_profile?.children_info?.[1]?.profile_image_url} alt="자녀 프로필 2" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-gray-400 text-[10px]">👤</span>
                                  )}
                                </div>
                              )}
                              <div className={`w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden relative z-10 ${(review.user_profile?.children_info?.length ?? 0) >= 2 ? '-mr-[5px]' : ''}`}>
                                {review.user_profile?.children_info?.[0]?.profile_image_url ? (
                                  <img src={review.user_profile?.children_info?.[0]?.profile_image_url} alt="자녀 프로필" className="w-full h-full object-cover" />
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
                              {new Date(review.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => toggleReviewMenu(review.id)}
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
                                onClick={() => handleDeleteReviewClick(review.id)}
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
                                  onClick={() => handleBlockReviewAuthor(review.user_id)}
                                  className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  차단하기
                                </button>
                                <div className="border-t border-gray-200 mx-2"></div>
                                <button
                                  onClick={() => handleReportReview(review.id, review.user_id)}
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
                        {review.images.map((image, index) => (
                          <div 
                            key={index} 
                            className={`w-20 h-20 aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${review.is_hidden ? '' : 'cursor-zoom-in'}`}
                            onClick={review.is_hidden ? undefined : () => {
                              const reviewIndex = reviews.findIndex((rev: any) => rev.id === review.id)
                              openImageViewer(review.images!.map(img => img.image_url), index, review.id, reviewIndex)
                            }}
                          >
                            {review.is_hidden ? (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">숨김</span>
                              </div>
                            ) : (
                              <img 
                                src={image.image_url} 
                                alt={`칭찬 이미지 ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 리뷰 액션 */}
                    <div className="flex items-center">
                      <button 
                        onClick={() => handleReviewHelpful(review.id)}
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
                        <span className="text-xs">도움됨 {review.helpful_count}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 무한 스크롤 Sentinel 및 로딩 인디케이터 */}
            {!reviewsLoading && reviews.length > 0 && (
              <>
                <div id="reviews-sentinel" className="h-1" />
                {reviewsLoading && hasMoreReviews && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fb8678] mx-auto mb-2"></div>
                    <p className="text-gray-500 text-xs">칭찬을 불러오는 중...</p>
                  </div>
                )}
                {!hasMoreReviews && reviews.length >= 10 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-xs">모든 칭찬을 불러왔습니다.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 리뷰 탭 플로팅 버튼 */}
        {activeTab === 'reviews' && (
          <>
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
                    // 이미 리뷰를 작성한 경우 알림 표시
                    if (userReview) {
                      alert('이미 칭찬을 남겼습니다.')
                      setShowReviewOptions(false)
                      return
                    }
                    
                    const reviewUrl = `/kindergarten/${kindercode}/review${sidoCode && sggCode ? `?sidoCode=${sidoCode}&sggCode=${sggCode}` : ''}`
                    navigate(reviewUrl)
                    setShowReviewOptions(false)
                  }}
                  disabled={!!userReview}
                  className={`w-full px-4 py-2 text-[#fb8678] rounded-xl shadow-lg border border-[#fb8678]/20 hover:bg-[#fb8678]/10 transition-all duration-300 whitespace-nowrap font-semibold ${
                    userReview 
                      ? 'text-gray-400 border-gray-200 cursor-not-allowed !bg-white' 
                      : ''
                  }`}
                >
                  {userReview ? '이미 칭찬 남겼습니다' : '칭찬 남기기'}
                </button>
              </div>
            )}

            {/* 플로팅 버튼 - 학부모만 표시 */}
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
      </div>


    {/* 신고 모달 (커뮤니티 스타일) */}
    {showReportModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-4 max-w-lg w-full min-h-[500px] max-h-[95vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">칭찬 신고</h3>
            <button
              onClick={() => setShowReportModal(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mb-6">
            <p className="text-gray-600 text-sm mb-4">
              선택한 칭찬을 신고합니다.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                신고 유형
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
              >
                <option value="spam">스팸/광고성 게시글</option>
                <option value="inappropriate">부적절한 내용</option>
                <option value="harassment">괴롭힘/폭력</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                신고 사유
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="신고 사유를 구체적으로 작성해주세요..."
                rows={6}
                maxLength={500}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent resize-none text-sm"
              />
              <div className="flex justify-between text-xs text-gray-400 font-semibold mt-1">
                <span>최대 텍스트 길이</span>
                <span>{reportReason.length}/500</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 flex-shrink-0">
            <button
              onClick={() => setShowReportModal(false)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSubmitReportModal}
              disabled={reportLoading || !reportReason.trim()}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reportLoading ? '신고 중...' : '신고하기'}
            </button>
          </div>
        </div>
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
                setIsMealImageReport(false)
              }}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSubmitImageReportModal}
              disabled={imageReportLoading || !imageReportReason.trim()}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {imageReportLoading ? '신고 중...' : '신고하기'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 차단 확인 모달 (커뮤니티 스타일) */}
    {showBlockModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              사용자를 차단하시겠습니까?
            </h2>
            <div className="text-sm text-gray-600 text-left space-y-2">
              <p>• 차단하면 해당 사용자의 칭찬와 활동이 더 이상 보이지 않습니다.</p>
              <p>• 상대방은 회원님의 글을 계속 볼 수 있습니다.</p>
              <p>• 정말 차단하시겠습니까?</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => { setShowBlockModal(false); setPendingBlockUserId(null) }}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={handleConfirmBlock}
              disabled={blockLoading}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {blockLoading ? '차단 중...' : '차단하기'}
            </button>
          </div>
        </div>
      </div>
    )}

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-white/50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-1px_rgba(0,0,0,0.06)] h-[70px] flex items-center py-2 px-3">
        <div className="flex space-x-3 w-full">
          <button onClick={() => setShowShareSheet(true)} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={async () => {
              const raw = kindergarten?.phone || ''
              const phone = raw.replace(/[^0-9+]/g, '')
              if (!phone) {
                alert('전화번호 정보가 없습니다.')
                return
              }
              try {
                await navigator.clipboard.writeText(phone)
              } catch {}
              // 전화앱 열기 (안드로이드/IOS 공통)
              window.location.href = `tel:${phone}`
            }}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            문의하기
          </button>
           <button 
            onClick={async () => {
              if (isUsingSampleData) {
                // 샘플 데이터일 때는 찜 금지
                alert('API 데이터를 불러오지 못해 임시 정보를 표시 중입니다. 실제 데이터에서만 찜하기가 가능합니다.')
                return
              }
              const next = !isFavorite
              setIsFavorite(next)
              try {
                if (currentUserId && kindercode) {
                  if (next) {
                    await addFavorite(
                      currentUserId, 
                      'kindergarten', 
                      String(kindercode), 
                      kindergarten?.name,
                      {
                        sidoCode: sidoCode,
                        sggCode: sggCode
                      }
                    )
                    setShowHeartBurst(true)
                    setTimeout(() => setShowHeartBurst(false), 700)
                  } else {
                    await removeFavorite(currentUserId, 'kindergarten', String(kindercode))
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

      {/* 사진 갤러리 전체 화면 */}
      {showPhotoGallery && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowPhotoGallery(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">칭찬 사진</h2>
            </div>
            <div className="text-sm text-gray-500">
              {photosWithReviews.reduce((total, review) => total + (review.images?.length || 0), 0)}장
            </div>
          </div>
          
          {/* 사진 그리드 */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {photosWithReviews.map((review, reviewIndex) => (
                review.images?.map((image, imageIndex) => {
                  const offset = photosWithReviews
                    .slice(0, photosWithReviews.indexOf(review))
                    .reduce((sum, r) => sum + (r.images?.length || 0), 0)
                  const globalIndex = offset + imageIndex
                  return (
                    <div 
                      key={`${reviewIndex}-${imageIndex}`} 
                      className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden group cursor-zoom-in"
                      onClick={() => {
                        openImageViewer(allPhotoUrls, globalIndex, review.id, reviewIndex)
                      }}
                    >
                      <img
                        src={image.image_url}
                        alt={`칭찬 사진 ${imageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
                        {review.rating}점
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="font-medium">{review.user_profile?.nickname || review.user_profile?.full_name || '익명'}</div>
                        <div className="text-[10px] opacity-75">{new Date(review.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )
                })
              ))}
            </div>
            
            {/* 사진이 없는 경우 */}
            {photosWithReviews.reduce((total, review) => total + (review.images?.length || 0), 0) === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Camera className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">등록된 사진이 없습니다</p>
                <p className="text-sm">첫 번째 칭찬 사진을 올려보세요!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 리뷰 이미지 전체보기 뷰어 */}
      {showImageViewer && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center touch-pan-y"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
            const reviewForCurrentImage = reviews.find((r: any) => r.id === currentImageViewerReview.reviewId)
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
              alt="칭찬 전체 이미지"
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

      {/* 삭제 확인 모달 (커뮤니티 스타일) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">칭찬 삭제요청</h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                삭제요청을 하시면 관리자 검토 후 삭제됩니다.
              </p>
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
            <div className="flex space-x-3 mt-auto">
              <button
                onClick={() => { 
                  setShowDeleteConfirm(false)
                  setPendingDeleteReviewId(null)
                  setDeleteRequestReason('')
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDeleteReview}
                disabled={deleteRequestReason.trim().length < 10 || deleteRequestReason.trim().length > 500}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                삭제요청
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 링크 공유 바텀시트 */}
      {showShareSheet && (
        <div className="fixed inset-0 z-50">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowShareSheet(false)}
          />
          {/* 시트 */}
          <div
            className={`absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl border-t border-gray-200 p-4 will-change-transform ${shareIsDragging ? 'transition-none' : 'transition-transform duration-200'}`}
            style={{ transform: `translate3d(0, ${shareDragY}px, 0)` }}
            onTouchMove={handleShareSheetTouchMove}
            onTouchEnd={handleShareSheetTouchEnd}
          >
            <div className="animate-[sheetSlideUp_0.28s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div
                className="w-full flex justify-center py-2 mb-1"
                onTouchStart={handleShareSheetTouchStart}
              >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
            <div className="mb-2">
              <div className="text-base font-semibold text-black pl-1 pb-1">링크 공유</div>
              <div className="mt-1 text-xs text-gray-600 break-all bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                {shareUrl}
              </div>
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

      {/* 유치원알리미 API 정보 팝업 모달 */}
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
                    <span className="text-sm font-semibold text-blue-800">유치원알리미</span>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed mb-3">
                    이 유치원 정보는 <strong>유치원알리미</strong>에서 제공하는 공식 API를 통해 수집된 데이터입니다.
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-blue-900">정확한 정보</p>
                      <p className="text-[10px] text-blue-600">교육부에서 제공하는 공식 데이터</p>
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
                    더 자세한 정보는 <strong>유치원알리미</strong> 공식 사이트에서 확인하실 수 있습니다.
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
                    window.open('https://e-childschoolinfo.moe.go.kr/main.do', '_blank')
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

      {/* 프로필 사진 전체보기 뷰어 */}
      {showProfileImageViewer && profileImageViewerImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center"
          onClick={(e) => {
            // 메뉴 외부 클릭 시 메뉴 닫기
            if (!(e.target as Element).closest('.profile-image-viewer-menu-container')) {
              setShowProfileImageViewerMenu(false)
            }
            // 배경 클릭 시 모달 닫기 (메뉴가 열려있지 않을 때만)
            if (!showProfileImageViewerMenu) {
              closeProfileImageViewer()
            }
          }}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={closeProfileImageViewer}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white z-10"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 점 3개 메뉴 버튼 (본인 프로필이 아닐 때만 표시) */}
          {currentAuthUserId && profileImageViewerUser && (() => {
            // 본인 프로필인지 확인
            const isOwnProfile = profileImageViewerUser.id === currentAuthUserId
            // 본인이 아니면 점3개 표시
            return !isOwnProfile
          })() && (
            <div className="absolute top-4 right-16 profile-image-viewer-menu-container z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowProfileImageViewerMenu(!showProfileImageViewerMenu)
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white"
                aria-label="옵션 메뉴"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
              {showProfileImageViewerMenu && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenProfileReportModal()
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
          {profileImageViewerImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentProfileImageIndex((currentProfileImageIndex - 1 + profileImageViewerImages.length) % profileImageViewerImages.length)
              }}
              className="absolute left-2 sm:left-4 p-3 rounded-full hover:bg-white/10 text-white z-10"
              aria-label="이전 이미지"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* 이미지 */}
          <div 
            className="flex-1 flex items-center justify-center max-w-full max-h-full px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={profileImageViewerImages[currentProfileImageIndex]}
              alt={`프로필 사진 ${currentProfileImageIndex === 0 ? '본인' : `자녀 ${currentProfileImageIndex}`}`}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>

          {/* 다음 버튼 */}
          {profileImageViewerImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCurrentProfileImageIndex((currentProfileImageIndex + 1) % profileImageViewerImages.length)
              }}
              className="absolute right-2 sm:right-4 p-3 rounded-full hover:bg-white/10 text-white z-10"
              aria-label="다음 이미지"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}

          {/* 자녀 사진 썸네일 (아래쪽에 원형으로 표시) */}
          {profileImageViewerImages.length > 1 && (
            <div 
              className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 px-4 pb-4 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {profileImageViewerImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProfileImageIndex(index)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                    currentProfileImageIndex === index
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-white/50 opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                  aria-label={index === 0 ? '본인 프로필' : `자녀 ${index} 프로필`}
                >
                  <img
                    src={image}
                    alt={index === 0 ? '본인 프로필' : `자녀 ${index} 프로필`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 프로필 신고 모달 */}
      {showProfileReportModal && profileImageViewerUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full min-h-[500px] max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">프로필 신고</h3>
              <button
                onClick={handleCloseProfileReportModal}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6">
              <p className="text-gray-600 text-sm mb-4">
                <strong>{profileImageViewerUser.name}</strong>님의 프로필을 신고합니다.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 유형
                </label>
                <select
                  value={profileReportType}
                  onChange={(e) => setProfileReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent"
                >
                  <option value="spam">스팸/광고성 게시글</option>
                  <option value="inappropriate">부적절한 내용</option>
                  <option value="inappropriate_image">부적절한 이미지 사용</option>
                  <option value="harassment">괴롭힘/폭력</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 사유
                </label>
                <textarea
                  value={profileReportReason}
                  onChange={(e) => setProfileReportReason(e.target.value)}
                  placeholder="신고 사유를 구체적으로 작성해주세요..."
                  rows={6}
                  maxLength={500}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent resize-none text-sm"
                />
                <div className="flex justify-between text-xs text-gray-400 font-semibold mt-1">
                  <span>최대 텍스트 길이</span>
                  <span>{profileReportReason.length}/500</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 flex-shrink-0">
              <button
                onClick={handleCloseProfileReportModal}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSubmitProfileReport}
                disabled={!profileReportReason.trim() || profileReportLoading}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileReportLoading ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 샘플 데이터 팝업 */}
      {isUsingSampleData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 pointer-events-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                죄송합니다. 파일을 불러오지 못했습니다.
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                없는 시설이거나 잘못된 시설 정보 인거같습니다.
                <br />
                자세한건 문의하기를 통해 알려주세요.
              </p>
            </div>
            <button
              onClick={() => {
                const type = searchParams.get('type') || 'kindergarten'
                navigate(`/kindergarten-map?type=${type}`)
              }}
              className="w-full px-4 py-3 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#fb8678]/90 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default KindergartenDetailPage

