import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 관리자 API 인증 확인 헬퍼 함수
 * 프로덕션 환경에서는 반드시 활성화해야 함
 */
export async function verifyAdminAuth(request: NextRequest): Promise<{
  authorized: boolean
  error?: string
  supabase?: ReturnType<typeof createClient>
}> {
  // 개발 환경에서는 환경 변수로 인증 우회 가능 (프로덕션에서는 제거)
  if (process.env.NODE_ENV === 'development' && process.env.ADMIN_BYPASS_AUTH === 'true') {
    console.warn('⚠️ 관리자 인증이 우회되었습니다. 프로덕션에서는 반드시 비활성화하세요.')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return { authorized: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    return { authorized: true, supabase }
  }

  // 프로덕션 인증 로직
  // 방법 1: Authorization 헤더에서 Bearer 토큰 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    
    // TODO: 실제 관리자 토큰 검증 로직 구현
    // 예: JWT 토큰 검증, Supabase 세션 확인 등
    // 현재는 환경 변수로 관리자 토큰 설정
    const adminToken = process.env.ADMIN_SECRET_TOKEN
    
    if (adminToken && token === adminToken) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseServiceKey) {
        return { authorized: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' }
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      return { authorized: true, supabase }
    }
  }

  // 방법 2: 쿠키에서 세션 확인
  const sessionCookie = request.cookies.get('admin_session')
  if (sessionCookie) {
    // 세션이 있으면 인증된 것으로 간주
    // 실제 프로덕션에서는 세션 토큰을 검증해야 함
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return { authorized: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    return { authorized: true, supabase }
  }

  return { 
    authorized: false, 
    error: '인증이 필요합니다. Authorization 헤더에 Bearer 토큰을 포함해주세요.' 
  }
}

/**
 * 관리자 API 라우트 래퍼
 * 인증이 필요한 API 라우트에서 사용
 */
export function withAdminAuth(
  handler: (request: NextRequest, supabase: ReturnType<typeof createClient>) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authResult = await verifyAdminAuth(request)
    
    if (!authResult.authorized || !authResult.supabase) {
      return NextResponse.json(
        { error: authResult.error || '인증에 실패했습니다.' },
        { status: 401 }
      )
    }
    
    return handler(request, authResult.supabase)
  }
}

