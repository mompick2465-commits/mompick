# Google Cloud 프로젝트 선택 가이드

## 현재 상황

Google Cloud Console에 프로젝트가 2개 있습니다:
- `mompick-46b2c` (현재 Firebase/FCM에 사용 중)
- `mompick-470215` (새로 생성된 것으로 보임)

## 어떤 프로젝트를 사용해야 하나요?

### 권장 사항: `mompick-46b2c` 프로젝트 사용

**이유:**
1. 현재 코드에서 `mompick-46b2c`가 Firebase/FCM에 사용 중입니다
2. OAuth 클라이언트 ID도 **같은 프로젝트**에 만드는 것이 관리하기 편합니다
3. 모든 Google 서비스(Firebase, OAuth, FCM)를 하나의 프로젝트에서 관리할 수 있습니다

### 프로젝트 확인 방법

1. **Firebase Console에서 확인**
   - [Firebase Console](https://console.firebase.google.com/) 접속
   - 프로젝트 목록에서 MomPick 프로젝트 확인
   - 프로젝트 ID가 `mompick-46b2c`인지 확인

2. **코드에서 확인**
   - `supabase/functions/send-fcm-push/index.ts` 파일에서:
     ```typescript
     const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID') || 'mompick-46b2c'
     ```

## OAuth 클라이언트 ID 생성 방법

### 1. 올바른 프로젝트 선택

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 상단의 **프로젝트 선택** 드롭다운 클릭
3. **`mompick-46b2c`** 프로젝트 선택 (Firebase에 사용 중인 프로젝트)
4. 프로젝트가 보이지 않으면:
   - "모든 프로젝트" 선택
   - `mompick-46b2c` 검색하여 선택

### 2. OAuth 클라이언트 ID 생성

1. **API 및 서비스** > **사용자 인증 정보** 이동
2. **+ 사용자 인증 정보 만들기** > **OAuth 클라이언트 ID** 선택
3. **애플리케이션 유형**: **웹 애플리케이션** 선택
4. **이름**: "MomPick Web OAuth Client" 입력
5. **승인된 JavaScript 원본** 추가:
   ```
   http://localhost:3000
   https://your-domain.com
   ```
6. **승인된 리디렉션 URI** 추가:
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   ```
7. **만들기** 클릭
8. 생성된 **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사

### 3. Supabase에 설정

1. Supabase 대시보드 접속
2. **Authentication** > **Providers** > **Google** 이동
3. 다음 입력:
   - **Client ID (for OAuth)**: 생성된 클라이언트 ID
   - **Client Secret (for OAuth)**: 생성된 클라이언트 보안 비밀번호
4. **저장** 클릭

## 다른 프로젝트(`mompick-470215`)는 어떻게 하나요?

### 옵션 1: 삭제 (권장하지 않음)
- 다른 용도로 사용 중일 수 있으므로 삭제 전 확인 필요

### 옵션 2: 그대로 두기
- 나중에 다른 용도로 사용할 수 있으므로 그대로 두어도 됩니다
- OAuth는 `mompick-46b2c` 프로젝트에서만 사용

### 옵션 3: 통합
- 두 프로젝트를 하나로 통합하려면 Google Cloud 지원팀에 문의하거나
- 새 프로젝트의 리소스를 기존 프로젝트로 이전

## 확인 사항

OAuth 클라이언트 ID를 생성한 후 확인:
- ✅ 올바른 프로젝트(`mompick-46b2c`)에 생성되었는지
- ✅ 승인된 JavaScript 원본에 localhost와 실제 도메인 모두 추가되었는지
- ✅ 승인된 리디렉션 URI에 `/auth/callback` 경로가 포함되었는지
- ✅ Supabase에 클라이언트 ID와 Secret이 올바르게 입력되었는지

## 문제 해결

### "프로젝트를 찾을 수 없습니다" 오류
- Google Cloud Console에서 프로젝트 목록을 새로고침
- "모든 프로젝트" 옵션 선택하여 전체 목록 확인

### OAuth 로그인이 작동하지 않음
- 생성한 프로젝트가 올바른지 확인
- Supabase에 입력한 클라이언트 ID가 올바른지 확인
- 설정 변경 후 5분~몇 시간 대기 (적용 시간 필요)

