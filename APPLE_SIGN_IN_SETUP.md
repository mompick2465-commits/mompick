# 애플 로그인(Sign in with Apple) 설정 가이드

## 개요
회원가입 페이지의 4번째 버튼인 애플 로그인을 활성화하기 위한 설정 가이드입니다.

## 1. iOS 앱 설정 (Xcode)

### 1.1 Capabilities 추가
✅ **이미 완료됨**: `ios/App/App/App.entitlements` 파일에 Sign in with Apple capability가 추가되었습니다.

### 1.2 Xcode에서 확인
1. Xcode에서 `ios/App/App.xcworkspace` 열기
2. 프로젝트 네비게이터에서 `App` 타겟 선택
3. "Signing & Capabilities" 탭으로 이동
4. "+ Capability" 버튼 클릭
5. "Sign in with Apple" 추가 확인

## 2. Apple Developer 설정

### 2.1 App ID 설정
1. [Apple Developer Portal](https://developer.apple.com/account/)에 로그인
2. **"인정합니다, ID 및 약력"** (Certificates, Identifiers & Profiles) 클릭
   - 왼쪽 메뉴에서 "인정합니다, ID 및 약력" 섹션 찾기
3. **"인정(국문)"** (Certificates) 또는 **"ID 및 약력(한문)"** (Identifiers) 클릭
4. **"App IDs"** 선택
5. 앱의 App ID 선택 (예: `com.mompick.app`)
   - 없으면 "+" 버튼으로 새로 생성
6. "Sign in with Apple" 기능 활성화
7. "Save" 또는 "저장" 클릭

### 2.2 Service ID 생성 (웹용)
1. **"인정합니다, ID 및 약력"** > **"ID 및 약력(한문)"** (Identifiers) 이동
2. **"+"** 버튼 클릭 (우측 상단)
3. **"Services IDs"** 선택 후 **"Continue"** 또는 **"계속"** 클릭
4. Description: `MomPick Web Sign In`
5. Identifier: `com.mompick.app.signin` (고유한 값)
6. **"Sign in with Apple"** 체크박스 활성화
7. **"Configure"** 또는 **"구성"** 클릭
8. Primary App ID: 앱의 App ID 선택 (2.1에서 설정한 App ID) ✅ 이미 선택됨: `com.mompick.app`
9. **Website URLs 설정** (현재 화면에서 입력):

   #### Domains and Subdomains (도메인 및 서브도메인)
   Supabase 프로젝트의 도메인을 입력합니다:
   ```
   supabase.co
   ```
   - 또는 자신의 커스텀 도메인을 사용하는 경우 해당 도메인 입력
   - 쉼표로 구분하여 여러 도메인 입력 가능
   
   **참고**: Supabase URL 형식은 `https://[project-ref].supabase.co`이므로, 도메인 부분인 `supabase.co`만 입력합니다.

   #### Return URLs (리턴 URL)
   Supabase OAuth 콜백 URL을 입력합니다:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
   
   **실제 입력 예시** (Supabase 프로젝트 URL 확인 필요):
   ```
   https://abcdefghijklmnop.supabase.co/auth/v1/callback
   ```
   
   **Supabase 프로젝트 URL 확인 방법**:
   1. [Supabase Dashboard](https://app.supabase.com)에 로그인
   2. 프로젝트 선택
   3. Settings > API에서 "Project URL" 확인
   4. 예: `https://abcdefghijklmnop.supabase.co` → Return URL은 `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
   
   **중요 사항**:
   - 모든 Return URL은 `https://`로 시작해야 합니다 (Apple 요구사항)
   - `http://localhost`는 개발 환경에서만 제한적으로 사용 가능 (프로덕션에서는 https만 허용)
   - 여러 URL을 입력하려면 쉼표로 구분: `https://url1.com/callback, https://url2.com/callback`

10. **"Done"** 또는 **"완료"** 클릭
11. **"Continue"** 또는 **"계속"** 클릭
12. **"Save"** 또는 **"저장"** 클릭

### 2.2-1 Service ID의 Client Secret 찾기 (Supabase 설정용) ⚠️ 중요!

**⚠️ Client Secret이 보이지 않는 경우:**
Apple Developer Portal에서 Service ID의 Client Secret이 직접 보이지 않는 경우가 있습니다. 이 경우 **Key 파일(.p8)을 사용하여 JWT를 생성**해야 합니다 (2.2-2 섹션 참고).

**Service ID의 Client Secret을 찾는 방법:**

Service ID를 생성한 후, Supabase에 필요한 Client Secret을 찾아야 합니다:

1. **Service ID 상세 페이지로 이동**:
   - **"인정합니다, ID 및 약력"** > **"ID 및 약력(한문)"** (Identifiers) 이동
   - 생성한 Service ID (예: `com.mompick.app.signin`) 클릭

2. **"Sign in with Apple" 섹션 클릭**:
   - Service ID 상세 페이지에서 **"Sign in with Apple"** 행을 찾습니다
   - 현재 화면: `Sign In with Apple | 2ZUHMYMMV4.com.mompick.app (2 Website URLs)`
   - **이 "Sign in with Apple" 텍스트 또는 오른쪽의 설정 아이콘을 클릭**합니다
   - 또는 **"Edit"** 버튼이 있다면 클릭

3. **Web Authentication Configuration 화면에서**:
   - "Sign in with Apple" 설정 화면이 열립니다
   - 이 화면에서 **"Client Secret"** 섹션을 찾습니다
   - **"Generate a new Client Secret"** 또는 **"Client Secret"** 버튼/링크 클릭
   - 생성된 Client Secret이 표시됩니다 (긴 문자열, 예: `eyJraWQiOiJ...`)

4. **Client Secret이 보이지 않는 경우**:
   - **방법 A**: "Sign in with Apple" 설정 화면에서 아래로 스크롤
   - **방법 B**: "Edit" 버튼이 있다면 클릭하여 편집 모드로 전환
   - **방법 C**: "Generate" 또는 "Create" 버튼 찾기
   - **방법 D**: 이미 생성되어 있다면 "View" 또는 "Show" 버튼 클릭

5. **Client Secret 복사**:
   - 생성된 Client Secret (긴 문자열, 예: `eyJraWQiOiJ...`) 전체 복사
   - **중요**: 이 Secret은 한 번만 표시되므로 즉시 복사하세요!
   - 이 값이 Supabase의 Secret Key에 들어갈 값입니다

**💡 팁**: 
- "Sign in with Apple" 행을 클릭하면 설정 화면이 열립니다
- Client Secret은 보안상 기본적으로 숨겨져 있습니다
- "Generate" 또는 "Create" 버튼을 클릭해야 생성/표시됩니다
- 이미 생성되어 있다면 "Show" 또는 "View" 버튼으로 확인할 수 있습니다
- **Keys 섹션의 Key 파일(.p8)은 이 과정과 별개입니다 - Service ID의 Client Secret을 사용하세요!**

### 2.2-2 Key 파일(.p8)로 JWT 생성 (Client Secret이 보이지 않는 경우) ⭐ 실제 해결 방법

**⚠️ Service ID 설정 화면에서 Client Secret이 보이지 않는 경우 이 방법을 사용하세요!**

이미 생성한 Key 파일(`C3ZVH98F9B`)을 사용하여 JWT를 생성합니다:

1. **Key 파일(.p8) 다운로드**:
   - **"인정합니다, ID 및 약력"** > **"키(국문)"** (Keys) 이동
   - Key ID `C3ZVH98F9B` 클릭
   - Key 파일(.p8) 다운로드
   - 파일명: `AuthKey_C3ZVH98F9B.p8` (또는 비슷한 이름)

2. **필수 패키지 설치**:
   ```bash
   npm install jsonwebtoken
   ```

3. **Key 파일을 scripts 폴더에 저장**:
   - 다운로드한 `AuthKey_C3ZVH98F9B.p8` 파일을 `scripts/` 폴더에 복사

4. **JWT 생성 스크립트 실행**:
   ```bash
   node scripts/generate-apple-jwt.js
   ```

5. **생성된 JWT 복사**:
   - 스크립트가 출력하는 긴 문자열(JWT)을 복사
   - 이 값이 Supabase의 Secret Key에 들어갈 값입니다

**스크립트 설정 값** (필요시 수정):
- `TEAM_ID`: `2ZUHMYMMV4` ✅
- `KEY_ID`: `C3ZVH98F9B` ✅
- `SERVICE_ID`: `com.mompick.app.signin` ✅
- `KEY_FILE_NAME`: `AuthKey_C3ZVH98F9B.p8`

**⚠️ 주의**: 
- JWT는 6개월간 유효합니다
- 만료되면 스크립트를 다시 실행하여 새 JWT를 생성하세요
- 생성된 JWT를 안전하게 보관하세요

### 2.3 Key 생성 (이미 완료됨)
⚠️ **주의**: 이 방법은 복잡합니다. **Service ID의 Client Secret 사용(2.2-1)을 권장합니다.**

1. **"인정합니다, ID 및 약력"** > **"키(국문)"** (Keys) 이동
2. **"+"** 버튼 클릭
3. Key Name: `MomPick Apple Sign In Key`
4. **"Sign in with Apple"** 체크박스 활성화
5. **"Configure"** 또는 **"구성"** 클릭
6. Primary App ID: 앱의 App ID 선택 (2.1에서 설정한 App ID)
7. **"Save"** 또는 **"저장"** 후 **"Continue"** > **"Register"** 또는 **"등록"** 클릭
8. **중요**: Key 파일(.p8)을 다운로드하고 안전하게 보관 (한 번만 다운로드 가능)

**⚠️ 이 Key 파일(.p8)은 Supabase에 직접 사용할 수 없습니다!**
- Supabase는 JWT 형식의 Secret Key를 요구합니다
- .p8 파일을 사용하려면 별도로 JWT 토큰을 생성해야 합니다 (복잡함)
- **권장**: Service ID의 Client Secret(2.2-1)을 사용하세요 - 훨씬 간단합니다!

## 3. Supabase 설정

### 3.1 Supabase 대시보드 설정
1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. "Authentication" > "Providers" 이동
4. "Apple" 제공자 찾기
5. "Enable Apple provider" 토글 활성화

### 3.2 Apple OAuth 설정 입력
다음 정보를 입력해야 합니다:

**⚠️ 중요**: Supabase는 JWT 형식의 Secret Key를 요구합니다. `.p8` 파일 내용을 직접 넣으면 오류가 발생합니다!

#### 방법 1: Key 파일(.p8)로 JWT 생성 (권장) ⭐ 실제 사용 방법
**⚠️ Service ID 설정 화면에서 Client Secret이 보이지 않는 경우 이 방법을 사용하세요!**

**Supabase 대시보드에서 설정해야 할 항목:**

- **Services ID** (또는 Client ID): `com.mompick.app.signin` (2.2에서 생성한 Service ID)
- **Secret Key**: **Key 파일(.p8)로 생성한 JWT 사용**
  
  **JWT 생성 방법** (2.2-2 섹션 참고):
  1. Key 파일 다운로드: Keys 섹션에서 `C3ZVH98F9B` 클릭하여 `.p8` 파일 다운로드
  2. 패키지 설치: `npm install jsonwebtoken`
  3. Key 파일을 `scripts/` 폴더에 저장: `AuthKey_C3ZVH98F9B.p8`
  4. 스크립트 실행: `node scripts/generate-apple-jwt.js`
  5. 생성된 JWT 복사 (긴 문자열)
  6. Supabase의 Secret Key 필드에 붙여넣기
  
  **💡 팁**: 
  - JWT는 6개월간 유효합니다
  - 만료되면 스크립트를 다시 실행하세요
  - 스크립트는 `scripts/generate-apple-jwt.js`에 있습니다
  - Team ID (`2ZUHMYMMV4`)는 JWT 생성 시 자동으로 포함되므로, Supabase 대시보드에는 별도로 입력할 필요가 없습니다

#### 방법 2: Key 파일(.p8)로 JWT 생성 (고급, 복잡함) ⚠️
**⚠️ 권장하지 않음**: 이 방법은 복잡하고 추가 도구가 필요합니다.

만약 이미 생성한 Key 파일(.p8)을 사용하려면:
1. Key 파일(.p8) 다운로드 (Keys 섹션에서 Key ID 클릭하여 다운로드)
2. Node.js 스크립트를 사용하여 JWT 토큰 생성 필요
3. 생성된 JWT를 Secret Key에 입력

**JWT 생성 스크립트 예시** (Node.js 필요):
```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('AuthKey_C3ZVH98F9B.p8', 'utf8');
const teamId = '2ZUHMYMMV4';
const keyId = 'C3ZVH98F9B';
const clientId = 'com.mompick.app.signin'; // Service ID

const token = jwt.sign(
  {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6개월
    aud: 'https://appleid.apple.com',
    sub: clientId
  },
  privateKey,
  {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: keyId
    }
  }
);

console.log(token);
```

**⚠️ 권장**: 방법 1 (Service ID Client Secret)을 사용하는 것이 훨씬 간단하고 안전합니다!

#### 방법 2: App ID 사용 (간단하지만 덜 안전)
- **Services ID**: 앱의 App ID (예: `com.mompick.app`)
- **Team ID**: Apple Developer 계정의 Team ID

### 3.3 Redirect URL 설정
Supabase 대시보드에서:
1. "Authentication" > "URL Configuration" 이동
2. "Redirect URLs"에 다음 추가:
   - `http://localhost:3000/auth/callback` (개발용)
   - `https://your-domain.com/auth/callback` (프로덕션용)
   - `capacitor://localhost/auth/callback` (iOS 앱용)

## 4. 코드 확인

### 4.1 회원가입 페이지
✅ **이미 구현됨**: `src/components/SignUp.tsx`의 `handleAppleLogin` 함수

```524:548:src/components/SignUp.tsx
  // 애플 OAuth 로그인
  const handleAppleLogin = async () => {
    setLoading(true)
    setError('')
    setAuthMethod('apple')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      // 애플 OAuth가 성공적으로 시작되면 리다이렉트됨
      console.log('애플 OAuth 시작됨:', data)
      
    } catch (error: any) {
      console.error('애플 로그인 오류:', error)
      setError('애플 로그인에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }
```

### 4.2 로그인 페이지
✅ **이미 구현됨**: `src/components/Login.tsx`의 `handleAppleLogin` 함수

### 4.3 OAuth 콜백 처리
✅ **이미 구현됨**: `src/components/AuthCallback.tsx`에서 애플 로그인 처리

## 5. 테스트 방법

### 5.1 웹에서 테스트
1. 개발 서버 실행: `npm run dev`
2. 회원가입 페이지로 이동: `/signup`
3. 4번째 애플 버튼 클릭
4. Apple ID로 로그인
5. 인증 완료 후 프로필 작성 단계로 이동 확인

### 5.2 iOS 앱에서 테스트
1. Xcode에서 앱 빌드 및 실행
2. 회원가입 페이지에서 애플 버튼 클릭
3. Sign in with Apple 시트 표시 확인
4. 로그인 완료 후 프로필 작성 단계로 이동 확인

## 6. 문제 해결

### 문제 1: "Sign in with Apple is not configured"
- **해결**: Apple Developer Portal에서 App ID에 Sign in with Apple capability 추가 확인

### 문제 2: "Invalid client" 오류
- **해결**: Supabase 대시보드에서 Service ID와 Team ID가 올바르게 입력되었는지 확인

### 문제 2-1: "Secret key should be a JWT" 오류 ⚠️
- **원인**: `.p8` 파일 내용을 직접 입력했을 때 발생
- **해결 방법**: **Key 파일(.p8)로 JWT 생성** (2.2-2 섹션 참고)
  1. **Key 파일 다운로드**:
     - Keys 섹션에서 Key ID `C3ZVH98F9B` 클릭
     - `.p8` 파일 다운로드
  2. **패키지 설치**:
     ```bash
     npm install jsonwebtoken
     ```
  3. **Key 파일을 scripts 폴더에 저장**:
     - `AuthKey_C3ZVH98F9B.p8` 파일을 `scripts/` 폴더에 복사
  4. **JWT 생성**:
     ```bash
     node scripts/generate-apple-jwt.js
     ```
  5. **생성된 JWT를 Supabase Secret Key에 붙여넣기**
- **참고**: 
  - Service ID 설정 화면에서 Client Secret이 보이지 않는 경우가 많습니다
  - 이 경우 Key 파일로 JWT를 생성하는 것이 표준 방법입니다
  - JWT는 6개월간 유효하며, 만료되면 다시 생성하세요

### 문제 3: Redirect URL 오류
- **해결**: 
  - Supabase 대시보드의 Redirect URLs에 올바른 URL 추가
  - Apple Developer Portal의 Service ID Return URLs 확인

### 문제 4: iOS 앱에서 버튼이 작동하지 않음
- **해결**: 
  - Xcode에서 Sign in with Apple capability 확인
  - App.entitlements 파일 확인
  - 실제 기기에서 테스트 (시뮬레이터에서는 제한적)

## 7. 주의사항

1. **Team ID**: Apple Developer 계정의 Team ID는 10자리 문자열입니다
2. **Service ID**: 웹용 Sign in with Apple을 사용하려면 Service ID가 필요합니다
3. **Key 파일**: Key 파일(.p8)은 한 번만 다운로드 가능하므로 안전하게 보관하세요
4. **테스트**: 실제 iOS 기기에서 테스트하는 것이 좋습니다 (시뮬레이터 제한)

## 8. 추가 리소스

- [Apple Sign in with Apple 문서](https://developer.apple.com/sign-in-with-apple/)
- [Supabase Apple OAuth 가이드](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Capacitor Sign in with Apple 플러그인](https://capacitorjs.com/docs/apis/apple-sign-in) (필요시)

---

**설정 완료 후**: 모든 설정이 완료되면 회원가입 페이지의 4번째 애플 버튼이 정상적으로 작동합니다.

