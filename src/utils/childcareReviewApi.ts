import { supabase } from '../lib/supabase'

export interface ChildcareReviewImage {
  id: string
  review_id: string
  image_url: string
  image_order: number
  created_at: string
}

export interface ChildcareReview {
  id: string
  childcare_code: string
  childcare_name?: string
  user_id: string
  rating: number
  content: string
  helpful_count: number
  created_at: string
  updated_at: string
  is_deleted: boolean
  is_hidden?: boolean
  images?: ChildcareReviewImage[]
  user_profile?: {
    full_name: string
    nickname: string
    profile_image_url?: string | null
  }
}

export interface ChildcareReviewStats {
  total_reviews: number
  average_rating: number
  rating_distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
}

export async function getMultipleChildcareRatings(codes: string[]): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('childcare_reviews')
      .select('childcare_code, rating')
      .in('childcare_code', codes)
      .eq('is_deleted', false)

    if (error) {
      console.error('어린이집 평점 조회 오류:', error)
      return {}
    }

    const acc: Record<string, { total: number; count: number }> = {}
    data?.forEach((r: any) => {
      if (!acc[r.childcare_code]) acc[r.childcare_code] = { total: 0, count: 0 }
      acc[r.childcare_code].total += r.rating
      acc[r.childcare_code].count += 1
    })

    const result: Record<string, number> = {}
    Object.keys(acc).forEach(code => {
      const { total, count } = acc[code]
      result[code] = Number((total / count).toFixed(1))
    })
    return result
  } catch (e) {
    console.error('어린이집 평점 조회 실패:', e)
    return {}
  }
}

export async function getMultipleChildcareReviewStats(
  codes: string[]
): Promise<Record<string, { average: number; count: number }>> {
  try {
    if (!codes || codes.length === 0) return {}
    console.log('🔍 getMultipleChildcareReviewStats 호출 - 코드:', codes)
    const { data, error } = await supabase
      .from('childcare_reviews')
      .select('childcare_code, rating')
      .in('childcare_code', codes)
      .eq('is_deleted', false)

    if (error) {
      console.error('어린이집 리뷰 통계 조회 오류:', error)
      return {}
    }
    
    console.log('📊 어린이집 리뷰 통계 조회 결과 - 데이터 개수:', data?.length || 0, '데이터:', data)

    const acc: Record<string, { total: number; count: number }> = {}
    ;(data || []).forEach((row: any) => {
      const code = row.childcare_code
      if (!acc[code]) acc[code] = { total: 0, count: 0 }
      acc[code].total += row.rating
      acc[code].count += 1
    })

    const result: Record<string, { average: number; count: number }> = {}
    Object.keys(acc).forEach(code => {
      const { total, count } = acc[code]
      result[code] = { average: count > 0 ? Number((total / count).toFixed(1)) : 0, count }
    })
    console.log('✅ getMultipleChildcareReviewStats 최종 결과:', result)
    return result
  } catch (e) {
    console.error('어린이집 리뷰 통계 조회 실패:', e)
    return {}
  }
}

export async function getChildcareReviews(
  childcareCode: string,
  page: number = 1,
  limit: number = 10,
  sortBy: 'latest' | 'rating' | 'helpful' = 'latest'
): Promise<{ reviews: ChildcareReview[]; hasMore: boolean }> {
  let query = supabase
    .from('childcare_reviews')
    .select(`
      *,
      images:childcare_review_images (
        id, review_id, image_url, image_order, created_at
      )
    `)
    .eq('childcare_code', childcareCode)
    .eq('is_deleted', false)

  switch (sortBy) {
    case 'latest':
      query = query.order('created_at', { ascending: false })
      break
    case 'rating':
      query = query.order('rating', { ascending: false }).order('created_at', { ascending: false })
      break
    case 'helpful':
      query = query.order('helpful_count', { ascending: false }).order('created_at', { ascending: false })
      break
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error } = await query
  if (error) {
    return { reviews: [], hasMore: false }
  }

  const { count } = await supabase
    .from('childcare_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('childcare_code', childcareCode)
    .eq('is_deleted', false)

  // 현재 사용자의 차단 목록 가져오기
  let blockedUserIds: string[] = []
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      if (isLoggedIn !== 'true') {
        // OAuth 사용자인 경우 차단 목록 조회
        const { data: blockedData } = await supabase
          .from('blocked_users')
          .select('blocked_user_id')
          .eq('blocker_id', user.id)
        
        if (blockedData) {
          blockedUserIds = blockedData.map(item => item.blocked_user_id)
        }
      }
    }
  } catch (error) {
    console.error('차단 목록 조회 오류:', error)
  }

  // 차단된 사용자의 리뷰 필터링 (목록에서만 제외, 통계는 유지)
  const filteredReviews = (data || []).filter((review: any) => {
    return !blockedUserIds.includes(review.user_id)
  })

  // 사용자 프로필 추가
  const reviewsWithProfiles = await Promise.all(
    filteredReviews.map(async (review: any) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, nickname, profile_image_url, children_info')
          .eq('auth_user_id', review.user_id)
          .maybeSingle()
        return {
          ...review,
          user_profile: profile || {
            full_name: '익명',
            nickname: '익명',
            profile_image_url: null
          }
        }
      } catch {
        return {
          ...review,
          user_profile: {
            full_name: '익명',
            nickname: '익명',
            profile_image_url: null
          }
        }
      }
    })
  )

  return {
    reviews: reviewsWithProfiles,
    hasMore: count ? page * limit < count : false
  }
}

