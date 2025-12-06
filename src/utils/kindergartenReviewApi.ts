import { supabase } from '../lib/supabase'

export interface KindergartenReview {
  id: string
  kindergarten_code: string
  user_id: string
  rating: number
  content: string
  helpful_count: number
  created_at: string
  updated_at: string
  is_deleted: boolean
  is_hidden?: boolean
  user_profile?: {
    full_name: string
    nickname: string
    profile_image_url?: string
    children_info?: any[] | null
  }
  images?: ReviewImage[]
}

export interface ReviewImage {
  id: string
  review_id: string
  image_url: string
  image_order: number
  created_at: string
}

export interface CreateReviewData {
  kindergarten_code: string
  kindergarten_name: string
  rating: number
  content: string
  images?: File[]
}

export interface ReviewStats {
  total_reviews: number
  average_rating: number
  rating_distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

/**
 * 유치원 리뷰 목록 조회
 */
export async function getKindergartenReviews(
  kindergartenCode: string,
  page: number = 1,
  limit: number = 10,
  sortBy: 'latest' | 'rating' | 'helpful' = 'latest'
): Promise<{ reviews: KindergartenReview[], hasMore: boolean }> {
  try {
    let query = supabase
      .from('kindergarten_reviews')
      .select(`
        *,
        images:kindergarten_review_images (
          id,
          review_id,
          image_url,
          image_order,
          created_at
        ),
        helpful_count:kindergarten_review_helpful(count)
      `)
      .eq('kindergarten_code', kindergartenCode)
      .eq('is_deleted', false)

    // 정렬
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

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      console.error('리뷰 목록 조회 오류:', error)
      // 테이블이 없거나 권한 문제인 경우 빈 배열 반환
      return {
        reviews: [],
        hasMore: false
      }
    }

    // 다음 페이지 존재 여부 확인
    const { count } = await supabase
      .from('kindergarten_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('kindergarten_code', kindergartenCode)
      .eq('is_deleted', false)

    const hasMore = count ? (page * limit) < count : false

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
    const filteredReviews = (data || []).filter(review => {
      return !blockedUserIds.includes(review.user_id)
    })

    // 사용자 프로필 정보와 도움됨 카운트를 별도로 가져오기
    const reviewsWithProfiles = await Promise.all(
      filteredReviews.map(async (review) => {
        try {
          // profiles 테이블에서 auth_user_id로 조회
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, nickname, profile_image_url, children_info')
            .eq('auth_user_id', review.user_id)
            .maybeSingle()
          
          // 도움됨 카운트를 실시간으로 계산
          const { count: helpfulCount, error: countError } = await supabase
            .from('kindergarten_review_helpful')
            .select('*', { count: 'exact', head: true })
            .eq('review_id', review.id)
          
          if (profileError) {
            console.warn('profiles 테이블 조회 실패, 기본값 사용:', profileError)
            // profiles 테이블이 없는 경우 기본값 사용
            return {
              ...review,
              user_profile: {
                full_name: '익명',
                nickname: '익명',
                profile_image_url: null
              },
              helpful_count: helpfulCount || 0
            }
          }
          
          console.log('리뷰 프로필 정보 조회 성공:', profile)
          return {
            ...review,
            user_profile: profile,
            helpful_count: helpfulCount || 0 // 실시간으로 계산된 helpful_count 사용
          }
        } catch (error) {
          console.warn('사용자 프로필 로딩 실패:', error)
          return {
            ...review,
            user_profile: {
              full_name: '익명',
              nickname: '익명',
              profile_image_url: null
            },
            helpful_count: 0 // 오류 시 기본값
          }
        }
      })
    )

    return {
      reviews: reviewsWithProfiles,
      hasMore
    }
  } catch (error) {
    console.error('리뷰 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 여러 유치원의 리뷰 평점 조회 (지도용)
 */
export async function getMultipleKindergartenRatings(kindergartenCodes: string[]): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('kindergarten_reviews')
      .select('kindergarten_code, rating')
      .in('kindergarten_code', kindergartenCodes)
      .eq('is_deleted', false)

    if (error) {
      console.error('유치원 평점 조회 오류:', error)
      return {}
    }

    // 유치원별 평점 계산
    const ratings: Record<string, { total: number; count: number }> = {}
    
    data?.forEach(review => {
      if (!ratings[review.kindergarten_code]) {
        ratings[review.kindergarten_code] = { total: 0, count: 0 }
      }
      ratings[review.kindergarten_code].total += review.rating
      ratings[review.kindergarten_code].count += 1
    })

    // 평균 계산
    const result: Record<string, number> = {}
    Object.keys(ratings).forEach(code => {
      const { total, count } = ratings[code]
      result[code] = Number((total / count).toFixed(1))
    })

    return result
  } catch (error) {
    console.error('유치원 평점 조회 실패:', error)
    return {}
  }
}

/**
 * 여러 유치원의 리뷰 평균과 개수 조회
 */
export async function getMultipleKindergartenReviewStats(
  kindergartenCodes: string[]
): Promise<Record<string, { average: number; count: number }>> {
  try {
    if (!kindergartenCodes || kindergartenCodes.length === 0) return {}
    const { data, error } = await supabase
      .from('kindergarten_reviews')
      .select('kindergarten_code, rating')
      .in('kindergarten_code', kindergartenCodes)
      .eq('is_deleted', false)

    if (error) {
      console.error('유치원 리뷰 통계 조회 오류:', error)
      return {}
    }

    const acc: Record<string, { total: number; count: number }> = {}
    ;(data || []).forEach((row: any) => {
      const code = row.kindergarten_code
      if (!acc[code]) acc[code] = { total: 0, count: 0 }
      acc[code].total += row.rating
      acc[code].count += 1
    })

    const result: Record<string, { average: number; count: number }> = {}
    Object.keys(acc).forEach(code => {
      const { total, count } = acc[code]
      result[code] = { average: count > 0 ? Number((total / count).toFixed(1)) : 0, count }
    })
    return result
  } catch (e) {
    console.error('유치원 리뷰 통계 조회 실패:', e)
    return {}
  }
}

/**
 * 리뷰 통계 조회
 */
export async function getReviewStats(kindergartenCode: string): Promise<ReviewStats> {
  try {
    const { data, error } = await supabase
      .from('kindergarten_reviews')
      .select('rating')
      .eq('kindergarten_code', kindergartenCode)
      .eq('is_deleted', false)

    if (error) {
      console.error('리뷰 통계 조회 오류:', error)
      // 테이블이 없거나 권한 문제인 경우 기본값 반환
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    }

    const reviews = data || []
    const total_reviews = reviews.length
    
    if (total_reviews === 0) {
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    }

    const rating_distribution = {
      1: reviews.filter((r: any) => r.rating === 1).length,
      2: reviews.filter((r: any) => r.rating === 2).length,
      3: reviews.filter((r: any) => r.rating === 3).length,
      4: reviews.filter((r: any) => r.rating === 4).length,
      5: reviews.filter((r: any) => r.rating === 5).length
    }

    const average_rating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / total_reviews

    return {
      total_reviews,
      average_rating: Number(average_rating.toFixed(1)),
      rating_distribution
    }
  } catch (error) {
    console.error('리뷰 통계 조회 실패:', error)
    throw error
  }
}

/**
 * 현재 사용자 정보 가져오기
 */
async function getCurrentUserProfile() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return null
    }

