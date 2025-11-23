import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // URL에서 쿼리 파라미터 가져오기
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // 카테고리 필터

    // Next.js 환경변수 방식 사용 (두 가지 방식 모두 시도)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.',
        posts: []
      }, { status: 500 })
    }

    // 서버에서 Supabase 클라이언트 생성 (관리자 권한으로)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('게시글 목록 조회 시작 - category:', category || 'all')

    // 게시글 조회 쿼리 시작
    let query = supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })

    // 카테고리 필터 적용
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: posts, error: postsError } = await query

    if (postsError) {
      console.error('게시글 조회 오류:', postsError)
      return NextResponse.json({ 
        error: `게시글 조회 중 오류가 발생했습니다: ${postsError.message}`,
        posts: [],
        details: postsError
      }, { status: 500 })
    }

    console.log(`게시글 ${posts?.length || 0}개 조회됨`)

    // 게시글이 없으면 바로 반환
    if (!posts || posts.length === 0) {
      return NextResponse.json({ 
        posts: [],
        count: 0
      })
    }

    // 각 게시글에 대한 추가 정보 조회
    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        // 실제 댓글 수 조회
        const { count: actualCommentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('is_deleted', false)

        // 실제 좋아요 수 조회
        const { count: actualLikesCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)

        // 신고 수 조회 (커뮤니티 게시글 신고)
        // post_id가 있고, target_type이 community_post이거나 facility_type이 community인 경우
        const { count: reportsCount, data: reportsData } = await supabase
          .from('reports')
          .select('*', { count: 'exact' })
          .eq('post_id', post.id)

        return {
          ...post,
          actual_comments_count: actualCommentsCount || 0,
          actual_likes_count: actualLikesCount || 0,
          reports_count: reportsCount || 0,
          reports: reportsData || []
        }
      })
    )

    return NextResponse.json({ 
      posts: postsWithDetails,
      count: postsWithDetails.length
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      posts: []
    }, { status: 500 })
  }
}