export async function getChildcareReviewStats(childcareCode: string): Promise<ChildcareReviewStats> {
  const { data, error } = await supabase
    .from('childcare_reviews')
    .select('rating')
    .eq('childcare_code', childcareCode)
    .eq('is_deleted', false)

  if (error || !data) {
    return { total_reviews: 0, average_rating: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  }

  const total_reviews = data.length
  if (total_reviews === 0) {
    return { total_reviews: 0, average_rating: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  }

  const rating_distribution = {
    1: data.filter((r: any) => r.rating === 1).length,
    2: data.filter((r: any) => r.rating === 2).length,
    3: data.filter((r: any) => r.rating === 3).length,
    4: data.filter((r: any) => r.rating === 4).length,
    5: data.filter((r: any) => r.rating === 5).length
  }
  const average_rating = Number((data.reduce((s: number, r: any) => s + r.rating, 0) / total_reviews).toFixed(1))
  return { total_reviews, average_rating, rating_distribution }
}

export async function createChildcareReview(input: {
  childcare_code: string
  childcare_name: string
  rating: number
  content: string
  images?: File[]
}): Promise<ChildcareReview> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const { data: review, error } = await supabase
    .from('childcare_reviews')
    .insert({
      childcare_code: input.childcare_code,
      childcare_name: input.childcare_name,
      user_id: user.id,
      rating: input.rating,
      content: input.content
    })
    .select()
    .single()
  if (error) throw error

  if (input.images && input.images.length > 0) {
    const urls = await uploadChildcareReviewImages(review.id, input.images)
    const imageRows = urls.map((url, idx) => ({ review_id: review.id, image_url: url, image_order: idx }))
    await supabase.from('childcare_review_images').insert(imageRows)
  }

  return review
}

export async function toggleChildcareReviewHelpful(reviewId: string): Promise<{ isHelpful: boolean; helpfulCount: number }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  // profiles.id 로 전환
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile?.id) throw new Error('프로필 정보를 찾을 수 없습니다.')

  const { data: existing } = await supabase
    .from('childcare_review_helpful')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', profile.id)
    .maybeSingle()

  let isHelpful = false
  if (existing) {
    const { error } = await supabase
      .from('childcare_review_helpful')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', profile.id)
    if (error) throw error
    isHelpful = false
  } else {
    const { error } = await supabase
      .from('childcare_review_helpful')
      .insert({ review_id: reviewId, user_id: profile.id })
    if (error) throw error
    isHelpful = true
  }

  const { data: r, error: rErr } = await supabase
    .from('childcare_reviews')
    .select('helpful_count')
    .eq('id', reviewId)
    .single()
  if (rErr) throw rErr

  return { isHelpful, helpfulCount: r.helpful_count }
}

// 리뷰 삭제 (소프트 삭제: is_deleted = true) - 관리자 승인 후 삭제
export async function deleteChildcareReview(reviewId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const { error } = await supabase
    .from('childcare_reviews')
    .update({ is_deleted: true })
    .eq('id', reviewId)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * 어린이집 리뷰 삭제요청 생성
 */
export async function requestChildcareReviewDeletion(reviewId: string, requestReason?: string): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('로그인이 필요합니다.')
    }

    // 현재 사용자의 profile ID 가져오기
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profileData) {
      throw new Error('프로필 정보를 찾을 수 없습니다.')
    }

    // 리뷰가 존재하고 본인 리뷰인지 확인
    const { data: reviewData, error: reviewError } = await supabase
      .from('childcare_reviews')
      .select('id, user_id')
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .single()

    if (reviewError || !reviewData) {
      throw new Error('리뷰를 찾을 수 없거나 삭제 권한이 없습니다.')
    }

    // 중복 요청 확인
    const { data: existingRequest } = await supabase
      .from('review_delete_requests')
      .select('id')
      .eq('review_id', reviewId)
      .eq('review_type', 'childcare')
      .eq('requester_id', profileData.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingRequest) {
      throw new Error('이미 삭제요청이 접수되었습니다.')
    }

    // 삭제요청 생성
    const { error: insertError } = await supabase
      .from('review_delete_requests')
      .insert({
        review_id: reviewId,
        review_type: 'childcare',
        requester_id: profileData.id,
        status: 'pending',
        request_reason: requestReason?.trim() || null,
      })

    if (insertError) {
      console.error('삭제요청 생성 오류:', insertError)
      throw insertError
    }
  } catch (error) {
    console.error('삭제요청 생성 실패:', error)
    throw error
  }
}

