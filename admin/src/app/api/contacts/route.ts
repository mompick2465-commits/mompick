import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // 모든 문의사항 조회
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          nickname,
          profile_image_url,
          user_type,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('문의사항 조회 오류:', error)
      return NextResponse.json(
        { error: '문의사항 조회 실패', details: error.message },
        { status: 500 }
      )
    }

    // 사용자 정보 매핑
    const contactsWithUserInfo = (contacts || []).map((contact: any) => {
      const profile = contact.profiles
      return {
        ...contact,
        user: profile ? {
          id: profile.id,
          full_name: profile.full_name,
          nickname: profile.nickname,
          profile_image_url: profile.profile_image_url,
          user_type: profile.user_type,
          email: profile.email
        } : null
      }
    })

    return NextResponse.json({
      contacts: contactsWithUserInfo,
      count: contactsWithUserInfo.length
    })
  } catch (error: any) {
    console.error('문의사항 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, admin_response, admin_notes } = body

    if (!id) {
      return NextResponse.json(
        { error: '문의사항 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (admin_response !== undefined) updateData.admin_response = admin_response
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes

    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('문의사항 업데이트 오류:', error)
      return NextResponse.json(
        { error: '문의사항 업데이트 실패', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ contact: data })
  } catch (error: any) {
    console.error('문의사항 업데이트 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    )
  }
}






