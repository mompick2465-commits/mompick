import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Edit, Camera, Save, X, Trash2, Grid, BookOpen, User, Heart, MessageCircle, MapPin, Star } from 'lucide-react'
import { supabase, uploadProfileImage, deleteProfileImage } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { listFavorites, removeFavorite, FavoriteTargetType } from '../utils/favorites'
import { getReviewStats } from '../utils/kindergartenReviewApi'
import { getChildcareReviewStats } from '../utils/childcareReviewApi'
import { getPlaygroundReviewStats } from '../utils/playgroundReviewApi'
import { regionCodes } from '../utils/kindergartenApi'

interface UserProfile {
  id: string
  email?: string
  phone?: string
  user_type: 'parent' | 'teacher'
  full_name: string
  auth_method: 'kakao' | 'google' | 'apple' | 'phone'
  nickname?: string
  profile_image_url?: string
  children_info?: Array<{
    name: string
    gender: string
    birth_date: string
    relationship: string
    profile_image_url?: string
  }>
  school_name?: string
  subject?: string
  experience_years?: number
  created_at: string
  updated_at: string
}

interface UserPost {
  id: string
  content: string
  images: string[]
  category: string
  created_at: string
  likes_count: number
  comments_count: number
}

interface UserComment {
  id: string
  content: string
  post_id: string
  created_at: string
}

