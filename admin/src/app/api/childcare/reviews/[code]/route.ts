import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: childcareCode } = await params

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Supabase 환경변수가 설정되지 않았습니다.'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 리뷰 정보 조회
    const { data: reviews, error: reviewsError } = await supabase
      .from('childcare_reviews')
      .select(`
        *,
        childcare_review_images(*)
      `)
      .eq('childcare_code', childcareCode)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (reviewsError) {
      console.error('리뷰 조회 오류:', reviewsError)
      return NextResponse.json({
        error: '리뷰 조회 실패'
      }, { status: 500 })
    }

    // 각 리뷰에 사용자 정보 및 이미지 추가
    const reviewsWithUserInfo = await Promise.all(
      (reviews || []).map(async (review) => {
        // user_id로 profiles 테이블에서 사용자 정보 가져오기
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, nickname, profile_image_url')
          .eq('auth_user_id', review.user_id)
          .single()

        // 리뷰 이미지 배열로 변환 (childcare_review_images를 images로 매핑)
        const images = (review.childcare_review_images || []).map((img: any) => ({
          id: img.id,
          review_id: img.review_id,
          image_url: img.image_url,
          image_order: img.image_order
        })).sort((a: any, b: any) => a.image_order - b.image_order)

        return {
          ...review,
          user_name: userProfile?.full_name || review.user_name || '알 수 없음',
          user_nickname: userProfile?.nickname || review.user_nickname,
          user_profile_image: userProfile?.profile_image_url || review.user_profile_image,
          images: images, // 이미지 배열 추가
          is_hidden: review.is_hidden || false, // 숨김 처리 상태
          is_deleted: review.is_deleted || false // 삭제 상태
        }
      })
    )

    // 평균 평점 및 리뷰 수 계산
    let averageRating = '0.0'
    let reviewCount = 0
    
    if (reviewsWithUserInfo && reviewsWithUserInfo.length > 0) {
      reviewCount = reviewsWithUserInfo.length
      const totalRating = reviewsWithUserInfo.reduce((sum, review) => sum + review.rating, 0)
      averageRating = (totalRating / reviewCount).toFixed(1)
    }

    return NextResponse.json({
      reviews: reviewsWithUserInfo || [],
      count: reviewCount,
      averageRating
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

