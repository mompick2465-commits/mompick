import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 관리자 페이지 접근 제어 미들웨어
export function middleware(request: NextRequest) {
  // API 라우트는 별도로 처리 (각 API에서 인증 확인)
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 관리자 페이지 접근 시 인증 확인
  const adminSession = request.cookies.get('admin_session')
  const isAdminPath = request.nextUrl.pathname.startsWith('/') && 
                      request.nextUrl.pathname !== '/login'

  // 로그인 페이지는 제외
  if (request.nextUrl.pathname === '/login') {
    // 이미 로그인되어 있으면 대시보드로 리다이렉트
    if (adminSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // 개발 환경에서 인증 우회 옵션
  const bypassAuth = process.env.NODE_ENV === 'development' && 
                     process.env.ADMIN_BYPASS_AUTH === 'true'

  // 관리자 세션이 없으면 로그인 페이지로 리다이렉트
  if (isAdminPath && !adminSession && !bypassAuth) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청 경로와 일치:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

