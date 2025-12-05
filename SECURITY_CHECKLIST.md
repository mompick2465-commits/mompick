# 보안 체크리스트

## ✅ 완료된 항목

### 1. 하드코딩된 API 키 제거
- [x] `scripts/playgrounds/fullSync.mjs` - 하드코딩된 Supabase 키 및 API 키 제거
- [x] `supabase/functions/kindergarten-detail/index.ts` - 하드코딩된 API 키 제거 (4곳)
- [x] `supabase/functions/sync-kindergartens/index.ts` - 하드코딩된 API 키 제거

**변경 사항:**
- 모든 API 키는 환경 변수에서만 가져오도록 수정
- 환경 변수가 없으면 에러 반환 (fallback 값 제거)

### 2. 관리자 페이지 인증 시스템 추가
- [x] `admin/src/middleware.ts` - 관리자 페이지 접근 제어 미들웨어 생성
- [x] `admin/src/lib/auth.ts` - 관리자 인증 헬퍼 함수 생성

**현재 상태:**
- 개발 환경에서는 `ADMIN_BYPASS_AUTH=true`로 인증 우회 가능
- 프로덕션 환경에서는 `ADMIN_SECRET_TOKEN` 환경 변수로 Bearer 토큰 인증 필요
- **⚠️ 중요:** 프로덕션 배포 전에 미들웨어의 주석 처리된 인증 로직을 활성화해야 함

**사용 방법:**
```typescript
// API 라우트에서 사용 예시
import { withAdminAuth } from '@/lib/auth'

export const GET = withAdminAuth(async (request, supabase) => {
  // 인증된 관리자만 접근 가능
  // ...
})
```

### 3. Supabase RLS 정책 확인
- [x] RLS 정책이 57개 파일에 399개 설정되어 있음
- [x] 주요 테이블에 RLS 활성화 및 정책 설정 확인

**주요 테이블 RLS 상태:**
- `profiles` - 사용자 프로필 보호
- `notifications` - 알림 접근 제어
- `community_posts` - 게시글 접근 제어
- `reports` - 신고 접근 제어
- `contacts` - 문의 접근 제어
- 기타 모든 주요 테이블에 RLS 정책 적용

## ⚠️ 프로덕션 배포 전 필수 확인 사항

### 1. 관리자 페이지 인증 활성화
```typescript
// admin/src/middleware.ts 파일에서 주석 해제 필요
if (isAdminPath && !adminToken) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}
```

### 2. 환경 변수 설정
다음 환경 변수들이 프로덕션 환경에 설정되어 있는지 확인:
- `ADMIN_SECRET_TOKEN` - 관리자 인증 토큰 (강력한 랜덤 문자열)
- `ADMIN_BYPASS_AUTH` - 개발 환경에서만 `true`, 프로덕션에서는 설정하지 않음

### 3. API 키 보안
- 모든 API 키가 환경 변수로 관리되는지 확인
- Git 저장소에 실제 API 키가 커밋되지 않았는지 확인
- `.env` 파일이 `.gitignore`에 포함되어 있는지 확인

### 4. Supabase 보안 설정
- Supabase 프로젝트의 RLS 정책이 모두 활성화되어 있는지 확인
- Service Role Key가 클라이언트에 노출되지 않았는지 확인
- API Rate Limiting 설정 확인

## 📝 추가 권장 사항

### 1. 로깅 및 모니터링
- 관리자 페이지 접근 로그 기록
- 실패한 인증 시도 모니터링
- 에러 추적 도구 통합 (Sentry 등)

### 2. 추가 보안 강화
- 2FA (2단계 인증) 구현
- IP 화이트리스트 설정
- 세션 타임아웃 설정
- CSRF 보호

### 3. 정기적인 보안 점검
- 의존성 취약점 스캔 (`npm audit`)
- 정기적인 보안 업데이트
- 로그 모니터링 및 이상 징후 탐지

## 🔗 관련 문서
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js 미들웨어 문서](https://nextjs.org/docs/app/building-your-application/routing/middleware)

