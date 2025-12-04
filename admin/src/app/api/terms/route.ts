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

// 약관 목록 조회
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .order('category', { ascending: true })
      .order('version', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('약관 조회 오류:', error)
      return NextResponse.json({ 
        error: '데이터 조회 중 오류가 발생했습니다.',
        terms: []
      }, { status: 500 })
    }

    return NextResponse.json({ 
      terms: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      terms: []
    }, { status: 500 })
  }
}

// 약관 작성
export async function POST(request: Request) {
  try {
    const { category, title, content, is_active } = await request.json()

    if (!category || !title || !content) {
      return NextResponse.json({ 
        error: '카테고리, 제목, 내용을 모두 입력해주세요.'
      }, { status: 400 })
    }

    // 해당 카테고리의 최신 버전 확인
    const { data: existingTerms, error: checkError } = await supabase
      .from('terms')
      .select('version')
      .eq('category', category)
      .order('version', { ascending: false })
      .limit(1)

    if (checkError) {
      console.error('기존 약관 조회 오류:', checkError)
    }

    const nextVersion = existingTerms && existingTerms.length > 0 
      ? existingTerms[0].version + 1 
      : 1

    // 기존 활성화된 약관이 있으면 비활성화
    if (is_active) {
      await supabase
        .from('terms')
        .update({ is_active: false })
        .eq('category', category)
        .eq('is_active', true)
    }

    // 새 약관 생성
    const { data: insertedData, error: insertError } = await supabase
      .from('terms')
      .insert({
        category,
        title,
        content,
        version: nextVersion,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()

    if (insertError) {
      console.error('약관 생성 오류:', insertError)
      return NextResponse.json({ 
        error: '약관 생성 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '약관이 작성되었습니다.',
      term: insertedData?.[0]
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