/**
 * 리뷰 도움됨 토글 (알림 기능 포함) - 유치원 구조 동일 적용
 */
export async function toggleChildcareReviewHelpfulWithNotification(
  reviewId: string,
  childcareName: string
): Promise<{ isHelpful: boolean; helpfulCount: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    // 리뷰 작성자 정보 조회
    const { data: reviewData, error: reviewError } = await supabase
      .from('childcare_reviews')
      .select('user_id, helpful_count, childcare_name')
      .eq('id', reviewId)
      .single()
    if (reviewError) throw reviewError

    // 현재 사용자 profile ID
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, nickname, profile_image_url')
      .eq('auth_user_id', user.id)
      .single()
    if (profileError || !profileData) throw new Error('프로필 정보를 찾을 수 없습니다.')

    const currentProfileId = profileData.id

    // 기존 도움됨 여부 확인
    const { data: existingHelpful } = await supabase
      .from('childcare_review_helpful')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', currentProfileId)
      .maybeSingle()

    let isHelpful = false
    const wasHelpful = !!existingHelpful

    if (existingHelpful) {
      const { error: deleteError } = await supabase
        .from('childcare_review_helpful')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', currentProfileId)
      if (deleteError) throw deleteError
      isHelpful = false
    } else {
      const { error: insertError } = await supabase
        .from('childcare_review_helpful')
        .insert({ review_id: reviewId, user_id: currentProfileId })
      if (insertError) throw insertError
      isHelpful = true
    }

    // 최신 도움됨 카운트 계산
    const { count: helpfulCount } = await supabase
      .from('childcare_review_helpful')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)

    // 알림 처리: 새로 도움됨을 눌렀을 때만, 자기 자신이 아닐 때만
    if (isHelpful && !wasHelpful) {
      try {
        const { createReviewLikeNotification } = await import('./notifications')

        // 리뷰 작성자 profile ID 조회
        const { data: reviewAuthorProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', reviewData.user_id)
          .single()

        if (reviewAuthorProfile && currentProfileId !== reviewAuthorProfile.id) {
          await createReviewLikeNotification(
            reviewId,
            childcareName || reviewData.childcare_name || '어린이집',
            currentProfileId,
            profileData.nickname || profileData.full_name,
            profileData.profile_image_url || '',
            reviewAuthorProfile.id
          )
        }
      } catch (notificationError) {
        console.error('어린이집 리뷰 좋아요 알림 생성 오류:', notificationError)
      }
    } else if (!isHelpful && wasHelpful) {
      try {
        const { deleteReviewLikeNotification } = await import('./notifications')

        const { data: reviewAuthorProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', reviewData.user_id)
          .single()

        if (reviewAuthorProfile && currentProfileId !== reviewAuthorProfile.id) {
          await deleteReviewLikeNotification(
            reviewId,
            currentProfileId,
            reviewAuthorProfile.id
          )
        }
      } catch (notificationError) {
        console.error('어린이집 리뷰 좋아요 알림 삭제 오류:', notificationError)
      }
    }

    return { isHelpful, helpfulCount: helpfulCount || 0 }
  } catch (error) {
    console.error('어린이집 도움됨 토글 실패:', error)
    throw error
  }
}

export async function getUserChildcareReview(childcareCode: string): Promise<ChildcareReview | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('childcare_reviews')
    .select(`
      *,
      images:childcare_review_images (
        id, review_id, image_url, image_order, created_at
      )
    `)
    .eq('childcare_code', childcareCode)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) return null

  return data as any
}

async function uploadChildcareReviewImages(reviewId: string, images: File[]): Promise<string[]> {
  const uploads = images.map(async (image, index) => {
    const ext = image.name.split('.').pop()
    const path = `${reviewId}/${index}_${Date.now()}.${ext}`
    const storagePath = `childcare-reviews/${path}`
    const { error: uploadError } = await supabase.storage
      .from('childcare-reviews')
      .upload(storagePath, image)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('childcare-reviews').getPublicUrl(storagePath)
    return data.publicUrl
  })
  return Promise.all(uploads)
}