    // profiles 테이블에서 auth_user_id로 사용자 정보 조회
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, nickname, profile_image_url, children_info')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      
      if (profileError) {
        console.warn('profiles 테이블 조회 실패:', profileError)
        return {
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '익명',
          nickname: user.user_metadata?.nickname || user.email?.split('@')[0] || '익명',
          profile_image_url: user.user_metadata?.avatar_url || null
        }
      }
      
      console.log('프로필 정보 조회 성공:', profile)
      return profile
    } catch (profileError) {
      console.warn('profiles 테이블 조회 실패, user_metadata 사용:', profileError)
      // profiles 테이블이 없는 경우 user_metadata에서 정보 가져오기
      return {
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '익명',
        nickname: user.user_metadata?.nickname || user.email?.split('@')[0] || '익명',
        profile_image_url: user.user_metadata?.avatar_url || null
      }
    }
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error)
    return null
  }
}

/**
 * 리뷰 작성
 */
export async function createReview(reviewData: CreateReviewData): Promise<KindergartenReview> {
  try {
    // 현재 사용자 정보 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('로그인이 필요합니다.')
    }

    // 리뷰 생성
    const { data: review, error: reviewError } = await supabase
      .from('kindergarten_reviews')
      .insert({
        kindergarten_code: reviewData.kindergarten_code,
        kindergarten_name: reviewData.kindergarten_name,
        user_id: user.id,
        rating: reviewData.rating,
        content: reviewData.content
      })
      .select()
      .single()

    if (reviewError) {
      console.error('리뷰 생성 오류:', reviewError)
      throw reviewError
    }

    // 이미지 업로드 (있는 경우)
    if (reviewData.images && reviewData.images.length > 0) {
      const uploadedImages = await uploadReviewImages(review.id, reviewData.images)
      
      // 이미지 정보를 데이터베이스에 저장
      const imageData = uploadedImages.map((url, index) => ({
        review_id: review.id,
        image_url: url,
        image_order: index
      }))

      const { error: imageError } = await supabase
        .from('kindergarten_review_images')
        .insert(imageData)

      if (imageError) {
        console.error('리뷰 이미지 저장 오류:', imageError)
        // 이미지는 업로드되었지만 DB 저장 실패 시 정리 필요
      }
    }

    // 사용자 프로필 정보 추가하여 반환
    const userProfile = await getCurrentUserProfile()
    return {
      ...review,
      user_profile: userProfile || {
        full_name: '익명',
        nickname: '익명',
        profile_image_url: null
      }
    }
  } catch (error) {
    console.error('리뷰 작성 실패:', error)
    throw error
  }
}

