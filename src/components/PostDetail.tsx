import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Heart, MessageCircle, MapPin, ChevronLeft, ChevronRight, Share2, MoreVertical, Edit, Trash2, Flag, X, Shield, MoreHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLikeContext } from '../contexts/LikeContext'
import { createLikeNotification, createReplyNotification } from '../utils/notifications'
import { getShareUrl } from '../utils/shareUrl'

interface CommunityPost {
  id: string
  author_name: string
  author_profile_image: string
  content: string
  location: string
  hashtags: string[]
  images: string[]
  emojis: string[]
  likes_count: number
  comments_count: number
  created_at: string
  category: string
  user_id: string
  author_children_images?: string[]
}

interface Comment {
  id: string
  post_id: string
  user_id: string
  user_name: string
  user_profile_image: string
  content: string
  created_at: string
  updated_at?: string
  is_edited?: boolean
  is_deleted?: boolean
  parent_id?: string | null
  replies?: Comment[]
  user_children_images?: string[]
  user_type?: string
}

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; full_name: string; nickname: string; profile_image_url: string; user_type?: string; auth_user_id?: string; children_info?: Array<{ name: string; gender: string; birth_date: string; relationship: string; profile_image_url?: string }> } | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  // 이미지 전체보기 뷰어 상태
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [imageViewerPhotos, setImageViewerPhotos] = useState<string[]>([])
  const [imageViewerStartIndex, setImageViewerStartIndex] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentLoading, setCommentLoading] = useState(false)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [currentCommentPage, setCurrentCommentPage] = useState(1)
  const commentsPerPage = 20
  const [likeLoading, setLikeLoading] = useState(false)
  const commentsLoadedRef = useRef<boolean>(false)
  
  // 신고 관련 상태
  const [showReportMenu, setShowReportMenu] = useState<boolean>(false)
  const [showReportModal, setShowReportModal] = useState<boolean>(false)
  const [reportReason, setReportReason] = useState<string>('')
  const [reportType, setReportType] = useState<string>('spam')
  const [reportLoading, setReportLoading] = useState<boolean>(false)
  
  // 차단 관련 상태
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false)
  const [blockLoading, setBlockLoading] = useState<boolean>(false)
  // 공유 바텀시트 상태
  const [showShareSheet, setShowShareSheet] = useState<boolean>(false)
  
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
  const [shareDragStartY, setShareDragStartY] = useState<number | null>(null)
  const [shareDragY, setShareDragY] = useState<number>(0)
  const [shareIsDragging, setShareIsDragging] = useState<boolean>(false)
  
  // 댓글 차단/신고 관련 상태
  const [pendingBlockCommentUserId, setPendingBlockCommentUserId] = useState<string | null>(null)
  const [pendingReportComment, setPendingReportComment] = useState<{ commentId: string; userId: string } | null>(null)
  const [showCommentReportModal, setShowCommentReportModal] = useState<boolean>(false)
  const [commentReportReason, setCommentReportReason] = useState<string>('')
  const [commentReportType, setCommentReportType] = useState<string>('spam')
  const [commentReportLoading, setCommentReportLoading] = useState<boolean>(false)
  const [showCommentBlockModal, setShowCommentBlockModal] = useState<boolean>(false)

  // 모달이 열릴 때 배경 스크롤 비활성화
  useEffect(() => {
    if (showReportModal || showBlockModal || showShareSheet || showImageViewer || showProfileImageViewer || showProfileReportModal || showCommentReportModal || showCommentBlockModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // cleanup function - 컴포넌트가 언마운트될 때 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showReportModal, showBlockModal, showShareSheet, showImageViewer, showProfileImageViewer, showProfileReportModal, showCommentReportModal, showCommentBlockModal])

  // 공유 시트 터치 핸들러
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
      setShareIsDragging(false)
      requestAnimationFrame(() => {
        setShowShareSheet(false)
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

  // 공유 핸들러들
  const postShareUrl = getShareUrl(`/community/post/${postId}`, `category=${encodeURIComponent(post?.category || '')}`)
  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(postShareUrl); alert('공유 링크가 복사되었습니다.') } catch {}
    setShowShareSheet(false)
  }
  const handleEmailShare = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent('맘픽 · 커뮤니티 게시글')}&body=${encodeURIComponent(postShareUrl)}`
    setShowShareSheet(false)
  }
  const handleBandShare = () => {
    const bandUrl = `https://band.us/plugin/share?body=${encodeURIComponent(post?.content?.slice(0, 60) || '')}%0A${encodeURIComponent(postShareUrl)}&route=${encodeURIComponent(postShareUrl)}`
    window.open(bandUrl, '_blank')
    setShowShareSheet(false)
  }
  const handleSmsShare = () => {
    const body = `맘픽 커뮤니티 게시글을 공유합니다.\n\n${postShareUrl}`
    window.location.href = `sms:?body=${encodeURIComponent(body)}`
    setShowShareSheet(false)
  }
  const handleKakaoShare = async () => {
    const Kakao = (window as any).Kakao
    try {
      if (Kakao?.isInitialized?.() && Kakao?.Share) {
        await Kakao.Share.sendDefault({
          objectType: 'feed',
          content: { title: '맘픽 · 커뮤니티', description: post?.content?.slice(0, 70) || '게시글 공유', imageUrl: `${getShareUrl('', '')}/headericon.png`, link: { mobileWebUrl: postShareUrl, webUrl: postShareUrl } }
        })
        setShowShareSheet(false)
        return
      }
    } catch {}
    // 일반 공유로 폴백
    const navWithShare = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> }
    if (navWithShare.share) { await navWithShare.share({ title: '맘픽 · 커뮤니티', text: post?.content?.slice(0, 70), url: postShareUrl }) }
    else { await handleCopyLink() }
    setShowShareSheet(false)
  }

  const handleSystemShare = async () => {
    try {
      const navWithShare = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> }
      if (navWithShare.share) {
        await navWithShare.share({ title: '맘픽 · 커뮤니티', text: post?.content?.slice(0, 70), url: postShareUrl })
      } else {
        await navigator.clipboard.writeText(postShareUrl)
        alert('공유 링크가 복사되었습니다.')
      }
    } catch {}
    setShowShareSheet(false)
  }
  
  // 댓글 모달 관련 상태
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false)
  const [newComment, setNewComment] = useState<string>('')
  
  // 댓글 수정/삭제 관련 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState<string>('')
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null)
  
  // 답글 관련 상태
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<string>('')
  const [showReplies, setShowReplies] = useState<Set<string>>(new Set())

  // URL에서 카테고리 정보 가져오기
  const category = searchParams.get('category') || '어린이집,유치원'
  
  // LikeContext 사용
  const { isLiked, toggleLike, refreshLikes } = useLikeContext()

  // 이미지 뷰어 관련 함수들
  const openImageViewer = (photos: string[], startIndex: number = 0) => {
    if (!photos || photos.length === 0) return
    setImageViewerPhotos(photos)
    setImageViewerStartIndex(Math.min(Math.max(startIndex, 0), photos.length - 1))
    setCurrentImageIndex(Math.min(Math.max(startIndex, 0), photos.length - 1))
    setShowImageViewer(true)
  }

  const closeImageViewer = () => {
    setShowImageViewer(false)
  }

  const goPrevImage = () => {
    if (imageViewerPhotos.length === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + imageViewerPhotos.length) % imageViewerPhotos.length)
  }

  const goNextImage = () => {
    if (imageViewerPhotos.length === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % imageViewerPhotos.length)
  }

  // 댓글 섹션용: 모든 댓글을 한 번에 가져오기 (Community.tsx와 동일)
  const fetchAllComments = useCallback(async (postId: string) => {
    if (!postId || commentLoading) return
    
    setCommentLoading(true)
    
    try {
      console.log('댓글 전체 조회 중:', postId)
      
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('댓글 조회 오류:', error)
        return
      }

      console.log('댓글 조회 결과:', data)
      
      // 각 댓글 작성자의 프로필 정보 가져오기
      const commentsWithChildren = await Promise.all((data || []).map(async (comment) => {
        // user_id로 profiles 조회 (id 또는 auth_user_id 둘 다 시도)
        let profileData = null
        
        // 먼저 id로 조회
        const { data: profileById } = await supabase
          .from('profiles')
          .select('user_type, children_info')
          .eq('id', comment.user_id)
          .maybeSingle()
        
        if (profileById) {
          profileData = profileById
        } else {
          // id로 못 찾으면 auth_user_id로 조회
          const { data: profileByAuthId } = await supabase
            .from('profiles')
            .select('user_type, children_info')
            .eq('auth_user_id', comment.user_id)
            .maybeSingle()
          
          profileData = profileByAuthId
        }
        
        const childrenImages = profileData?.user_type === 'parent' && profileData?.children_info
          ? profileData.children_info.map((child: any) => child.profile_image_url || null)
          : []
        
        return {
          ...comment,
          user_children_images: childrenImages,
          user_type: profileData?.user_type
        }
      }))
      
      setComments(commentsWithChildren)
      commentsLoadedRef.current = true // 댓글 로드 완료 표시
      setHasMoreComments(false) // 모든 댓글을 불러왔으므로 더 이상 없음
    } catch (error) {
      console.error('댓글 조회 오류:', error)
    } finally {
      setCommentLoading(false)
    }
  }, [commentLoading])

  // 댓글 목록 가져오기 (페이지네이션용 - 댓글 모달에서 사용)
  const fetchComments = useCallback(async (postId: string, page: number = 1, append: boolean = false) => {
    if (!postId || (commentLoading && !append) || (loadingMoreComments && append)) return
    
    if (append) {
      setLoadingMoreComments(true)
    } else {
      setCommentLoading(true)
    }
    
    try {
      console.log('댓글 조회 중:', postId, 'page:', page)
      
      // 페이지네이션 적용
      const from = (page - 1) * commentsPerPage
      const to = from + commentsPerPage - 1
      
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('댓글 조회 오류:', error)
        return
      }

      console.log('댓글 조회 결과:', data)
      
      // 전체 댓글 수 확인 (hasMore 판단용)
      const { count: totalCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
      
      // 각 댓글 작성자의 프로필 정보 가져오기
      const commentsWithChildren = await Promise.all((data || []).map(async (comment) => {
        // user_id로 profiles 조회 (id 또는 auth_user_id 둘 다 시도)
        let profileData = null
        
        // 먼저 id로 조회
        const { data: profileById } = await supabase
          .from('profiles')
          .select('user_type, children_info')
          .eq('id', comment.user_id)
          .maybeSingle()
        
        if (profileById) {
          profileData = profileById
        } else {
          // id로 못 찾으면 auth_user_id로 조회
          const { data: profileByAuthId } = await supabase
            .from('profiles')
            .select('user_type, children_info')
            .eq('auth_user_id', comment.user_id)
            .maybeSingle()
          
          profileData = profileByAuthId
        }
        
        const childrenImages = profileData?.user_type === 'parent' && profileData?.children_info
          ? profileData.children_info.map((child: any) => child.profile_image_url || null)
          : []
        
        return {
          ...comment,
          user_children_images: childrenImages,
          user_type: profileData?.user_type
        }
      }))
      
      if (append) {
        setComments(prev => [...prev, ...commentsWithChildren])
      } else {
        setComments(commentsWithChildren)
        commentsLoadedRef.current = true // 댓글 로드 완료 표시
      }
      
      // 더 불러올 댓글이 있는지 확인
      const hasMore = totalCount ? (page * commentsPerPage) < totalCount : false
      setHasMoreComments(hasMore)
      setCurrentCommentPage(page)
    } catch (error) {
      console.error('댓글 조회 오류:', error)
    } finally {
      setCommentLoading(false)
      setLoadingMoreComments(false)
    }
  }, [commentLoading, loadingMoreComments, commentsPerPage])

  // 실제 게시글 데이터 가져오기
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return
      
      try {
        // 먼저 게시글 정보 가져오기 (작성자 정보 포함)
        const { data: postData, error: postError } = await supabase
          .from('community_posts')
          .select(`
            *,
            profiles!community_posts_author_id_fkey(
              id,
              auth_user_id,
              full_name,
              nickname,
              profile_image_url,
              user_type,
              children_info
            )
          `)
          .eq('id', postId)
          .single()

        if (postError) {
          console.error('게시글 조회 오류:', postError)
          return
        }

        // 실제 댓글 수와 좋아요 수 계산
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)

        const { count: likeCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)

        // 작성자의 자녀 프로필 이미지 추출
        const authorChildrenImages = postData.profiles?.user_type === 'parent' && postData.profiles?.children_info 
          ? postData.profiles.children_info.map((child: any) => child.profile_image_url || null)
          : []
        
        // 실제 댓글 수와 좋아요 수로 업데이트된 게시글 데이터
        const postWithActualCounts = {
          ...postData,
          user_id: postData.profiles?.auth_user_id || postData.author_id, // 작성자의 UUID 사용
          comments_count: commentCount || 0,
          likes_count: likeCount || 0,
          author_children_images: authorChildrenImages
        }

        setPost(postWithActualCounts)
        setCurrentImageIndex(0) // 이미지 인덱스 초기화
      } catch (error) {
        console.error('게시글 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId])

  // postId가 변경될 때 댓글 로드 상태 리셋
  useEffect(() => {
    commentsLoadedRef.current = false
    setComments([])
    setCurrentCommentPage(1)
    setHasMoreComments(true)
  }, [postId])

  // 게시글이 로드된 후 댓글 가져오기 (별도 useEffect로 분리)
  // 댓글 최적화: 댓글이 10개 이상일 때는 초기에 불러오지 않음 (사용자가 댓글 섹션을 볼 때만 불러오기)
  useEffect(() => {
    if (post && postId && !commentsLoadedRef.current && !commentLoading) {
      // 댓글이 10개 미만일 때만 초기에 불러오기 (최적화)
      if (post.comments_count > 0 && post.comments_count < 10) {
        // 댓글 섹션에서는 모든 댓글을 한 번에 불러오기
        fetchAllComments(postId)
      }
      // 댓글이 10개 이상이면 초기에 불러오지 않음 (사용자가 댓글 섹션을 스크롤하거나 댓글 모달을 열 때만 불러오기)
    }
  }, [post, postId, commentLoading, fetchAllComments]) // fetchAllComments를 dependency에 추가

  // 댓글 섹션이 보일 때 댓글 불러오기 (댓글이 10개 이상일 때만)
  useEffect(() => {
    if (!post || !postId || commentsLoadedRef.current || commentLoading) return
    
    // 댓글이 10개 이상이고 아직 댓글을 불러오지 않았을 때만
    if (post.comments_count >= 10 && comments.length === 0) {
      const commentsSection = document.getElementById('comments-section')
      if (!commentsSection) return

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !commentsLoadedRef.current && !commentLoading) {
            // 댓글 섹션에서는 모든 댓글을 한 번에 불러오기
            fetchAllComments(postId)
          }
        },
        { threshold: 0.1 }
      )

      observer.observe(commentsSection)

      return () => {
        observer.disconnect()
      }
    }
  }, [post, postId, comments.length, commentLoading, fetchAllComments])

  // 댓글 무한 스크롤을 위한 Intersection Observer
  useEffect(() => {
    if (!hasMoreComments || loadingMoreComments || !postId) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreComments && !loadingMoreComments) {
          fetchComments(postId, currentCommentPage + 1, true)
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = document.getElementById('comments-sentinel')
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel)
      }
    }
  }, [hasMoreComments, loadingMoreComments, currentCommentPage, postId, fetchComments])

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    let isMounted = true // 컴포넌트 마운트 상태 추적
    
    const getUserInfo = async () => {
      try {
        // 먼저 Supabase Auth에서 사용자 확인 (OAuth 사용자용)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!isMounted) return // 컴포넌트가 언마운트된 경우 중단
        
        if (user) {
          // OAuth 사용자인 경우 profiles 테이블에서 프로필 이미지 가져오기
          console.log('🔐 OAuth 사용자 감지, profiles 테이블에서 정보 조회 중...')
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, nickname, profile_image_url, user_type, auth_user_id, children_info')
            .eq('auth_user_id', user.id)
            .single()

          if (profileData && isMounted) {
            console.log('✅ OAuth 사용자 프로필 정보:', profileData)
            setCurrentUser(profileData)
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
              console.log('🔍 profiles 테이블에서 user_type 조회 중...')
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, nickname, profile_image_url, user_type, auth_user_id, children_info')
                .eq('id', profile.id)
                .single()
              
              if (!isMounted) return // 컴포넌트가 언마운트된 경우 중단
              
              if (profileData) {
                console.log('✅ profiles 테이블에서 가져온 정보:', profileData)
                setCurrentUser(profileData)
              } else {
                // profiles 테이블에 없는 경우 localStorage 정보 사용
                console.log('⚠️ profiles 테이블에 정보 없음, localStorage 정보 사용 (기본값: parent)')
                setCurrentUser({
                  id: profile.id || 'local-user',
                  full_name: profile.full_name || '',
                  nickname: profile.nickname || profile.full_name || '',
                  profile_image_url: profile.profile_image_url || '',
                  user_type: 'parent', // 기본값
                  children_info: []
                })
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
    
    // 클린업 함수
    return () => {
      isMounted = false
    }
  }, [])

  // 사용자 정보가 로드된 후 좋아요 상태 확인
  useEffect(() => {
    if (currentUser && postId) {
      // currentUser.id와 currentUser.auth_user_id 모두 확인
      const userIdToCheck = currentUser.auth_user_id || currentUser.id
      refreshLikes(userIdToCheck)
    }
  }, [currentUser, postId]) // refreshLikes 의존성 제거

  // 댓글 모달 열림/닫힘에 따른 배경 스크롤 제어
  useEffect(() => {
    if (showCommentModal) {
      // 모달이 열렸을 때 배경 스크롤 막기
      document.body.style.overflow = 'hidden'
    } else {
      // 모달이 닫혔을 때 배경 스크롤 복원
      document.body.style.overflow = 'unset'
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showCommentModal])

  // 좋아요 토글 기능
  const handleLikeToggle = async () => {
    if (!currentUser || !post || likeLoading) return

    setLikeLoading(true)

    try {
      // currentUser.id와 currentUser.auth_user_id 모두 확인하여 올바른 ID 사용
      const userIdToCheck = currentUser.auth_user_id || currentUser.id
      
      // 좋아요를 새로 눌렀는지 확인
      const wasLiked = isLiked(post.id)
      
      // LikeContext의 toggleLike 함수 사용
      await toggleLike(post.id, userIdToCheck, currentUser.nickname || currentUser.full_name)
      
      // 좋아요를 새로 눌렀을 때만 알림 생성
      if (!wasLiked) {
        // 게시글 작성자에게 알림 생성
        await createLikeNotification(
          post.id,
          userIdToCheck,
          currentUser.nickname || currentUser.full_name,
          currentUser.profile_image_url || '',
          post.user_id
        )
      }
      
      // 좋아요 수 업데이트
      const isCurrentlyLiked = isLiked(post.id)
      setPost(prev => prev ? { ...prev, likes_count: isCurrentlyLiked ? prev.likes_count + 1 : Math.max(0, prev.likes_count - 1) } : null)

      // 실제 데이터베이스에서 좋아요 수 다시 가져오기
      const { count: likeCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      // 실제 좋아요 수로 업데이트
      setPost(prev => prev ? { ...prev, likes_count: likeCount || 0 } : null)
    } catch (error) {
      console.error('좋아요 처리 오류:', error)
    } finally {
      setLikeLoading(false)
    }
  }

  const handleGoBack = () => {
    // 프로필 페이지에서 온 경우 프로필 페이지로 돌아가기
    if (location.state?.from === '/profile') {
      console.log('🔙 PostDetail 뒤로가기 - 프로필 페이지로 이동')
      navigate('/profile')
      return
    }
    if (location.state?.from === '/profile/posts') {
      console.log('🔙 PostDetail 뒤로가기 - 내가 작성한 글 전체 페이지로 이동')
      navigate('/profile/posts')
      return
    }
    
    // 그 외의 경우 커뮤니티로 돌아가기
    console.log('🔙 PostDetail 뒤로가기 - 카테고리:', category)
    navigate(`/community?category=${encodeURIComponent(category)}`)
  }

  const handleMenuToggle = () => {
    setShowMenu(!showMenu)
  }

  const handleDeletePost = async () => {
    if (!post) return

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', post.id)

      if (error) {
        console.error('게시글 삭제 오류:', error)
        return
      }

      console.log('🗑️ 게시글 삭제 성공! 커뮤니티로 이동 - 카테고리:', category)
      // 삭제 성공 시 커뮤니티로 이동
      navigate(`/community?category=${encodeURIComponent(category)}`)
    } catch (error) {
      console.error('게시글 삭제 오류:', error)
    }
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
    if (!currentUser || !profileReportReason.trim()) return
    if (!post && !profileImageViewerUser) return
    
    setProfileReportLoading(true)
    try {
      const reporterId = currentUser.id
      
      // 게시글 작성자 프로필 신고인 경우
      if (post && !profileImageViewerUser) {
        const { error } = await supabase
          .from('reports')
          .insert({
            post_id: post.id,
            reporter_id: reporterId,
            report_reason: profileReportReason.trim(),
            report_type: profileReportType,
            target_type: 'profile' // 프로필 신고임을 명시
          })

      // 프로필 신고는 중복 허용이므로, UNIQUE 제약조건 위반 에러(409 Conflict)는 성공으로 처리
      if (error) {
        const errorMessage = error.message?.toLowerCase() || ''
        const errorCode = error.code || ''
        const errorDetails = error.details?.toLowerCase() || ''
        
        const isDuplicateError = 
          errorCode === '23505' || 
          errorCode === 'PGRST116' || 
          errorMessage.includes('duplicate') || 
          errorMessage.includes('unique') ||
          errorMessage.includes('conflict') ||
          errorDetails.includes('duplicate') ||
          errorDetails.includes('unique') ||
          errorDetails.includes('conflict') ||
          (error as any)?.status === 409 ||
          (error as any)?.statusCode === 409
        
        if (isDuplicateError) {
          if (process.env.NODE_ENV === 'development') {
            console.log('중복 신고 감지됨, 성공으로 처리:', error)
          }
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
        return
      }
      
      // 댓글/답글 작성자 프로필 신고인 경우
      if (profileImageViewerUser && post) {
        const { error } = await supabase
          .from('reports')
          .insert({
            post_id: post.id,
            reporter_id: reporterId,
            report_reason: profileReportReason.trim(),
            report_type: profileReportType,
            target_type: 'profile', // 프로필 신고임을 명시
            target_id: profileImageViewerUser.id // 댓글 작성자 ID (target_id 사용)
          })

        // 프로필 신고는 중복 허용이므로, UNIQUE 제약조건 위반 에러(409 Conflict)는 성공으로 처리
        if (error) {
          const errorMessage = error.message?.toLowerCase() || ''
          const errorCode = error.code || ''
          const errorDetails = error.details?.toLowerCase() || ''
          
          const isDuplicateError = 
            errorCode === '23505' || 
            errorCode === 'PGRST116' || 
            errorMessage.includes('duplicate') || 
            errorMessage.includes('unique') ||
            errorMessage.includes('conflict') ||
            errorDetails.includes('duplicate') ||
            errorDetails.includes('unique') ||
            errorDetails.includes('conflict') ||
            (error as any)?.status === 409 ||
            (error as any)?.statusCode === 409
          
          if (isDuplicateError) {
            if (process.env.NODE_ENV === 'development') {
              console.log('중복 신고 감지됨, 성공으로 처리:', error)
            }
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
        return
      }
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || ''
      const errorCode = error?.code || ''
      
      const isDuplicateError = 
        error?.status === 409 ||
        error?.statusCode === 409 ||
        errorCode === '23505' || 
        errorCode === 'PGRST116' ||
        errorMessage.includes('duplicate') || 
        errorMessage.includes('unique') ||
        errorMessage.includes('conflict')
      
      if (isDuplicateError) {
        if (process.env.NODE_ENV === 'development') {
          console.log('중복 신고 감지됨 (catch), 성공으로 처리:', error)
        }
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
  
  // 프로필 사진 인덱스 변경
  const setProfileImageIndex = (index: number) => {
    if (index >= 0 && index < profileImageViewerImages.length) {
      setCurrentProfileImageIndex(index)
    }
  }

  const handleEditPost = () => {
    // 수정 페이지로 이동 (구현 예정)
    console.log('수정할 게시글:', post)
    setShowMenu(false)
  }

  // 신고 메뉴 토글
  const handleReportMenuToggle = () => {
    setShowReportMenu(!showReportMenu)
  }

  // 신고 모달 열기
  const handleOpenReportModal = () => {
    setShowReportModal(true)
    setReportReason('')
    setReportType('spam')
  }

  // 신고 모달 닫기
  const handleCloseReportModal = () => {
    setShowReportModal(false)
    setReportReason('')
    setReportType('spam')
  }

  // 댓글 모달 열기
  const handleOpenCommentModal = async () => {
    setShowCommentModal(true)
    setNewComment('')
    // 답글 관련 상태 초기화
    setReplyingToCommentId(null)
    setReplyContent('')
    setShowReplies(new Set())
    
    // 댓글 모달을 열 때 댓글 불러오기 (모든 댓글을 한 번에 불러오기)
    if (postId) {
      await fetchAllComments(postId)
    }
  }

  // 댓글 모달 닫기
  const handleCloseCommentModal = () => {
    // 애니메이션을 위한 지연
    const modalElement = document.querySelector('.animate-slide-up')
    if (modalElement) {
      modalElement.classList.add('animate-slide-down')
      modalElement.classList.remove('animate-slide-up')
    }
    
    // 애니메이션 완료 후 상태 변경
    setTimeout(() => {
      setShowCommentModal(false)
      setNewComment('')
      // 댓글 수정 상태 초기화
      setEditingCommentId(null)
      setEditingCommentContent('')
      setShowCommentMenu(null)
      // 답글 관련 상태 초기화
      setReplyingToCommentId(null)
      setReplyContent('')
      setShowReplies(new Set())
    }, 300)
  }

  // 댓글 작성 처리
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser || !post) return

    try {
      // comments.user_id는 profiles.auth_user_id를 참조하므로 auth_user_id만 사용
      const userIdToUse = currentUser.auth_user_id
      
      if (!userIdToUse) {
        console.error('auth_user_id가 없어 댓글을 작성할 수 없습니다.')
        return
      }
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: userIdToUse,
          user_name: currentUser.nickname || currentUser.full_name,
          user_profile_image: currentUser.profile_image_url || '',
          content: newComment.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('댓글 작성 오류:', error)
        return
      }

      // 현재 사용자의 자녀 이미지 추가
      const childrenImages = currentUser.user_type === 'parent' && currentUser.children_info
        ? currentUser.children_info.map((child: any) => child.profile_image_url || null)
        : []

      // 새 댓글을 댓글 목록에 추가 (로컬 상태 업데이트로 즉시 반영)
      setComments(prev => [...prev, {
        ...data,
        user_children_images: childrenImages,
        user_type: currentUser.user_type
      }])
      setNewComment('')

      // 게시글의 댓글 수 업데이트
      setPost(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : null)
    } catch (error) {
      console.error('댓글 작성 오류:', error)
    }
  }

  // 댓글 수정 시작
  const handleStartEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentContent(comment.content)
    setShowCommentMenu(null)
  }

  // 댓글 수정 완료
  const handleSaveEditComment = async () => {
    if (!editingCommentId || !editingCommentContent.trim() || !currentUser) return

    try {
      const currentTime = new Date().toISOString()
      console.log('댓글 수정 시도:', { editingCommentId, content: editingCommentContent.trim(), currentTime })
      console.log('현재 사용자:', currentUser)
      
      // 먼저 현재 댓글 상태 확인
      const { data: currentComment, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('id', editingCommentId)
        .single()
      
      if (fetchError) {
        console.error('현재 댓글 조회 오류:', fetchError)
        return
      }
      
      console.log('수정 전 댓글 상태:', currentComment)
      console.log('댓글 작성자 ID:', currentComment.user_id)
      console.log('현재 사용자 ID:', currentUser.id)
      
      // 권한 확인 - auth_user_id가 있으면 그것을 사용, 없으면 기존 id 사용
      const userIdToCheck = currentUser.auth_user_id || currentUser.id
      if (currentComment.user_id !== userIdToCheck && currentComment.user_id !== currentUser.id) {
        console.error('권한 없음: 댓글 작성자가 아닙니다')
        console.error('댓글 작성자 ID:', currentComment.user_id)
        console.error('현재 사용자 ID:', currentUser.id)
        console.error('현재 사용자 auth_user_id:', currentUser.auth_user_id)
        return
      }
      
      // 업데이트 쿼리 실행
      const { data: updateResult, error } = await supabase
        .from('comments')
        .update({ 
          content: editingCommentContent.trim(),
          updated_at: currentTime,
          is_edited: true
        })
        .eq('id', editingCommentId)
        .eq('user_id', userIdToCheck)
        .select()

      if (error) {
        console.error('댓글 수정 오류:', error)
        console.error('오류 상세:', error.details, error.hint, error.message)
        return
      }

      console.log('댓글 수정 결과:', updateResult)
      
      if (!updateResult || updateResult.length === 0) {
        console.error('업데이트 결과가 비어있음 - RLS 정책 문제일 수 있음')
        
        // RLS 정책 우회 테스트 (개발용)
        const { data: testUpdate, error: testError } = await supabase
          .from('comments')
          .update({ 
            content: editingCommentContent.trim(),
            updated_at: currentTime,
            is_edited: true
          })
          .eq('id', editingCommentId)
          .select()
        
        console.log('RLS 우회 테스트 결과:', testUpdate, testError)
        return
      }
      
      console.log('댓글 수정 성공, 로컬 상태 업데이트 중...')
      
      // 로컬 상태를 직접 업데이트하여 불필요한 API 호출 방지
      setComments(prev => prev.map(comment => 
        comment.id === editingCommentId 
          ? { ...comment, content: editingCommentContent.trim(), updated_at: currentTime, is_edited: true }
          : comment
      ))

      setEditingCommentId(null)
      setEditingCommentContent('')
    } catch (error) {
      console.error('댓글 수정 오류:', error)
    }
  }

  // 댓글 수정 취소
  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditingCommentContent('')
  }

  // 답글 작성 시작
  const handleStartReply = (commentId: string) => {
    console.log('=== 답글달기 시작 ===')
    console.log('클릭된 댓글 ID:', commentId)
    console.log('현재 replyingToCommentId:', replyingToCommentId)
    console.log('현재 replyContent:', replyContent)
    
    // 이미 답글을 작성 중인 댓글이라면 닫기
    if (replyingToCommentId === commentId) {
      console.log('이미 답글 작성 중인 댓글, 닫기')
      setReplyingToCommentId(null)
      setReplyContent('')
      return
    }
    
    // 새로운 답글 작성 시작
    console.log('새로운 답글 작성 시작')
    setReplyingToCommentId(commentId)
    setReplyContent('')
    
    // 상태 업데이트 후 확인을 위한 setTimeout
    setTimeout(() => {
      console.log('상태 업데이트 후 replyingToCommentId:', replyingToCommentId)
      console.log('상태 업데이트 후 replyContent:', replyContent)
    }, 0)
  }

  // 답글 작성 취소
  const handleCancelReply = () => {
    setReplyingToCommentId(null)
    setReplyContent('')
  }

  // 답글 제출
  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !currentUser || !post || !replyingToCommentId) return

    try {
      console.log('=== 답글 제출 시작 ===')
      console.log('답글 내용:', replyContent.trim())
      console.log('답글 대상 ID:', replyingToCommentId)
      
      // comments.user_id는 profiles.auth_user_id를 참조하므로 auth_user_id만 사용
      if (!currentUser.auth_user_id) {
        console.error('auth_user_id가 없어 답글을 작성할 수 없습니다.')
        return
      }
      
      // 답글을 달 댓글 정보 가져오기
      const parentComment = comments.find(comment => comment.id === replyingToCommentId)
      if (!parentComment) return
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: currentUser.auth_user_id,
          user_name: currentUser.nickname || currentUser.full_name,
          user_profile_image: currentUser.profile_image_url || '',
          content: replyContent.trim(),
          parent_id: replyingToCommentId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('답글 작성 오류:', error)
        return
      }

      console.log('답글 작성 성공:', data)

      // 현재 사용자의 자녀 이미지 추가
      const childrenImages = currentUser.user_type === 'parent' && currentUser.children_info
        ? currentUser.children_info.map((child: any) => child.profile_image_url || null)
        : []

      // 답글을 댓글 목록에 추가
      setComments(prev => [...prev, {
        ...data,
        user_children_images: childrenImages,
        user_type: currentUser.user_type
      }])
      setReplyContent('')
      setReplyingToCommentId(null)

      // 게시글의 댓글 수 업데이트
      setPost(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : null)
      
      // 댓글 작성자에게 알림 생성
      await createReplyNotification(
        post.id,
        data.id,
        currentUser.auth_user_id || currentUser.id, // from_user_id는 auth_user_id 또는 id 사용
        currentUser.nickname || currentUser.full_name,
        currentUser.profile_image_url || '',
        parentComment.user_id
      )
      
      // 댓글 목록을 다시 가져와서 계층 구조 업데이트
      setTimeout(() => {
        setCurrentCommentPage(1)
        setHasMoreComments(true)
        fetchComments(post.id, 1, false)
      }, 100)
    } catch (error) {
      console.error('답글 작성 오류:', error)
    }
  }

  // 답글 표시/숨김 토글
  const toggleReplies = (commentId: string) => {
    setShowReplies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  // 댓글을 계층 구조로 정리하는 함수 (중첩 답글 지원)
  const organizeComments = useCallback((comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>()
    const rootComments: Comment[] = []

    // 모든 댓글을 맵에 저장
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // 계층 구조 구성 (중첩 답글 지원)
    comments.forEach(comment => {
      if (comment.parent_id) {
        // 답글인 경우
        const parentComment = commentMap.get(comment.parent_id)
        if (parentComment) {
          // 부모 댓글에 답글 추가
          parentComment.replies = parentComment.replies || []
          parentComment.replies.push(commentMap.get(comment.id)!)
        } else {
          // 부모 댓글이 없는 경우 (데이터 오류), 최상위로 처리
          rootComments.push(commentMap.get(comment.id)!)
        }
      } else {
        // 최상위 댓글인 경우
        rootComments.push(commentMap.get(comment.id)!)
      }
    })

    // 모든 레벨의 답글들을 시간순으로 정렬
    const sortReplies = (commentList: Comment[]) => {
      commentList.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          // 재귀적으로 하위 답글들도 정렬
          sortReplies(comment.replies)
        }
      })
    }
    
    sortReplies(rootComments)
    

    
    return rootComments
  }, [])

  // 댓글 계층 구조 메모이제이션
  const organizedComments = useMemo(() => {
    return organizeComments(comments)
  }, [comments])

  // 답글 개수를 재귀적으로 계산하는 함수
  const getTotalRepliesCount = (comment: Comment): number => {
    let count = 0
    if (comment.replies && comment.replies.length > 0) {
      count += comment.replies.length
      // 재귀적으로 하위 답글들도 카운트
      comment.replies.forEach(reply => {
        count += getTotalRepliesCount(reply)
      })
    }
    return count
  }

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return

    try {
      // 권한 확인 - auth_user_id가 있으면 그것을 사용, 없으면 기존 id 사용
      const userIdToCheck = currentUser.auth_user_id || currentUser.id
      
      // 먼저 댓글 정보를 가져와서 권한 확인
      const { data: commentData, error: fetchError } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', commentId)
        .single()
      
      if (fetchError) {
        console.error('댓글 조회 오류:', fetchError)
        return
      }
      
      // 권한 확인 - 두 ID 모두 확인
      if (commentData.user_id !== userIdToCheck && commentData.user_id !== currentUser.id) {
        console.error('권한 없음: 댓글 작성자가 아닙니다')
        console.error('댓글 작성자 ID:', commentData.user_id)
        console.error('현재 사용자 ID:', currentUser.id)
        console.error('현재 사용자 auth_user_id:', currentUser.auth_user_id)
        return
      }
      
      // 댓글을 실제로 삭제하지 않고 is_deleted 플래그만 설정
      const { error } = await supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId)
        .eq('user_id', commentData.user_id)

      if (error) {
        console.error('댓글 삭제 오류:', error)
        // 데이터베이스 업데이트 실패 시에도 로컬 상태는 업데이트
        console.log('데이터베이스 업데이트 실패, 로컬 상태만 업데이트')
      }
      
      // 로컬 상태를 업데이트하여 "삭제되었습니다" 표시
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, is_deleted: true, content: '삭제되었습니다.' }
          : comment
      ))
      setShowCommentMenu(null)

      // 댓글 수는 줄이지 않음 (삭제된 댓글도 표시되므로)
    } catch (error) {
      console.error('댓글 삭제 오류:', error)
    }
  }

  // 댓글 메뉴 토글
  const toggleCommentMenu = (commentId: string) => {
    setShowCommentMenu(showCommentMenu === commentId ? null : commentId)
  }

  // 댓글 작성자 차단
  const handleBlockCommentAuthor = async (userId: string) => {
    if (!userId || !currentUser) return
    setPendingBlockCommentUserId(userId)
    setShowCommentBlockModal(true)
    setShowCommentMenu(null)
  }

  // 댓글 작성자 차단 확인 처리
  const handleConfirmBlockCommentAuthor = async () => {
    if (!pendingBlockCommentUserId || !currentUser) return
    try {
      const userIdToUse = currentUser.auth_user_id || currentUser.id
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: userIdToUse,
          blocked_user_id: pendingBlockCommentUserId,
          created_at: new Date().toISOString()
        })
      if (error) throw error
      setShowCommentBlockModal(false)
      setPendingBlockCommentUserId(null)
      setShowCommentMenu(null)
      // 차단된 사용자의 댓글을 목록에서 제거
      setComments(prev => prev.filter(comment => comment.user_id !== pendingBlockCommentUserId))
      alert('차단되었습니다.')
    } catch (error) {
      console.error('차단 처리 중 오류:', error)
      alert('차단 처리 중 오류가 발생했습니다.')
    }
  }

  // 댓글 신고
  const handleReportComment = async (commentId: string, userId: string) => {
    setPendingReportComment({ commentId, userId })
    setShowCommentReportModal(true)
    setShowCommentMenu(null)
  }

  // 댓글 신고 제출
  const handleSubmitCommentReport = async () => {
    if (!pendingReportComment || !currentUser || !commentReportReason.trim()) {
      alert('로그인이 필요합니다.')
      return
    }
    try {
      setCommentReportLoading(true)
      
      // 현재 사용자의 profile ID 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (profileError || !profileData) {
        throw new Error('프로필을 찾을 수 없습니다.')
      }
      
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: profileData.id,
          report_reason: commentReportReason.trim(),
          report_type: commentReportType,
          status: 'pending',
          target_type: 'comment',
          target_id: pendingReportComment.commentId,
          post_id: post?.id || null
        })
      
      // 댓글 신고는 중복 허용이므로, UNIQUE 제약조건 위반 에러(409 Conflict)는 성공으로 처리
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
          setShowCommentReportModal(false)
          setPendingReportComment(null)
          setCommentReportReason('')
          setCommentReportType('spam')
          setShowCommentMenu(null)
          return
        }
        console.error('신고 처리 오류:', error)
        alert('신고 처리 중 오류가 발생했습니다.')
        return
      }

      alert('신고가 성공적으로 접수되었습니다.')
      setShowCommentReportModal(false)
      setPendingReportComment(null)
      setCommentReportReason('')
      setCommentReportType('spam')
      setShowCommentMenu(null)
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
        setShowCommentReportModal(false)
        setPendingReportComment(null)
        setShowCommentMenu(null)
        setCommentReportReason('')
        setCommentReportType('spam')
        return
      }
      console.error('댓글 신고 오류:', error)
      alert('신고 처리 중 오류가 발생했습니다.')
    } finally {
      setCommentReportLoading(false)
    }
  }

  // 게시글 신고 처리
  const handleSubmitReport = async () => {
    if (!post || !currentUser || !reportReason.trim()) return

    setReportLoading(true)
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          post_id: post.id,
          reporter_id: currentUser.id,
          report_reason: reportReason.trim(),
          report_type: reportType
        })

      if (error) {
        console.error('신고 처리 오류:', error)
        alert('신고 처리 중 오류가 발생했습니다.')
        return
      }

      alert('신고가 성공적으로 접수되었습니다.')
      handleCloseReportModal()
    } catch (error) {
      console.error('신고 처리 오류:', error)
      alert('신고 처리 중 오류가 발생했습니다.')
    } finally {
      setReportLoading(false)
    }
  }

  // 차단 모달 열기
  const handleOpenBlockModal = () => {
    setShowBlockModal(true)
  }

  // 차단 모달 닫기
  const handleCloseBlockModal = () => {
    setShowBlockModal(false)
  }

  // 사용자 차단 처리
  const handleBlockUser = async () => {
    if (!post || !currentUser) return

    setBlockLoading(true)
    try {
      // auth_user_id가 있으면 그것을 사용, 없으면 기존 id 사용
      const userIdToUse = currentUser.auth_user_id || currentUser.id
      
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: userIdToUse,
          blocked_user_id: post.user_id,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('차단 처리 중 오류:', error)
        alert('차단 처리 중 오류가 발생했습니다.')
        return
      }

      alert('사용자가 차단되었습니다.')
      // 차단 후 이전 페이지로 이동
      navigate(-1)
      
    } catch (error) {
      console.error('차단 처리 중 오류:', error)
      alert('차단 처리 중 오류가 발생했습니다.')
    } finally {
      setBlockLoading(false)
      handleCloseBlockModal()
    }
  }

  const formatTimeAgo = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}일 전`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">게시글을 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10 flex-shrink-0">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleGoBack}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">게시글</h1>
            <div className="flex items-center space-x-2">
              <button onClick={() => setShowShareSheet(true)} className="p-1.5 hover:bg-white/50 rounded-lg transition-colors">
                <Share2 className="w-4 h-4 text-[#fb8678]" />
              </button>
              
              {/* 점3개 메뉴 (자신이 올린 글에만 표시, 학부모만) */}
              {currentUser && post && post.author_name === (currentUser.nickname || currentUser.full_name) && currentUser.user_type === 'parent' && (
                <div className="relative">
                  <button
                    onClick={handleMenuToggle}
                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-[#fb8678]" />
                  </button>
                  
                  {/* 메뉴 드롭다운 */}
                  {showMenu && (
                    <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
                      <button
                        onClick={handleEditPost}
                        className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                      >
                        수정하기
                      </button>
                      <div className="border-t border-gray-200 mx-2"></div>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                      >
                        삭제하기
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* 신고 버튼 (다른 사람이 쓴 글에만 표시, 로그인한 사용자만) */}
              {currentUser && post && post.author_name !== (currentUser.nickname || currentUser.full_name) && (
                <div className="relative">
                  <button
                    onClick={handleReportMenuToggle}
                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    title="게시글 메뉴"
                  >
                    <MoreVertical className="w-4 h-4 text-[#fb8678]" />
                  </button>
                  
                  {/* 신고 메뉴 드롭다운 */}
                  {showReportMenu && (
                    <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
                      <button
                        onClick={() => {
                          handleOpenBlockModal()
                          setShowReportMenu(false)
                        }}
                        className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                      >
                        차단하기
                      </button>
                      <div className="border-t border-gray-200 mx-2"></div>
                      <button
                        onClick={() => {
                          handleOpenReportModal()
                          setShowReportMenu(false)
                        }}
                        className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                      >
                        신고하기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

  {/* 링크 공유 바텀시트 (유치원 상세 공유 모달과 동일 UX) */}
  {showShareSheet && (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={() => setShowShareSheet(false)} />
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
            <div className="mt-1 text-xs text-gray-600 break-all bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{postShareUrl}</div>
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
            <button onClick={handleSystemShare} className="w-1/4 flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
              <span className="w-10 h-10 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center text-lg font-bold">⋯</span>
              <span className="mt-2 text-xs text-gray-700">더보기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
             {/* Post Content */}
       <div className="flex-1 flex flex-col">
         <div className="bg-white/90 backdrop-blur-sm rounded-b-2xl p-6 border border-white/50 shadow-lg flex-shrink-0">
          {/* Post Header */}
          <div className="flex items-start space-x-3 mb-5">
            <div className="relative">
              <div 
                className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  // 프로필 사진이 있거나 자녀 사진이 있는 경우에만 모달 열기
                  const hasProfileImage = post.author_profile_image && post.author_profile_image.trim() !== ''
                  const hasChildrenImages = post.author_children_images && post.author_children_images.length > 0 && 
                    post.author_children_images.some(img => img && img.trim() !== '')
                  
                  if (hasProfileImage || hasChildrenImages) {
                    openProfileImageViewer(post.author_profile_image || '', post.author_children_images)
                  }
                }}
              >
                {post.author_profile_image ? (
                  <img
                    src={post.author_profile_image}
                    alt={`${post.author_name}의 프로필`}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      // 프로필 이미지 로드 실패 시 이니셜 표시
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
                            <span class="text-sm font-medium text-gray-600">${post.author_name.charAt(0)}</span>
                          </div>
                        `
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {post.author_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            
            {/* 자녀 프로필 사진 배지 */}
            {post.author_children_images && post.author_children_images.length > 0 && (
              <div className="absolute -bottom-1 -right-1 flex items-center flex-row-reverse">
                {/* 3명 이상일 경우 +N 표시 (가장 우측에 위치) */}
                {post.author_children_images.length > 2 && (
                  <div className="w-5 h-5 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center cursor-pointer relative z-30">
                    <span className="text-white text-[8px] font-bold">
                      +{post.author_children_images.length - 2}
                    </span>
                  </div>
                )}
                
                {/* 두 번째 자녀 (우측에서 두 번째, +N이 없으면 가장 우측) */}
                {post.author_children_images.length >= 2 && (
                  <div className={`w-5 h-5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-20 ${post.author_children_images.length > 2 ? '-mr-[6px]' : ''}`}>
                    {post.author_children_images[1] ? (
                      <img
                        src={post.author_children_images[1]}
                        alt="자녀 프로필 2"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-[11px]">👤</span>
                    )}
                  </div>
                )}
                
                {/* 첫 번째 자녀 (맨 왼쪽, 1명이면 가장 우측) */}
                <div className={`w-5 h-5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-10 ${post.author_children_images.length >= 2 ? '-mr-[6px]' : ''}`}>
                  {post.author_children_images[0] ? (
                    <img
                      src={post.author_children_images[0]}
                      alt="자녀 프로필"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-[11px]">👤</span>
                  )}
                </div>
              </div>
            )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="font-bold text-gray-900 text-base">{post.author_name}</span>
                <span className="px-2.5 py-0.5 bg-gradient-to-r from-[#fb8678]/20 to-[#e67567]/20 text-[#fb8678] text-xs rounded-full border border-[#fb8678]/30 font-medium">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  {post.location}
                </span>
              </div>
              <div className="text-xs text-gray-500">{formatTimeAgo(post.created_at)}</div>
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-6">
            <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line">
              {post.content}
            </p>
          </div>

          {/* Post Images */}
          {post.images && post.images.length > 0 && (
            <div className="mb-6">
              <div className="relative w-full h-80 bg-gray-100 rounded-xl overflow-hidden">
                <div 
                  className="flex w-full h-full overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement
                    const scrollLeft = target.scrollLeft
                    const imageWidth = target.clientWidth
                    const currentIndex = Math.round(scrollLeft / imageWidth)
                    setCurrentImageIndex(currentIndex)
                  }}
                >
                  {post.images.map((image, index) => (
                    <div 
                      key={index} 
                      className="flex-shrink-0 w-full h-full snap-center cursor-pointer"
                      onClick={() => openImageViewer(post.images, index)}
                    >
                      <img
                        src={image}
                        alt={`게시글 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                
                {/* 현재 사진 번호 표시 (우상단) */}
                {post.images.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur-sm">
                    {currentImageIndex + 1}/{post.images.length}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Post Emojis */}
          {post.emojis && post.emojis.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-3">
                {post.emojis.map((emoji, index) => (
                  <span key={index} className="text-3xl">{emoji}</span>
                ))}
              </div>
            </div>
          )}

          {/* Post Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {post.hashtags.map((tag, index) => (
              <span key={index} className="px-3 py-2 bg-[#fb8678]/10 text-[#fb8678] text-sm rounded-full border border-[#fb8678]/20 font-medium">
                #{tag}
              </span>
            ))}
          </div>

          {/* Post Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-6">
              <button 
                onClick={handleLikeToggle}
                className={`flex items-center space-x-2 transition-colors ${
                  isLiked(post.id)
                    ? 'text-[#fb8678]'
                    : 'text-gray-600 hover:text-[#fb8678]'
                } ${likeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={likeLoading}
              >
                <Heart 
                  className={`w-6 h-6 ${isLiked(post.id) ? 'fill-current' : ''}`} 
                />
                <span className="text-base font-medium">{post.likes_count}</span>
              </button>
              <button className="flex items-center space-x-2 text-gray-600 hover:text-[#fb8678] transition-colors">
                <MessageCircle className="w-6 h-6" />
                <span className="text-base font-medium">{post.comments_count}</span>
              </button>
            </div>
            <button 
              onClick={handleOpenCommentModal}
              className="px-6 py-2 bg-[#fb8678] text-white text-sm rounded-full hover:bg-[#e67567] transition-colors font-medium"
            >
              댓글 달기
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div id="comments-section" className="mt-6 bg-white/90 backdrop-blur-sm rounded-t-2xl p-6 border border-white/50 shadow-lg flex-1 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex-shrink-0">댓글 {post.comments_count}개</h3>
          <div className="space-y-4 flex-1">
            {commentLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
                <p className="text-gray-600">댓글을 불러오는 중...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">아직 댓글이 없습니다.</p>
                <p className="text-gray-500 text-sm">첫 번째 댓글을 작성해보세요!</p>
              </div>
            ) : (
                              organizedComments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* 최상위 댓글 */}
                  <div className="flex space-x-3">
                    <div className="relative w-10 h-10">
                      <div 
                        className="w-full h-full overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer shadow-lg"
                        style={{ borderRadius: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation() // 댓글 클릭 이벤트 전파 방지
                          // 프로필 사진이 있거나 자녀 사진이 있는 경우에만 모달 열기
                          const hasProfileImage = comment.user_profile_image && comment.user_profile_image.trim() !== ''
                          const hasChildrenImages = comment.user_children_images && comment.user_children_images.length > 0 && 
                            comment.user_children_images.some(img => img && img.trim() !== '')
                          
                          if (hasProfileImage || hasChildrenImages) {
                            openProfileImageViewer(
                              comment.user_profile_image || '', 
                              comment.user_children_images,
                              { id: comment.user_id, name: comment.user_name }
                            )
                          }
                        }}
                      >
                        {comment.user_profile_image ? (
                          <img
                            src={comment.user_profile_image}
                            alt={`${comment.user_name}의 프로필`}
                            className="w-full h-full object-cover"
                            style={{ borderRadius: '12px' }}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {comment.user_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      
                      {/* 자녀 프로필 사진 배지 (학부모) 또는 교사 배지 (교사) */}
                      {comment.user_type === 'teacher' ? (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[0.5px] border-blue-500 bg-white flex items-center justify-center cursor-pointer">
                          <svg className="w-2 h-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                          </svg>
                        </div>
                      ) : comment.user_children_images && comment.user_children_images.length > 0 && (
                        <div className="absolute -bottom-0.5 -right-0.5 flex items-center flex-row-reverse">
                          {/* 3명 이상일 경우 +N 표시 (가장 우측에 위치) */}
                          {comment.user_children_images.length > 2 && (
                            <div className="w-3.5 h-3.5 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center cursor-pointer relative z-30">
                              <span className="text-white text-[6px] font-bold">
                                +{comment.user_children_images.length - 2}
                              </span>
                            </div>
                          )}

                          {/* 두 번째 자녀 (우측에서 두 번째, +N이 없으면 가장 우측) */}
                          {comment.user_children_images.length >= 2 && (
                            <div className={`w-3.5 h-3.5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-20 ${comment.user_children_images.length > 2 ? '-mr-[4px]' : ''}`}>
                              {comment.user_children_images[1] ? (
                                <img
                                  src={comment.user_children_images[1]}
                                  alt="자녀 프로필 2"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const parent = e.currentTarget.parentElement
                                    if (parent) {
                                      const icon = document.createElement('span')
                                      icon.className = 'text-gray-400 text-[8px]'
                                      icon.textContent = '👤'
                                      parent.appendChild(icon)
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-gray-400 text-[8px]">👤</span>
                              )}
                            </div>
                          )}

                          {/* 첫 번째 자녀 (맨 왼쪽, 1명이면 가장 우측) */}
                          <div className={`w-3.5 h-3.5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-10 ${comment.user_children_images.length >= 2 ? '-mr-[4px]' : ''}`}>
                            {comment.user_children_images[0] ? (
                              <img
                                src={comment.user_children_images[0]}
                                alt="자녀 프로필"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent) {
                                    const icon = document.createElement('span')
                                    icon.className = 'text-gray-400 text-[8px]'
                                    icon.textContent = '👤'
                                    parent.appendChild(icon)
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-gray-400 text-[8px]">👤</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900 text-sm">
                            {comment.user_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {comment.is_edited && comment.updated_at
                              ? `${formatTimeAgo(comment.updated_at)} (수정됨)`
                              : formatTimeAgo(comment.created_at)
                            }
                          </span>
                        </div>
                        
                        {/* 점3개 메뉴 표시 (삭제된 댓글 제외) */}
                        {currentUser && !comment.is_deleted && (
                          <div className="relative">
                            <button
                              onClick={() => toggleCommentMenu(comment.id)}
                              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-[#fb8678]" />
                            </button>
                            
                            {/* 댓글 메뉴 드롭다운 */}
                            {showCommentMenu === comment.id && (
                              <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[100px]">
                                {comment.user_id === currentUser.id || comment.user_id === currentUser.auth_user_id ? (
                                  <>
                                    <button
                                      onClick={() => handleStartEditComment(comment)}
                                      className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      수정하기
                                    </button>
                                    <div className="border-t border-gray-200 mx-2"></div>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                    >
                                      삭제하기
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleBlockCommentAuthor(comment.user_id)}
                                      className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      차단하기
                                    </button>
                                    <div className="border-t border-gray-200 mx-2"></div>
                                    <button
                                      onClick={() => handleReportComment(comment.id, comment.user_id)}
                                      className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                    >
                                      신고하기
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* 댓글 내용 (수정 모드일 때는 입력창) */}
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEditComment}
                              className="px-3 py-1 bg-[#fb8678] text-white text-xs rounded-lg hover:bg-[#e67567] transition-colors"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEditComment}
                              className="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : comment.is_deleted ? (
                        <p className="text-gray-400 text-sm italic">삭제되었습니다.</p>
                      ) : (
                        <p className="text-gray-800 text-sm">{comment.content}</p>
                      )}

                      {/* 댓글 액션 버튼들 */}
                      {!comment.is_deleted && (
                        <div className="flex items-center space-x-4 mt-2">
                          {/* 답글 달기 버튼 - 자신의 댓글이 아닌 경우에만 표시 */}
                          {currentUser && (comment.user_id !== currentUser.id && comment.user_id !== currentUser.auth_user_id) && (
                            <button
                              onClick={() => {
                                console.log('답글달기 버튼 클릭됨:', comment.id)
                                console.log('현재 사용자 ID:', currentUser.id, 'auth_user_id:', currentUser.auth_user_id)
                                console.log('댓글 작성자 ID:', comment.user_id)
                                handleStartReply(comment.id)
                              }}
                              className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors"
                            >
                              답글달기
                            </button>
                          )}
                        </div>
                      )}

                      {/* 답글 입력창 */}
                      {replyingToCommentId === comment.id && (
                        <div className="mt-3 space-y-2">
                          {/* 답글 대상 표시 */}
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-[#fb8678] font-medium text-sm">@</span>
                            <span className="text-[#fb8678] font-semibold text-sm">{comment.user_name}</span>
                            <span className="text-gray-500 text-sm">님에게 답글</span>
                          </div>
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="답글을 입력하세요..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSubmitReply}
                              className="px-3 py-1 bg-[#fb8678] text-white text-xs rounded-lg hover:bg-[#e67567] transition-colors"
                            >
                              답글달기
                            </button>
                            <button
                              onClick={handleCancelReply}
                              className="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 답글들 */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-8 space-y-3">
                      {showReplies.has(comment.id) ? (
                        // 펼쳐진 상태: 모든 답글들 표시
                        <>
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex space-x-3">
                              <div className="relative w-6 h-6">
                                <div 
                                  className="w-full h-full overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer shadow-lg"
                                  style={{ borderRadius: '8px' }}
                                  onClick={(e) => {
                                    e.stopPropagation() // 답글 클릭 이벤트 전파 방지
                                    // 프로필 사진이 있거나 자녀 사진이 있는 경우에만 모달 열기
                                    const hasProfileImage = reply.user_profile_image && reply.user_profile_image.trim() !== ''
                                    const hasChildrenImages = reply.user_children_images && reply.user_children_images.length > 0 && 
                                      reply.user_children_images.some(img => img && img.trim() !== '')
                                    
                                    if (hasProfileImage || hasChildrenImages) {
                                      openProfileImageViewer(
                                        reply.user_profile_image || '', 
                                        reply.user_children_images,
                                        { id: reply.user_id, name: reply.user_name }
                                      )
                                    }
                                  }}
                                >
                                  {reply.user_profile_image ? (
                                    <img
                                      src={reply.user_profile_image}
                                      alt={`${reply.user_name}의 프로필`}
                                      className="w-full h-full object-cover"
                                      style={{ borderRadius: '8px' }}
                                    />
                                  ) : (
                                    <span className="text-xs font-medium text-gray-600">
                                      {reply.user_name.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                
                                {/* 자녀 프로필 사진 배지 (학부모) 또는 교사 배지 (교사) */}
                                {reply.user_type === 'teacher' ? (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[0.5px] border-blue-500 bg-white flex items-center justify-center cursor-pointer">
                                    <svg className="w-1.5 h-1.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                                    </svg>
                                  </div>
                                ) : reply.user_children_images && reply.user_children_images.length > 0 && (
                                  <div className="absolute -bottom-0.5 -right-0.5 flex items-center flex-row-reverse">
                                    {/* 3명 이상일 경우 +N 표시 */}
                                    {reply.user_children_images.length > 2 && (
                                      <div className="w-2.5 h-2.5 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center cursor-pointer relative z-30">
                                        <span className="text-white text-[5px] font-bold">
                                          +{reply.user_children_images.length - 2}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* 두 번째 자녀 */}
                                    {reply.user_children_images.length >= 2 && (
                                      <div className={`w-2.5 h-2.5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-20 ${reply.user_children_images.length > 2 ? '-mr-[3px]' : ''}`}>
                                        {reply.user_children_images[1] ? (
                                          <img
                                            src={reply.user_children_images[1]}
                                            alt="자녀 프로필 2"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                              const parent = e.currentTarget.parentElement
                                              if (parent) {
                                                const icon = document.createElement('span')
                                                icon.className = 'text-gray-400 text-[7px]'
                                                icon.textContent = '👤'
                                                parent.appendChild(icon)
                                              }
                                            }}
                                          />
                                        ) : (
                                          <span className="text-gray-400 text-[7px]">👤</span>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* 첫 번째 자녀 */}
                                    <div className={`w-2.5 h-2.5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-10 ${reply.user_children_images.length >= 2 ? '-mr-[3px]' : ''}`}>
                                      {reply.user_children_images[0] ? (
                                        <img
                                          src={reply.user_children_images[0]}
                                          alt="자녀 프로필"
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                            const parent = e.currentTarget.parentElement
                                            if (parent) {
                                              const icon = document.createElement('span')
                                              icon.className = 'text-gray-400 text-[7px]'
                                              icon.textContent = '👤'
                                              parent.appendChild(icon)
                                            }
                                          }}
                                        />
                                      ) : (
                                        <span className="text-gray-400 text-[7px]">👤</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-gray-900 text-xs">
                                     {reply.user_name}
                                   </span>
                                    <span className="text-xs text-gray-400">
                                      {reply.is_edited && reply.updated_at
                                        ? `${formatTimeAgo(reply.updated_at)} (수정됨)`
                                        : formatTimeAgo(reply.created_at)
                                      }
                                    </span>
                                  </div>
                                  
                                  {/* 점3개 메뉴 표시 (삭제된 답글 제외) */}
                                  {currentUser && !reply.is_deleted && (
                                    <div className="relative">
                                      <button
                                        onClick={() => toggleCommentMenu(reply.id)}
                                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                      >
                                        <MoreVertical className="w-3 h-3 text-[#fb8678]" />
                                      </button>
                                      
                                      {/* 답글 메뉴 드롭다운 */}
                                      {showCommentMenu === reply.id && (
                                        <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[100px]">
                                          {reply.user_id === currentUser.id || reply.user_id === currentUser.auth_user_id ? (
                                            <>
                                              <button
                                                onClick={() => handleStartEditComment(reply)}
                                                className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                              >
                                                수정하기
                                              </button>
                                              <div className="border-t border-gray-200 mx-2"></div>
                                              <button
                                                onClick={() => handleDeleteComment(reply.id)}
                                                className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                              >
                                                삭제하기
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                onClick={() => handleBlockCommentAuthor(reply.user_id)}
                                                className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                              >
                                                차단하기
                                              </button>
                                              <div className="border-t border-gray-200 mx-2"></div>
                                              <button
                                                onClick={() => handleReportComment(reply.id, reply.user_id)}
                                                className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                              >
                                                신고하기
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                                                  {/* 답글 내용 */}
                                  {reply.is_deleted ? (
                                    <p className="text-gray-400 text-xs italic">삭제되었습니다.</p>
                                  ) : (
                                    <p className="text-gray-800 text-xs">
                                      <span className="text-[#fb8678] font-medium">@{comment.user_name}</span>
                                      <span className="ml-1">{reply.content}</span>
                                    </p>
                                  )}

                                {/* 답글달기 버튼 - 자신의 답글이 아닌 경우에만 표시 */}
                                {!reply.is_deleted && currentUser && (reply.user_id !== currentUser.id && reply.user_id !== currentUser.auth_user_id) && (
                                  <div className="mt-2">
                                    <button
                                      onClick={() => {
                                        console.log('=== B의 답글에 대한 답글달기 버튼 클릭 ===')
                                        console.log('답글 ID (reply.id):', reply.id)
                                        console.log('답글 작성자:', reply.user_name)
                                        console.log('현재 사용자:', currentUser.nickname || currentUser.full_name)
                                        console.log('현재 replyingToCommentId:', replyingToCommentId)
                                        handleStartReply(reply.id)
                                      }}
                                      className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors"
                                    >
                                      답글달기
                                    </button>
                                  </div>
                                )}

                                {/* 답글에 대한 답글 입력창 */}
                                {replyingToCommentId === reply.id && (
                                  <div className="mt-3 space-y-2 ml-8">
                                    {/* 답글 대상 표시 */}
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-[#fb8678] font-medium text-xs">@</span>
                                      <span className="text-[#fb8678] font-semibold text-xs">{reply.user_name}</span>
                                      <span className="text-gray-500 text-xs">님에게 답글</span>
                                    </div>
                                    <textarea
                                      value={replyContent}
                                      onChange={(e) => setReplyContent(e.target.value)}
                                      placeholder="답글을 입력하세요..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-xs resize-none"
                                      rows={2}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={handleSubmitReply}
                                        className="px-3 py-1 bg-[#fb8678] text-white text-xs rounded-lg hover:bg-[#e67567] transition-colors"
                                      >
                                        답글달기
                                      </button>
                                      <button
                                        onClick={handleCancelReply}
                                        className="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
                                      >
                                        취소
                                      </button>
                                    </div>
                                  </div>
                                )}


                              </div>
                            </div>
                          ))}
                          
                          {/* 2차 답글들 표시 (1차 답글과 동일한 레벨에) */}
                          {comment.replies && (() => {
                            const replies = comment.replies
                            // 1차 답글들에 대한 2차 답글들을 찾기
                            const secondLevelReplies = comments.filter(c => 
                              c.parent_id && replies.some(reply => reply.id === c.parent_id)
                            )
                            return secondLevelReplies.length > 0 ? (
                              <div className="space-y-3">
                                {secondLevelReplies.map((nestedReply) => {
                                  // 이 2차 답글의 부모 1차 답글 찾기
                                  const parentReply = replies.find(reply => reply.id === nestedReply.parent_id)
                                  return (
                                    <div key={nestedReply.id} className="flex space-x-3">
                                      <div className="relative w-6 h-6">
                                        <div 
                                          className="w-full h-full overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer shadow-lg"
                                          style={{ borderRadius: '8px' }}
                                          onClick={(e) => {
                                            e.stopPropagation() // 답글 클릭 이벤트 전파 방지
                                            // 프로필 사진이 있거나 자녀 사진이 있는 경우에만 모달 열기
                                            const hasProfileImage = nestedReply.user_profile_image && nestedReply.user_profile_image.trim() !== ''
                                            const hasChildrenImages = nestedReply.user_children_images && nestedReply.user_children_images.length > 0 && 
                                              nestedReply.user_children_images.some(img => img && img.trim() !== '')
                                            
                                            if (hasProfileImage || hasChildrenImages) {
                                              openProfileImageViewer(
                                                nestedReply.user_profile_image || '', 
                                                nestedReply.user_children_images,
                                                { id: nestedReply.user_id, name: nestedReply.user_name }
                                              )
                                            }
                                          }}
                                        >
                                          {nestedReply.user_profile_image ? (
                                            <img
                                              src={nestedReply.user_profile_image}
                                              alt={`${nestedReply.user_name}의 프로필`}
                                              className="w-full h-full object-cover"
                                              style={{ borderRadius: '8px' }}
                                            />
                                          ) : (
                                            <span className="text-xs font-medium text-gray-600">
                                              {nestedReply.user_name.charAt(0)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-gray-900 text-xs">
                                              {nestedReply.user_name}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                              {nestedReply.is_edited && nestedReply.updated_at
                                                ? `${formatTimeAgo(nestedReply.updated_at)} (수정됨)`
                                                : formatTimeAgo(nestedReply.created_at)
                                              }
                                            </span>
                                          </div>
                                          
                                          {/* 점3개 메뉴 표시 (삭제된 답글 제외) */}
                                          {currentUser && !nestedReply.is_deleted && (
                                            <div className="relative">
                                              <button
                                                onClick={() => toggleCommentMenu(nestedReply.id)}
                                                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                              >
                                                <MoreVertical className="w-3 h-3 text-[#fb8678]" />
                                              </button>
                                              
                                              {/* 답글 메뉴 드롭다운 */}
                                              {showCommentMenu === nestedReply.id && (
                                                <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[100px]">
                                                  {nestedReply.user_id === currentUser.id || nestedReply.user_id === currentUser.auth_user_id ? (
                                                    <>
                                                      <button
                                                        onClick={() => handleStartEditComment(nestedReply)}
                                                        className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                                      >
                                                        수정하기
                                                      </button>
                                                      <div className="border-t border-gray-200 mx-2"></div>
                                                      <button
                                                        onClick={() => handleDeleteComment(nestedReply.id)}
                                                        className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                                      >
                                                        삭제하기
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <button
                                                        onClick={() => handleBlockCommentAuthor(nestedReply.user_id)}
                                                        className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                                      >
                                                        차단하기
                                                      </button>
                                                      <div className="border-t border-gray-200 mx-2"></div>
                                                      <button
                                                        onClick={() => handleReportComment(nestedReply.id, nestedReply.user_id)}
                                                        className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                                      >
                                                        신고하기
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* 중첩 답글 내용 */}
                                        {nestedReply.is_deleted ? (
                                          <p className="text-gray-400 text-xs italic">삭제되었습니다.</p>
                                        ) : (
                                          <p className="text-gray-800 text-xs">
                                            <span className="text-[#fb8678] font-medium">@{parentReply?.user_name}</span>
                                            <span className="ml-1">{nestedReply.content}</span>
                                          </p>
                                        )}

                                        {/* 답글달기 버튼 - 자신의 답글이 아닌 경우에만 표시 */}
                                        {!nestedReply.is_deleted && currentUser && (nestedReply.user_id !== currentUser.id && nestedReply.user_id !== currentUser.auth_user_id) && (
                                          <div className="mt-2">
                                            <button
                                              onClick={() => {
                                                console.log('=== 2차 답글에 대한 답글달기 버튼 클릭 ===')
                                                console.log('답글 ID (nestedReply.id):', nestedReply.id)
                                                console.log('답글 작성자:', nestedReply.user_name)
                                                console.log('현재 사용자:', currentUser.nickname || currentUser.full_name)
                                                console.log('현재 replyingToCommentId:', replyingToCommentId)
                                                handleStartReply(nestedReply.id)
                                              }}
                                              className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors"
                                            >
                                              답글달기
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : null
                          })()}
                          
                          {/* 답글 숨기기 버튼 */}
                          <div className="mt-3">
                            <button
                              onClick={() => toggleReplies(comment.id)}
                              className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors ml-9 flex items-center space-x-1"
                            >
                              <span className="text-gray-400">{'>'}</span>
                              <span className="font-semibold">답글 숨기기</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        // 접힌 상태: "답글 N개 보기" 버튼만 표시
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors ml-9 flex items-center space-x-1"
                        >
                          <span className="text-gray-400">{'>'}</span>
                          <span className="font-semibold">답글 {getTotalRepliesCount(comment)}개 보기</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">게시글 삭제</h3>
            <p className="text-gray-600 text-center mb-6">
              정말로 이 게시글을 삭제하시겠습니까?<br />
              삭제된 게시글은 복구할 수 없습니다.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleDeletePost}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full min-h-[500px] max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">게시글 신고</h3>
              <button
                onClick={handleCloseReportModal}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6">
              <p className="text-gray-600 text-sm mb-4">
                <strong>{post?.author_name}</strong>님이 작성한 게시글을 신고합니다.
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
                onClick={handleCloseReportModal}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportReason.trim() || reportLoading}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reportLoading ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 차단 확인 모달 */}
      {showBlockModal && post && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                {post.author_name}님을 차단하시겠습니까?
              </h2>
              <div className="text-sm text-gray-600 text-left space-y-2">
                <p>• 차단하면 사용자가 작성한 글과 댓글이 더 이상 보이지 않습니다.</p>
                <p>• 상대방은 회원님의 글을 계속 볼 수 있습니다.</p>
                <p>• 정말 차단하시겠습니까?</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCloseBlockModal}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleBlockUser}
                disabled={blockLoading}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {blockLoading ? '차단 중...' : '차단하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 모달 */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50 overflow-hidden">
          <div 
            className="w-full bg-white rounded-t-3xl transform transition-all duration-500 ease-out animate-slide-up"
            style={{ height: '90vh' }}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-bold text-gray-900">댓글</h3>
              <button
                onClick={handleCloseCommentModal}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* 댓글 목록 */}
            <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(90vh - 140px)' }}>
              {commentLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
                  <p className="text-gray-600">댓글을 불러오는 중...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">아직 댓글이 없습니다.</p>
                  <p className="text-gray-500 text-sm">첫 번째 댓글을 작성해보세요!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {organizedComments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      {/* 최상위 댓글 */}
                      <div className="flex space-x-3">
                        <div className="relative w-8 h-8">
                          <div 
                            className="w-full h-full overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer shadow-lg"
                            style={{ borderRadius: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation() // 댓글 클릭 이벤트 전파 방지
                              // 프로필 사진이 있거나 자녀 사진이 있는 경우에만 모달 열기
                              const hasProfileImage = comment.user_profile_image && comment.user_profile_image.trim() !== ''
                              const hasChildrenImages = comment.user_children_images && comment.user_children_images.length > 0 && 
                                comment.user_children_images.some(img => img && img.trim() !== '')
                              
                              if (hasProfileImage || hasChildrenImages) {
                                openProfileImageViewer(
                                  comment.user_profile_image || '', 
                                  comment.user_children_images,
                                  { id: comment.user_id, name: comment.user_name }
                                )
                              }
                            }}
                          >
                            {comment.user_profile_image ? (
                              <img
                                src={comment.user_profile_image}
                                alt={`${comment.user_name}의 프로필`}
                                className="w-full h-full object-cover"
                                style={{ borderRadius: '12px' }}
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-600">
                                {comment.user_name.charAt(0)}
                              </span>
                            )}
                          </div>
                          
                          {/* 자녀 프로필 사진 배지 (학부모) 또는 교사 배지 (교사) */}
                          {comment.user_type === 'teacher' ? (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[0.5px] border-blue-500 bg-white flex items-center justify-center cursor-pointer">
                              <svg className="w-2 h-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                              </svg>
                            </div>
                          ) : comment.user_children_images && comment.user_children_images.length > 0 && (
                            <div className="absolute -bottom-0.5 -right-0.5 flex items-center flex-row-reverse">
                              {/* 3명 이상일 경우 +N 표시 (가장 우측에 위치) */}
                              {comment.user_children_images.length > 2 && (
                                <div className="w-3 h-3 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center cursor-pointer relative z-30">
                                  <span className="text-white text-[6px] font-bold">
                                    +{comment.user_children_images.length - 2}
                                  </span>
                                </div>
                              )}

                              {/* 두 번째 자녀 (우측에서 두 번째, +N이 없으면 가장 우측) */}
                              {comment.user_children_images.length >= 2 && (
                                <div className={`w-3 h-3 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-20 ${comment.user_children_images.length > 2 ? '-mr-[4px]' : ''}`}>
                                  {comment.user_children_images[1] ? (
                                    <img
                                      src={comment.user_children_images[1]}
                                      alt="자녀 프로필 2"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        const parent = e.currentTarget.parentElement
                                        if (parent) {
                                          const icon = document.createElement('span')
                                          icon.className = 'text-gray-400 text-[8px]'
                                          icon.textContent = '👤'
                                          parent.appendChild(icon)
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="text-gray-400 text-[8px]">👤</span>
                                  )}
                                </div>
                              )}

                              {/* 첫 번째 자녀 (맨 왼쪽, 1명이면 가장 우측) */}
                              <div className={`w-3 h-3 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-10 ${comment.user_children_images.length >= 2 ? '-mr-[4px]' : ''}`}>
                                {comment.user_children_images[0] ? (
                                  <img
                                    src={comment.user_children_images[0]}
                                    alt="자녀 프로필"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      const parent = e.currentTarget.parentElement
                                      if (parent) {
                                        const icon = document.createElement('span')
                                        icon.className = 'text-gray-400 text-[8px]'
                                        icon.textContent = '👤'
                                        parent.appendChild(icon)
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className="text-gray-400 text-[8px]">👤</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900 text-sm">
                                {comment.user_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {comment.is_edited && comment.updated_at
                                  ? `${formatTimeAgo(comment.updated_at)} (수정됨)`
                                  : formatTimeAgo(comment.created_at)
                                }
                              </span>
                            </div>
                            
                            {/* 점3개 메뉴 표시 (삭제된 댓글 제외) */}
                            {currentUser && !comment.is_deleted && (
                              <div className="relative">
                                <button
                                  onClick={() => toggleCommentMenu(comment.id)}
                                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4 text-[#fb8678]" />
                                </button>
                                
                                {/* 댓글 메뉴 드롭다운 */}
                                {showCommentMenu === comment.id && (
                                  <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[100px]">
                                    {comment.user_id === currentUser.id || comment.user_id === currentUser.auth_user_id ? (
                                      <>
                                        <button
                                          onClick={() => handleStartEditComment(comment)}
                                          className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                          수정하기
                                        </button>
                                        <div className="border-t border-gray-200 mx-2"></div>
                                        <button
                                          onClick={() => handleDeleteComment(comment.id)}
                                          className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                        >
                                          삭제하기
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleBlockCommentAuthor(comment.user_id)}
                                          className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                          차단하기
                                        </button>
                                        <div className="border-t border-gray-200 mx-2"></div>
                                        <button
                                          onClick={() => handleReportComment(comment.id, comment.user_id)}
                                          className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                        >
                                          신고하기
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* 댓글 내용 (수정 모드일 때는 입력창) */}
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingCommentContent}
                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-sm resize-none"
                                rows={2}
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={handleSaveEditComment}
                                  className="px-3 py-1 bg-[#fb8678] text-white text-xs rounded-lg hover:bg-[#e67567] transition-colors"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={handleCancelEditComment}
                                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : comment.is_deleted ? (
                            <p className="text-gray-400 text-sm italic">삭제되었습니다.</p>
                          ) : (
                            <p className="text-gray-800 text-sm">{comment.content}</p>
                          )}

                          {/* 댓글 액션 버튼들 */}
                          {!comment.is_deleted && (
                            <div className="flex items-center space-x-4 mt-2">
                              {/* 답글 달기 버튼 - 자신의 댓글이 아닌 경우에만 표시 */}
                              {currentUser && (comment.user_id !== currentUser.id && comment.user_id !== currentUser.auth_user_id) && (
                                <button
                                  onClick={() => {
                                    console.log('댓글 모달 내 답글달기 버튼 클릭됨:', comment.id)
                                    console.log('현재 사용자 ID:', currentUser.id, 'auth_user_id:', currentUser.auth_user_id)
                                    console.log('댓글 작성자 ID:', comment.user_id)
                                    handleStartReply(comment.id)
                                  }}
                                  className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors"
                                >
                                  답글달기
                                </button>
                              )}
                              

                            </div>
                          )}

                          {/* 답글 입력창 */}
                          {replyingToCommentId === comment.id && (
                            <div className="mt-3 space-y-2">
                              {/* 답글 대상 표시 */}
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-[#fb8678] font-medium text-sm">@</span>
                                <span className="text-[#fb8678] font-semibold text-sm">{comment.user_name}</span>
                                <span className="text-gray-500 text-sm">님에게 답글</span>
                              </div>
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="답글을 입력하세요..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-sm resize-none"
                                rows={2}
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={handleSubmitReply}
                                  className="px-3 py-1 bg-[#fb8678] text-white text-xs rounded-lg hover:bg-[#e67567] transition-colors"
                                >
                                  답글달기
                                </button>
                                <button
                                  onClick={handleCancelReply}
                                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 답글들 */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-8 space-y-3">
                          {showReplies.has(comment.id) ? (
                            // 펼쳐진 상태: 모든 답글들 표시
                            <>
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex space-x-3">
                                  <div className="relative w-6 h-6">
                                    <div 
                                      className="w-full h-full overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer shadow-lg"
                                      style={{ borderRadius: '8px' }}
                                      onClick={(e) => {
                                        e.stopPropagation() // 답글 클릭 이벤트 전파 방지
                                        // 프로필 사진이 있거나 자녀 사진이 있는 경우에만 모달 열기
                                        const hasProfileImage = reply.user_profile_image && reply.user_profile_image.trim() !== ''
                                        const hasChildrenImages = reply.user_children_images && reply.user_children_images.length > 0 && 
                                          reply.user_children_images.some(img => img && img.trim() !== '')
                                        
                                        if (hasProfileImage || hasChildrenImages) {
                                          openProfileImageViewer(
                                            reply.user_profile_image || '', 
                                            reply.user_children_images,
                                            { id: reply.user_id, name: reply.user_name }
                                          )
                                        }
                                      }}
                                    >
                                      {reply.user_profile_image ? (
                                        <img
                                          src={reply.user_profile_image}
                                          alt={`${reply.user_name}의 프로필`}
                                          className="w-full h-full object-cover"
                                          style={{ borderRadius: '8px' }}
                                        />
                                      ) : (
                                        <span className="text-xs font-medium text-gray-600">
                                          {reply.user_name.charAt(0)}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* 자녀 프로필 사진 배지 (학부모) 또는 교사 배지 (교사) */}
                                    {reply.user_type === 'teacher' ? (
                                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[0.5px] border-blue-500 bg-white flex items-center justify-center cursor-pointer">
                                        <svg className="w-1.5 h-1.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                                        </svg>
                                      </div>
                                    ) : reply.user_children_images && reply.user_children_images.length > 0 && (
                                      <div className="absolute -bottom-0.5 -right-0.5 flex items-center flex-row-reverse">
                                        {/* 3명 이상일 경우 +N 표시 */}
                                        {reply.user_children_images.length > 2 && (
                                          <div className="w-2.5 h-2.5 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center cursor-pointer relative z-30">
                                            <span className="text-white text-[5px] font-bold">
                                              +{reply.user_children_images.length - 2}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* 두 번째 자녀 */}
                                        {reply.user_children_images.length >= 2 && (
                                          <div className={`w-2.5 h-2.5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-20 ${reply.user_children_images.length > 2 ? '-mr-[3px]' : ''}`}>
                                            {reply.user_children_images[1] ? (
                                              <img
                                                src={reply.user_children_images[1]}
                                                alt="자녀 프로필 2"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  e.currentTarget.style.display = 'none'
                                                  const parent = e.currentTarget.parentElement
                                                  if (parent) {
                                                    const icon = document.createElement('span')
                                                    icon.className = 'text-gray-400 text-[7px]'
                                                    icon.textContent = '👤'
                                                    parent.appendChild(icon)
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <span className="text-gray-400 text-[7px]">👤</span>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* 첫 번째 자녀 */}
                                        <div className={`w-2.5 h-2.5 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer relative z-10 ${reply.user_children_images.length >= 2 ? '-mr-[3px]' : ''}`}>
                                          {reply.user_children_images[0] ? (
                                            <img
                                              src={reply.user_children_images[0]}
                                              alt="자녀 프로필"
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                                const parent = e.currentTarget.parentElement
                                                if (parent) {
                                                  const icon = document.createElement('span')
                                                  icon.className = 'text-gray-400 text-[7px]'
                                                  icon.textContent = '👤'
                                                  parent.appendChild(icon)
                                                }
                                              }}
                                            />
                                          ) : (
                                            <span className="text-gray-400 text-[7px]">👤</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-gray-900 text-xs">
                                         {reply.user_name}
                                       </span>
                                        <span className="text-xs text-gray-400">
                                          {reply.is_edited && reply.updated_at
                                            ? `${formatTimeAgo(reply.updated_at)} (수정됨)`
                                            : formatTimeAgo(reply.created_at)
                                          }
                                        </span>
                                      </div>
                                      
                                      {/* 점3개 메뉴 표시 (삭제된 답글 제외) */}
                                      {currentUser && !reply.is_deleted && (
                                        <div className="relative">
                                          <button
                                            onClick={() => toggleCommentMenu(reply.id)}
                                            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                          >
                                            <MoreVertical className="w-3 h-3 text-[#fb8678]" />
                                          </button>
                                          
                                          {/* 답글 메뉴 드롭다운 */}
                                          {showCommentMenu === reply.id && (
                                            <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[100px]">
                                              {reply.user_id === currentUser.id || reply.user_id === currentUser.auth_user_id ? (
                                                <>
                                                  <button
                                                    onClick={() => handleStartEditComment(reply)}
                                                    className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                                  >
                                                    수정하기
                                                  </button>
                                                  <div className="border-t border-gray-200 mx-2"></div>
                                                  <button
                                                    onClick={() => handleDeleteComment(reply.id)}
                                                    className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                                  >
                                                    삭제하기
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    onClick={() => handleBlockCommentAuthor(reply.user_id)}
                                                    className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                                  >
                                                    차단하기
                                                  </button>
                                                  <div className="border-t border-gray-200 mx-2"></div>
                                                  <button
                                                    onClick={() => handleReportComment(reply.id, reply.user_id)}
                                                    className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                                  >
                                                    신고하기
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* 답글 내용 */}
                                    {reply.is_deleted ? (
                                      <p className="text-gray-400 text-xs italic">삭제되었습니다.</p>
                                    ) : (
                                      <p className="text-gray-800 text-xs">
                                        <span className="text-[#fb8678] font-medium">@{comment.user_name}</span>
                                        <span className="ml-1">{reply.content}</span>
                                      </p>
                                    )}

                                    {/* 답글달기 버튼 - 자신의 답글이 아닌 경우에만 표시 */}
                                    {!reply.is_deleted && currentUser && (reply.user_id !== currentUser.id && reply.user_id !== currentUser.auth_user_id) && (
                                      <div className="mt-2">
                                        <button
                                          onClick={() => {
                                            console.log('=== 댓글 모달 내 B의 답글에 대한 답글달기 버튼 클릭 ===')
                                            console.log('답글 ID (reply.id):', reply.id)
                                            console.log('답글 작성자:', reply.user_name)
                                            console.log('현재 사용자:', currentUser.nickname || currentUser.full_name)
                                            console.log('현재 replyingToCommentId:', replyingToCommentId)
                                            handleStartReply(reply.id)
                                          }}
                                          className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors"
                                        >
                                          답글달기
                                        </button>
                                      </div>
                                    )}

                                    {/* 답글에 대한 답글 입력창 */}
                                    {replyingToCommentId === reply.id && (
                                      <div className="mt-3 space-y-2">
                                        {/* 답글 대상 표시 */}
                                        <div className="flex items-center space-x-2 mb-2">
                                          <span className="text-[#fb8678] font-medium text-xs">@</span>
                                          <span className="text-[#fb8678] font-semibold text-xs">{reply.user_name}</span>
                                          <span className="text-xs text-gray-500">님에게 답글</span>
                                        </div>
                                        <textarea
                                          value={replyContent}
                                          onChange={(e) => setReplyContent(e.target.value)}
                                          placeholder="답글을 입력하세요..."
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-xs resize-none"
                                          rows={2}
                                        />
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={handleSubmitReply}
                                            className="px-3 py-1 bg-[#fb8678] text-white text-xs rounded-lg hover:bg-[#e67567] transition-colors"
                                          >
                                            답글달기
                                          </button>
                                          <button
                                            onClick={handleCancelReply}
                                            className="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
                                          >
                                            취소
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* 답글에 대한 답글들 표시 */}

                                  </div>
                                </div>
                              ))}
                              
                              {/* 2차 답글들 표시 (1차 답글과 동일한 레벨에) */}
                              {comment.replies && (() => {
                                const replies = comment.replies
                                // 1차 답글들에 대한 2차 답글들을 찾기
                                const secondLevelReplies = comments.filter(c => 
                                  c.parent_id && replies.some(reply => reply.id === c.parent_id)
                                )
                                return secondLevelReplies.length > 0 ? (
                                  <div className="space-y-3">
                                    {secondLevelReplies.map((nestedReply) => {
                                      // 이 2차 답글의 부모 1차 답글 찾기
                                      const parentReply = replies.find(reply => reply.id === nestedReply.parent_id)
                                      return (
                                        <div key={nestedReply.id} className="flex space-x-3">
                                          <div className="relative w-6 h-6">
                                            <div 
                                              className="w-full h-full overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer shadow-lg"
                                              style={{ borderRadius: '8px' }}
                                              onClick={(e) => {
                                                e.stopPropagation() // 답글 클릭 이벤트 전파 방지
                                                // 프로필 사진이 있거나 자녀 사진이 있는 경우에만 모달 열기
                                                const hasProfileImage = nestedReply.user_profile_image && nestedReply.user_profile_image.trim() !== ''
                                                const hasChildrenImages = nestedReply.user_children_images && nestedReply.user_children_images.length > 0 && 
                                                  nestedReply.user_children_images.some(img => img && img.trim() !== '')
                                                
                                                if (hasProfileImage || hasChildrenImages) {
                                                  openProfileImageViewer(
                                                    nestedReply.user_profile_image || '', 
                                                    nestedReply.user_children_images,
                                                    { id: nestedReply.user_id, name: nestedReply.user_name }
                                                  )
                                                }
                                              }}
                                            >
                                              {nestedReply.user_profile_image ? (
                                                <img
                                                  src={nestedReply.user_profile_image}
                                                  alt={`${nestedReply.user_name}의 프로필`}
                                                  className="w-full h-full object-cover"
                                                  style={{ borderRadius: '8px' }}
                                                />
                                              ) : (
                                                <span className="text-xs font-medium text-gray-600">
                                                  {nestedReply.user_name.charAt(0)}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="flex items-center space-x-2">
                                                <span className="font-semibold text-gray-900 text-xs">
                                                  {nestedReply.user_name}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                  {nestedReply.is_edited && nestedReply.updated_at
                                                    ? `${formatTimeAgo(nestedReply.updated_at)} (수정됨)`
                                                    : formatTimeAgo(nestedReply.created_at)
                                                  }
                                                </span>
                                              </div>
                                              
                                              {/* 점3개 메뉴 표시 (삭제된 답글 제외) */}
                                              {currentUser && !nestedReply.is_deleted && (
                                                <div className="relative">
                                                  <button
                                                    onClick={() => toggleCommentMenu(nestedReply.id)}
                                                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                                  >
                                                    <MoreVertical className="w-3 h-3 text-[#fb8678]" />
                                                  </button>
                                                  
                                                  {/* 답글 메뉴 드롭다운 */}
                                                  {showCommentMenu === nestedReply.id && (
                                                    <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[100px]">
                                                      {nestedReply.user_id === currentUser.id || nestedReply.user_id === currentUser.auth_user_id ? (
                                                        <>
                                                          <button
                                                            onClick={() => handleStartEditComment(nestedReply)}
                                                            className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                                          >
                                                            수정하기
                                                          </button>
                                                          <div className="border-t border-gray-200 mx-2"></div>
                                                          <button
                                                            onClick={() => handleDeleteComment(nestedReply.id)}
                                                            className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                                          >
                                                            삭제하기
                                                          </button>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <button
                                                            onClick={() => handleBlockCommentAuthor(nestedReply.user_id)}
                                                            className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
                                                          >
                                                            차단하기
                                                          </button>
                                                          <div className="border-t border-gray-200 mx-2"></div>
                                                          <button
                                                            onClick={() => handleReportComment(nestedReply.id, nestedReply.user_id)}
                                                            className="w-full px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                                                          >
                                                            신고하기
                                                          </button>
                                                        </>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* 중첩 답글 내용 */}
                                            {nestedReply.is_deleted ? (
                                              <p className="text-gray-400 text-xs italic">삭제되었습니다.</p>
                                            ) : (
                                              <p className="text-gray-800 text-xs">
                                                <span className="text-[#fb8678] font-medium">@{parentReply?.user_name}</span>
                                                <span className="ml-1">{nestedReply.content}</span>
                                              </p>
                                            )}

                                            {/* 답글달기 버튼 - 자신의 답글이 아닌 경우에만 표시 */}
                                            {!nestedReply.is_deleted && currentUser && (nestedReply.user_id !== currentUser.id && nestedReply.user_id !== currentUser.auth_user_id) && (
                                              <div className="mt-2">
                                                <button
                                                  onClick={() => {
                                                    console.log('=== 게시글 전체보기 모달 내 2차 답글에 대한 답글달기 버튼 클릭 ===')
                                                    console.log('답글 ID (nestedReply.id):', nestedReply.id)
                                                    console.log('답글 작성자:', nestedReply.user_name)
                                                    console.log('현재 사용자:', currentUser.nickname || currentUser.full_name)
                                                    console.log('현재 replyingToCommentId:', replyingToCommentId)
                                                    handleStartReply(nestedReply.id)
                                                  }}
                                                  className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors"
                                                >
                                                  답글달기
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : null
                              })()}
                              
                              {/* 답글 숨기기 버튼 */}
                              <div className="mt-3">
                                <button
                                  onClick={() => toggleReplies(comment.id)}
                                  className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors ml-9 flex items-center space-x-1"
                                >
                                  <span className="text-gray-400">{'>'}</span>
                                  <span className="font-semibold">답글 숨기기</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            // 접힌 상태: "답글 N개 보기" 버튼만 표시
                            <button
                              onClick={() => toggleReplies(comment.id)}
                              className="text-xs text-gray-500 hover:text-[#fb8678] transition-colors ml-9 flex items-center space-x-1"
                            >
                              <span className="text-gray-400">{'>'}</span>
                              <span className="font-semibold">답글 {getTotalRepliesCount(comment)}개 보기</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 댓글 입력 */}
            <div className="p-4 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#fb8678] focus:border-transparent text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitComment()
                    }
                  }}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  className="px-6 py-3 bg-[#fb8678] text-white rounded-full hover:bg-[#e67567] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  게시
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 전체보기 뷰어 */}
      {showImageViewer && imageViewerPhotos.length > 0 && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={closeImageViewer}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={closeImageViewer}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white z-10"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 이전 버튼 */}
          {imageViewerPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goPrevImage()
              }}
              className="absolute left-2 sm:left-4 p-3 rounded-full hover:bg-white/10 text-white z-10"
              aria-label="이전 이미지"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* 이미지 */}
          <div 
            className="max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageViewerPhotos[currentImageIndex]}
              alt={`게시글 이미지 ${currentImageIndex + 1}`}
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
              onClick={(e) => {
                e.stopPropagation()
                goNextImage()
              }}
              className="absolute right-2 sm:right-4 p-3 rounded-full hover:bg-white/10 text-white z-10"
              aria-label="다음 이미지"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
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
          {currentUser && (() => {
            // 게시글 작성자인 경우
            if (post && post.author_name === (currentUser.nickname || currentUser.full_name)) {
              return false
            }
            // 댓글/답글 작성자인 경우
            if (profileImageViewerUser) {
              const isSameName = profileImageViewerUser.name === (currentUser.nickname || currentUser.full_name)
              const isSameId = profileImageViewerUser.id === currentUser.auth_user_id
              if (isSameName || isSameId) {
                return false
              }
            }
            // 본인이 아니면 점3개 표시
            return true
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
                setProfileImageIndex((currentProfileImageIndex - 1 + profileImageViewerImages.length) % profileImageViewerImages.length)
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
                setProfileImageIndex((currentProfileImageIndex + 1) % profileImageViewerImages.length)
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
                  onClick={() => setProfileImageIndex(index)}
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
      {showProfileReportModal && (post || profileImageViewerUser) && (
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
                <strong>{post?.author_name || profileImageViewerUser?.name}</strong>님의 프로필을 신고합니다.
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

      {/* 댓글 차단 모달 */}
      {showCommentBlockModal && pendingBlockCommentUserId && (
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
                <p>• 차단하면 해당 사용자의 댓글이 더 이상 보이지 않습니다.</p>
                <p>• 상대방은 회원님의 글을 계속 볼 수 있습니다.</p>
                <p>• 정말 차단하시겠습니까?</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCommentBlockModal(false)
                  setPendingBlockCommentUserId(null)
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleConfirmBlockCommentAuthor}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                차단하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 신고 모달 */}
      {showCommentReportModal && pendingReportComment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full min-h-[500px] max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">댓글 신고</h3>
              <button
                onClick={() => {
                  setShowCommentReportModal(false)
                  setPendingReportComment(null)
                  setCommentReportReason('')
                  setCommentReportType('spam')
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6">
              <p className="text-gray-600 text-sm mb-4">
                선택한 댓글을 신고합니다.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 유형
                </label>
                <select
                  value={commentReportType}
                  onChange={(e) => setCommentReportType(e.target.value)}
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
                  value={commentReportReason}
                  onChange={(e) => setCommentReportReason(e.target.value)}
                  placeholder="신고 사유를 구체적으로 작성해주세요..."
                  rows={6}
                  maxLength={500}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fb8678] focus:border-transparent resize-none text-sm"
                />
                <div className="flex justify-between text-xs text-gray-400 font-semibold mt-1">
                  <span>최대 텍스트 길이</span>
                  <span>{commentReportReason.length}/500</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowCommentReportModal(false)
                  setPendingReportComment(null)
                  setCommentReportReason('')
                  setCommentReportType('spam')
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSubmitCommentReport}
                disabled={commentReportLoading || !commentReportReason.trim()}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {commentReportLoading ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostDetail
