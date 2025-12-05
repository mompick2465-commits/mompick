import { Capacitor } from '@capacitor/core'

/**
 * OAuth 리다이렉트 URL을 생성합니다.
 * 
 * 상황:
 * - 개발 환경: React 개발 서버 (localhost:3000) - React Router 있음
 * - 프로덕션 웹: 정적 웹사이트 (mompick.ai.kr) - React Router 없음, 순수 HTML 파일만
 * - 프로덕션 앱: Capacitor 앱 - React Router 있음
 * 
 * Supabase OAuth 동작 방식:
 * 1. signInWithOAuth 호출 → Supabase가 OAuth 제공자로 리다이렉트
 * 2. OAuth 제공자 인증 완료 → Supabase 콜백 URL로 리다이렉트 (자동 처리)
 * 3. Supabase가 인증 처리 후 → redirectTo에 지정한 URL로 최종 리다이렉트
 * 
 * 전략:
 * - 개발 웹: localhost:3000/auth/callback (React Router가 처리)
 * - 프로덕션 앱: Supabase 콜백 URL 직접 사용 (https://xxx.supabase.co/auth/v1/callback)
 *               → Supabase가 처리하고, 앱에서 세션 확인
 */
export const getOAuthRedirectUrl = (): string => {
  // 웹 환경인지 확인 (더 정확한 체크)
  const isWeb = typeof window !== 'undefined' && 
                (Capacitor.getPlatform() === 'web' || !Capacitor.isNativePlatform())
  
  if (isWeb) {
    // 웹 환경: 개발 서버(localhost:3000)에서만 작동
    // React Router가 /auth/callback 경로를 처리함
    const redirectUrl = `${window.location.origin}/auth/callback`
    console.log('🌐 웹 환경 OAuth 리다이렉트 URL:', redirectUrl)
    console.log('💡 개발 환경(localhost:3000)에서만 작동합니다')
    return redirectUrl
  }
  
  // 앱 환경: 딥링크 사용
  // 딥링크를 사용하면 웹사이트에 /auth/callback 경로가 필요 없음
  // 앱 전용 딥링크로 OAuth 콜백 처리
  const deepLinkUrl = 'mompick://auth-callback'
  
  console.log('📱 앱 환경 OAuth 리다이렉트 URL (딥링크):', deepLinkUrl)
  console.log('💡 앱에서 딥링크를 받아서 세션을 확인하고 로그인 처리합니다')
  return deepLinkUrl
}

