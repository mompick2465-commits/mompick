import { NextResponse } from 'next/server'

export async function DELETE(
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
        success: false
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

    console.log('사용자 삭제 시작 - userId:', userId)

    // 먼저 profiles 테이블에서 auth_user_id 찾기
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('auth_user_id, id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('프로필 조회 오류:', profileError)
      return NextResponse.json({ 
        error: '사용자를 찾을 수 없습니다.',
        success: false
      }, { status: 404 })
    }

    const authUserId = profile.auth_user_id || userId
    const profileId = profile.id

    // 삭제 작업들을 순차적으로 진행
    const deleteResults = {
      comments: 0,
      post_likes: 0,
      community_posts: 0,
      childcare_reviews: 0,
      childcare_helpful: 0,
      favorites: 0,
      notifications: 0,
      reports: 0,
      storage: false,
      auth: false,
      profile: false
    }

    try {
      // 1. 댓글 삭제 (작성한 댓글)
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('user_id', authUserId)
      
      if (commentsError) console.error('댓글 삭제 오류:', commentsError)
      else console.log('댓글 삭제 완료')

      // 2. 좋아요 삭제
      const { error: likesError } = await supabase
        .from('post_likes')
        .delete()
        .eq('user_id', authUserId)
      
      if (likesError) console.error('좋아요 삭제 오류:', likesError)
      else console.log('좋아요 삭제 완료')

      // 3. 커뮤니티 게시글 삭제
      const { error: postsError } = await supabase
        .from('community_posts')
        .delete()
        .eq('author_id', authUserId)
      
      if (postsError) console.error('게시글 삭제 오류:', postsError)
      else console.log('게시글 삭제 완료')

      // 4. 어린이집 리뷰 삭제
      const { error: reviewsError } = await supabase
        .from('childcare_reviews')
        .delete()
        .eq('user_id', authUserId)
      
      if (reviewsError) console.error('리뷰 삭제 오류:', reviewsError)
      else console.log('리뷰 삭제 완료')

      // 5. 리뷰 도움됨 삭제
      const { error: helpfulError } = await supabase
        .from('childcare_helpful')
        .delete()
        .eq('user_id', authUserId)
      
      if (helpfulError) console.error('도움됨 삭제 오류:', helpfulError)
      else console.log('도움됨 삭제 완료')

      // 6. 찜 목록 삭제
      const { error: favoritesError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', authUserId)
      
      if (favoritesError) console.error('찜 삭제 오류:', favoritesError)
      else console.log('찜 삭제 완료')

      // 7. 알림 삭제 (보낸 알림, 받은 알림)
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .or(`user_id.eq.${authUserId},sender_id.eq.${authUserId}`)
      
      if (notificationsError) console.error('알림 삭제 오류:', notificationsError)
      else console.log('알림 삭제 완료')

      // 8. 신고 삭제 (신고한 내역)
      const { error: reportsError } = await supabase
        .from('reports')
        .delete()
        .eq('reporter_id', authUserId)
      
      if (reportsError) console.error('신고 삭제 오류:', reportsError)
      else console.log('신고 삭제 완료')

      // 9. Storage에서 프로필 이미지 삭제
      try {
        const { data: files } = await supabase
          .storage
          .from('profile-images')
          .list(authUserId)

        if (files && files.length > 0) {
          const filePaths = files.map(file => `${authUserId}/${file.name}`)
          const { error: storageError } = await supabase
            .storage
            .from('profile-images')
            .remove(filePaths)
          
          if (storageError) console.error('Storage 삭제 오류:', storageError)
          else {
            deleteResults.storage = true
            console.log('Storage 이미지 삭제 완료:', filePaths.length, '개')
          }
        }
      } catch (storageErr) {
        console.error('Storage 삭제 중 오류:', storageErr)
      }

      // 10. profiles 테이블에서 삭제
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId)
      
      if (profileDeleteError) {
        console.error('프로필 삭제 오류:', profileDeleteError)
        return NextResponse.json({ 
          error: '프로필 삭제 중 오류가 발생했습니다.',
          success: false,
          results: deleteResults
        }, { status: 500 })
      }

      deleteResults.profile = true
      console.log('프로필 삭제 완료')

      // 11. auth.users에서 삭제 (관리자 API 사용)
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUserId)
        
        if (authDeleteError) {
          console.error('Auth 사용자 삭제 오류:', authDeleteError)
        } else {
          deleteResults.auth = true
          console.log('Auth 사용자 삭제 완료')
        }
      } catch (authErr) {
        console.error('Auth 삭제 중 오류:', authErr)
      }

      console.log('사용자 삭제 완료:', deleteResults)

      return NextResponse.json({ 
        success: true,
        message: '사용자와 관련된 모든 데이터가 삭제되었습니다.',
        results: deleteResults
      })

    } catch (error) {
      console.error('삭제 작업 중 오류:', error)
      return NextResponse.json({ 
        error: '일부 데이터 삭제 중 오류가 발생했습니다.',
        success: false,
        results: deleteResults
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      success: false
    }, { status: 500 })
  }
}

