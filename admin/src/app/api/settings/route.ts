import { NextRequest, NextResponse } from 'next/server'
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

// GET: 설정 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      // 특정 키 조회
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', key)
        .single()

      if (error) {
        console.error('설정 조회 오류:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ setting: data })
    } else {
      // 전체 설정 조회
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('key')

      if (error) {
        console.error('설정 조회 오류:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ settings: data || [] })
    }
  } catch (error) {
    console.error('설정 조회 오류:', error)
    return NextResponse.json(
      { error: '설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, description } = body

    if (!key) {
      return NextResponse.json(
        { error: '설정 키가 필요합니다.' },
        { status: 400 }
      )
    }

    // 기존 설정 확인
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key)
      .single()

    let result
    if (existing) {
      // 업데이트
      const updateData: any = { value }
      if (description !== undefined) {
        updateData.description = description
      }
      
      result = await supabase
        .from('app_settings')
        .update(updateData)
        .eq('key', key)
    } else {
      // 새로 생성
      result = await supabase
        .from('app_settings')
        .insert({
          key,
          value,
          description: description || null
        })
    }

    if (result.error) {
      console.error('설정 저장 오류:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '설정이 저장되었습니다.'
    })
  } catch (error) {
    console.error('설정 저장 오류:', error)
    return NextResponse.json(
      { error: '설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

