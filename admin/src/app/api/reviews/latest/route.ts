import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')

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

    // 각 타입별로 최신 리뷰 가져오기
    const [playgroundReviews, kindergartenReviews, childcareReviews] = await Promise.all([
      // 놀이시설 리뷰
      supabase
        .from('playground_reviews')
        .select(`
          *,
          playground_review_images(*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit),
      
      // 유치원 리뷰
      supabase
        .from('kindergarten_reviews')
        .select(`
          *,
          kindergarten_review_images(*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit),
      
      // 어린이집 리뷰
      supabase
        .from('childcare_reviews')
        .select(`
          *,
          childcare_review_images(*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)
    ])

    const allReviews: any[] = []

    // 놀이시설 리뷰 처리
    if (playgroundReviews.data) {
      for (const review of playgroundReviews.data) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, nickname, profile_image_url')
          .eq('auth_user_id', review.user_id)
          .single()

        // 시설명 가져오기
        const { data: playground } = await supabase
          .from('playgrounds')
          .select('name')
          .eq('id', review.playground_id)
          .single()

        const images = (review.playground_review_images || []).map((img: any) => ({
          id: img.id,
          image_url: img.image_url,
          image_order: img.image_order
        })).sort((a: any, b: any) => a.image_order - b.image_order)

        allReviews.push({
          id: review.id,
          review_type: 'playground',
          facility_id: review.playground_id,
          facility_name: playground?.name,
          user_id: review.user_id,
          user_name: userProfile?.full_name || review.user_name || '알 수 없음',
          user_nickname: userProfile?.nickname || review.user_nickname,
          user_profile_image: userProfile?.profile_image_url || review.user_profile_image,
          rating: review.rating,
          content: review.content,
          helpful_count: review.helpful_count || 0,
          created_at: review.created_at,
          images,
          is_hidden: review.is_hidden || false,
          is_deleted: review.is_deleted || false
        })
      }
    }

    // 유치원 리뷰 처리
    if (kindergartenReviews.data) {
      for (const review of kindergartenReviews.data) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, nickname, profile_image_url')
          .eq('auth_user_id', review.user_id)
          .single()

        // 시설명 가져오기
        const { data: kindergarten } = await supabase
          .from('kindergartens_cache')
          .select('kindername')
          .eq('kindercode', review.kindergarten_code)
          .single()

        const images = (review.kindergarten_review_images || []).map((img: any) => ({
          id: img.id,
          image_url: img.image_url,
          image_order: img.image_order
        })).sort((a: any, b: any) => a.image_order - b.image_order)

        allReviews.push({
          id: review.id,
          review_type: 'kindergarten',
          facility_id: review.kindergarten_code,
          facility_name: kindergarten?.kindername,
          user_id: review.user_id,
          user_name: userProfile?.full_name || review.user_name || '알 수 없음',
          user_nickname: userProfile?.nickname || review.user_nickname,
          user_profile_image: userProfile?.profile_image_url || review.user_profile_image,
          rating: review.rating,
          content: review.content,
          helpful_count: review.helpful_count || 0,
          created_at: review.created_at,
          images,
          is_hidden: review.is_hidden || false,
          is_deleted: review.is_deleted || false
        })
      }
    }

    // 어린이집 리뷰 처리
    if (childcareReviews.data) {
      for (const review of childcareReviews.data) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, nickname, profile_image_url')
          .eq('auth_user_id', review.user_id)
          .single()

        // 시설명 가져오기
        const { data: childcare } = await supabase
          .from('childcare_cache')
          .select('crname')
          .eq('crcode', review.childcare_code)
          .single()

        const images = (review.childcare_review_images || []).map((img: any) => ({
          id: img.id,
          image_url: img.image_url,
          image_order: img.image_order
        })).sort((a: any, b: any) => a.image_order - b.image_order)

        allReviews.push({
          id: review.id,
          review_type: 'childcare',
          facility_id: review.childcare_code,
          facility_name: childcare?.crname,
          user_id: review.user_id,
          user_name: userProfile?.full_name || review.user_name || '알 수 없음',
          user_nickname: userProfile?.nickname || review.user_nickname,
          user_profile_image: userProfile?.profile_image_url || review.user_profile_image,
          rating: review.rating,
          content: review.content,
          helpful_count: review.helpful_count || 0,
          created_at: review.created_at,
          images,
          is_hidden: review.is_hidden || false,
          is_deleted: review.is_deleted || false
        })
      }
    }

    // 최신순으로 정렬하고 limit만큼만 반환
    const sortedReviews = allReviews
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    return NextResponse.json({
      reviews: sortedReviews,
      count: sortedReviews.length
    })

  } catch (error) {
    console.error('최신 리뷰 조회 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.',
      reviews: [],
      count: 0
    }, { status: 500 })
  }
}


