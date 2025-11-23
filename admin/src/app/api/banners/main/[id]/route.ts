import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// PATCH: 배너 수정
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bannerId = params.id
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

    const body = await request.json()
    const { banner_type, title, description, image_url, link_url, order_index, is_active, show_click_text, start_date, end_date } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (banner_type !== undefined) updateData.banner_type = banner_type
    if (title !== undefined) updateData.title = title || null
    if (description !== undefined) updateData.description = description || null
    if (image_url !== undefined) updateData.image_url = image_url
    if (link_url !== undefined) updateData.link_url = link_url || null
    if (order_index !== undefined) updateData.order_index = order_index
    if (is_active !== undefined) updateData.is_active = is_active
    if (show_click_text !== undefined) updateData.show_click_text = show_click_text
    if (start_date !== undefined) updateData.start_date = start_date || null
    if (end_date !== undefined) updateData.end_date = end_date || null

    const { data, error } = await supabase
      .from('ad_banners')
      .update(updateData)
      .eq('id', bannerId)
      .select()
      .single()

    if (error) {
      console.error('배너 수정 오류:', error)
      return NextResponse.json({
        error: `배너 수정 실패: ${error.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      message: '배너가 수정되었습니다.',
      banner: data
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// DELETE: 배너 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bannerId = params.id
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

    const { error } = await supabase
      .from('ad_banners')
      .delete()
      .eq('id', bannerId)

    if (error) {
      console.error('배너 삭제 오류:', error)
      return NextResponse.json({
        error: `배너 삭제 실패: ${error.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      message: '배너가 삭제되었습니다.'
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