/**
 * 리뷰 수정
 */
export async function updateReview(
  reviewId: string,
  updateData: { rating?: number; content?: string; images?: File[] }
): Promise<KindergartenReview> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('로그인이 필요합니다.')
    }

    // 리뷰 수정
    const updateFields: any = {}
    if (updateData.rating !== undefined) updateFields.rating = updateData.rating
    if (updateData.content !== undefined) updateFields.content = updateData.content

    const { data: review, error: reviewError } = await supabase
      .from('kindergarten_reviews')
      .update(updateFields)
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (reviewError) {
      console.error('리뷰 수정 오류:', reviewError)
      throw reviewError
    }

    // 이미지 업데이트 (있는 경우)
    if (updateData.images && updateData.images.length > 0) {
      // 기존 이미지 삭제
      await supabase
        .from('kindergarten_review_images')
        .delete()
        .eq('review_id', reviewId)

      // 새 이미지 업로드 및 저장
      const uploadedImages = await uploadReviewImages(reviewId, updateData.images)
      const imageData = uploadedImages.map((url, index) => ({
        review_id: reviewId,
        image_url: url,
        image_order: index
      }))

      await supabase
        .from('kindergarten_review_images')
        .insert(imageData)
    }

    return review
  } catch (error) {
    console.error('리뷰 수정 실패:', error)
    throw error
  }
}

/**
 * 리뷰 삭제 (소프트 삭제) - 관리자 승인 후 삭제
 */
export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('로그인이 필요합니다.')
    }

    const { error } = await supabase
      .from('kindergarten_reviews')
      .update({ is_deleted: true })
      .eq('id', reviewId)
      .eq('user_id', user.id)

    if (error) {
      console.error('리뷰 삭제 오류:', error)
      throw error
    }
  } catch (error) {
    console.error('리뷰 삭제 실패:', error)
    throw error
  }
}

/**
 * 유치원 리뷰 삭제요청 생성
 */
