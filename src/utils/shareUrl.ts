/**
 * 공유 링크 URL 생성 유틸리티
 * Capacitor 앱 환경에서는 실제 웹 URL을 반환하도록 처리
 */

/**
 * 실제 웹 URL을 반환합니다.
 * Capacitor 앱 환경에서는 환경 변수나 기본 웹 URL을 사용합니다.
 */
export const getWebUrl = (): string => {
  // 환경 변수에서 웹 URL 가져오기
  const webUrl = process.env.REACT_APP_WEB_URL
  
  if (webUrl) {
    return webUrl
  }
  
  // Capacitor 환경 확인
  if (typeof window !== 'undefined') {
    const isCapacitor = (window as any).Capacitor?.isNativePlatform?.() || false
    
    if (isCapacitor) {
      // Capacitor 환경에서는 기본 웹 URL 사용 (환경 변수가 없을 경우)
      // 실제 배포된 웹 URL로 변경해야 합니다
      return 'https://mompick.ai.kr/' // TODO: 실제 웹 URL로 변경
    }
  }
  
  // 웹 환경에서는 현재 origin 사용
  return window.location.origin
}

/**
 * 공유 가능한 전체 URL을 생성합니다.
 * @param pathname 경로 (예: '/kindergarten/12345')
 * @param search 쿼리 파라미터 (예: 'sidoCode=11&sggCode=110' 또는 '?sidoCode=11&sggCode=110')
 * @returns 전체 공유 URL
 */
export const getShareUrl = (pathname: string, search: string = ''): string => {
  const baseUrl = getWebUrl()
  
  // pathname이 비어있으면 base URL만 반환
  if (!pathname) {
    return baseUrl
  }
  
  const cleanPathname = pathname.startsWith('/') ? pathname : `/${pathname}`
  const cleanSearch = search.startsWith('?') ? search : search ? `?${search}` : ''
  
  return `${baseUrl}${cleanPathname}${cleanSearch}`
}

