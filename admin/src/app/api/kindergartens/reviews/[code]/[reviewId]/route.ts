import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 리뷰 삭제 (실제 삭제 - is_deleted = true, 이미지도 삭제)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string; reviewId: string }> }
) {
  try {
    const { reviewId } = await params

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

    // 1. 리뷰 이미지 조회
    const { data: images } = await supabase
      .from('kindergarten_review_images')
      .select('image_url')
      .eq('review_id', reviewId)

    // 2. 리뷰 이미지 삭제 (CASCADE로 자동 삭제되지만 명시적으로 삭제)
    await supabase
      .from('kindergarten_review_images')
      .delete()
      .eq('review_id', reviewId)

    // 3. 리뷰 삭제 (is_deleted = true로 설정)
    const { error: deleteError } = await supabase
      .from('kindergarten_reviews')
      .update({ is_deleted: true })
      .eq('id', reviewId)

    if (deleteError) {
      console.error('리뷰 삭제 오류:', deleteError)
      return NextResponse.json({
        error: '리뷰 삭제 실패'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '리뷰가 삭제되었습니다.'
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 리뷰 숨김 처리 (is_hidden = true)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; reviewId: string }> }
) {
  try {
    const { reviewId } = await params
    const body = await request.json()
    const { action } = body // 'hide' or 'unhide'

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

    const isHidden = action === 'hide'

    const { error: updateError } = await supabase
      .from('kindergarten_reviews')
      .update({ is_hidden: isHidden })
      .eq('id', reviewId)

    if (updateError) {
      console.error('리뷰 숨김 처리 오류:', updateError)
      return NextResponse.json({
        error: '리뷰 숨김 처리 실패'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: isHidden ? '리뷰가 숨김 처리되었습니다.' : '리뷰 숨김 처리가 해제되었습니다.'
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}





