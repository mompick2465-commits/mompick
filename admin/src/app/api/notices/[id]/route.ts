import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 공지사항 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { title, content } = await request.json()
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams

    if (!title || !content) {
      return NextResponse.json({ 
        error: '제목과 내용을 모두 입력해주세요.'
      }, { status: 400 })
    }

    // 해당 공지사항 알림 조회하여 notice_id 확인
    const { data: noticeData } = await supabase
      .from('notifications')
      .select('payload')
      .eq('id', id)
      .eq('type', 'notice')
      .single()

    if (!noticeData) {
      return NextResponse.json({ 
        error: '공지사항을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    const noticeId = noticeData.payload?.notice_id || id

    // 같은 notice_id를 가진 모든 공지사항 알림 조회
    const { data: allNotices, error: fetchError } = await supabase
      .from('notifications')
      .select('id, payload')
      .eq('type', 'notice')

    if (fetchError) {
      console.error('공지사항 조회 오류:', fetchError)
      return NextResponse.json({ 
        error: '공지사항 조회 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // notice_id가 일치하는 알림 필터링 (ID와 payload 함께 저장)
    const matchingNotices = (allNotices || [])
      .filter((n: any) => n.payload?.notice_id === noticeId)
      .map((n: any) => ({ id: n.id, noticeId: n.payload?.notice_id || noticeId }))

    if (matchingNotices.length === 0) {
      return NextResponse.json({ 
        error: '수정할 공지사항을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 같은 notice_id를 가진 모든 공지사항 알림 업데이트
    const updatePromises = matchingNotices.map((notice: { id: string; noticeId: string }) => {
      const newPayload = {
        notice_id: notice.noticeId, // 기존 notice_id 유지
        title,
        content,
        message: content
      }
      
      console.log(`업데이트 중: 알림 ID=${notice.id}, notice_id=${notice.noticeId}`)
      
      return supabase
        .from('notifications')
        .update({
          payload: newPayload
        })
        .eq('id', notice.id)
    })

    const results = await Promise.all(updatePromises)
    const updateError = results.find(r => r.error)?.error

    if (updateError) {
      console.error('공지사항 수정 오류:', updateError)
      console.error('업데이트 대상 알림 수:', matchingNotices.length)
      console.error('업데이트 결과:', results.map(r => ({ error: r.error, data: r.data })))
      return NextResponse.json({ 
        error: `공지사항 수정 중 오류가 발생했습니다: ${updateError.message || updateError}`
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '공지사항이 수정되었습니다.'
    })
  } catch (error: any) {
    console.error('API 라우트 오류:', error)
    console.error('에러 스택:', error?.stack)
    return NextResponse.json({ 
      error: `서버 오류가 발생했습니다: ${error?.message || String(error)}`
    }, { status: 500 })
  }
}

// 공지사항 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams

    // 해당 공지사항 알림 조회하여 notice_id 확인
    const { data: noticeData } = await supabase
      .from('notifications')
      .select('payload')
      .eq('id', id)
      .eq('type', 'notice')
      .single()

    if (!noticeData) {
      return NextResponse.json({ 
        error: '공지사항을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    const noticeId = noticeData.payload?.notice_id || id

    // 같은 notice_id를 가진 모든 공지사항 알림 조회
    const { data: allNotices, error: fetchError } = await supabase
      .from('notifications')
      .select('id, payload')
      .eq('type', 'notice')

    if (fetchError) {
      console.error('공지사항 조회 오류:', fetchError)
      return NextResponse.json({ 
        error: '공지사항 조회 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    // notice_id가 일치하는 알림 ID 필터링
    const matchingNoticeIds = (allNotices || [])
      .filter((n: any) => n.payload?.notice_id === noticeId)
      .map((n: any) => n.id)

    if (matchingNoticeIds.length === 0) {
      return NextResponse.json({ 
        error: '삭제할 공지사항을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    // 같은 notice_id를 가진 모든 공지사항 알림 삭제
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .in('id', matchingNoticeIds)

    if (deleteError) {
      console.error('공지사항 삭제 오류:', deleteError)
      return NextResponse.json({ 
        error: '공지사항 삭제 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '공지사항이 삭제되었습니다.'
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

