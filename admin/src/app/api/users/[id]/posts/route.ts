import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    
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

    console.log('게시글 조회 시작 - userId:', userId)
    
    // 사용자가 작성한 게시글 조회
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })

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

    // 각 게시글에 대한 댓글 수와 좋아요 수 추가 (이미 테이블에 있음)
    const postsWithDetails = await Promise.all(
      (posts || []).map(async (post) => {
        // 실제 댓글 수 조회 (테이블의 comments_count와 비교용)
        const { count: actualCommentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('is_deleted', false)

        // 실제 좋아요 수 조회 (테이블의 likes_count와 비교용)
        const { count: actualLikesCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)

        return {
          ...post,
          actual_comments_count: actualCommentsCount || 0,
          actual_likes_count: actualLikesCount || 0
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