export async function requestKindergartenReviewDeletion(reviewId: string, requestReason?: string): Promise<void> {
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
      .from('kindergarten_reviews')
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
      .eq('review_type', 'kindergarten')
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
        review_type: 'kindergarten',
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
 * 리뷰 도움됨 토글
 */
export async function toggleReviewHelpful(reviewId: string): Promise<{ isHelpful: boolean; helpfulCount: number }> {
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

    const profileId = profileData.id

    // 기존 도움됨 확인 (profile ID 사용)
    const { data: existingHelpful, error: checkError } = await supabase
      .from('kindergarten_review_helpful')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', profileId)
      .maybeSingle()

    let isHelpful = false

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingHelpful) {
      // 도움됨 제거
      const { error: deleteError } = await supabase
        .from('kindergarten_review_helpful')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', profileId)

      if (deleteError) {
        throw deleteError
      }
      isHelpful = false
    } else {
      // 도움됨 추가
      const { error: insertError } = await supabase
        .from('kindergarten_review_helpful')
        .insert({
          review_id: reviewId,
          user_id: profileId
        })

      if (insertError) {
        throw insertError
      }
      isHelpful = true
    }

    // 업데이트된 도움됨 수 조회
    const { data: review, error: reviewError } = await supabase
      .from('kindergarten_reviews')
      .select('helpful_count')
      .eq('id', reviewId)
      .single()

    if (reviewError) {
      throw reviewError
    }

    return {
      isHelpful,
      helpfulCount: review.helpful_count
    }
  } catch (error) {
    console.error('도움됨 토글 실패:', error)
    throw error
  }
}

/**
 * 리뷰 도움됨 토글 (알림 기능 포함)
 */
export async function toggleReviewHelpfulWithNotification(
  reviewId: string,
  kindergartenName: string
): Promise<{ isHelpful: boolean; helpfulCount: number }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('로그인이 필요합니다.')
    }

    // 먼저 리뷰 작성자 정보를 가져오기
    const { data: reviewData, error: reviewError } = await supabase
      .from('kindergarten_reviews')
      .select('user_id, helpful_count')
      .eq('id', reviewId)
      .single()

    if (reviewError) {
      throw reviewError
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

    const profileId = profileData.id

    // 기존 도움됨 확인 (profile ID 사용)
    const { data: existingHelpful, error: checkError } = await supabase
      .from('kindergarten_review_helpful')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', profileId)
      .maybeSingle()

    let isHelpful = false
    let wasHelpful = !!existingHelpful

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingHelpful) {
      // 도움됨 제거
      const { error: deleteError } = await supabase
        .from('kindergarten_review_helpful')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', profileId)

      if (deleteError) {
        throw deleteError
      }
      isHelpful = false
    } else {
      // 도움됨 추가
      const { error: insertError } = await supabase
        .from('kindergarten_review_helpful')
        .insert({
          review_id: reviewId,
          user_id: profileId
        })

      if (insertError) {
        throw insertError
      }
      isHelpful = true
    }

    // 도움됨 카운트 조회
    const { count: helpfulCount, error: countError } = await supabase
      .from('kindergarten_review_helpful')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)

    if (countError) {
      console.error('도움됨 카운트 조회 오류:', countError)
      // 카운트 조회 실패 시 기본값 반환
      return { isHelpful, helpfulCount: helpfulCount || 0 }
    }

    // 알림 처리 (동적 import로 알림 함수 가져오기)
    if (isHelpful && !wasHelpful) {
      // 좋아요를 새로 눌렀을 때만 알림 생성
      try {
        const { createReviewLikeNotification } = await import('./notifications')
        
        // 현재 사용자 프로필 정보 가져오기
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, nickname, profile_image_url')
          .eq('auth_user_id', user.id)
          .single()

        if (!profileError && profileData) {
          // 리뷰 작성자의 profile ID 가져오기
          const { data: reviewAuthorProfile, error: reviewAuthorError } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', reviewData.user_id)
            .single()

          if (!reviewAuthorError && reviewAuthorProfile) {
            // 리뷰 작성자에게 알림 생성 (자기 자신이 아닌 경우에만)
            if (profileId !== reviewAuthorProfile.id) {
              await createReviewLikeNotification(
                reviewId,
                kindergartenName,
                profileId, // fromUserId는 현재 사용자의 profile ID
                profileData.nickname || profileData.full_name,
                profileData.profile_image_url || '',
                reviewAuthorProfile.id // toUserId는 리뷰 작성자의 profile ID
              )
            }
          }
        }
      } catch (notificationError) {
        console.error('리뷰 좋아요 알림 생성 오류:', notificationError)
        // 알림 생성 실패해도 좋아요 기능은 정상 작동
      }
    } else if (!isHelpful && wasHelpful) {
      // 좋아요를 취소했을 때 알림 삭제
      try {
        const { deleteReviewLikeNotification } = await import('./notifications')
        
        // 리뷰 작성자의 profile ID 가져오기
        const { data: reviewAuthorProfile, error: reviewAuthorError } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', reviewData.user_id)
          .single()

        if (!reviewAuthorError && reviewAuthorProfile) {
          // 리뷰 작성자에게 알림 삭제 (자기 자신이 아닌 경우에만)
          if (profileId !== reviewAuthorProfile.id) {
            await deleteReviewLikeNotification(
              reviewId,
              profileId, // fromUserId는 현재 사용자의 profile ID
              reviewAuthorProfile.id // toUserId는 리뷰 작성자의 profile ID
            )
          }
        }
      } catch (notificationError) {
        console.error('리뷰 좋아요 알림 삭제 오류:', notificationError)
        // 알림 삭제 실패해도 좋아요 기능은 정상 작동
      }
    }

    return {
      isHelpful,
      helpfulCount: helpfulCount || 0
    }
  } catch (error) {
    console.error('도움됨 토글 실패:', error)
    throw error
  }
}

