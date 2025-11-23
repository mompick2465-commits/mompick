import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
	AlertCircle,
	Camera,
	ChevronLeft,
	ChevronRight,
	FileText,
	Heart,
	Info,
	Phone,
	Share2,
	X,
	ThumbsUp,
	MoreHorizontal,
	Shield,
	Flag,
} from 'lucide-react'
import {
  fetchAllPlaygroundsFromSnapshot,
  fetchPlaygroundsByRegionGroup,
  fetchPlaygroundsBySido,
  fetchPlaygroundsFromCache,
  playgroundToMapData,
  type PlaygroundRawItem,
} from '../utils/playgroundApi'
import type { KindergartenMapData } from '../types/kakaoMap'
import { supabase } from '../lib/supabase'
import { addFavorite, isFavorited, removeFavorite } from '../utils/favorites'
import {
	getPlaygroundReviews,
	getPlaygroundReviewStats,
	listUserHelpfulReviewIds,
	togglePlaygroundReviewHelpful,
	togglePlaygroundReviewHelpfulWithNotification,
	deletePlaygroundReview,
	requestPlaygroundReviewDeletion,
} from '../utils/playgroundReviewApi'
import { playgroundDetailCacheManager } from '../utils/playgroundDetailCache'

type PlaygroundTab = 'basic' | 'praise'

interface PlaygroundDetailState {
  map: KindergartenMapData
  raw: PlaygroundRawItem | null
}

const SESSION_STORAGE_KEY = 'mompick:lastPlaygroundSelection'

