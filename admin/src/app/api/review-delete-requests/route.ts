import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.',
        requests: []
      }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 삭제요청 목록 조회
    const { data, error } = await supabase
      .from('review_delete_requests')
      .select('id, review_id, review_type, requester_id, status, request_reason, admin_notes, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('삭제요청 조회 오류:', error)
      return NextResponse.json({ 
        error: '데이터 조회 중 오류가 발생했습니다.',
        requests: []
      }, { status: 500 })
    }
    
    // 디버깅: request_reason 확인
    console.log('조회된 삭제요청 데이터 샘플:', data?.[0])

    // 각 요청에 대한 추가 정보 조회
    const requestsWithDetails = await Promise.all(
      (data || []).map(async (request) => {
        // 요청자 정보 조회
        const { data: requester } = await supabase
          .from('profiles')
          .select('id, full_name, nickname, profile_image_url, user_type, auth_user_id')
          .eq('id', request.requester_id)
          .single()

        // 리뷰 정보 조회 (review_type에 따라 다른 테이블)
        let reviewData: any = null
        let reviewAuthor: any = null
        let reviewImages: any[] = []

        if (request.review_type === 'playground') {
          const { data: review } = await supabase
            .from('playground_reviews')
            .select('id, user_id, content, rating, created_at, playground_name')
            .eq('id', request.review_id)
            .single()
          
          if (review) {
            reviewData = review
            // 리뷰 작성자 정보
            const { data: author } = await supabase
              .from('profiles')
              .select('id, full_name, nickname, profile_image_url, auth_user_id')
              .eq('auth_user_id', review.user_id)
              .single()
            reviewAuthor = author
            
            // 리뷰 이미지 조회
            const { data: images } = await supabase
              .from('playground_review_images')
              .select('id, image_url, image_order')
              .eq('review_id', review.id)
              .order('image_order', { ascending: true })
            reviewImages = images || []
          }
        } else if (request.review_type === 'kindergarten') {
          const { data: review } = await supabase
            .from('kindergarten_reviews')
            .select('id, user_id, content, rating, created_at, kindergarten_name')
            .eq('id', request.review_id)
            .single()
          
          if (review) {
            reviewData = review
            const { data: author } = await supabase
              .from('profiles')
              .select('id, full_name, nickname, profile_image_url, auth_user_id')
              .eq('auth_user_id', review.user_id)
              .single()
            reviewAuthor = author
            
            // 리뷰 이미지 조회
            const { data: images } = await supabase
              .from('kindergarten_review_images')
              .select('id, image_url, image_order')
              .eq('review_id', review.id)
              .order('image_order', { ascending: true })
            reviewImages = images || []
          }
        } else if (request.review_type === 'childcare') {
          const { data: review } = await supabase
            .from('childcare_reviews')
            .select('id, user_id, content, rating, created_at, childcare_name')
            .eq('id', request.review_id)
            .single()
          
          if (review) {
            reviewData = review
            const { data: author } = await supabase
              .from('profiles')
              .select('id, full_name, nickname, profile_image_url, auth_user_id')
              .eq('auth_user_id', review.user_id)
              .single()
            reviewAuthor = author
            
            // 리뷰 이미지 조회
            const { data: images } = await supabase
              .from('childcare_review_images')
              .select('id, image_url, image_order')
              .eq('review_id', review.id)
              .order('image_order', { ascending: true })
            reviewImages = images || []
          }
        }

        return {
          ...request,
          request_reason: request.request_reason || null, // 명시적으로 포함
          requester,
          review: reviewData ? {
            ...reviewData,
            images: reviewImages
          } : null,
          reviewAuthor,
        }
      })
    )

    // 디버깅: 최종 응답 데이터 확인
    console.log('최종 응답 데이터 샘플:', requestsWithDetails?.[0])
    console.log('request_reason 포함 여부:', requestsWithDetails?.[0]?.request_reason)
    
    return NextResponse.json({ 
      requests: requestsWithDetails,
      count: requestsWithDetails.length
    })
  } catch (error) {
    console.error('삭제요청 목록 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      requests: []
    }, { status: 500 })
  }
}

