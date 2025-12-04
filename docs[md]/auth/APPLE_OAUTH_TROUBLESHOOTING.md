# 애플 로그인 OAuth 에러 해결 가이드

## 에러 메시지
```
Unable to exchange external code: ...
error: server_error
error_code: unexpected_failure
```

## 원인
이 에러는 Supabase가 Apple로부터 받은 인증 코드를 토큰으로 교환하는 과정에서 실패했을 때 발생합니다.

## 해결 방법

### 1단계: JWT (Secret Key) 확인 및 재생성

JWT는 6개월마다 만료되므로, 만료되었을 수 있습니다.

#### JWT 생성 스크립트 실행

1. **필수 패키지 설치 확인**:
   ```bash
   npm install jsonwebtoken
   ```

2. **Key 파일 확인**:
   - `scripts/AuthKey_C3ZVH98F9B.p8` 파일이 존재하는지 확인
   - 없으면 Apple Developer Portal에서 다운로드:
     1. [Apple Developer Portal](https://developer.apple.com/account/) 로그인
     2. "인정합니다, ID 및 약력" > "키(국문)" 이동
     3. Key ID `C3ZVH98F9B` 클릭
     4. Key 파일(.p8) 다운로드
     5. `scripts/` 폴더에 `AuthKey_C3ZVH98F9B.p8`로 저장

3. **JWT 생성**:
   ```bash
   node scripts/generate-apple-jwt.js
   ```

4. **생성된 JWT 복사**:
   - 스크립트가 출력하는 긴 문자열(JWT) 전체를 복사

### 2단계: Supabase 대시보드 설정 확인

1. [Supabase Dashboard](https://app.supabase.com) 로그인
2. 프로젝트 선택
3. **"Authentication"** > **"Providers"** 이동
4. **"Apple"** 제공자 찾기
5. 다음 설정 확인:

   - ✅ **Enable Apple provider**: 활성화되어 있는지 확인
   - ✅ **Services ID** (또는 Client ID): `com.mompick.app.signin` (정확히 일치해야 함)
   - ✅ **Secret Key**: 1단계에서 생성한 JWT를 붙여넣기
   
   **참고**: Team ID는 JWT 생성 시 사용되며, JWT 내부에 포함되어 있으므로 별도로 입력할 필요가 없습니다.

6. **"Save"** 클릭

### 3단계: Apple Developer Portal 설정 확인

#### Service ID 설정

1. [Apple Developer Portal](https://developer.apple.com/account/) 로그인
2. **"인정합니다, ID 및 약력"** > **"ID 및 약력(한문)"** 이동
3. Service ID `com.mompick.app.signin` 클릭
4. **"Sign in with Apple"** 섹션 클릭
5. **"Edit"** 버튼 클릭 (있는 경우)
6. **Return URLs 확인**:
   - Supabase 프로젝트의 콜백 URL이 등록되어 있어야 함:
     ```
     https://[your-project-ref].supabase.co/auth/v1/callback
     ```
   - Supabase 프로젝트 URL 확인:
     1. Supabase Dashboard > Settings > API
     2. "Project URL" 확인 (예: `https://abcdefghijklmnop.supabase.co`)
     3. Return URL: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
   
7. **Domains and Subdomains**:
   - `supabase.co` 가 등록되어 있는지 확인

### 4단계: Redirect URLs 확인

Supabase Dashboard에서:

1. **"Authentication"** > **"URL Configuration"** 이동
2. **"Redirect URLs"** 섹션 확인
3. 다음 URL들이 등록되어 있는지 확인:
   ```
   http://localhost:3000/auth/callback
   https://[your-domain]/auth/callback
   capacitor://localhost/auth/callback
   ```

### 5단계: 테스트

1. 브라우저 캐시 및 쿠키 삭제
2. 시크릿 모드에서 테스트
3. 회원가입 페이지에서 애플 로그인 다시 시도

## 문제가 계속되는 경우

### 체크리스트

- [ ] JWT가 최근 6개월 이내에 생성되었는가?
- [ ] Supabase의 Service ID가 `com.mompick.app.signin`과 정확히 일치하는가?
- [ ] Secret Key에 JWT가 올바르게 입력되었는가? (`.p8` 파일 내용이 아닌 JWT)
- [ ] JWT 생성 시 Team ID (`2ZUHMYMMV4`)가 올바르게 포함되었는가? (JWT 내부에 포함됨)
- [ ] Apple Developer Portal의 Return URL에 Supabase 콜백 URL이 등록되어 있는가?
- [ ] Apple Developer Portal의 Domains에 `supabase.co`가 등록되어 있는가?
- [ ] Supabase의 Redirect URLs에 필요한 URL들이 모두 등록되어 있는가?

### 추가 확인 사항

1. **Apple Developer 계정 상태**: 
   - Apple Developer Program에 활성 멤버십이 있는지 확인
   - Team ID가 올바른지 확인

2. **Service ID 활성화**:
   - Service ID가 활성화되어 있는지 확인
   - "Sign in with Apple" 기능이 활성화되어 있는지 확인

3. **네트워크 문제**:
   - 방화벽이나 VPN이 Apple 인증 서버 접근을 차단하지 않는지 확인
   - `appleid.apple.com` 도메인 접근 가능 여부 확인

## 빠른 재설정 가이드

1. **JWT 재생성**:
   ```bash
   node scripts/generate-apple-jwt.js
   ```

2. **Supabase에 새 JWT 입력**:
   - Dashboard > Authentication > Providers > Apple
   - Secret Key 필드에 새 JWT 붙여넣기
   - Save

3. **테스트**:
   - 시크릿 모드에서 애플 로그인 재시도

## 참고 문서

- [APPLE_SIGN_IN_SETUP.md](./APPLE_SIGN_IN_SETUP.md) - 전체 설정 가이드
- [Supabase Apple OAuth 문서](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Sign in with Apple 문서](https://developer.apple.com/sign-in-with-apple/)

