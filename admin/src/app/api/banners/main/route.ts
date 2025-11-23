import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET: 특정 타입의 배너 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bannerType = searchParams.get('type') || 'splash' // 'splash' 또는 'modal'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Supabase 환경변수가 설정되지 않았습니다.',
        banners: []
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data, error } = await supabase
      .from('ad_banners')
      .select('*')
      .eq('banner_type', bannerType)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('배너 조회 오류:', error)
      return NextResponse.json({
        error: '배너 조회 중 오류가 발생했습니다.',
        banners: []
      }, { status: 500 })
    }

    return NextResponse.json({
      banners: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.',
      banners: []
    }, { status: 500 })
  }
}

// POST: 배너 추가
export async function POST(request: Request) {
  try {
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

    if (!banner_type || !image_url) {
      return NextResponse.json({
        error: '배너 타입과 이미지 URL은 필수입니다.'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ad_banners')
      .insert([{
        banner_type,
        title: title || null,
        description: description || null,
        image_url,
        link_url: link_url || null,
        order_index: order_index || 0,
        is_active: is_active !== undefined ? is_active : true,
        show_click_text: show_click_text || false,
        start_date: start_date || null,
        end_date: end_date || null
      }])
      .select()
      .single()

    if (error) {
      console.error('배너 추가 오류:', error)
      return NextResponse.json({
        error: `배너 추가 실패: ${error.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      message: '배너가 추가되었습니다.',
      banner: data
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

