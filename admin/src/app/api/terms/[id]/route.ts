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

// 약관 상세 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('약관 조회 오류:', error)
      return NextResponse.json({ 
        error: '약관을 찾을 수 없습니다.'
      }, { status: 404 })
    }

    return NextResponse.json({ term: data })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 약관 수정
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { category, title, content, is_active, version } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ 
        error: '제목과 내용을 모두 입력해주세요.'
      }, { status: 400 })
    }

    // 활성화로 변경하는 경우, 같은 카테고리의 다른 활성화된 약관 비활성화
    if (is_active) {
      const { data: currentTerm } = await supabase
        .from('terms')
        .select('category')
        .eq('id', params.id)
        .single()

      if (currentTerm) {
        await supabase
          .from('terms')
          .update({ is_active: false })
          .eq('category', currentTerm.category)
          .eq('is_active', true)
          .neq('id', params.id)
      }
    }

    const updateData: any = {
      title,
      content,
      is_active,
      updated_at: new Date().toISOString()
    }

    // 버전이 변경된 경우에만 업데이트
    if (version !== undefined) {
      updateData.version = version
    }

    const { data: updatedData, error: updateError } = await supabase
      .from('terms')
      .update(updateData)
      .eq('id', params.id)
      .select()

    if (updateError) {
      console.error('약관 수정 오류:', updateError)
      return NextResponse.json({ 
        error: '약관 수정 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '약관이 수정되었습니다.',
      term: updatedData?.[0]
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 약관 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('terms')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('약관 삭제 오류:', error)
      return NextResponse.json({ 
        error: '약관 삭제 중 오류가 발생했습니다.'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: '약관이 삭제되었습니다.'
    })
  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