const Profile = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingChildren, setIsEditingChildren] = useState(false)
  const [editData, setEditData] = useState<Partial<UserProfile>>({})
  const [editChildrenData, setEditChildrenData] = useState<Array<{
    name: string
    gender: string
    birth_date: string
    relationship: string
    profile_image_url?: string
    newProfileImage?: File | null
    newProfileImagePreview?: string
  }>>([])
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null)
  const [newProfileImagePreview, setNewProfileImagePreview] = useState<string>('')
  const [isProfileImageDeleted, setIsProfileImageDeleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showProfileSaveConfirm, setShowProfileSaveConfirm] = useState(false)
  const [originalProfileImage, setOriginalProfileImage] = useState<string | null | undefined>(null)
  
  // 카테고리 및 콘텐츠 관련 상태
  const [activeTab, setActiveTab] = useState<'posts' | 'info' | 'children'>('posts')
  const [userPosts, setUserPosts] = useState<UserPost[]>([])
  const [userComments, setUserComments] = useState<UserComment[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [favorites, setFavorites] = useState<Array<{
    id: string
    target_type: FavoriteTargetType
    target_id: string
    target_name: string
    created_at: string
    arcode?: string
    sido_code?: string
    sgg_code?: string
  }>>([])
  const [favoriteRegions, setFavoriteRegions] = useState<Record<string, string>>({})
  const [favoriteRatings, setFavoriteRatings] = useState<Record<string, number>>({})
  const [favoriteBuildingImages, setFavoriteBuildingImages] = useState<Record<string, string>>({})
  
  // 스와이프 관련 상태
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // 약관 철회 관련 상태
  const [showTermsWithdrawal, setShowTermsWithdrawal] = useState(false)
  const [showMarketingWithdrawal, setShowMarketingWithdrawal] = useState(false)
  const [dataSubTerms, setDataSubTerms] = useState({
    serviceOperation: false,
    userExperience: false,
    appStability: false,
    marketing: false,
    anonymousStats: false
  })
  const [marketingAgreed, setMarketingAgreed] = useState(false)
  const [loadingTerms, setLoadingTerms] = useState(false)

  // 차단 목록 관련 상태
  const [blockedUsers, setBlockedUsers] = useState<Array<{
    id: string
    blocked_user_id: string
    created_at: string
    profiles: {
      full_name: string
      nickname?: string
      profile_image_url?: string
    }
  }>>([])
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false)
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false)
  const [pendingUnblockUserId, setPendingUnblockUserId] = useState<string | null>(null)
  const [showAllBlockedUsers, setShowAllBlockedUsers] = useState(false)
  const [wasAllBlockedUsersOpen, setWasAllBlockedUsersOpen] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  // 성공 팝업과 확인 팝업이 열릴 때 배경 스크롤 비활성화
  useEffect(() => {
    if (successMessage || showSaveConfirm || showProfileSaveConfirm || showTermsWithdrawal || showMarketingWithdrawal || showUnblockConfirm || showAllBlockedUsers) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [successMessage, showSaveConfirm, showProfileSaveConfirm, showTermsWithdrawal, showMarketingWithdrawal, showUnblockConfirm, showAllBlockedUsers])

  useEffect(() => {
    if (profile) {
      fetchUserContent()
      fetchBlockedUsers()
    }
  }, [profile])

  // 차단 목록 가져오기
  const fetchBlockedUsers = async () => {
    try {
      setLoadingBlockedUsers(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 로컬 스토리지에서 전화번호 가입 사용자 확인
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      if (isLoggedIn === 'true') {
        // 전화번호 가입 사용자는 차단 기능을 사용하지 않음
        setBlockedUsers([])
        setLoadingBlockedUsers(false)
        return
      }

      const userIdToUse = user.id

      // 차단 목록 가져오기 (blocked_users 테이블에서 blocker_id로 조회)
      const { data: blockedData, error } = await supabase
        .from('blocked_users')
        .select('id, blocked_user_id, created_at')
        .eq('blocker_id', userIdToUse)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('차단 목록 조회 오류:', error)
        setBlockedUsers([])
        return
      }

      if (!blockedData || blockedData.length === 0) {
        setBlockedUsers([])
        return
      }

      // 각 차단된 사용자의 프로필 정보 가져오기
      const blockedUserIds = blockedData.map(item => item.blocked_user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('auth_user_id, full_name, nickname, profile_image_url')
        .in('auth_user_id', blockedUserIds)

      if (profilesError) {
        console.error('프로필 정보 조회 오류:', profilesError)
        // 프로필 정보가 없어도 차단 목록은 표시
        setBlockedUsers(blockedData.map(item => ({
          ...item,
          profiles: {
            full_name: '알 수 없음',
            nickname: undefined,
            profile_image_url: undefined
          }
        })))
        return
      }

      // 차단 목록과 프로필 정보 매칭
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.auth_user_id, profile])
      )

      const blockedUsersWithProfiles = blockedData.map(item => {
        const profile = profilesMap.get(item.blocked_user_id)
        return {
          ...item,
          profiles: profile ? {
            full_name: profile.full_name || '알 수 없음',
            nickname: profile.nickname,
            profile_image_url: profile.profile_image_url
          } : {
            full_name: '알 수 없음',
            nickname: undefined,
            profile_image_url: undefined
          }
        }
      })

      setBlockedUsers(blockedUsersWithProfiles)
    } catch (error) {
      console.error('차단 목록 조회 오류:', error)
      setBlockedUsers([])
    } finally {
      setLoadingBlockedUsers(false)
    }
  }

  // 차단 해제 처리
  const handleUnblockUser = async (blockedUserId: string) => {
    if (!blockedUserId) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('로그인이 필요합니다.')
        return
      }

      const userIdToUse = user.id

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', userIdToUse)
        .eq('blocked_user_id', blockedUserId)

      if (error) {
        console.error('차단 해제 오류:', error)
        alert('차단 해제 중 오류가 발생했습니다.')
        return
      }

      alert('차단이 해제되었습니다.')
      // 차단 목록 새로고침
      await fetchBlockedUsers()
      setShowUnblockConfirm(false)
      setPendingUnblockUserId(null)
      // 전체 목록 모달이 열려있었다면 다시 열기
      if (wasAllBlockedUsersOpen) {
        setShowAllBlockedUsers(true)
        setWasAllBlockedUsersOpen(false)
      }
    } catch (error) {
      console.error('차단 해제 오류:', error)
      alert('차단 해제 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const data = await listFavorites(user.id)
        setFavorites(data as any)
        // 모든 찜 목록에 대해 지역 정보, 평점, 건물 이미지 병렬 로드
        const top = (data || [])
        const results = await Promise.all(top.map(async (fav: any) => {
          try {
            let region = ''
            let rating = 0
            let buildingImage = ''
            
            if (fav.target_type === 'kindergarten') {
              // 지역 정보: sido_code, sgg_code를 이름으로 변환
              region = getRegionNameFromCode(fav.sido_code, fav.sgg_code)
              
              // 리뷰 평점만 조회
              try {
                const stats = await getReviewStats(String(fav.target_id))
                rating = stats.average_rating || 0
              } catch {}
              
              // 건물 이미지 조회 (kindergarten_custom_info 테이블)
              try {
                const { data: customInfo } = await supabase
                  .from('kindergarten_custom_info')
                  .select('building_images')
                  .eq('kinder_code', fav.target_id)
                  .maybeSingle()
                
                if (customInfo && customInfo.building_images && customInfo.building_images.length > 0) {
                  buildingImage = customInfo.building_images[0]
                }
              } catch {}
              
              return { id: fav.id, region, rating, buildingImage }
            } else if (fav.target_type === 'childcare') {
              // 지역 정보: arcode를 이름으로 변환
              region = getRegionNameFromCode(undefined, undefined, fav.arcode)
              
              // 리뷰 평점만 조회
              try {
                const stats = await getChildcareReviewStats(String(fav.target_id))
                rating = stats.average_rating || 0
              } catch {}
              
              // 건물 이미지 조회 (childcare_custom_info 테이블) - facility_code 컬럼 사용
              try {
                const { data: customInfo } = await supabase
                  .from('childcare_custom_info')
                  .select('building_images')
                  .eq('facility_code', fav.target_id)
                  .maybeSingle()
                
                if (customInfo && customInfo.building_images && customInfo.building_images.length > 0) {
                  buildingImage = customInfo.building_images[0]
                }
              } catch {}
              
              return { id: fav.id, region, rating, buildingImage }
            } else if (fav.target_type === 'playground') {
              // 지역 정보: sido_code, sgg_code를 이름으로 변환
              region = getRegionNameFromCode(fav.sido_code, fav.sgg_code)
              
              // 리뷰 평점만 조회
              try {
                const stats = await getPlaygroundReviewStats(String(fav.target_id))
                rating = stats.average_rating || 0
              } catch {}
              
              // 건물 이미지 조회 (playground_custom_info 테이블)
              try {
                const { data: customInfo } = await supabase
                  .from('playground_custom_info')
                  .select('building_images')
                  .eq('playground_id', fav.target_id)
                  .eq('is_active', true)
                  .maybeSingle()
                
                if (customInfo && customInfo.building_images && customInfo.building_images.length > 0) {
                  buildingImage = customInfo.building_images[0]
                }
              } catch {}
              
              return { id: fav.id, region, rating, buildingImage }
            }
          } catch {}
          return { id: fav.id, region: '', rating: 0, buildingImage: '' }
        }))
        setFavoriteRegions(prev => {
          const next = { ...prev }
          results.forEach(r => { if (r) next[r.id] = r.region })
          return next
        })
        setFavoriteRatings(prev => {
          const next = { ...prev }
          results.forEach(r => { if (r) next[r.id] = r.rating })
          return next
        })
        setFavoriteBuildingImages(prev => {
          const next = { ...prev }
          results.forEach(r => { if (r) next[r.id] = r.buildingImage })
          return next
        })
      } catch {}
    }
    loadFavorites()
  }, [])

  // 지역 코드를 이름으로 변환하는 함수
  const getRegionNameFromCode = (sidoCode?: string, sggCode?: string, arcode?: string): string => {
    try {
      // arcode를 사용하는 경우 (어린이집)
      if (arcode) {
        const code = parseInt(arcode)
        // arcode에서 sido 코드 추출 (앞 2자리)
        const sidoNum = Math.floor(code / 1000)
        
        // regionCodes에서 매칭되는 시도 찾기
        for (const [sidoName, sidoData] of Object.entries(regionCodes)) {
          if (sidoData.sidoCode === sidoNum) {
            // sggCodes에서 매칭되는 시군구 찾기
            for (const [sggName, sggCodeValue] of Object.entries(sidoData.sggCodes)) {
              if (sggCodeValue === code) {
                // "서울특별시" → "서울시" 간소화
                const shortSido = sidoName.replace('특별시', '시').replace('광역시', '시').replace('특별자치시', '시').replace('특별자치도', '도')
                return `${shortSido} ${sggName}`
              }
            }
          }
        }
      }
      
      // sidoCode와 sggCode를 사용하는 경우 (유치원)
      if (sidoCode && sggCode) {
        const sidoNum = parseInt(sidoCode)
        const sggNum = parseInt(sggCode)
        
        // regionCodes에서 매칭되는 시도 찾기
        for (const [sidoName, sidoData] of Object.entries(regionCodes)) {
          if (sidoData.sidoCode === sidoNum) {
            // sggCodes에서 매칭되는 시군구 찾기
            for (const [sggName, sggCodeValue] of Object.entries(sidoData.sggCodes)) {
              if (sggCodeValue === sggNum) {
                // "서울특별시" → "서울시" 간소화
                const shortSido = sidoName.replace('특별시', '시').replace('광역시', '시').replace('특별자치시', '시').replace('특별자치도', '도')
                return `${shortSido} ${sggName}`
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('지역 코드 변환 오류:', error)
    }
    
    return ''
  }

  const fetchUserContent = async () => {
    if (!profile) return
    
    setPostsLoading(true)
    try {
      // 사용자가 작성한 게시글 가져오기
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .eq('author_name', profile.nickname || profile.full_name)
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('게시글 조회 오류:', postsError)
        setUserPosts([])
      } else {
        // 모든 게시글 ID 수집
        const postIds = (postsData || []).map(post => post.id)
        
        if (postIds.length > 0) {
          try {
            // 한 번에 모든 게시글의 좋아요 수 가져오기
            const { data: likesData, error: likesError } = await supabase
              .from('post_likes')
              .select('post_id')
              .in('post_id', postIds)

            // 한 번에 모든 게시글의 댓글 수 가져오기
            const { data: commentsData, error: commentsError } = await supabase
              .from('comments')
              .select('post_id')
              .in('post_id', postIds)

            if (likesError) console.error('좋아요 수 조회 오류:', likesError)
            if (commentsError) console.error('댓글 수 조회 오류:', commentsError)

            // 좋아요 수와 댓글 수 계산
            const likesCountMap = new Map()
            const commentsCountMap = new Map()

            // 좋아요 수 집계
            if (likesData) {
              likesData.forEach(like => {
                likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1)
              })
            }

            // 댓글 수 집계
            if (commentsData) {
              commentsData.forEach(comment => {
                commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1)
              })
            }

            // 게시글에 카운트 정보 추가
            const postsWithCounts = (postsData || []).map(post => ({
              ...post,
              likes_count: likesCountMap.get(post.id) || 0,
              comments_count: commentsCountMap.get(post.id) || 0
            }))

            setUserPosts(postsWithCounts)
          } catch (error) {
            console.error('카운트 조회 오류:', error)
            // 카운트 조회에 실패한 경우 기존 데이터 사용
            setUserPosts(postsData || [])
          }
        } else {
          setUserPosts([])
        }
      }

      // 사용자가 작성한 댓글 가져오기
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('user_name', profile.nickname || profile.full_name)
        .order('created_at', { ascending: false })

      if (commentsError) {
        console.error('댓글 조회 오류:', commentsError)
        setUserComments([])
      } else {
        setUserComments(commentsData || [])
      }
    } catch (error) {
      console.error('사용자 콘텐츠 조회 오류:', error)
      setUserPosts([])
      setUserComments([])
    } finally {
      setPostsLoading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      // 먼저 로컬 스토리지에서 전화번호 가입 사용자 정보 확인
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      const userProfile = localStorage.getItem('userProfile')
      
      if (isLoggedIn === 'true' && userProfile) {
        // 전화번호 가입 사용자인 경우
        const profileData = JSON.parse(userProfile)
        setProfile(profileData)
        setEditData(profileData)
        setLoading(false)
        return
      }

      // OAuth 사용자인 경우 Supabase 세션 확인
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // profiles 테이블에서 사용자 정보 가져오기
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('프로필 조회 오류:', error)
        setError('프로필 정보를 불러올 수 없습니다.')
        return
      }

      if (profileData) {
        setProfile(profileData)
        setEditData(profileData)
      } else {
                 // profiles 테이블에 데이터가 없는 경우 user_metadata에서 기본 정보 가져오기
         // OAuth 제공자 정보 확인 (여러 방법으로 시도)
         let provider = user.app_metadata?.provider
         if (!provider) {
           provider = user.user_metadata?.provider
         }
         if (!provider) {
           const identities = user.app_metadata?.identities
           if (identities && identities.length > 0) {
             provider = identities[0]?.provider
           }
         }
         
         // provider를 유효한 auth_method 타입으로 변환
         let authMethod: 'kakao' | 'google' | 'apple' | 'phone' = 'phone'
         if (provider === 'kakao') {
           authMethod = 'kakao'
         } else if (provider === 'google') {
           authMethod = 'google'
         } else if (provider === 'apple') {
           authMethod = 'apple'
         }
         
         const basicProfile: UserProfile = {
           id: user.id,
           email: user.email || undefined,
           phone: user.phone || undefined,
           user_type: user.user_metadata?.user_type || 'parent',
           full_name: user.user_metadata?.full_name || '',
           auth_method: authMethod,
           nickname: user.user_metadata?.nickname || undefined,
           profile_image_url: undefined,
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         }
        setProfile(basicProfile)
        setEditData(basicProfile)
      }
    } catch (error) {
      console.error('프로필 조회 오류:', error)
      setError('프로필 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('프로필 사진은 5MB 이하로 업로드해주세요.')
        return
      }

      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.')
        return
      }

      setNewProfileImage(file)
      
      // 프로필 사진 자리에 바로 표시 (실제 저장은 저장 버튼 클릭 시에만)
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setProfile(prev => prev ? { ...prev, profile_image_url: imageUrl } : null)
        setNewProfileImagePreview(imageUrl)
      }
      reader.readAsDataURL(file)
      
      setError('')
    }
  }

  const handleProfileImageDelete = () => {
    setNewProfileImage(null)
    setNewProfileImagePreview('')
    setIsProfileImageDeleted(true)
    setError('')
  }

  const handleSave = () => {
    setShowProfileSaveConfirm(true)
  }

  const confirmProfileSave = async () => {
    if (!profile) return

    setSaving(true)
    setError('')
    setShowProfileSaveConfirm(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.')

      // 프로필 이미지 업로드 (새로운 이미지가 있는 경우)
      let profileImageUrl: string | null | undefined = profile.profile_image_url
      if (newProfileImage) {
        try {
          profileImageUrl = await uploadProfileImage(newProfileImage, user.id)
        } catch (error) {
          console.error('프로필 이미지 업로드 실패:', error)
          setError('프로필 이미지 업로드에 실패했습니다.')
          return
        }
      } else if (isProfileImageDeleted) {
        // 프로필 사진이 삭제된 경우 (null로 설정)
        profileImageUrl = null
      }

      // 사용자 메타데이터 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          user_type: editData.user_type,
          full_name: editData.full_name,
          nickname: editData.nickname
        }
      })

      if (updateError) throw updateError

      // profiles 테이블 업데이트
      const updateData = {
        ...editData,
        profile_image_url: profileImageUrl,
        updated_at: new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([updateData])

      if (profileError) throw profileError

      // 성공 시 프로필 정보 새로고침
      await fetchProfile()
      setIsEditing(false)
      setNewProfileImage(null)
      setNewProfileImagePreview('')
      setIsProfileImageDeleted(false)
      
    } catch (error: any) {
      console.error('프로필 저장 오류:', error)
      setError('프로필 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditData(profile || {})
    setNewProfileImage(null)
    setNewProfileImagePreview('')
    setIsProfileImageDeleted(false)
    setError('')
    
    // 프로필 사진을 원래대로 되돌리기
    if (profile) {
      setProfile(prev => prev ? { ...prev, profile_image_url: originalProfileImage || undefined } : null)
    }
    setOriginalProfileImage(null)
  }

  const handleSaveChildren = () => {
    setShowSaveConfirm(true)
  }

  const confirmSaveChildren = async () => {
    if (!profile) return

    setSaving(true)
    setError('')
    setShowSaveConfirm(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.')

      // 자녀 프로필 이미지 업로드 (새로 추가된 이미지가 있는 경우)
      const childrenWithImages = await Promise.all(
        editChildrenData.map(async (child, index) => {
          if (child.newProfileImage) {
            try {
              // 자녀별로 고유한 경로 생성: userId/children/childIndex_timestamp
              const timestamp = Date.now()
              const fileName = `${user.id}/children/${index}_${timestamp}`
              const { data, error } = await supabase.storage
                .from('profile-images')
                .upload(fileName, child.newProfileImage, {
                  cacheControl: '3600',
                  upsert: false
                })

              if (error) throw error

              // 공개 URL 가져오기
              const { data: { publicUrl } } = supabase.storage
                .from('profile-images')
                .getPublicUrl(fileName)

              return { ...child, profile_image_url: publicUrl, newProfileImage: undefined, newProfileImagePreview: undefined }
            } catch (error) {
              console.error(`자녀 ${index + 1} 프로필 이미지 업로드 실패:`, error)
              return child
            }
          }
          return child
        })
      )

      // profiles 테이블 업데이트 (자녀 정보 포함)
      const updateData = {
        ...profile,
        children_info: childrenWithImages.map(child => ({
          name: child.name,
          gender: child.gender,
          birth_date: child.birth_date,
          relationship: child.relationship,
          profile_image_url: child.profile_image_url || null
        })),
        updated_at: new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([updateData])

      if (profileError) throw profileError

      // 성공 시 프로필 정보 새로고침
      await fetchProfile()
      setIsEditingChildren(false)
      setSuccessMessage('자녀 정보가 성공적으로 저장되었습니다.')
      
      // 3초 후 성공 메시지 자동 제거
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
      
    } catch (error: any) {
      console.error('자녀 정보 저장 오류:', error)
      setError('자녀 정보 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelChildren = () => {
    setIsEditingChildren(false)
    setEditChildrenData(convertChildrenDataToKorean(profile?.children_info || []))
    setError('')
  }

  const handleAddChild = () => {
    const newChild = {
      name: '',
      gender: '',
      birth_date: '',
      relationship: '',
      profile_image_url: undefined,
      newProfileImage: null,
      newProfileImagePreview: undefined
    }
    setEditChildrenData([...editChildrenData, newChild])
  }

  const handleRemoveChild = (index: number) => {
    const updatedChildren = editChildrenData.filter((_, i) => i !== index)
    setEditChildrenData(updatedChildren)
  }

  const handleChildChange = (index: number, field: string, value: string) => {
    const updatedChildren = [...editChildrenData]
    updatedChildren[index] = { ...updatedChildren[index], [field]: value }
    setEditChildrenData(updatedChildren)
  }

  // 자녀 프로필 이미지 업로드 핸들러
  const handleChildProfileImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 파일 크기 검증 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        setError('프로필 사진은 5MB 이하로 업로드해주세요.')
        return
      }

      // 파일 타입 검증 (이미지 파일만)
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.')
        return
      }

      const updatedChildren = [...editChildrenData]
      updatedChildren[index] = { ...updatedChildren[index], newProfileImage: file }
      
      // 미리보기 생성
      const reader = new FileReader()
      reader.onload = (e) => {
        const children = [...editChildrenData]
        children[index] = { ...children[index], newProfileImage: file, newProfileImagePreview: e.target?.result as string }
        setEditChildrenData(children)
      }
      reader.readAsDataURL(file)
      
      setError('') // 에러 메시지 초기화
    }
  }

  // 자녀 프로필 이미지 제거 핸들러
  const handleRemoveChildProfileImage = (index: number) => {
    const updatedChildren = [...editChildrenData]
    updatedChildren[index] = { 
      ...updatedChildren[index], 
      newProfileImage: null, 
      newProfileImagePreview: undefined,
      profile_image_url: undefined
    }
    setEditChildrenData(updatedChildren)
  }

  // 성별을 한글로 변환하는 함수
  const getGenderInKorean = (gender: string): string => {
    const genderMap: { [key: string]: string } = {
      'male': '남아',
      'female': '여아',
      'boy': '남아',
      'girl': '여아',
      '남자': '남아',
      '여자': '여아',
      '남아': '남아',
      '여아': '여아'
    }
    return genderMap[gender] || gender
  }

  // 관계를 한글로 변환하는 함수 (학부모와 자녀의 관계)
  const getRelationshipInKorean = (relationship: string): string => {
    const relationshipMap: { [key: string]: string } = {
      'father': '아빠',
      'mother': '엄마',
      'grandfather': '할아버지',
      'grandmother': '할머니',
      'uncle': '삼촌',
      'aunt': '이모/고모',
      'other': '기타',
      '아빠': '아빠',
      '엄마': '엄마',
      '할아버지': '할아버지',
      '할머니': '할머니',
      '삼촌': '삼촌',
      '이모/고모': '이모/고모',
      '아들': '아들',
      '딸': '딸'
    }
    return relationshipMap[relationship] || relationship
  }

  // 자녀 정보 수정 모드로 전환 시 영어 값을 한글로 변환 (수정 폼용)
  const convertChildrenDataToKorean = (childrenInfo: any[]) => {
    return childrenInfo.map(child => {
      // 성별 변환 (수정 폼에서는 "남자", "여자" 사용)
      let gender = child.gender
      if (gender === 'male' || gender === 'boy' || gender === '남아') gender = '남자'
      if (gender === 'female' || gender === 'girl' || gender === '여아') gender = '여자'
      
      // 관계 변환
      const relationshipMap: { [key: string]: string } = {
        'father': '아빠',
        'mother': '엄마',
        'grandfather': '할아버지',
        'grandmother': '할머니',
        'uncle': '삼촌',
        'aunt': '이모/고모',
        'other': '기타'
      }
      const relationship = relationshipMap[child.relationship] || child.relationship
      
      return {
        ...child,
        gender,
        relationship
      }
    })
  }

  const handleContact = () => {
    navigate('/contact/list')
  }

  const handleLogout = async () => {
    try {
      // 커뮤니티 카테고리 정보 초기화
      localStorage.removeItem('selectedCommunityCategory')
      
      // 전화번호 가입 사용자인지 확인
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      const userProfile = localStorage.getItem('userProfile')
      
      if (isLoggedIn === 'true' && userProfile) {
        // 전화번호 가입 사용자인 경우 로컬 스토리지만 정리
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('userProfile')
        console.log('전화번호 가입 사용자 로그아웃 성공')
        navigate('/login')
        return
      }

      // OAuth 사용자인 경우 Supabase 세션 로그아웃
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('로그아웃 오류:', error)
        setError('로그아웃에 실패했습니다.')
      } else {
        console.log('OAuth 사용자 로그아웃 성공')
        navigate('/login')
      }
    } catch (error) {
      console.error('로그아웃 오류:', error)
      setError('로그아웃에 실패했습니다.')
    }
  }

  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (favId: string) => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    
    if (isLeftSwipe) {
      setSwipedItemId(favId)
    } else {
      setSwipedItemId(null)
    }
  }

  // 찜 삭제 핸들러
  const handleDeleteFavorite = async (fav: any) => {
    if (!window.confirm(`${fav.target_name || '이 시설'}을(를) 찜 목록에서 삭제하시겠습니까?`)) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await removeFavorite(user.id, fav.target_type, fav.target_id)
      
      // 로컬 상태 업데이트
      setFavorites(prev => prev.filter(f => f.id !== fav.id))
      setSwipedItemId(null)
      
      // 성공 메시지 (선택사항)
      // alert('찜 목록에서 삭제되었습니다.')
    } catch (error) {
      console.error('찜 삭제 오류:', error)
      alert('삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 약관 철회 팝업 열기
  const handleOpenTermsWithdrawal = async () => {
    setLoadingTerms(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('사용자 정보를 찾을 수 없습니다.')
        return
      }

      // 약관 동의 정보 가져오기
      const { data: termsData, error: termsError } = await supabase
        .from('user_terms_agreements')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (termsError) {
        console.error('약관 동의 정보 조회 오류:', termsError)
        setError('약관 동의 정보를 불러올 수 없습니다.')
        return
      }

      // 데이터 활용 동의 하위 항목 정보 설정
      if (termsData?.data_sub_terms) {
        setDataSubTerms({
          serviceOperation: termsData.data_sub_terms.serviceOperation || false,
          userExperience: termsData.data_sub_terms.userExperience || false,
          appStability: termsData.data_sub_terms.appStability || false,
          marketing: termsData.data_sub_terms.marketing || false,
          anonymousStats: termsData.data_sub_terms.anonymousStats || false
        })
      }

      setShowTermsWithdrawal(true)
    } catch (error) {
      console.error('약관 동의 정보 조회 오류:', error)
      setError('약관 동의 정보를 불러올 수 없습니다.')
    } finally {
      setLoadingTerms(false)
    }
  }

  // 약관 철회 저장
  const handleSaveTermsWithdrawal = async () => {
    setSaving(true)
    setError('')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('사용자 정보를 찾을 수 없습니다.')
        return
      }

      // 필수 항목 체크
      if (!dataSubTerms.serviceOperation) {
        setError('필수 항목(서비스 운영 및 기능 제공)은 해제할 수 없습니다.')
        setSaving(false)
        return
      }

      // 약관 동의 정보 업데이트
      const { error: updateError } = await supabase
        .from('user_terms_agreements')
        .upsert({
          user_id: user.id,
          data_sub_terms: {
            serviceOperation: dataSubTerms.serviceOperation,
            userExperience: dataSubTerms.userExperience,
            appStability: dataSubTerms.appStability,
            marketing: dataSubTerms.marketing,
            anonymousStats: dataSubTerms.anonymousStats
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (updateError) {
        console.error('약관 동의 정보 업데이트 오류:', updateError)
        setError('약관 동의 정보 업데이트에 실패했습니다.')
        return
      }

      setSuccessMessage('약관 동의 정보가 성공적으로 업데이트되었습니다.')
      setShowTermsWithdrawal(false)
      
      // 3초 후 성공 메시지 자동 제거
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      console.error('약관 동의 정보 업데이트 오류:', error)
      setError('약관 동의 정보 업데이트에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 데이터 활용 동의 하위 항목 핸들러
  const handleDataSubTermChange = (subTerm: 'serviceOperation' | 'userExperience' | 'appStability' | 'marketing' | 'anonymousStats', checked: boolean) => {
    // 필수 항목은 해제 불가
    if (subTerm === 'serviceOperation' && !checked) {
      setError('필수 항목은 해제할 수 없습니다.')
      return
    }
    setDataSubTerms(prev => ({ ...prev, [subTerm]: checked }))
    setError('')
  }

  // 마케팅 약관 철회 팝업 열기
  const handleOpenMarketingWithdrawal = async () => {
    setLoadingTerms(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('사용자 정보를 찾을 수 없습니다.')
        return
      }

      // 약관 동의 정보 가져오기
      const { data: termsData, error: termsError } = await supabase
        .from('user_terms_agreements')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (termsError) {
        console.error('약관 동의 정보 조회 오류:', termsError)
        setError('약관 동의 정보를 불러올 수 없습니다.')
        return
      }

      // 마케팅 약관 동의 정보 설정
      setMarketingAgreed(termsData?.marketing_agreed || false)

      setShowMarketingWithdrawal(true)
    } catch (error) {
      console.error('약관 동의 정보 조회 오류:', error)
      setError('약관 동의 정보를 불러올 수 없습니다.')
    } finally {
      setLoadingTerms(false)
    }
  }

  // 마케팅 약관 철회 저장
  const handleSaveMarketingWithdrawal = async () => {
    setSaving(true)
    setError('')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('사용자 정보를 찾을 수 없습니다.')
        return
      }

      // 약관 동의 정보 업데이트
      const { error: updateError } = await supabase
        .from('user_terms_agreements')
        .upsert({
          user_id: user.id,
          marketing_agreed: marketingAgreed,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (updateError) {
        console.error('약관 동의 정보 업데이트 오류:', updateError)
        setError('약관 동의 정보 업데이트에 실패했습니다.')
        return
      }

      setSuccessMessage('마케팅 정보 수신 동의가 성공적으로 업데이트되었습니다.')
      setShowMarketingWithdrawal(false)
      
      // 3초 후 성공 메시지 자동 제거
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      console.error('약관 동의 정보 업데이트 오류:', error)
      setError('약관 동의 정보 업데이트에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">프로필 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">프로필 정보를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate('/signup')}
            className="px-4 py-2 bg-[#fb8678] text-white rounded-lg hover:bg-[#e67567]"
          >
            프로필 설정하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/50 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (isEditingChildren) {
                  setIsEditingChildren(false)
                } else {
                  navigate('/main')
                }
              }}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">프로필</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        
         {/* 프로필 이미지 및 탭 섹션 */}
         {!isEditingChildren && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white rounded-2xl p-6 mb-3"
           >
               <div className="flex items-start space-x-6">
               <div className="relative flex-shrink-0">
                 <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-lg">
                   {(newProfileImagePreview || (profile.profile_image_url && !isProfileImageDeleted)) ? (
                     <img
                       src={newProfileImagePreview || profile.profile_image_url}
                       alt="프로필 사진"
                       className="w-full h-full object-cover"
                       onError={(e) => {
                         console.error('프로필 이미지 로딩 실패:', newProfileImagePreview || profile.profile_image_url)
                         e.currentTarget.style.display = 'none'
                         const parent = e.currentTarget.parentElement
                         if (parent) {
                           const fallback = parent.querySelector('.profile-fallback')
                           if (fallback) {
                             fallback.classList.remove('hidden')
                           }
                         }
                       }}
                     />
                   ) : null}
                   <div className={`w-full h-full bg-gray-100 flex items-center justify-center ${(newProfileImagePreview || (profile.profile_image_url && !isProfileImageDeleted)) ? 'hidden profile-fallback' : 'profile-fallback'}`}>
                     <span className="text-gray-600 text-3xl font-medium">
                       {(profile.nickname || profile.full_name).charAt(0)}
                     </span>
                   </div>
                 </div>
                 
                 {isEditing && (
                   <>
                     <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#fb8678] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#e67567] transition-colors">
                       <Camera className="w-4 h-4 text-white" />
                       <input
                         type="file"
                         accept="image/*"
                         onChange={handleProfileImageUpload}
                         className="hidden"
                       />
                     </label>
                     {profile.profile_image_url && !isProfileImageDeleted && (
                       <button
                         onClick={handleProfileImageDelete}
                         className="absolute top-0 right-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
                         title="프로필 사진 삭제"
                       >
                         <Trash2 className="w-4 h-4 text-white" />
                       </button>
                     )}
                   </>
                 )}
               </div>

               <div className="flex-1 min-w-0">
                 <h2 className="text-2xl font-bold text-gray-900 mb-2 min-h-[40px] flex items-center">
                   {profile.full_name}
                 </h2>
                 
                 <p className="text-gray-600 mb-1 min-h-[20px] flex items-center">
                   {profile.user_type === 'parent' ? '학부모' : '교사'}
                 </p>
                 
                 <p className="text-sm text-gray-500 min-h-[20px] flex items-center">
                   {profile.auth_method === 'kakao' ? '카카오톡' : 
                    profile.auth_method === 'google' ? '구글' :
                    profile.auth_method === 'apple' ? '애플' : '휴대폰'} 계정
                 </p>
               </div>

               <div className="flex space-x-2 flex-shrink-0">
                 {isEditing ? (
                   <div className="flex flex-col space-y-2">
                     <button
                       onClick={handleSave}
                       disabled={saving}
                       className="w-10 h-10 bg-[#fb8678] text-white rounded-full hover:bg-[#e67567] disabled:opacity-50 flex items-center justify-center transition-colors"
                       title="저장"
                     >
                       <Save className="w-5 h-5" />
                     </button>
                     <button
                       onClick={handleCancel}
                       className="w-10 h-10 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors flex items-center justify-center"
                       title="취소"
                     >
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                 ) : (
                   // 편집 버튼은 기본정보 탭에서만 표시
                   activeTab === 'info' && (
                     <button
                       onClick={() => {
                         setOriginalProfileImage(profile?.profile_image_url)
                         setIsEditing(true)
                       }}
                       className="w-10 h-10 bg-[#fb8678] text-white rounded-full hover:bg-[#e67567] flex items-center justify-center"
                       title="편집"
                     >
                       <Edit className="w-5 h-5" />
                     </button>
                   )
                 )}
               </div>
             </div>

           </motion.div>
         )}

        {/* 탭 섹션 */}
        {!isEditingChildren && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl mb-3"
          >
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 flex flex-col items-center justify-center space-y-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'posts'
                    ? 'bg-white text-[#fb8678] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 flex flex-col items-center justify-center space-y-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'info'
                    ? 'bg-white text-[#fb8678] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTab('children')}
                className={`flex-1 flex flex-col items-center justify-center space-y-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'children'
                    ? 'bg-white text-[#fb8678] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* 찜한 유치원/어린이집 섹션 - 탭 아래 (내 글 탭에서만 표시) */}
        {!isEditingChildren && activeTab === 'posts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* 작은 헤더 */}
            <div className="bg-gray-50 px-2 py-1 text-center">
              <div className="text-xs text-gray-500 font-semibold flex items-center justify-center space-x-1">
                <Heart className="w-3 h-3 text-[#fb8678] fill-current" />
                <span>내 찜</span>
              </div>
            </div>

            <div className="p-3">
              <div className="bg-white rounded-lg">
                {favorites.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs font-medium text-gray-900">아직 찜한 시설이 없습니다.</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">관심있는 유치원/어린이집을 찜해 보세요.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {favorites.slice(0, 3).map((fav) => (
                      <div
                        key={fav.id}
                        className="relative overflow-hidden rounded-2xl"
                      >
                        {/* 삭제 버튼 배경 - 카드보다 넓게 */}
                        {swipedItemId === fav.id && (
                          <div className="absolute -right-4 top-0 bottom-0 w-28 bg-red-500 flex items-center justify-center rounded-r-2xl">
                            <Trash2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                        
                        {/* 스와이프 가능한 카드 */}
                        <div
                          className="w-full bg-white border border-gray-100 rounded-2xl p-3 transition-transform duration-200 relative z-10"
                          style={{
                            transform: swipedItemId === fav.id ? 'translateX(-80px)' : 'translateX(0)',
                          }}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={() => handleTouchEnd(fav.id)}
                          onClick={() => {
                            if (swipedItemId === fav.id) {
                              setSwipedItemId(null)
                            }
                          }}
                        >
                          <div className="flex items-center">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                              {favoriteBuildingImages[fav.id] ? (
                                <img 
                                  src={favoriteBuildingImages[fav.id]} 
                                  alt={fav.target_name || '시설 사진'} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <BookOpen className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-gray-900 truncate">{fav.target_name || fav.target_id}</div>
                              <div className="flex items-center space-x-1 mt-1 min-w-0">
                                <MapPin className="w-3 h-3 text-[#fb8678] flex-shrink-0" />
                                <span className="text-[10px] text-gray-500 truncate">{favoriteRegions[fav.id] || ''}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">
                                {fav.target_type === 'kindergarten' ? '유치원' : fav.target_type === 'childcare' ? '어린이집' : fav.target_type === 'playground' ? '놀이시설' : fav.target_type}
                              </div>
                            </div>
                            {/* rating badge */}
                            {(fav.target_type === 'kindergarten' || fav.target_type === 'childcare' || fav.target_type === 'playground') && (
                              <div className="ml-3 flex items-center px-2 py-0.5 bg-black/80 border border-white rounded-xl">
                                <Heart className="w-3 h-3 text-[#fb8678] fill-current mr-1" />
                                <span className="text-white text-[11px] font-bold">{(favoriteRatings[fav.id] || 0).toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 삭제 버튼 영역 */}
                        {swipedItemId === fav.id && (
                          <button
                            onClick={() => handleDeleteFavorite(fav)}
                            className="absolute -right-4 top-0 bottom-0 w-28 bg-red-500 rounded-r-2xl flex items-center justify-center active:bg-red-600"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                    {favorites.length > 3 && (
                      <button
                        onClick={() => navigate('/profile/favorites')}
                        className="w-full bg-white border border-gray-100 rounded-2xl p-3 hover:bg-gray-50 transition-colors"
                        aria-label="찜 목록 전체 보기"
                      >
                        <div className="flex items-center justify-center">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-2xl text-gray-400 font-semibold">+</span>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-xs font-semibold text-gray-700">더 보기</div>
                            <div className="text-[10px] text-gray-500 mt-1">총 {favorites.length}개의 찜한 시설</div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 기본 정보 섹션 */}
        {!isEditingChildren && activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* 작은 헤더 */}
            <div className="bg-gray-50 px-2 py-1 text-center">
              <div className="text-xs text-gray-500 font-semibold">기본 정보</div>
            </div>
            
            <div className="p-3">
              <div className="bg-white rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500 font-semibold">이름</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.full_name || ''}
                        onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                        className="w-32 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    ) : (
                      <span className="text-gray-900 font-medium">{profile.full_name}</span>
                    )}
                  </div>

                  {profile.user_type === 'parent' && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-500 font-semibold">닉네임</span>
                      <span className="text-gray-900 font-medium">{profile.nickname || '-'}</span>
                    </div>
                  )}

                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500 font-semibold">이메일</span>
                    <span className="text-gray-900 font-medium">{profile.email || '-'}</span>
                  </div>

                   <div className="flex justify-between">
                     <span className="text-gray-500 font-semibold">계정 유형</span>
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                       profile.user_type === 'parent' 
                         ? 'bg-blue-100 text-blue-800' 
                         : 'bg-green-100 text-green-800'
                     }`}>
                       {profile.user_type === 'parent' ? '학부모' : '교사'}
                     </span>
                   </div>

                   <div className="flex justify-between">
                     <span className="text-gray-500 font-semibold">가입 방법</span>
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                       profile.auth_method === 'kakao' 
                         ? 'bg-yellow-100 text-yellow-800'
                         : profile.auth_method === 'google'
                         ? 'bg-red-100 text-red-800'
                         : profile.auth_method === 'apple'
                         ? 'bg-black text-white'
                         : 'bg-gray-100 text-gray-800'
                     }`}>
                       {profile.auth_method === 'kakao' ? '카카오톡' : 
                        profile.auth_method === 'google' ? '구글' :
                        profile.auth_method === 'apple' ? '애플' : '휴대폰 번호'}
                     </span>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 내 글 탭 콘텐츠 */}
        {!isEditingChildren && activeTab === 'posts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* 작은 헤더 */}
            <div className="bg-gray-50 px-2 py-1 text-center">
              <div className="text-xs text-gray-500 font-semibold">내가 작성한 글</div>
            </div>
            
            <div className="p-3">
              <div className="bg-white rounded-lg p-3">
            
            {postsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
                <p className="text-gray-600">글을 불러오는 중...</p>
              </div>
            ) : userPosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs font-medium text-gray-900">아직 작성한 글이 없습니다.</p>
                <p className="text-[10px] text-gray-500 mt-0.5">커뮤니티에 글을 작성해보세요!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {userPosts.slice(0, 5).map((post) => (
                  <div 
                    key={post.id} 
                    className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative group cursor-pointer"
                    onClick={() => navigate(`/community/post/${post.id}?category=${encodeURIComponent(post.category)}`, { 
                      state: { from: '/profile' } 
                    })}
                  >
                    {post.images && post.images.length > 0 ? (
                      <img
                        src={post.images[0]}
                        alt="게시글 이미지"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    
                                         {/* 하트 수와 댓글 수 표시 (항상 보임) */}
                     <div className="absolute bottom-2 left-2 right-2">
                       <div className="flex items-center justify-between bg-black/60 backdrop-blur-sm rounded-xl px-2 py-1">
                         <div className="flex items-center space-x-1">
                           <Heart className="w-3 h-3 text-red-400 fill-current" />
                           <span className="text-white text-xs font-medium">{post.likes_count}</span>
                         </div>
                         <div className="flex items-center space-x-1">
                           <MessageCircle className="w-3 h-3 text-blue-400" />
                           <span className="text-white text-xs font-medium">{post.comments_count}</span>
                         </div>
                       </div>
                     </div>
                     
                     {/* 호버 시 오버레이 정보 */}
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-end">
                       <div className="w-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                         <div className="text-center">
                           <p className="text-xs font-medium">클릭하여 보기</p>
                         </div>
                       </div>
                     </div>
                  </div>
                ))}
                {userPosts.length > 5 && (
                  <button
                    onClick={() => navigate('/profile/posts')}
                    className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative group cursor-pointer flex items-center justify-center"
                    aria-label="내가 작성한 글 전체 보기"
                  >
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
                      <span className="text-3xl text-gray-400 font-semibold">+</span>
                    </div>
                  </button>
                )}
              </div>
            )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 자녀 정보 탭 콘텐츠 */}
        {activeTab === 'children' && profile.children_info && profile.children_info.length > 0 && (
          <div className="space-y-2">
            {!isEditingChildren ? (
              // 조회 모드: 각 자녀를 별도 카드로 표시
              profile.children_info?.map((child, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* 헤더 */}
                  <div className="bg-gray-50 px-2 py-1 relative flex items-center justify-center">
                    <div className="text-xs text-gray-500 font-semibold">
                      {index === 0 ? '첫 번째 자녀 정보' : `${index + 1}번째 자녀 정보`}
                    </div>
                    {index === 0 && (
                      <button
                        onClick={() => {
                          setIsEditingChildren(true)
                          setEditChildrenData(convertChildrenDataToKorean(profile.children_info || []))
                        }}
                        className="absolute right-2 px-2 py-0.5 bg-[#fb8678] text-white text-xs rounded hover:bg-[#e67567] transition-colors"
                      >
                        수정
                      </button>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="bg-white rounded-lg">
                      {/* 자녀 프로필 사진 */}
                      <div className="flex justify-center mb-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                          {child.profile_image_url ? (
                            <img 
                              src={child.profile_image_url} 
                              alt={`${child.name} 프로필`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-500 font-semibold">이름</span>
                          <span className="text-gray-900 font-medium">{child.name}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-500 font-semibold">성별</span>
                          <span className="text-gray-900 font-medium">{getGenderInKorean(child.gender)}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-500 font-semibold">생년월일</span>
                          <span className="text-gray-900 font-medium">{child.birth_date}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-500 font-semibold">보호자 관계</span>
                          <span className="text-gray-900 font-medium">{getRelationshipInKorean(child.relationship)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              // 수정 모드
              <>
                {/* 저장/취소 버튼 */}
                <div className="flex justify-end space-x-2 mb-2">
                  <button
                    onClick={handleSaveChildren}
                    disabled={saving}
                    className="px-4 py-2 bg-[#fb8678] text-white text-sm rounded-lg hover:bg-[#e67567] disabled:opacity-50 transition-colors"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleCancelChildren}
                    className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                </div>
                
                {/* 각 자녀 카드 */}
                      {editChildrenData.map((child, index) => (
                        <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          {/* 헤더 */}
                          <div className="bg-gray-50 px-3 py-2 relative flex items-center justify-center">
                            <div className="text-xs text-gray-500 font-semibold">
                              {index === 0 ? '첫 번째 자녀 정보' : `${index + 1}번째 자녀 정보`}
                            </div>
                            <button
                              onClick={() => handleRemoveChild(index)}
                              className="absolute right-3 text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              제거
                            </button>
                          </div>
                          
                          {/* 입력 필드들 */}
                          <div className="p-3">
                            <div className="bg-white rounded-lg overflow-hidden">
                              {/* 자녀 프로필 사진 */}
                              <div className="flex justify-center mb-3">
                                <div className="relative">
                                  <div 
                                    className="w-20 h-20 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden"
                                    onClick={() => document.getElementById(`edit-child-profile-image-${index}`)?.click()}
                                  >
                                    {child.newProfileImagePreview ? (
                                      <img 
                                        src={child.newProfileImagePreview} 
                                        alt={`${child.name} 프로필`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : child.profile_image_url ? (
                                      <img 
                                        src={child.profile_image_url} 
                                        alt={`${child.name} 프로필`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    )}
                                  </div>
                                  
                                  {/* 사진 제거 버튼 */}
                                  {(child.newProfileImagePreview || child.profile_image_url) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveChildProfileImage(index)
                                      }}
                                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                
                                {/* 숨겨진 파일 입력 */}
                                <input
                                  id={`edit-child-profile-image-${index}`}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleChildProfileImageUpload(index, e)}
                                  className="hidden"
                                />
                              </div>

                              <div className="space-y-3 text-xs overflow-hidden">
                                {/* 이름 */}
                                <div>
                                  <label className="block text-gray-500 font-semibold mb-1">이름</label>
                                  <input
                                    type="text"
                                    placeholder="자녀 이름 *"
                                    value={child.name}
                                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                                  />
                                </div>

                                {/* 성별 */}
                                <div>
                                  <label className="block text-gray-500 font-semibold mb-1">성별</label>
                                  <select
                                    value={child.gender}
                                    onChange={(e) => handleChildChange(index, 'gender', e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs appearance-none"
                                  >
                                    <option value="">성별 선택 *</option>
                                    <option value="남자">남아</option>
                                    <option value="여자">여아</option>
                                  </select>
                                </div>

                                {/* 생년월일 */}
                                <div className="w-full overflow-hidden">
                                  <label className="block text-gray-500 font-semibold mb-1">생년월일</label>
                                  <input
                                    type="date"
                                    value={child.birth_date}
                                    onChange={(e) => handleChildChange(index, 'birth_date', e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                                    style={{ 
                                      width: '100%',
                                      maxWidth: '100%',
                                      minWidth: 0,
                                      boxSizing: 'border-box',
                                      WebkitAppearance: 'none',
                                      appearance: 'none'
                                    }}
                                  />
                                </div>

                                {/* 보호자 관계 */}
                                <div>
                                  <label className="block text-gray-500 font-semibold mb-1">보호자 관계</label>
                                  <select
                                    value={child.relationship}
                                    onChange={(e) => handleChildChange(index, 'relationship', e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs appearance-none"
                                  >
                                    <option value="">선택해주세요</option>
                                    <option value="아빠">아빠</option>
                                    <option value="엄마">엄마</option>
                                    <option value="할아버지">할아버지</option>
                                    <option value="할머니">할머니</option>
                                    <option value="삼촌">삼촌</option>
                                    <option value="이모/고모">이모/고모</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                ))}
                
                <button
                  onClick={handleAddChild}
                  className="w-full text-sm text-[#fb8678] hover:text-[#e67567] font-medium py-2 border border-[#fb8678] rounded-lg hover:bg-[#fb8678] hover:text-white transition-colors"
                >
                  + 자녀 추가하기
                </button>
              </>
            )}
          </div>
        )}

        {/* 자녀 정보가 없는 경우 (학부모) */}
        {profile.user_type === 'parent' && (!profile.children_info || profile.children_info.length === 0) && !isEditing && activeTab === 'children' && (
          <div className="space-y-2">
            {!isEditingChildren ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* 작은 헤더 */}
                <div className="bg-gray-50 px-2 py-1 relative flex items-center justify-center">
                  <div className="text-xs text-gray-500 font-semibold">자녀 정보</div>
                  <button
                    onClick={() => {
                      setIsEditingChildren(true)
                      setEditChildrenData([])
                    }}
                    className="absolute right-2 px-2 py-0.5 bg-[#fb8678] text-white text-xs rounded hover:bg-[#e67567] transition-colors"
                  >
                    추가
                  </button>
                </div>
                
                <div className="p-3">
                  <div className="bg-white rounded-lg">
                    <div className="text-center py-8">
                      <p className="text-gray-600 text-sm">등록된 자녀 정보가 없습니다.</p>
                      <p className="text-gray-500 text-xs mt-1">자녀 정보를 추가해주세요.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              // 수정 모드
              <>
                {/* 저장/취소 버튼 */}
                <div className="flex justify-end space-x-2 mb-2">
                  <button
                    onClick={handleSaveChildren}
                    disabled={saving}
                    className="px-4 py-2 bg-[#fb8678] text-white text-sm rounded-lg hover:bg-[#e67567] disabled:opacity-50 transition-colors"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleCancelChildren}
                    className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                </div>

                {/* 각 자녀 카드 */}
                {editChildrenData.map((child, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-2">
                    {/* 헤더 */}
                    <div className="bg-gray-50 px-3 py-2 relative flex items-center justify-center">
                      <div className="text-xs text-gray-500 font-semibold">
                        {index === 0 ? '첫 번째 자녀 정보' : `${index + 1}번째 자녀 정보`}
                      </div>
                      <button
                        onClick={() => handleRemoveChild(index)}
                        className="absolute right-3 text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        제거
                      </button>
                    </div>
                    
                    {/* 입력 필드들 */}
                    <div className="p-3">
                      <div className="bg-white rounded-lg overflow-hidden">
                        {/* 자녀 프로필 사진 */}
                        <div className="flex justify-center mb-3">
                          <div className="relative">
                            <div 
                              className="w-20 h-20 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden"
                              onClick={() => document.getElementById(`edit-child-profile-image-empty-${index}`)?.click()}
                            >
                              {child.newProfileImagePreview ? (
                                <img 
                                  src={child.newProfileImagePreview} 
                                  alt={`${child.name} 프로필`}
                                  className="w-full h-full object-cover"
                                />
                              ) : child.profile_image_url ? (
                                <img 
                                  src={child.profile_image_url} 
                                  alt={`${child.name} 프로필`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                            </div>
                            
                            {/* 사진 제거 버튼 */}
                            {(child.newProfileImagePreview || child.profile_image_url) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveChildProfileImage(index)
                                }}
                                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          {/* 숨겨진 파일 입력 */}
                          <input
                            id={`edit-child-profile-image-empty-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleChildProfileImageUpload(index, e)}
                            className="hidden"
                          />
                        </div>

                        <div className="space-y-3 text-xs overflow-hidden">
                          {/* 이름 */}
                          <div>
                            <label className="block text-gray-500 font-semibold mb-1">이름</label>
                            <input
                              type="text"
                              placeholder="자녀 이름 *"
                              value={child.name}
                              onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                            />
                          </div>

                          {/* 성별 */}
                          <div>
                            <label className="block text-gray-500 font-semibold mb-1">성별</label>
                            <select
                              value={child.gender}
                              onChange={(e) => handleChildChange(index, 'gender', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs appearance-none"
                            >
                              <option value="">성별 선택 *</option>
                              <option value="남자">남아</option>
                              <option value="여자">여아</option>
                            </select>
                          </div>

                          {/* 생년월일 */}
                          <div className="w-full overflow-hidden">
                            <label className="block text-gray-500 font-semibold mb-1">생년월일</label>
                            <input
                              type="date"
                              value={child.birth_date}
                              onChange={(e) => handleChildChange(index, 'birth_date', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
                              style={{ 
                                width: '100%',
                                maxWidth: '100%',
                                minWidth: 0,
                                boxSizing: 'border-box',
                                WebkitAppearance: 'none',
                                appearance: 'none'
                              }}
                            />
                          </div>

                          {/* 보호자 관계 */}
                          <div>
                            <label className="block text-gray-500 font-semibold mb-1">보호자 관계</label>
                            <select
                              value={child.relationship}
                              onChange={(e) => handleChildChange(index, 'relationship', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs appearance-none"
                            >
                              <option value="">선택해주세요</option>
                              <option value="아빠">아빠</option>
                              <option value="엄마">엄마</option>
                              <option value="할아버지">할아버지</option>
                              <option value="할머니">할머니</option>
                              <option value="삼촌">삼촌</option>
                              <option value="이모/고모">이모/고모</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={handleAddChild}
                  className="w-full text-sm text-[#fb8678] hover:text-[#e67567] font-medium py-2 border border-[#fb8678] rounded-lg hover:bg-[#fb8678] hover:text-white transition-colors"
                >
                  + 자녀 추가하기
                </button>
              </>
            )}
          </div>
        )}

        {/* 교사 전용 정보 */}
        {profile.user_type === 'teacher' && !isEditing && !isEditingChildren && activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* 작은 헤더 */}
            <div className="bg-gray-50 px-2 py-1 text-center">
              <div className="text-xs text-gray-500 font-semibold">교사 정보</div>
            </div>
            
            <div className="p-3">
              <div className="bg-white rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500 font-semibold">소속 기관명</span>
                    <span className="text-gray-900 font-medium">{profile.school_name || '-'}</span>
                  </div>

                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500 font-semibold">담당 반/학급</span>
                    <span className="text-gray-900 font-medium">{profile.subject || '-'}</span>
                  </div>

                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500 font-semibold">경력 연차</span>
                    <span className="text-gray-900 font-medium">{profile.experience_years || 0}년</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

         {/* 계정 정보 */}
         {!isEditing && !isEditingChildren && activeTab === 'info' && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
           >
             {/* 작은 헤더 */}
             <div className="bg-gray-50 px-2 py-1 text-center">
               <div className="text-xs text-gray-500 font-semibold">계정 정보</div>
             </div>
             
             <div className="p-3">
               <div className="bg-white rounded-lg p-3">
                 <div className="grid grid-cols-2 gap-3 text-xs">
                   <div className="flex justify-between col-span-2">
                     <span className="text-gray-500 font-semibold">가입일</span>
                     <span className="text-gray-900 font-medium">
                       {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                     </span>
                   </div>
                   
                   <div className="flex justify-between col-span-2">
                     <span className="text-gray-500 font-semibold">최근 수정일</span>
                     <span className="text-gray-900 font-medium">
                       {new Date(profile.updated_at).toLocaleDateString('ko-KR')}
                     </span>
                   </div>
                 </div>
               </div>
             </div>
           </motion.div>
         )}

         {/* 차단 목록 섹션 */}
         {!isEditing && !isEditingChildren && activeTab === 'info' && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
           >
             {/* 작은 헤더 */}
             <div className="bg-gray-50 px-2 py-1 text-center">
               <div className="text-xs text-gray-500 font-semibold">차단 목록</div>
             </div>
             
             <div className="p-3">
               {loadingBlockedUsers ? (
                 <div className="text-center py-4">
                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fb8678] mx-auto mb-2"></div>
                   <p className="text-xs text-gray-500">로딩 중...</p>
                 </div>
               ) : blockedUsers.length === 0 ? (
                 <div className="text-center py-4">
                   <p className="text-xs text-gray-500">차단한 사용자가 없습니다.</p>
                 </div>
               ) : (
                 <>
                   <div className="space-y-2">
                     {blockedUsers.slice(0, 3).map((blockedUser) => {
                       const userProfile = blockedUser.profiles as any
                       const displayName = userProfile?.nickname || userProfile?.full_name || '알 수 없음'
                       const profileImage = userProfile?.profile_image_url
                       
                       return (
                         <div
                           key={blockedUser.id}
                           className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                         >
                           <div className="flex items-center gap-2 flex-1 min-w-0">
                             {profileImage ? (
                               <img
                                 src={profileImage}
                                 alt={displayName}
                                 className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                               />
                             ) : (
                               <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center flex-shrink-0">
                                 <User className="w-4 h-4 text-gray-500" />
                               </div>
                             )}
                             <div className="flex-1 min-w-0">
                               <p className="text-xs font-medium text-gray-900 truncate">{displayName}</p>
                               <p className="text-[10px] text-gray-500">
                                 {new Date(blockedUser.created_at).toLocaleDateString('ko-KR')}
                               </p>
                             </div>
                           </div>
                           <button
                             onClick={() => {
                               setPendingUnblockUserId(blockedUser.blocked_user_id)
                               setWasAllBlockedUsersOpen(false)
                               setShowUnblockConfirm(true)
                             }}
                             className="px-3 py-1.5 text-xs text-[#fb8678] hover:bg-[#fb8678] hover:text-white rounded-lg transition-colors flex-shrink-0 ml-2"
                           >
                             해제
                           </button>
                         </div>
                       )
                     })}
                   </div>
                   {blockedUsers.length > 3 && (
                     <div
                       onClick={() => setShowAllBlockedUsers(true)}
                       className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer mt-2"
                     >
                       <div className="flex items-center gap-2 flex-1 min-w-0">
                         <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center flex-shrink-0">
                           <ChevronRight className="w-4 h-4 text-gray-500" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-xs font-medium text-gray-900 truncate">더 보기</p>
                           <p className="text-[10px] text-gray-500">총 {blockedUsers.length}명의 차단된 사용자</p>
                         </div>
                       </div>
                     </div>
                   )}
                 </>
               )}
             </div>
           </motion.div>
         )}

         {/* 법률 및 약관 섹션 */}
         {!isEditing && !isEditingChildren && activeTab === 'info' && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="bg-white rounded-2xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
           >
             {/* 작은 헤더 */}
             <div className="bg-gray-50 px-2 py-1 text-center">
               <div className="text-xs text-gray-600 font-semibold">법률 및 약관</div>
             </div>
             
             <div className="p-3">
               <div className="space-y-3">
                 {/* 서비스 이용약관 - 첫 번째 항목 */}
                 <div 
                   className="w-full p-3 text-left border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
                   onClick={() => window.open('https://mompick.ai.kr/terms.html', '_blank', 'noopener,noreferrer')}
                 >
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-xs font-medium text-gray-900">서비스 이용약관</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">서비스 이용에 대한 약관 및 정책</p>
                     </div>
                     <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                   </div>
                 </div>
                 
                 {/* 개인정보 처리방침 */}
                 <div 
                   className="w-full p-3 text-left border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
                   onClick={() => window.open('https://mompick.ai.kr/privacy.html', '_blank', 'noopener,noreferrer')}
                 >
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-xs font-medium text-gray-900">개인정보 처리방침</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">개인정보 수집 및 이용에 대한 안내</p>
                     </div>
                     <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                   </div>
                 </div>
                 
                 {/* 데이터 활용 동의서 */}
                 <div 
                   className="w-full p-3 text-left border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors rounded-lg"
                 >
                   <div className="flex items-center justify-between">
                     <div 
                       className="flex-1 cursor-pointer"
                       onClick={() => window.open('https://mompick.ai.kr/data-consent.html', '_blank', 'noopener,noreferrer')}
                     >
                       <p className="text-xs font-medium text-gray-900">데이터 활용 동의서</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">데이터 활용 및 처리에 대한 안내</p>
                     </div>
                     <div className="flex items-center gap-2">
                       <button
                         onClick={(e) => {
                           e.stopPropagation()
                           handleOpenTermsWithdrawal()
                         }}
                         className="px-2 py-1 text-[10px] text-gray-600 hover:text-[#fb8678] hover:bg-gray-100 rounded transition-colors"
                       >
                         약관철회
                       </button>
                       <svg 
                         className="w-3 h-3 text-gray-400 cursor-pointer" 
                         fill="none" 
                         stroke="currentColor" 
                         viewBox="0 0 24 24"
                         onClick={() => window.open('https://mompick.ai.kr/data-consent.html', '_blank', 'noopener,noreferrer')}
                       >
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                     </div>
                   </div>
                 </div>
                 
                 {/* 마케팅 정보 수신 및 활용 동의서 */}
                 <div 
                   className="w-full p-3 text-left hover:bg-gray-50 transition-colors rounded-lg"
                 >
                   <div className="flex items-center justify-between">
                     <div 
                       className="flex-1 cursor-pointer"
                       onClick={() => window.open('https://mompick.ai.kr/marketing-consent.html', '_blank', 'noopener,noreferrer')}
                     >
                       <p className="text-xs font-medium text-gray-900">마케팅 정보 수신 및 활용 동의서</p>
                       <p className="text-[10px] text-gray-500 mt-0.5">마케팅 정보 수신 동의 및 안내</p>
                     </div>
                     <div className="flex items-center gap-2">
                       <button
                         onClick={(e) => {
                           e.stopPropagation()
                           handleOpenMarketingWithdrawal()
                         }}
                         className="px-2 py-1 text-[10px] text-gray-600 hover:text-[#fb8678] hover:bg-gray-100 rounded transition-colors"
                       >
                         약관철회
                       </button>
                       <svg 
                         className="w-3 h-3 text-gray-400 cursor-pointer" 
                         fill="none" 
                         stroke="currentColor" 
                         viewBox="0 0 24 24"
                         onClick={() => window.open('https://mompick.ai.kr/marketing-consent.html', '_blank', 'noopener,noreferrer')}
                       >
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </motion.div>
         )}

         {/* 문의하기 섹션 */}
         {!isEditing && !isEditingChildren && activeTab === 'info' && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.35 }}
             className="bg-white rounded-2xl mb-3 shadow-sm border border-blue-100 overflow-hidden"
           >
             {/* 작은 헤더 */}
             <div className="bg-blue-50 px-2 py-1 text-center">
               <div className="text-xs text-blue-600 font-semibold">문의하기</div>
             </div>
             
             <div className="p-3">
               <div className="bg-white rounded-lg p-3">
                 <div className="text-center">
                   <p className="text-xs text-blue-700 mb-4">
                     궁금한 사항이나 불편한 점이 있으시면 고객센터로 문의해주세요.
                   </p>
                   <button
                     onClick={handleContact}
                     className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-xs"
                   >
                     문의하기
                   </button>
                 </div>
               </div>
             </div>
           </motion.div>
         )}

         {/* 계정 관리 섹션 */}
         {!isEditing && !isEditingChildren && activeTab === 'info' && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4 }}
             className="bg-white rounded-2xl mb-3 shadow-sm border border-red-100 overflow-hidden"
           >
             {/* 작은 헤더 */}
             <div className="bg-red-50 px-2 py-1 text-center">
               <div className="text-xs text-red-600 font-semibold">계정 관리</div>
             </div>
             
             <div className="p-3">
               <div className="bg-white rounded-lg p-3">
                 <div className="text-center">
                   <p className="text-xs text-red-700 mb-4">
                     로그아웃하면 현재 세션이 종료되고 로그인 페이지로 이동합니다.
                   </p>
                   <button
                     onClick={handleLogout}
                     className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-xs"
                   >
                     로그아웃
                   </button>
                 </div>
               </div>
             </div>
           </motion.div>
         )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* 성공 팝업 */}
        {successMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full mx-4 animate-[modalSlideUp_0.3s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-[#fb8678] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">저장 완료</h3>
                <p className="text-sm text-gray-600 mb-6">{successMessage}</p>
                <button
                  onClick={() => setSuccessMessage('')}
                  className="w-full px-4 py-3 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 프로필 저장 확인 팝업 */}
        {showProfileSaveConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full mx-4 animate-[modalSlideUp_0.3s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-pink-600 fill-current" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">저장 확인</h3>
                <p className="text-sm text-gray-600 mb-6">프로필 내용이 저장됩니다?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProfileSaveConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmProfileSave}
                    className="flex-1 px-4 py-3 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 저장 확인 팝업 */}
        {showSaveConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full mx-4 animate-[modalSlideUp_0.3s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-pink-600 fill-current" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">저장 확인</h3>
                <p className="text-sm text-gray-600 mb-6">자녀정보 수정한 내용이 저장됩니다?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSaveConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmSaveChildren}
                    className="flex-1 px-4 py-3 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 약관 철회 팝업 */}
        {showTermsWithdrawal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full mx-4 my-8 animate-[modalSlideUp_0.3s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">데이터 활용 동의서 철회</h3>
                  <button
                    onClick={() => setShowTermsWithdrawal(false)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {loadingTerms ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
                    <p className="text-gray-600 text-sm">약관 정보를 불러오는 중...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-4">
                        데이터 활용 동의서의 선택 항목을 철회할 수 있습니다. 필수 항목은 해제할 수 없습니다.
                      </p>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                      {/* [필수] 서비스 운영 및 기능 제공 */}
                      <label className="flex items-start cursor-pointer p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={dataSubTerms.serviceOperation}
                          disabled={true}
                          className="w-4 h-4 mt-0.5 border-gray-300 rounded focus:ring-[#fb8678] focus:ring-2 accent-[#fb8678] cursor-not-allowed opacity-60"
                        />
                        <div className="ml-2 flex-1">
                          <span className="text-xs font-medium text-gray-900">
                            서비스 운영 및 기능 제공
                          </span>
                          <span className="ml-1 text-xs text-red-500">(필수)</span>
                          <p className="mt-0.5 text-xs text-gray-500">
                            계정 운영, 커뮤니티 기능, 콘텐츠 작성, 신고 시스템 운영
                          </p>
                        </div>
                      </label>

                      {/* [선택] 사용자 경험 및 추천 기능 개선 */}
                      <label className="flex items-start cursor-pointer p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={dataSubTerms.userExperience}
                          onChange={(e) => handleDataSubTermChange('userExperience', e.target.checked)}
                          className="w-4 h-4 mt-0.5 border-gray-300 rounded focus:ring-[#fb8678] focus:ring-2 accent-[#fb8678]"
                        />
                        <div className="ml-2 flex-1">
                          <span className="text-xs font-medium text-gray-900">
                            사용자 경험 및 추천 기능 개선
                          </span>
                          <span className="ml-1 text-xs text-gray-500">(선택)</span>
                          <p className="mt-0.5 text-xs text-gray-500">
                            개인 맞춤형 시설 추천, 콘텐츠 추천, UI 개선
                          </p>
                        </div>
                      </label>

                      {/* [선택] 앱 안정성 확보 및 기술적 개선 */}
                      <label className="flex items-start cursor-pointer p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={dataSubTerms.appStability}
                          onChange={(e) => handleDataSubTermChange('appStability', e.target.checked)}
                          className="w-4 h-4 mt-0.5 border-gray-300 rounded focus:ring-[#fb8678] focus:ring-2 accent-[#fb8678]"
                        />
                        <div className="ml-2 flex-1">
                          <span className="text-xs font-medium text-gray-900">
                            앱 안정성 확보 및 기술적 개선
                          </span>
                          <span className="ml-1 text-xs text-gray-500">(선택)</span>
                          <p className="mt-0.5 text-xs text-gray-500">
                            기기 정보, 오류 로그, 성능 데이터 수집
                          </p>
                        </div>
                      </label>

                      {/* [선택] 마케팅 및 광고 활용 */}
                      <label className="flex items-start cursor-pointer p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={dataSubTerms.marketing}
                          onChange={(e) => handleDataSubTermChange('marketing', e.target.checked)}
                          className="w-4 h-4 mt-0.5 border-gray-300 rounded focus:ring-[#fb8678] focus:ring-2 accent-[#fb8678]"
                        />
                        <div className="ml-2 flex-1">
                          <span className="text-xs font-medium text-gray-900">
                            마케팅 및 광고 활용
                          </span>
                          <span className="ml-1 text-xs text-gray-500">(선택)</span>
                          <p className="mt-0.5 text-xs text-gray-500">
                            이벤트/프로모션 안내, 앱 내 광고, 푸시 알림
                          </p>
                        </div>
                      </label>

                      {/* [선택] 익명 통계 데이터 활용 */}
                      <label className="flex items-start cursor-pointer p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={dataSubTerms.anonymousStats}
                          onChange={(e) => handleDataSubTermChange('anonymousStats', e.target.checked)}
                          className="w-4 h-4 mt-0.5 border-gray-300 rounded focus:ring-[#fb8678] focus:ring-2 accent-[#fb8678]"
                        />
                        <div className="ml-2 flex-1">
                          <span className="text-xs font-medium text-gray-900">
                            익명 통계 데이터 활용
                          </span>
                          <span className="ml-1 text-xs text-gray-500">(선택)</span>
                          <p className="mt-0.5 text-xs text-gray-500">
                            서비스 품질 개선 분석, 연구 및 통계 자료 활용 (개인 식별 불가)
                          </p>
                        </div>
                      </label>
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-xs">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowTermsWithdrawal(false)}
                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveTermsWithdrawal}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] disabled:opacity-50 transition-colors"
                      >
                        {saving ? '저장 중...' : '저장하기'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 마케팅 약관 철회 팝업 */}
        {showMarketingWithdrawal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full mx-4 my-8 animate-[modalSlideUp_0.3s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">마케팅 정보 수신 동의 철회</h3>
                  <button
                    onClick={() => setShowMarketingWithdrawal(false)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {loadingTerms ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-4"></div>
                    <p className="text-gray-600 text-sm">약관 정보를 불러오는 중...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-4">
                        마케팅 정보 수신 동의를 철회할 수 있습니다. 동의를 해제하면 마케팅 정보를 받을 수 없습니다.
                      </p>
                    </div>

                    <div className="space-y-3 mb-4">
                      {/* 마케팅 정보 수신 동의 */}
                      <label className="flex items-start cursor-pointer p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={marketingAgreed}
                          onChange={(e) => setMarketingAgreed(e.target.checked)}
                          className="w-4 h-4 mt-0.5 border-gray-300 rounded focus:ring-[#fb8678] focus:ring-2 accent-[#fb8678]"
                        />
                        <div className="ml-2 flex-1">
                          <span className="text-xs font-medium text-gray-900">
                            마케팅 정보 수신 및 활용 동의
                          </span>
                          <span className="ml-1 text-xs text-gray-500">(선택)</span>
                          <p className="mt-0.5 text-xs text-gray-500">
                            이벤트/프로모션 안내, 앱 내 광고, 푸시 알림 등 마케팅 정보 수신
                          </p>
                        </div>
                      </label>
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-xs">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowMarketingWithdrawal(false)}
                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveMarketingWithdrawal}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] disabled:opacity-50 transition-colors"
                      >
                        {saving ? '저장 중...' : '저장하기'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 차단 해제 확인 모달 */}
        {showUnblockConfirm && pendingUnblockUserId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full mx-4 animate-[modalSlideUp_0.3s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">차단 해제</h3>
                  <button
                    onClick={() => {
                      setShowUnblockConfirm(false)
                      setPendingUnblockUserId(null)
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-gray-500">
                    • 차단 해제 후 해당 사용자의 글과 댓글이 다시 보이게 됩니다.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowUnblockConfirm(false)
                      setPendingUnblockUserId(null)
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleUnblockUser(pendingUnblockUserId)}
                    className="flex-1 px-4 py-3 bg-[#fb8678] text-white rounded-xl font-medium hover:bg-[#e67567] transition-colors"
                  >
                    해제하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 전체 차단 목록 모달 */}
        {showAllBlockedUsers && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col animate-[modalSlideUp_0.3s_cubic-bezier(0.22,0.61,0.36,1)]">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">차단 목록</h3>
                  <button
                    onClick={() => setShowAllBlockedUsers(false)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">총 {blockedUsers.length}명</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingBlockedUsers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fb8678] mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500">로딩 중...</p>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-500">차단한 사용자가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map((blockedUser) => {
                      const userProfile = blockedUser.profiles as any
                      const displayName = userProfile?.nickname || userProfile?.full_name || '알 수 없음'
                      const profileImage = userProfile?.profile_image_url
                      
                      return (
                        <div
                          key={blockedUser.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {profileImage ? (
                              <img
                                src={profileImage}
                                alt={displayName}
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{displayName}</p>
                              <p className="text-[10px] text-gray-500">
                                {new Date(blockedUser.created_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setPendingUnblockUserId(blockedUser.blocked_user_id)
                              setWasAllBlockedUsersOpen(true)
                              setShowUnblockConfirm(true)
                              setShowAllBlockedUsers(false)
                            }}
                            className="px-3 py-1.5 text-xs text-[#fb8678] hover:bg-[#fb8678] hover:text-white rounded-lg transition-colors flex-shrink-0 ml-2"
                          >
                            해제
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default Profile
