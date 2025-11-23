import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    
    // Next.js 환경변수 방식 사용
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.',
        comments: [],
        likes: []
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

    console.log('게시글 상세 정보 조회 시작 - postId:', postId)

    // 댓글 목록 조회
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (commentsError) {
      console.error('댓글 조회 오류:', commentsError)
    }

    // 각 댓글의 답글 수 조회
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { count: repliesCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', comment.id)
          .eq('is_deleted', false)

        return {
          ...comment,
          replies_count: repliesCount || 0
        }
      })
    )

    // 좋아요 목록 조회 (사용자 정보 포함)
    const { data: likes, error: likesError } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    if (likesError) {
      console.error('좋아요 조회 오류:', likesError)
    }

    // 좋아요 누른 사용자 정보 가져오기
    const likesWithUsers = await Promise.all(
      (likes || []).map(async (like) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, nickname, profile_image_url, user_type')
          .eq('auth_user_id', like.user_id)
          .single()

        return {
          ...like,
          user: profile || { full_name: like.username || '알 수 없음' }
        }
      })
    )

    console.log(`댓글 ${commentsWithReplies.length}개, 좋아요 ${likesWithUsers.length}개 조회됨`)

    return NextResponse.json({ 
      comments: commentsWithReplies,
      likes: likesWithUsers,
      commentsCount: commentsWithReplies.length,
      likesCount: likesWithUsers.length
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      comments: [],
      likes: []
    }, { status: 500 })
  }
}