/**
 * 리뷰 이미지 업로드
 */
async function uploadReviewImages(reviewId: string, images: File[]): Promise<string[]> {
  const uploadPromises = images.map(async (image, index) => {
    const fileExt = image.name.split('.').pop()
    const fileName = `${reviewId}/${index}_${Date.now()}.${fileExt}`
    const filePath = `kindergarten-reviews/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('kindergarten-reviews')
      .upload(filePath, image)

    if (uploadError) {
      console.error('이미지 업로드 오류:', uploadError)
      throw uploadError
    }

    const { data } = supabase.storage
      .from('kindergarten-reviews')
      .getPublicUrl(filePath)

    return data.publicUrl
  })

  return Promise.all(uploadPromises)
}

/**
 * 사용자의 특정 유치원 리뷰 조회
 */
export async function getUserReview(kindergartenCode: string): Promise<KindergartenReview | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return null
    }

    const { data, error } = await supabase
      .from('kindergarten_reviews')
      .select(`
        *,
        images:kindergarten_review_images (
          id,
          review_id,
          image_url,
          image_order,
          created_at
        )
      `)
      .eq('kindergarten_code', kindergartenCode)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .maybeSingle() // single() 대신 maybeSingle() 사용

    if (error) {
      console.error('사용자 리뷰 조회 오류:', error)
      // 테이블이 없거나 권한 문제인 경우 null 반환
      return null
    }

    if (data) {
      // 사용자 프로필 정보 추가
      try {
        // profiles 테이블에서 auth_user_id로 조회
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, nickname, profile_image_url, children_info')
          .eq('auth_user_id', data.user_id)
          .maybeSingle()
        
        if (profileError) {
          console.warn('profiles 테이블 조회 실패, 기본값 사용:', profileError)
          // profiles 테이블이 없는 경우 기본값 사용
          return {
            ...data,
            user_profile: {
              full_name: '익명',
              nickname: '익명',
              profile_image_url: null
            }
          }
        }
        
        return {
          ...data,
          user_profile: profile
        }
      } catch (profileError) {
        console.warn('사용자 프로필 로딩 실패:', profileError)
        return {
          ...data,
          user_profile: {
            full_name: '익명',
            nickname: '익명',
            profile_image_url: null
          }
        }
      }
    }

    return data
  } catch (error) {
    console.error('사용자 리뷰 조회 실패:', error)
    return null
  }
}