const PlaygroundDetailPage: React.FC = () => {
  const { playgroundId: playgroundIdParam } = useParams<{ playgroundId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<PlaygroundDetailState | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PlaygroundTab>('basic')
  const [showSourceInfo, setShowSourceInfo] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showHeartBurst, setShowHeartBurst] = useState(false)
  const [praiseFilter, setPraiseFilter] = useState<'전체' | '최신순'>('전체')
	const [reviewsLoading, setReviewsLoading] = useState<boolean>(false)
	const [reviews, setReviews] = useState<any[]>([])
	const [reviewStats, setReviewStats] = useState<{ average_rating: number; total_reviews: number; rating_distribution: Record<1|2|3|4|5, number> } | null>(null)
	const [helpfulSet, setHelpfulSet] = useState<Set<string>>(new Set())
	const [showReviewOptions, setShowReviewOptions] = useState<boolean>(false)
	const [showShareSheet, setShowShareSheet] = useState(false)
	const [shareDragStartY, setShareDragStartY] = useState<number | null>(null)
	const [shareDragY, setShareDragY] = useState(0)
	const [shareIsDragging, setShareIsDragging] = useState(false)
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
	const touchStartXRef = useRef<number | null>(null)
	const touchStartYRef = useRef<number | null>(null)
	const lastWheelTimeRef = useRef<number>(0)
	// 리뷰 메뉴 관련 상태
	const [showReviewMenu, setShowReviewMenu] = useState<string | null>(null)
	const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null)
	const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
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
	const [pendingReport, setPendingReport] = useState<{ reviewId: string; authorAuthUserId: string } | null>(null)
	const [buildingImages, setBuildingImages] = useState<string[]>([])
	const [currentBuildingImageIndex, setCurrentBuildingImageIndex] = useState<number>(0)
	const [pendingDeleteRequestReviewIds, setPendingDeleteRequestReviewIds] = useState<Set<string>>(new Set())
	const photoItems = useMemo(() => {
		const items: Array<{ id: string; image_url: string; rating: number }> = []
		for (const r of reviews) {
			// 숨김 처리된 리뷰의 이미지는 제외
			if (r.is_hidden) continue
			const imgs = (r?.images || []) as Array<{ id: string; image_url: string }>
			for (const img of imgs) {
				items.push({ id: img.id, image_url: img.image_url, rating: Number((r as any)?.rating || 0) })
			}
		}
		return items
	}, [reviews])
	useEffect(() => {
		if (showSourceInfo) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [showSourceInfo])

	useEffect(() => {
		if (showShareSheet) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
	}, [showShareSheet])


  const normalizedId = useMemo(() => {
    if (!playgroundIdParam) return ''
    try {
      return decodeURIComponent(playgroundIdParam)
    } catch {
      return playgroundIdParam
    }
  }, [playgroundIdParam])

  const sessionFallbackRaw = useMemo(() => {
    try {
      return window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    } catch (err) {
      console.warn('[PlaygroundDetail] 세션 데이터를 불러오지 못했습니다.', err)
      return null
    }
  }, [normalizedId])

	useEffect(() => {
		const syncFavoriteStatus = async () => {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser()
				const userId = user?.id ?? null
				setCurrentUserId(userId)
				setCurrentAuthUserId(userId)
				if (userId && normalizedId) {
					const favorited = await isFavorited(userId, 'playground', normalizedId)
					setIsFavorite(favorited)
				} else {
					setIsFavorite(false)
				}
				// 현재 사용자의 profile ID 가져오기
				if (userId) {
					const { data: profileData, error: profileError } = await supabase
						.from('profiles')
						.select('id')
						.eq('auth_user_id', userId)
						.single()
					if (!profileError && profileData) {
						setCurrentProfileId(profileData.id)
					}
				}
			} catch {
				setCurrentUserId(null)
				setCurrentAuthUserId(null)
				setCurrentProfileId(null)
				setIsFavorite(false)
			}
		}
		syncFavoriteStatus()
	}, [normalizedId])

  const sessionFallback = useMemo<KindergartenMapData | null>(() => {
    if (!sessionFallbackRaw) return null
    try {
      const parsed = JSON.parse(sessionFallbackRaw)
      if (!parsed || typeof parsed !== 'object') return null
      const candidateId = String(parsed.id ?? parsed.code ?? '')
      if (!candidateId) return null
      return candidateId === normalizedId ? (parsed as KindergartenMapData) : null
    } catch (err) {
      console.warn('[PlaygroundDetail] 세션 데이터 파싱 실패:', err)
      return null
    }
  }, [normalizedId, sessionFallbackRaw])

  const searchParamsKey = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    if (!normalizedId) {
      setDetail(null)
      setLoading(false)
      setError('놀이시설 정보를 찾을 수 없어요.')
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    if (sessionFallback && !detail) {
      setDetail({
        map: sessionFallback,
        raw: null,
      })
    }

    const loadDetail = async () => {
      try {
        // 1. 캐시에서 먼저 조회
        const cachedData = await playgroundDetailCacheManager.getCachedDetail(normalizedId)
        if (cachedData) {
          console.log('✅ 놀이시설 상세 정보 캐시 사용:', normalizedId)
          if (isMounted) {
            setDetail(cachedData)
            setLoading(false)
            return
          }
        }

        // 2. 캐시가 없으면 데이터 로드
        const regionCodeParam = (searchParams.get('regionCode') || '').trim()
        const sggCodeParam = (searchParams.get('sggCode') || '').trim()
        const sidoCodeParam = (searchParams.get('sidoCode') || '').trim()

        const candidateLists: PlaygroundRawItem[][] = []

        if (regionCodeParam) {
          const cacheResult = await fetchPlaygroundsFromCache(regionCodeParam)
          if (cacheResult?.items?.length) {
            candidateLists.push(cacheResult.items)
          }
        }

        if (!candidateLists.length && sggCodeParam) {
          const result = await fetchPlaygroundsByRegionGroup({ sggCode: sggCodeParam, suppressLog: true })
          if (result.items.length) {
            candidateLists.push(result.items)
          }
        }

        if (!candidateLists.length && sidoCodeParam) {
          const items = await fetchPlaygroundsBySido(sidoCodeParam)
          if (items.length) {
            candidateLists.push(items)
          }
        }

        if (!candidateLists.length) {
          const snapshotItems = await fetchAllPlaygroundsFromSnapshot()
          if (snapshotItems.length) {
            candidateLists.push(snapshotItems)
          }
        }

        let matchedRaw: PlaygroundRawItem | null = null
        const sessionName = sessionFallback?.name?.trim()

        for (const items of candidateLists) {
          const found =
            items.find((item) => String(item.pfctSn ?? '').trim() === normalizedId) ||
            items.find((item) => String(item.pfctNm ?? '').trim() === normalizedId) ||
            (sessionName ? items.find((item) => String(item.pfctNm ?? '').trim() === sessionName) : undefined)

          if (found) {
            matchedRaw = found
            break
          }
        }

        if (!matchedRaw) {
          throw new Error('선택한 놀이시설 정보를 찾지 못했습니다.')
        }

        const mapData = await playgroundToMapData(matchedRaw)
        const mergedMapData: KindergartenMapData = {
          ...mapData,
          rating: sessionFallback?.rating ?? mapData.rating,
          distance: sessionFallback?.distance ?? mapData.distance,
          image: sessionFallback?.image ?? mapData.image,
        }

        const detailState: PlaygroundDetailState = {
          map: mergedMapData,
          raw: matchedRaw,
        }

        if (isMounted) {
          setDetail(detailState)

          try {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mergedMapData))
          } catch (storageErr) {
            console.warn('[PlaygroundDetail] 세션 저장 실패:', storageErr)
          }

          // 3. 캐시에 저장 (비동기, 에러 무시)
          playgroundDetailCacheManager.saveDetailCache(normalizedId, detailState).catch((err) => {
            console.warn('[PlaygroundDetail] 캐시 저장 실패:', err)
          })
        }
      } catch (err) {
        console.error('[PlaygroundDetail] 로딩 오류:', err)
        if (isMounted) {
          setError('놀이시설 정보를 불러오지 못했어요.')
          if (!sessionFallback) {
            setDetail(null)
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDetail()

    return () => {
      isMounted = false
    }
  }, [normalizedId, searchParamsKey, sessionFallbackRaw])

  useEffect(() => {
    if (detail) {
      console.log('[PlaygroundDetail] 현재 로드된 데이터', {
        map: detail.map,
        raw: detail.raw,
      })
    }
  }, [detail])

  // 건물 사진 가져오기
  useEffect(() => {
    const loadBuildingImages = async () => {
      if (!normalizedId) return
      try {
        const { data, error } = await supabase
          .from('playground_custom_info')
          .select('building_images')
          .eq('playground_id', normalizedId)
          .eq('is_active', true)
          .maybeSingle()
        
        if (error) {
          console.warn('[PlaygroundDetail] 건물 사진 조회 실패:', error)
          setBuildingImages([])
          return
        }
        
        if (data && Array.isArray(data.building_images) && data.building_images.length > 0) {
          setBuildingImages(data.building_images)
          setCurrentBuildingImageIndex(0)
        } else {
          setBuildingImages([])
        }
      } catch (error) {
        console.error('[PlaygroundDetail] 건물 사진 로드 오류:', error)
        setBuildingImages([])
      }
    }
    
    loadBuildingImages()
  }, [normalizedId])

  const handleRetry = () => {
    setDetail(sessionFallback ? { map: sessionFallback, raw: null } : null)
    setLoading(true)
    setError(null)
    setActiveTab('basic')
  }

  const facilityName = detail?.map?.name || '놀이시설 상세보기'
	const primaryTags = useMemo(() => {
		if (!detail) return []
		const rawTags = [
			detail.map.establishment || null,
			detail.map.officeedu || null,
			detail.raw?.instlPlaceCdNm || detail.raw?.instlPlaceCd || null,
		]
		const seen = new Set<string>()
		return rawTags
			.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
			.filter((tag) => {
				const trimmed = tag.trim()
				if (seen.has(trimmed)) return false
				seen.add(trimmed)
				return true
			})
	}, [detail])

	const shareUrl = useMemo(() => {
		if (typeof window === 'undefined') return ''
		try {
			return window.location.href
		} catch {
			return ''
		}
	}, [normalizedId, searchParamsKey])

	const handleBack = () => {
		const params = new URLSearchParams()
		params.set('type', 'playground')
		const regionCodeParam = searchParams.get('regionCode')
		const sggCodeParam = searchParams.get('sggCode')
		const sidoCodeParam = searchParams.get('sidoCode')
		if (regionCodeParam) params.set('regionCode', regionCodeParam)
		if (sggCodeParam) params.set('sggCode', sggCodeParam)
		if (sidoCodeParam) params.set('sidoCode', sidoCodeParam)
		if (normalizedId) params.set('selected', normalizedId)
		navigate(`/kindergarten-map?${params.toString()}`)
	}

	const handleGoWritePraise = () => {
		if (!currentUserId) {
			alert('로그인 후 이용해주세요.')
			return
		}
		try {
			const params = new URLSearchParams()
			if (detail?.map?.name) params.set('name', detail.map.name)
			if (detail?.map?.sidoCode) params.set('sidoCode', String(detail.map.sidoCode))
			if (detail?.map?.sggCode) params.set('sggCode', String(detail.map.sggCode))
			navigate(`/playground/${encodeURIComponent(normalizedId)}/review/write?${params.toString()}`)
		} catch {
			navigate(`/playground/${encodeURIComponent(normalizedId)}/review/write`)
		}
	}

	const handleGoAllPhotos = () => {
		try {
			const params = new URLSearchParams()
			if (detail?.map?.name) params.set('name', detail.map.name)
			if (detail?.map?.sidoCode) params.set('sidoCode', String(detail.map.sidoCode))
			if (detail?.map?.sggCode) params.set('sggCode', String(detail.map.sggCode))
			navigate(`/playground/${encodeURIComponent(normalizedId)}/review/photos?${params.toString()}`)
		} catch {
			navigate(`/playground/${encodeURIComponent(normalizedId)}/review/photos`)
		}
	}

	// 리뷰 이미지 전체보기 뷰어 핸들러
	const openImageViewer = (photos: string[], startIndex: number = 0, reviewId?: string, reviewIndex?: number) => {
		if (!photos || photos.length === 0) return
		setImageViewerPhotos(photos)
		setCurrentImageIndex(Math.min(Math.max(startIndex, 0), photos.length - 1))
		setShowImageViewer(true)
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

	const handleCopyLink = async () => {
		if (!shareUrl) return
		try {
			await navigator.clipboard.writeText(shareUrl)
			alert('링크가 클립보드에 복사되었습니다!')
		} catch (error) {
			console.error('링크 복사 실패:', error)
		} finally {
			setShowShareSheet(false)
		}
	}

	const handleNativeShare = async () => {
		if (!shareUrl) {
			setShowShareSheet(false)
			return
		}
		try {
			if (navigator.share) {
				await navigator.share({
					title: facilityName,
					text: `${facilityName} 상세 정보를 확인해보세요!`,
					url: shareUrl,
				})
				setShowShareSheet(false)
				return
			}
		} catch (error) {
			console.error('공유 실패:', error)
		}
		await handleCopyLink()
	}

	const handleEmailShare = () => {
		if (!shareUrl) return
		const subject = `맘픽 · ${facilityName} 정보 공유`
		const body = `${facilityName} 정보를 공유합니다.\n\n${shareUrl}`
		window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
		setShowShareSheet(false)
	}

	const handleBandShare = () => {
		if (!shareUrl) return
		const text = `${facilityName} 정보를 공유합니다.`
		const url = `https://band.us/plugin/share?body=${encodeURIComponent(text)}%0A${encodeURIComponent(shareUrl)}&route=${encodeURIComponent(shareUrl)}`
		window.open(url, '_blank')
		setShowShareSheet(false)
	}

	const handleSmsShare = () => {
		if (!shareUrl) return
		const body = `${facilityName} 정보를 공유합니다.\n\n${shareUrl}`
		window.location.href = `sms:?&body=${encodeURIComponent(body)}`
		setShowShareSheet(false)
	}

	const handleKakaoShare = async () => {
		const Kakao = (window as any)?.Kakao
		if (Kakao?.isInitialized?.() && Kakao?.Share) {
			try {
				await Kakao.Share.sendDefault({
					objectType: 'feed',
					content: {
						title: '맘픽 · 놀이시설',
						description: facilityName,
						imageUrl: `${window.location.origin}/headericon.png`,
						link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
					},
				})
				setShowShareSheet(false)
				return
			} catch (error) {
				console.warn('카카오 공유 실패, 기본 공유 시도:', error)
			}
		}
		await handleNativeShare()
	}

	const openShareSheet = () => {
		setShowShareSheet(true)
	}

	const handleContact = async () => {
		const rawTel = detail?.map?.telno || ''
		const sanitized = rawTel.replace(/[^0-9+]/g, '')
		if (!sanitized) {
			alert('등록된 연락처가 없습니다.')
			return
		}
		try {
			await navigator.clipboard.writeText(sanitized)
		} catch {
			// ignore clipboard failure
		}
		window.location.href = `tel:${sanitized}`
	}

	const handleToggleFavorite = async () => {
		if (!detail || !normalizedId) return
		if (!currentUserId) {
			alert('로그인 후 이용해주세요.')
			return
		}
		const next = !isFavorite
		setIsFavorite(next)
		try {
			if (next) {
				await addFavorite(currentUserId, 'playground', normalizedId, detail.map.name, {
					sidoCode: detail.map.sidoCode !== undefined ? detail.map.sidoCode : undefined,
					sggCode: detail.map.sggCode !== undefined ? detail.map.sggCode : undefined,
				})
				setShowHeartBurst(true)
				setTimeout(() => setShowHeartBurst(false), 700)
			} else {
				await removeFavorite(currentUserId, 'playground', normalizedId)
			}
		} catch (error: any) {
			console.error('찜하기 처리 오류:', error)
			setIsFavorite(!next)
			alert(`찜하기 처리 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`)
		}
	}

	const tabItems: Array<{ id: PlaygroundTab; icon: React.ComponentType<any>; label: string }> = [
		{ id: 'basic', icon: FileText, label: '상세' },
		{ id: 'praise', icon: Heart, label: '칭찬' },
	]

	const praiseTotal = reviewStats?.total_reviews ?? 0
	const praiseAverage = reviewStats?.average_rating ?? 0
	const praiseAverageDisplay = praiseTotal === 0 ? '0' : (Math.round(praiseAverage * 10) / 10).toFixed(1)
	const praiseDistribution = reviewStats?.rating_distribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

	useEffect(() => {
		let cancelled = false
		const run = async () => {
			if (!normalizedId || activeTab !== 'praise') return
			setReviewsLoading(true)
			try {
				const [stats, list] = await Promise.all([
					getPlaygroundReviewStats(normalizedId),
					getPlaygroundReviews(normalizedId, 1, 20),
				])
				if (!cancelled) {
					setReviewStats(stats)
					setReviews(list)
				}
				// 사용자 도움됨 목록 및 대기중인 삭제요청 확인 (profile ID 사용)
				try {
					if (currentUserId) {
						const { data: { user } } = await supabase.auth.getUser()
						if (user) {
							const { data: profileData, error: profileError } = await supabase
								.from('profiles')
								.select('id')
								.eq('auth_user_id', user.id)
								.single()
							
							if (!profileError && profileData) {
								const reviewIds = list.map(review => review.id)
								if (reviewIds.length > 0) {
									// 도움됨 목록 조회
									const { data: helpfulData, error } = await supabase
										.from('playground_review_helpful')
										.select('review_id')
										.eq('user_id', profileData.id) // profile ID 사용
										.in('review_id', reviewIds)
									
									if (!error && helpfulData && !cancelled) {
										const helpfulReviewIds = new Set(helpfulData.map(item => item.review_id))
										setHelpfulSet(helpfulReviewIds)
									}

									// 대기중인 삭제요청 확인 (본인 리뷰만)
									const ownReviewIds = list
										.filter(review => review.user_id === user.id)
										.map(review => review.id)
									
									if (ownReviewIds.length > 0) {
										const { data: deleteRequests, error: deleteRequestError } = await supabase
											.from('review_delete_requests')
											.select('review_id')
											.eq('review_type', 'playground')
											.eq('requester_id', profileData.id)
											.eq('status', 'pending')
											.in('review_id', ownReviewIds)
										
										if (!deleteRequestError && deleteRequests && !cancelled) {
											const pendingDeleteIds = new Set(deleteRequests.map(req => req.review_id))
											setPendingDeleteRequestReviewIds(pendingDeleteIds)
										}
									}
								}
							}
						}
					}
				} catch (e) {
					console.error('도움됨 리뷰 로드 오류:', e)
				}
			} catch (e) {
				if (!cancelled) {
					setReviewStats({ average_rating: 0, total_reviews: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
					setReviews([])
				}
			} finally {
				if (!cancelled) setReviewsLoading(false)
			}
		}
		run()
		return () => { cancelled = true }
	}, [normalizedId, currentUserId, activeTab])

	// 메뉴 외부 클릭 시 닫기
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showReviewMenu && !(event.target as Element).closest('.review-menu-container')) {
				setShowReviewMenu(null)
			}
		}
		if (showReviewMenu) {
			document.addEventListener('mousedown', handleClickOutside)
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [showReviewMenu])

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
					<p className="text-gray-600">놀이시설 불러오는 중입니다</p>
				</div>
			</div>
		)
	}

	if (error && !detail) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
				<div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
						<AlertCircle className="h-7 w-7 text-red-500" />
					</div>
					<h2 className="mt-4 text-lg font-semibold text-gray-900">놀이시설 정보를 불러오지 못했어요</h2>
					<p className="mt-2 text-sm text-gray-600">{error}</p>
					<button
						type="button"
						onClick={handleRetry}
						className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#fb8678] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e36d63]"
					>
						다시 시도하기
					</button>
				</div>
			</div>
		)
	}

	if (!detail) {
		return null
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
		setShowReviewMenu(null)
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
			await requestPlaygroundReviewDeletion(pendingDeleteReviewId, trimmedReason)
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

	// 리뷰 작성자 차단 (타인 리뷰에서만 노출)
	const handleBlockReviewAuthor = async (authorAuthUserId: string) => {
		if (!authorAuthUserId) return
		setPendingBlockUserId(authorAuthUserId)
		setShowBlockModal(true)
		setShowReviewMenu(null)
	}

	// 리뷰 신고 (간단 사유 입력)
	const handleReportReview = async (reviewId: string, authorAuthUserId: string) => {
		setPendingReport({ reviewId, authorAuthUserId })
		setShowReportModal(true)
		setShowReviewMenu(null)
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
				.eq('facility_type', 'playground')
				.eq('facility_code', normalizedId || '')
				.eq('target_type', 'playground_review')
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
			const facilityAddress = detail?.map?.address || null
			
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
					target_type: 'playground_review',
					target_id: pendingReport.reviewId,
					facility_type: 'playground',
					facility_code: normalizedId || null,
					facility_name: detail?.map?.name || null,
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

		// 건물사진 신고인 경우
		if (isBuildingImageReport) {
			try {
				setImageReportLoading(true)
				
				// 현재 보고 있는 이미지 URL 가져오기
				const reportedImageUrl = imageViewerPhotos[currentImageIndex] || null
				
				// 시설 주소 정보
				const facilityAddress = detail?.map?.address || null
				
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
						facility_type: 'playground',
						facility_code: normalizedId || null,
						facility_name: detail?.map?.name || null,
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
			const facilityAddress = detail?.map?.address || null
			
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
					target_type: 'playground_review_image',
					target_id: currentImageViewerReview.reviewId,
					facility_type: 'playground',
					facility_code: normalizedId || null,
					facility_name: detail?.map?.name || null,
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

	const handleToggleHelpful = async (reviewId: string) => {
		if (!currentUserId) {
			alert('로그인 후 이용해주세요.')
			return
		}
		const isCurrentlyHelpful = helpfulSet.has(reviewId)
		const newHelpfulSet = new Set(helpfulSet)

		if (isCurrentlyHelpful) {
			newHelpfulSet.delete(reviewId)
		} else {
			newHelpfulSet.add(reviewId)
		}
		setHelpfulSet(newHelpfulSet) // Optimistic UI update

		// Update reviews list helpful_count
		setReviews((prevReviews) =>
			prevReviews.map((review) =>
				review.id === reviewId
					? { ...review, helpful_count: (review.helpful_count || 0) + (isCurrentlyHelpful ? -1 : 1) }
					: review,
			),
		)

		try {
			// 알림 기능이 포함된 함수 사용
			const result = await togglePlaygroundReviewHelpfulWithNotification(
				reviewId,
				detail?.map?.name || '놀이시설',
			)
			// helpful_count 업데이트
			setReviews((prevReviews) =>
				prevReviews.map((review) =>
					review.id === reviewId ? { ...review, helpful_count: result.helpfulCount } : review,
				),
			)
			// helpfulSet 업데이트
			if (result.isHelpful) {
				setHelpfulSet((prev) => new Set(prev).add(reviewId))
			} else {
				setHelpfulSet((prev) => {
					const newSet = new Set(prev)
					newSet.delete(reviewId)
					return newSet
				})
			}
		} catch (error) {
			console.error('도움됨 토글 실패:', error)
			// Revert optimistic update on error
			setHelpfulSet(helpfulSet)
			setReviews((prevReviews) =>
				prevReviews.map((review) =>
					review.id === reviewId
						? { ...review, helpful_count: (review.helpful_count || 0) + (isCurrentlyHelpful ? 1 : -1) }
						: review,
				),
			)
			alert('도움됨 처리 중 오류가 발생했습니다.')
		}
	}

	return (
		<>
		<div className="min-h-screen bg-white">
			<div className="border-b border-gray-200 bg-white shadow-sm">
				<div className="flex items-center justify-between px-4 py-3">
					<button
						type="button"
						onClick={handleBack}
						className="rounded-lg p-2 transition-colors hover:bg-gray-100"
						aria-label="지도 페이지로 돌아가기"
					>
						<ChevronLeft className="h-5 w-5 text-gray-700" />
					</button>
					<h1
						className="mx-3 flex-1 break-words text-lg font-semibold text-gray-900 leading-tight"
						style={{
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden',
						}}
					>
						{facilityName}
					</h1>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowSourceInfo(true)}
							className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-[#fb8678]"
							title="정보 출처"
							aria-label="정보 출처 안내"
						>
							<Info className="h-4 w-4" />
						</button>
						{detail.map.establishment && (
							<span className="rounded-full bg-[#fb8678]/10 px-2 py-1 text-xs font-medium text-[#fb8678]">
								{detail.map.establishment}
							</span>
						)}
					</div>
				</div>
				<div className="flex">
					{tabItems.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setActiveTab(id)}
							className={`flex flex-1 items-center justify-center py-3 transition-colors ${
								activeTab === id ? 'border-b-2 border-[#fb8678] text-[#fb8678]' : 'text-gray-500 hover:text-gray-700'
							}`}
							aria-label={label}
						>
							<Icon className="h-5 w-5" />
						</button>
					))}
				</div>
			</div>

			{showSourceInfo && (
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
									onClick={() => setShowSourceInfo(false)}
									className="p-2 hover:bg-gray-100 rounded-full transition-colors"
									aria-label="정보 출처 닫기"
								>
									<X className="w-5 h-5 text-gray-500" />
								</button>
							</div>

							<div className="space-y-4">
								<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
									<div className="flex items-center mb-2">
										<div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
											<span className="text-white text-xs font-bold">i</span>
										</div>
										<span className="text-sm font-semibold text-blue-800">전국어린이놀이시설정보서비스</span>
									</div>
									<p className="text-xs text-blue-700 leading-relaxed mb-3">
										이 놀이시설 정보는 <strong>전국어린이놀이시설정보서비스</strong>에서 제공하는 데이터를 기반으로 수집·가공되었습니다.
										정기 동기화와 캐시를 통해 최신 정보를 제공하고 있습니다.
									</p>
									<div className="space-y-2">
										<div>
											<p className="text-xs font-medium text-blue-900">정확한 정보</p>
											<p className="text-[10px] text-blue-600">행정안전부에서 제공하는 공식 데이터</p>
										</div>
										<div>
											<p className="text-xs font-medium text-blue-900">정기 갱신</p>
											<p className="text-[10px] text-blue-600">스토리지 캐시와 동기화를 통해 최신 상태 유지</p>
										</div>
										<div>
											<p className="text-xs font-medium text-blue-900">신뢰할 수 있는 출처</p>
											<p className="text-[10px] text-blue-600">정부가 관리하는 어린이 놀이시설 안전관리 시스템</p>
										</div>
									</div>
								</div>

								<div className="rounded-lg border border-blue-100 bg-white/80 p-4">
									<h4 className="text-sm font-semibold text-blue-800">안전 관리 안내</h4>
									<p className="mt-2 text-xs leading-relaxed text-blue-700">
										공용 놀이시설은 지자체와 관리 주체가 정기적으로 안전 점검을 수행합니다. 시설 이용 시 안전 수칙을 확인하고,
										위험 요소가 발견되면 즉시 관할 지자체에 신고해 주세요.
									</p>
									<p className="mt-2 text-[10px] text-blue-500">자료 출처: 전국어린이놀이시설정보서비스</p>
								</div>
								<div className="bg-gray-50 rounded-xl p-4">
									<p className="text-xs text-gray-600 text-center">
										더 자세한 정보는 <strong>전국어린이놀이시설정보서비스</strong> 공식 사이트에서 확인하실 수 있습니다.
									</p>
								</div>
							</div>

							<div className="mt-6 flex gap-3">
								<button
									onClick={() => setShowSourceInfo(false)}
									className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
								>
									확인
								</button>
								<button
									onClick={() => {
										window.open('https://www.cpf.go.kr/cpf/', '_blank', 'noopener,noreferrer')
										setShowSourceInfo(false)
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

			{error && detail && (
				<div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600 shadow-sm">
					<strong className="font-semibold">알림:</strong> {error}
				</div>
			)}

			<div className="pb-16 bg-white">
				{activeTab === 'basic' && (
					<div className="space-y-4">
						<section className="overflow-hidden bg-white">
							<div className="relative h-40 overflow-hidden bg-gray-100">
								<div 
									className="relative h-full w-full cursor-pointer"
									onClick={() => {
										if (buildingImages.length > 0) {
											openImageViewer(buildingImages, currentBuildingImageIndex)
										}
									}}
								>
									{buildingImages.length > 0 ? (
										<>
											<img
												src={buildingImages[currentBuildingImageIndex]}
												alt={`${detail.map.name} 이미지 ${currentBuildingImageIndex + 1}`}
												className="h-full w-full object-cover"
											/>
											{buildingImages.length > 1 && (
												<>
													{/* 이미지 카운터 */}
													<div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
														{currentBuildingImageIndex + 1} / {buildingImages.length}
													</div>
													{/* 이전 버튼 */}
													<button
														onClick={(e) => {
															e.stopPropagation()
															setCurrentBuildingImageIndex((prev) => (prev - 1 + buildingImages.length) % buildingImages.length)
														}}
														className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
														aria-label="이전 사진"
													>
														<ChevronLeft className="w-4 h-4" />
													</button>
													{/* 다음 버튼 */}
													<button
														onClick={(e) => {
															e.stopPropagation()
															setCurrentBuildingImageIndex((prev) => (prev + 1) % buildingImages.length)
														}}
														className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
														aria-label="다음 사진"
													>
														<ChevronRight className="w-4 h-4" />
													</button>
													{/* 인디케이터 */}
													<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
														{buildingImages.map((_, idx) => (
															<button
																key={idx}
																onClick={(e) => {
																	e.stopPropagation()
																	setCurrentBuildingImageIndex(idx)
																}}
																className={`w-1.5 h-1.5 rounded-full transition-all ${
																	idx === currentBuildingImageIndex ? 'bg-white w-4' : 'bg-white/50'
																}`}
																aria-label={`사진 ${idx + 1}`}
															/>
														))}
													</div>
												</>
											)}
										</>
									) : detail.map.image ? (
										<img
											src={detail.map.image}
											alt={`${detail.map.name} 이미지`}
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
											<Camera className="h-8 w-8" />
											<span className="text-xs">등록된 사진이 없어요</span>
										</div>
									)}
								</div>
							</div>
							<div className="space-y-3 px-4 py-5">
								<h3 className="text-base font-semibold text-gray-900">상세 설명</h3>
								<div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
									<div className="bg-gray-50 px-3 py-2 text-center">
										<div className="text-xs text-gray-500 font-semibold">시설 기본 정보</div>
									</div>
									<div className="p-4 space-y-2 text-xs text-gray-600">
										<div className="flex items-start justify-between gap-3">
											<span className="text-gray-600">시설 위치</span>
											<span className="max-w-[65%] text-right font-semibold text-gray-900">
												{detail.map.address || '주소 정보가 등록되어 있지 않습니다.'}
											</span>
										</div>
										{detail.raw?.pfctSn && (
											<div className="flex items-center justify-between">
												<span className="text-gray-600">시설 고유번호</span>
												<span className="font-semibold text-gray-900">{detail.raw.pfctSn}</span>
											</div>
										)}
										<div className="flex items-center justify-between">
											<span className="text-gray-600">시설 유형</span>
											<span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
												{detail.raw?.wowaStylRideCdNm || detail.raw?.wowaStylRideCd || '미포함'}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-gray-600">설치 장소</span>
											<span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
												{detail.raw?.instlPlaceCdNm || detail.raw?.instlPlaceCd || '정보 없음'}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-gray-600">운영 상태</span>
											<span className="inline-flex items-center rounded-full bg-[#fb8678]/10 px-3 py-1 text-xs font-semibold text-[#fb8678]">
												{detail.raw?.operYnCdNm
													? `${detail.raw.operYnCdNm}${detail.raw?.prvtPblcYnCdNm ? ` • ${detail.raw.prvtPblcYnCdNm}` : ''}`
													: '정보 없음'}
											</span>
										</div>
									</div>
								</div>
							</div>
						</section>

					</div>
				)}

				{activeTab === 'praise' && (
					<div className="min-h-screen bg-white">
						<div className="px-4 py-4 border-b border-gray-100">
							<div className="mb-3">
								<h2 className="text-lg font-semibold text-gray-900">칭찬 ({praiseTotal})</h2>
							</div>
							<div className="flex items-center space-x-6">
								<div className="text-center">
									<div className="text-2xl font-bold text-gray-900">{praiseAverageDisplay}</div>
									<div className="flex items-center justify-center space-x-1">
										{[1, 2, 3, 4, 5].map((heart) => (
											<Heart
												key={heart}
												className={`w-4 h-4 ${heart <= Math.floor(praiseAverage) ? 'text-[#fb8678] fill-current' : 'text-gray-300'}`}
											/>
										))}
									</div>
									<div className="text-xs text-gray-500 mt-1">총 {praiseTotal}개</div>
								</div>
								<div className="flex-1 space-y-1">
									{[5, 4, 3, 2, 1].map((rating) => (
										<div key={rating} className="flex items-center space-x-2">
											<span className="text-xs text-gray-600 w-6 font-semibold">{rating}점</span>
											<Heart className="w-3 h-3 text-[#fb8678] fill-current" />
											<div className="flex-1 bg-gray-200 rounded-full h-1.5">
												<div
													className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
													style={{
														width: `${praiseTotal > 0 ? ((praiseDistribution as any)[rating] / praiseTotal) * 100 : 0}%`,
													}}
												></div>
											</div>
											<span className="text-[10px] text-gray-600 w-6 text-right">
												({(praiseDistribution as any)[rating]})
											</span>
										</div>
									))}
								</div>
							</div>
						</div>

						<div className="px-4 py-3 border-b border-gray-100">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-semibold text-gray-900">칭찬 사진</h3>
								{photoItems.length >= 5 && (
									<button onClick={handleGoAllPhotos} className="p-1 hover:bg-gray-100 rounded transition-colors" aria-label="칭찬 사진 전체보기">
										<ChevronRight className="w-4 h-4 text-gray-600" />
									</button>
								)}
							</div>
							<div className="flex space-x-3 overflow-x-auto">
								{photoItems.length === 0 ? (
									<div className="flex items-center justify-center w-full h-20 text-gray-500 text-sm">등록된 사진이 없습니다</div>
								) : (
									photoItems.slice(0, 4).map((p, idx) => {
										const allPhotoUrls = photoItems.map(item => item.image_url)
										// photoItems에서 현재 이미지가 속한 리뷰 찾기
										const reviewForPhoto = reviews.find((r: any) => 
											!r.is_hidden && r.images && r.images.some((img: any) => img.image_url === p.image_url)
										)
										const reviewIndex = reviewForPhoto ? reviews.findIndex((rev: any) => rev.id === reviewForPhoto.id) : -1
										return (
											<div 
												key={p.id} 
												className="flex-shrink-0 w-20 h-20 aspect-square bg-gray-100 rounded-lg relative overflow-hidden cursor-zoom-in"
												onClick={() => openImageViewer(allPhotoUrls, idx, reviewForPhoto?.id, reviewIndex >= 0 ? reviewIndex : undefined)}
											>
												<img src={p.image_url} alt={`칭찬 사진 ${idx + 1}`} className="w-full h-full object-cover" />
												<div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded">{`${Math.max(0, Math.min(5, Math.round(p.rating)))}점`}</div>
												{idx === 3 && photoItems.length > 4 && (
													<div className="absolute inset-0 bg-black/40 flex items-center justify-center">
														<span className="text-white text-sm font-semibold">+{photoItems.length - 4}</span>
													</div>
												)}
											</div>
										)
									})
								)}
							</div>
						</div>

						<div className="px-4 py-3">
							<div className="flex items-center space-x-4">
								<div className="flex space-x-2">
									<button
										onClick={() => setPraiseFilter('전체')}
										className={`px-3 py-1 text-sm rounded-full transition-colors ${
											praiseFilter === '전체' ? 'bg-[#fb8678] text-white' : 'text-gray-600 hover:bg-gray-100'
										}`}
									>
										전체
									</button>
									<button
										onClick={() => setPraiseFilter('최신순')}
										className={`px-3 py-1 text-sm rounded-full transition-colors ${
											praiseFilter === '최신순' ? 'bg-[#fb8678] text-white' : 'text-gray-600 hover:bg-gray-100'
										}`}
									>
										최신순
									</button>
								</div>
							</div>
						</div>

						<div className="divide-y divide-gray-100">
							{reviewsLoading ? (
								<div className="px-4 py-8 text-center text-gray-600">칭찬을 불러오는 중...</div>
							) : reviews.length === 0 ? (
								<div className="px-4 py-8 text-center">
									<p className="text-gray-600">아직 칭찬이 없습니다.</p>
									<p className="text-gray-500 text-sm">첫 번째 칭찬을 남겨보세요!</p>
								</div>
							) : (
								reviews.map((r) => {
									const name = (r.user_profile?.nickname || r.user_profile?.full_name || '익명') as string
									const initial = name.trim().charAt(0) || '👤'
									const avatarUrl = (r.user_profile as any)?.profile_image_url as string | undefined
									const childImages: string[] = (() => {
										const ci = (r.user_profile as any)?.children_info
										if (!ci) return []
										try {
											const arr = Array.isArray(ci) ? ci : []
											return arr.map((c: any) => c?.profile_image_url).filter((u: any) => typeof u === 'string' && u.length > 0)
										} catch { return [] }
									})()
									const formatDate = (d: string) => {
										try {
											const dt = new Date(d)
											const y = dt.getFullYear()
											const m = String(dt.getMonth() + 1).padStart(2, '0')
											const day = String(dt.getDate()).padStart(2, '0')
											return `${y}. ${m}. ${day}.`
										} catch { return d }
									}
									return (
										<div key={r.id} className="px-4 py-4">
											<div className="flex items-start justify-between mb-2">
												<div className="flex items-center space-x-3">
													<div className="relative">
														<div className="w-10 h-10 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
															{avatarUrl ? (
																<img src={avatarUrl} alt="프로필" className="w-full h-full object-cover" />
															) : (
																<span className="text-sm font-medium text-gray-600">{initial}</span>
															)}
														</div>
														<div className="absolute -bottom-1 -right-1 flex items-center flex-row-reverse">
															{childImages.length > 2 && (
																<div className="w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-400 flex items-center justify-center relative z-30">
																	<span className="text-white text-[7px] font-bold">+{childImages.length - 2}</span>
																</div>
															)}
															{childImages.length >= 2 && (
																<div className={`w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden relative z-20 ${childImages.length > 2 ? '-mr-[5px]' : ''}`}>
																	{childImages[1] ? (
																		<img src={childImages[1]} alt="자녀 프로필 2" className="w-full h-full object-cover" />
																	) : (
																		<span className="text-gray-400 text-[10px]">👤</span>
																	)}
																</div>
															)}
															<div className={`w-4 h-4 rounded-full border-[0.5px] border-white bg-gray-200 flex items-center justify-center overflow-hidden relative z-10 ${childImages.length >= 2 ? '-mr-[5px]' : ''}`}>
																{childImages[0] ? (
																	<img src={childImages[0]} alt="자녀 프로필" className="w-full h-full object-cover" />
																) : (
																	<span className="text-gray-400 text-[10px]">👤</span>
																)}
															</div>
														</div>
													</div>
													<div>
														<div className="font-semibold text-gray-900 text-sm">{name}</div>
														<div className="flex items-center space-x-2">
															<div className="flex items-center space-x-1">
																{[1,2,3,4,5].map((i) => (
																	<Heart key={i} className={`w-3 h-3 ${i <= (r.rating || 0) ? 'text-[#fb8678] fill-current' : 'text-gray-300'}`} />
																))}
															</div>
															<span className="text-xs text-gray-500">{formatDate(r.created_at)}</span>
														</div>
													</div>
												</div>
												<div className="relative review-menu-container">
													<button 
														onClick={() => toggleReviewMenu(r.id)}
														className="p-2 rounded-full hover:bg-[#fb8678]/10 transition-colors" 
														aria-label="칭찬 옵션"
													>
														<MoreHorizontal className="w-5 h-5 text-[#fb8678]" />
													</button>
													{showReviewMenu === r.id && (
														<div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 min-w-[120px]">
															{currentAuthUserId && r.user_id === currentAuthUserId ? (
															<button
																onClick={() => handleDeleteReviewClick(r.id)}
																disabled={pendingDeleteRequestReviewIds.has(r.id)}
																className={`w-full px-4 py-2 text-center text-sm ${
																	pendingDeleteRequestReviewIds.has(r.id)
																		? 'text-gray-400 cursor-not-allowed'
																		: 'text-red-600 hover:bg-red-50'
																}`}
															>
																{pendingDeleteRequestReviewIds.has(r.id) ? '삭제요청 대기중' : '삭제요청'}
															</button>
															) : (
																<>
																	<button
																		onClick={() => handleBlockReviewAuthor(r.user_id)}
																		className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
																	>
																		차단하기
																	</button>
																	<div className="border-t border-gray-200 mx-2"></div>
																	<button
																		onClick={() => handleReportReview(r.id, r.user_id)}
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

											<div className="text-gray-800 text-sm leading-relaxed mb-3 whitespace-pre-line">
												{r.is_hidden ? '관리자에 의해 숨김처리된 칭찬입니다.' : (r.content || '')}
											</div>
											{(r.images || []).length > 0 && (
												<div className="flex space-x-3 overflow-x-auto mb-3">
													{(r.images || []).map((img: any, imgIdx: number) => {
														const reviewImageUrls = (r.images || []).map((i: any) => i.image_url)
														const reviewIndex = reviews.findIndex((rev: any) => rev.id === r.id)
														return (
															<div 
																key={img.id} 
																className={`w-20 h-20 aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${r.is_hidden ? '' : 'cursor-zoom-in'}`}
																onClick={r.is_hidden ? undefined : () => openImageViewer(reviewImageUrls, imgIdx, r.id, reviewIndex)}
															>
																{r.is_hidden ? (
																	<div className="w-full h-full bg-gray-200 flex items-center justify-center">
																		<span className="text-gray-400 text-xs">숨김</span>
																	</div>
																) : (
																	<img src={img.image_url} alt="칭찬 이미지" className="w-full h-full object-cover" />
																)}
															</div>
														)
													})}
												</div>
											)}
											<div className="flex items-center">
												<button 
													onClick={() => handleToggleHelpful(r.id)} 
													className={`flex items-center space-x-1 transition-colors ${
														helpfulSet.has(r.id)
															? 'text-red-500 hover:text-red-600'
															: 'text-gray-500 hover:text-gray-700'
													}`}
												>
													<svg 
														className="w-4 h-4" 
														fill={helpfulSet.has(r.id) ? 'currentColor' : 'none'} 
														stroke="currentColor" 
														viewBox="0 0 24 24"
													>
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
													</svg>
													<span className="text-xs">도움됨 {r.helpful_count || 0}</span>
												</button>
											</div>
										</div>
									)
								})
							)}
						</div>
					</div>
				)}
			</div>

			{activeTab === 'praise' && (
				<button
					onClick={() => setShowReviewOptions(!showReviewOptions)}
					className={`fixed bottom-24 right-4 w-14 h-14 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center z-40 ${
						showReviewOptions ? 'bg-gray-500 hover:bg-gray-600' : 'bg-[#fb8678] hover:bg-[#fb8678]/90'
					}`}
					aria-label="칭찬 남기기"
				>
					<svg className={`w-6 h-6 transition-transform duration-200 ${showReviewOptions ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
					</svg>
				</button>
			)}

			{activeTab === 'praise' && showReviewOptions && (
				<div className="fixed bottom-40 right-4 bg-white rounded-2xl shadow-lg border border-gray-200 z-50 min-w-[160px]">
					<button
						onClick={() => {
							handleGoWritePraise()
							setShowReviewOptions(false)
						}}
						className="w-full px-4 py-2 text-[#fb8678] rounded-xl shadow-lg border border-[#fb8678]/20 hover:bg-[#fb8678]/10 transition-all duration-300 whitespace-nowrap font-semibold"
					>
						칭찬 남기기
					</button>
				</div>
			)}
			<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-20 flex items-center p-3">
				<div className="flex space-x-3 w-full">
					<button
						onClick={openShareSheet}
						className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
						aria-label="링크 공유"
					>
						<Share2 className="w-5 h-5" />
					</button>
					<button
						onClick={handleContact}
						className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
					>
						문의하기
					</button>
					<button
						onClick={handleToggleFavorite}
						className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
							isFavorite ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-[#fb8678] text-white hover:bg-[#fb8678]/90'
						}`}
					>
						<div className="relative">
							<Heart className={`w-5 h-5 ${isFavorite ? 'fill-current animate-heart-bounce' : ''}`} />
							{showHeartBurst && (
								<>
									<div className="heart-particle left-[-14px] text-red-400">❤</div>
									<div className="heart-particle left-0 text-pink-400" style={{ animationDelay: '60ms' }}>
										❤
									</div>
									<div className="heart-particle left-[14px] text-rose-400" style={{ animationDelay: '120ms' }}>
										❤
									</div>
								</>
							)}
						</div>
						<span>{isFavorite ? '찜완료' : '찜하기'}</span>
					</button>
				</div>
			</div>

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
								<div className="mt-1 text-xs text-gray-600 break-all bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{shareUrl}</div>
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
								<button onClick={handleNativeShare} className="w-1/4 flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
									<span className="w-10 h-10 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center text-lg font-bold">⋯</span>
									<span className="mt-2 text-xs text-gray-700">더보기</span>
								</button>
							</div>
						</div>
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
						// 건물사진 신고 버튼 (currentImageViewerReview가 null일 때)
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
											setIsBuildingImageReport(true)
											setImageReportType('wrong_purpose') // 건물사진 신고용 기본값 설정
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

			<div className="h-20 bg-white" />
		</div>

		{/* 삭제 확인 모달 */}
		{showDeleteConfirm && (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
				<div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
					<div className="mb-6">
						<h2 className="text-lg font-bold text-gray-900 mb-2 text-center">
							칭찬 삭제요청
						</h2>
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

		{/* 신고 모달 */}
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

		{/* 차단 확인 모달 */}
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

		{/* 이미지 신고 모달 */}
		{showImageReportModal && (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
				<div className="bg-white rounded-2xl p-4 max-w-lg w-full min-h-[500px] max-h-[95vh] flex flex-col">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-xl font-bold text-gray-900">
							{isBuildingImageReport ? '건물사진 신고' : '사진 신고'}
						</h3>
						<button
							onClick={() => {
								setShowImageReportModal(false)
								setImageReportReason('')
								setImageReportType('spam')
								setIsBuildingImageReport(false)
							}}
							className="p-2 rounded-full hover:bg-gray-100 transition-colors"
						>
							<X className="w-6 h-6 text-gray-500" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto mb-6">
						<p className="text-gray-600 text-sm mb-4">
							{isBuildingImageReport 
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
								{isBuildingImageReport ? (
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
								placeholder={isBuildingImageReport 
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
								setImageReportType('spam')
								setIsBuildingImageReport(false)
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
	</>
	)
}

export default PlaygroundDetailPage

