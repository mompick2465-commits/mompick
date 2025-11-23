import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    
    // Next.js 환경변수 방식 사용
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.',
        comments: []
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

    console.log('댓글 조회 시작 - userId:', userId)

    // 먼저 profiles에서 auth_user_id 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('auth_user_id')
      .eq('id', userId)
      .single()

    const authUserId = profile?.auth_user_id || userId

    // 사용자가 작성한 댓글 조회
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', authUserId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (commentsError) {
      console.error('댓글 조회 오류:', commentsError)
      return NextResponse.json({ 
        error: `댓글 조회 중 오류가 발생했습니다: ${commentsError.message}`,
        comments: [],
        details: commentsError
      }, { status: 500 })
    }

    console.log(`댓글 ${comments?.length || 0}개 조회됨`)

    // 댓글이 없으면 바로 반환
    if (!comments || comments.length === 0) {
      return NextResponse.json({ 
        comments: [],
        count: 0
      })
    }

    // 각 댓글의 게시글 정보 가져오기
    const commentsWithPosts = await Promise.all(
      comments.map(async (comment) => {
        // 댓글이 달린 게시글 정보 조회
        const { data: post } = await supabase
          .from('community_posts')
          .select('id, content, category, created_at')
          .eq('id', comment.post_id)
          .single()

        // 답글 수 조회 (parent_id가 현재 댓글 id인 답글들)
        const { count: repliesCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', comment.id)
          .eq('is_deleted', false)

        return {
          ...comment,
          post: post || null,
          replies_count: repliesCount || 0
        }
      })
    )

    return NextResponse.json({ 
      comments: commentsWithPosts,
      count: commentsWithPosts.length
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      comments: []
    }, { status: 500 })
  }
}

