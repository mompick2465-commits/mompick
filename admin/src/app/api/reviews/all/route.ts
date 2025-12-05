import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const reviewType = searchParams.get('type') || 'all' // all, playground, kindergarten, childcare
    const search = searchParams.get('search') || ''

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

    const offset = (page - 1) * limit

    // 각 타입별로 칭찬 가져오기
    const fetchReviews = async (type: 'playground' | 'kindergarten' | 'childcare') => {
      let query: any

      if (type === 'playground') {
        query = supabase
          .from('playground_reviews')
          .select(`
            *,
            playground_review_images(*)
          `)
          .eq('is_deleted', false)
      } else if (type === 'kindergarten') {
        query = supabase
          .from('kindergarten_reviews')
          .select(`
            *,
            kindergarten_review_images(*)
          `)
          .eq('is_deleted', false)
      } else {
        query = supabase
          .from('childcare_reviews')
          .select(`
            *,
            childcare_review_images(*)
          `)
          .eq('is_deleted', false)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`${type} 리뷰 조회 오류:`, error)
        return []
      }

      return data || []
    }

    // 모든 타입의 칭찬 가져오기
    let allReviews: any[] = []

    if (reviewType === 'all') {
      const [playgroundReviews, kindergartenReviews, childcareReviews] = await Promise.all([
        fetchReviews('playground'),
        fetchReviews('kindergarten'),
        fetchReviews('childcare')
      ])
      allReviews = [...playgroundReviews, ...kindergartenReviews, ...childcareReviews]
    } else if (reviewType === 'playground') {
      allReviews = await fetchReviews('playground')
    } else if (reviewType === 'kindergarten') {
      allReviews = await fetchReviews('kindergarten')
    } else if (reviewType === 'childcare') {
      allReviews = await fetchReviews('childcare')
    }

    // 사용자 정보 및 시설명 추가
    const reviewsWithDetails = await Promise.all(
      allReviews.map(async (review: any) => {
        // 사용자 정보 가져오기
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, nickname, profile_image_url')
          .eq('auth_user_id', review.user_id)
          .single()

        let facilityName = null
        let reviewType = ''

        // 타입 판별 및 시설명 가져오기
        if (review.playground_id) {
          reviewType = 'playground'
          const { data: playground } = await supabase
            .from('playgrounds')
            .select('name')
            .eq('id', review.playground_id)
            .single()
          facilityName = playground?.name
        } else if (review.kindergarten_code) {
          reviewType = 'kindergarten'
          const { data: kindergarten } = await supabase
            .from('kindergarten_cache')
            .select('kindername')
            .eq('kindercode', review.kindergarten_code)
            .single()
          facilityName = kindergarten?.kindername
        } else if (review.childcare_code) {
          reviewType = 'childcare'
          const { data: childcare } = await supabase
            .from('childcare_cache')
            .select('crname')
            .eq('crcode', review.childcare_code)
            .single()
          facilityName = childcare?.crname
        }

        // 이미지 처리
        const images = (review.playground_review_images || 
                       review.kindergarten_review_images || 
                       review.childcare_review_images || [])
          .map((img: any) => ({
            id: img.id,
            image_url: img.image_url,
            image_order: img.image_order || 0
          }))
          .sort((a: any, b: any) => a.image_order - b.image_order)

        return {
          id: review.id,
          review_type: reviewType,
          facility_id: review.playground_id || review.kindergarten_code || review.childcare_code,
          facility_name: facilityName,
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
        }
      })
    )

    // 검색 필터링
    let filteredReviews = reviewsWithDetails
    if (search) {
      const searchLower = search.toLowerCase()
      filteredReviews = reviewsWithDetails.filter(review => 
        review.content?.toLowerCase().includes(searchLower) ||
        review.user_name?.toLowerCase().includes(searchLower) ||
        review.facility_name?.toLowerCase().includes(searchLower)
      )
    }

    // 총 개수
    const totalCount = filteredReviews.length

    // 페이지네이션
    const paginatedReviews = filteredReviews.slice(offset, offset + limit)

    return NextResponse.json({
      reviews: paginatedReviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('전체 칭찬 목록 조회 오류:', error)
    return NextResponse.json({
      error: '전체 칭찬 목록 조회 실패',
      reviews: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    }, { status: 500 })
  }
}

