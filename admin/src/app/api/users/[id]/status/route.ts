import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    const { is_active } = await request.json()
    
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

    console.log('사용자 상태 변경 시작 - userId:', userId, 'is_active:', is_active)

    // profiles 테이블에서 is_active 업데이트
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('상태 변경 오류:', error)
      return NextResponse.json({ 
        error: `상태 변경 중 오류가 발생했습니다: ${error.message}`,
        success: false
      }, { status: 500 })
    }

    console.log('사용자 상태 변경 완료:', data)

    return NextResponse.json({ 
      success: true,
      message: `사용자가 ${is_active ? '활성화' : '비활성화'}되었습니다.`,
      user: data
    })

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      success: false
    }, { status: 500 })
  }
}

