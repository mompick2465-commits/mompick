import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, admin_notes } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.'
      }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 삭제요청 정보 조회
    const { data: deleteRequest, error: fetchError } = await supabase
      .from('review_delete_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !deleteRequest) {
      return NextResponse.json({ 
        error: '삭제요청을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 상태 업데이트
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { error: updateError } = await supabase
      .from('review_delete_requests')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('삭제요청 상태 업데이트 오류:', updateError)
      return NextResponse.json({ 
        error: '상태 업데이트 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // 승인된 경우 리뷰 삭제 처리
    if (status === 'approved') {
      let reviewTable = ''
      if (deleteRequest.review_type === 'playground') {
        reviewTable = 'playground_reviews'
      } else if (deleteRequest.review_type === 'kindergarten') {
        reviewTable = 'kindergarten_reviews'
      } else if (deleteRequest.review_type === 'childcare') {
        reviewTable = 'childcare_reviews'
      }

      if (reviewTable) {
        const { error: deleteError } = await supabase
          .from(reviewTable)
          .update({ is_deleted: true })
          .eq('id', deleteRequest.review_id)

        if (deleteError) {
          console.error('리뷰 삭제 오류:', deleteError)
          // 삭제 실패해도 요청 상태는 업데이트됨
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: status === 'approved' ? '삭제요청이 승인되었습니다.' : '삭제요청이 거절되었습니다.'
    })
  } catch (error) {
    console.error('삭제요청 처리 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.'
      }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 삭제요청 삭제
    const { error: deleteError } = await supabase
      .from('review_delete_requests')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('삭제요청 삭제 오류:', deleteError)
      return NextResponse.json({ 
        error: '삭제 처리 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '삭제요청 내역이 삭제되었습니다.'
    })
  } catch (error) {
    console.error('삭제요청 삭제 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}


