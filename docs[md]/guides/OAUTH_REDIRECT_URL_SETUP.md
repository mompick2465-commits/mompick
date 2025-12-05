# OAuth 리다이렉트 URL 설정 가이드

## 개요

OAuth 로그인(카카오, 구글, 애플)이 정상적으로 작동하려면 각 환경에 맞는 리다이렉트 URL을 등록해야 합니다.

## 현재 구조

### 1. 웹 환경 (개발)
- **개발 환경**: `http://localhost:3000/auth/callback`
  - React 개발 서버에서 React Router가 처리

### 2. 앱 환경 (프로덕션)
- **프로덕션 앱**: `https://xxx.supabase.co/auth/v1/callback` (Supabase 콜백 URL 직접 사용)
  - 정적 웹사이트(mompick.ai.kr)에는 React Router가 없어 `/auth/callback` 경로가 없음
  - 따라서 Supabase 콜백 URL을 직접 사용
  - Supabase가 인증을 처리한 후, 앱에서 세션을 확인하여 로그인 처리

**⚠️ 중요**: 실제 웹사이트 URL(`https://mompick.ai.kr/auth/callback`)은 **더 이상 필요하지 않습니다**.

## 각 OAuth 제공자별 설정

### 카카오 개발자 콘솔

**⚠️ 중요**: OAuth 제공자 콘솔은 HTTP/HTTPS URL만 허용합니다. 딥링크는 Supabase Redirect URLs에만 등록하면 됩니다.

1. [Kakao Developers](https://developers.kakao.com) 접속
2. 내 애플리케이션 선택
3. **카카오 로그인** > **Redirect URI** 설정:
   ```
   http://localhost:3000/auth/callback                    (개발용)
   https://xxx.supabase.co/auth/v1/callback               (프로덕션 앱용 - Supabase 콜백)
   ```
   - `xxx.supabase.co`는 실제 Supabase 프로젝트 URL로 변경하세요
   - 예: `https://fxkftrczarwuytnufprv.supabase.co/auth/v1/callback`
   - **참고**: 딥링크(`mompick://auth-callback`)는 여기에 등록할 수 없습니다. Supabase Redirect URLs에만 등록하면 됩니다.

4. **플랫폼** > **Web** > **사이트 도메인** 설정:
   ```
   http://localhost:3000                                   (개발용)
   https://xxx.supabase.co                                 (프로덕션 앱용)
   ```
   - `xxx.supabase.co`는 실제 Supabase 프로젝트 URL로 변경하세요

### 구글 클라우드 콘솔

**⚠️ 프로젝트 선택 중요:**
- 프로젝트가 여러 개인 경우, **Firebase/FCM에 사용 중인 프로젝트**를 선택하세요
- 현재 코드에서 `mompick-46b2c` 프로젝트가 Firebase에 사용 중입니다
- OAuth 클라이언트 ID도 **같은 프로젝트**에 만들어야 합니다

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 상단의 프로젝트 선택 드롭다운에서 **올바른 프로젝트 선택**
   - Firebase에 사용 중인 프로젝트: `mompick-46b2c` (또는 현재 사용 중인 프로젝트)
   - 프로젝트가 여러 개인 경우, Firebase Console에서 확인한 프로젝트 ID와 일치하는 것을 선택
3. **API 및 서비스** > **사용자 인증 정보** 이동
3. 상단의 **+ 사용자 인증 정보 만들기** 클릭 > **OAuth 클라이언트 ID** 선택
4. **애플리케이션 유형** 선택:
   - **웹 애플리케이션** 선택
5. **이름** 입력 (예: "MomPick Web Client")
6. **승인된 JavaScript 원본** 섹션에 다음 추가:
   ```
   http://localhost:3000
   https://xxx.supabase.co
   ```
   - `xxx.supabase.co`는 실제 Supabase 프로젝트 URL로 변경하세요
   - 각 URL을 한 줄씩 입력하거나 **+ URI 추가** 버튼으로 추가
   - 포트 번호 포함 (localhost:3000)
   - 프로토콜 포함 (http:// 또는 https://)
   - 마지막 슬래시(/) 제거

7. **승인된 리디렉션 URI** 섹션에 다음 추가:
   ```
   http://localhost:3000/auth/callback
   https://xxx.supabase.co/auth/v1/callback
   ```
   - `xxx.supabase.co`는 실제 Supabase 프로젝트 URL로 변경하세요
   - 예: `https://fxkftrczarwuytnufprv.supabase.co/auth/v1/callback`
   - **⚠️ 중요**: 딥링크(`mompick://auth-callback`)는 여기에 등록할 수 없습니다. OAuth 제공자는 HTTP/HTTPS URL만 허용합니다.
   - 각 URL을 한 줄씩 입력하거나 **+ URI 추가** 버튼으로 추가
   - 정확한 경로 포함 (`/auth/callback` 또는 `/auth/v1/callback`)
   - 포트 번호 포함 (localhost:3000)
   - 프로토콜 포함 (http:// 또는 https://)

8. **만들기** 버튼 클릭
9. 생성된 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사
10. Supabase 대시보드 > **Authentication** > **Providers** > **Google**에 입력:
    - Client ID (for OAuth): 생성된 클라이언트 ID 입력
    - Client Secret (for OAuth): 생성된 클라이언트 보안 비밀번호 입력

**⚠️ 주의사항:**
- 설정 변경 후 적용까지 5분~몇 시간이 걸릴 수 있습니다
- OAuth 제공자 콘솔에는 Supabase 콜백 URL을 등록합니다
- 딥링크(`mompick://auth-callback`)는 **Supabase Redirect URLs에만** 등록하면 됩니다
- 개발용(localhost)과 프로덕션용(Supabase 콜백) 모두 추가하는 것을 권장합니다

### 애플 개발자 콘솔

#### 방법 1: 기존 App ID에서 설정 (권장)

1. [Apple Developer](https://developer.apple.com) 접속
2. **Certificates, Identifiers & Profiles** > **Identifiers** 선택
3. **App IDs** 섹션에서 기존 App ID 선택 (예: `com.mompick.app`)
4. App ID 상세 페이지에서 **Sign in with Apple** 섹션 확인
5. **Edit** 버튼 클릭
6. **Sign in with Apple** 섹션에서 설정:
   - **Primary App ID**: 이미 선택되어 있을 것입니다 (`com.mompick.app`)
   - **Domains and Subdomains** 섹션에 도메인 추가:
     ```
     xxx.supabase.co
     ```
     - `xxx.supabase.co`는 실제 Supabase 프로젝트 URL로 변경하세요
     - 예: `fxkftrczarwuytnufprv.supabase.co`
     - 프로토콜(`https://`) 없이 도메인만 입력
   - **Return URLs** 섹션에 리다이렉트 URL 추가:
     ```
     https://xxx.supabase.co/auth/v1/callback
     ```
     - `xxx.supabase.co`는 실제 Supabase 프로젝트 URL로 변경하세요
     - 예: `https://fxkftrczarwuytnufprv.supabase.co/auth/v1/callback`
     - **+** 버튼을 클릭하여 추가
     - 프로토콜(`https://`) 포함하여 전체 URL 입력
     - **⚠️ 중요**: 딥링크(`mompick://auth-callback`)는 여기에 등록할 수 없습니다. Apple은 HTTP/HTTPS URL만 허용합니다. 딥링크는 Supabase Redirect URLs에만 등록하면 됩니다.
7. **Save** 클릭하여 설정 저장
8. **Continue** > **Save** 클릭하여 완료

#### 방법 2: 새 서비스 ID 생성 (선택사항)

App ID 대신 별도의 서비스 ID를 사용하려면:

1. **Identifiers** > **+** 버튼 클릭
2. **Services IDs** 선택 후 **Continue**
3. **Description** 입력 (예: "MomPick Sign In with Apple")
4. **Identifier** 입력 (예: `com.mompick.app.signin`)
5. **Sign in with Apple** 체크박스 선택
6. **Continue** > **Register** 클릭
7. 생성된 서비스 ID를 선택하고 **Sign in with Apple** 섹션에서 **Configure** 클릭
8. **Primary App ID** 선택 (`com.mompick.app`)
9. **Domains and Subdomains**와 **Return URLs** 설정:
   - **Domains and Subdomains**: `xxx.supabase.co` (실제 Supabase URL)
   - **Return URLs**: `https://xxx.supabase.co/auth/v1/callback` (실제 Supabase 콜백 URL)
   - **⚠️ 중요**: 딥링크(`mompick://auth-callback`)는 여기에 등록할 수 없습니다. Apple은 HTTP/HTTPS URL만 허용합니다. 딥링크는 Supabase Redirect URLs에만 등록하면 됩니다.
10. **Save** 클릭하여 완료

6. **Server-to-Server Notification Endpoint** (선택사항):
   - **비워두기** (권장): Supabase를 사용하는 경우 일반적으로 필요하지 않습니다
   - 이 엔드포인트는 사용자가 이메일 전달 설정을 변경하거나 계정을 삭제할 때 알림을 받기 위한 것입니다
   - 대부분의 경우 비워두어도 Apple Sign In이 정상적으로 작동합니다
   - 만약 알림을 받고 싶다면:
     - Supabase Edge Function 엔드포인트 사용:
       ```
       https://your-project-ref.supabase.co/functions/v1/apple-webhook
       ```
     - 또는 실제 웹사이트의 엔드포인트 사용:
       ```
       https://your-domain.com/api/apple-webhook
       ```

**참고**: 애플은 localhost를 지원하지 않으므로, 개발 환경에서는 다른 방법을 사용해야 할 수 있습니다.

## Supabase 대시보드 설정

1. Supabase 프로젝트 대시보드 접속
2. **Authentication** > **URL Configuration** 이동

### Site URL 설정

**⚠️ 중요**: Site URL은 **하나만** 설정할 수 있습니다.

- **프로덕션 환경**: `https://mompick.ai.kr` **반드시 설정**

**❌ 절대 하지 말아야 할 것:**
- Site URL을 `http://localhost:3000`으로 설정하면 안 됩니다!
  - `localhost:3000`은 오직 로컬 개발용입니다
  - 실제 기기에서는 `localhost:3000`에 접근할 수 없어서 OAuth가 실패합니다
- Site URL을 Supabase URL(`https://xxx.supabase.co`)로 설정하면 안 됩니다!

**이유:**
- `redirectTo`에 지정한 URL이 Redirect URLs에 등록되어 있지 않으면 Site URL로 폴백됩니다
- Site URL이 `localhost:3000`이면 실제 기기에서 접근할 수 없어서 실패합니다
- 실제 웹사이트 URL(`https://mompick.ai.kr`)을 사용해야 합니다

**참고**: 
- Site URL은 기본 리다이렉트 URL로 사용됩니다
- 앱에서는 딥링크(`mompick://auth-callback`)를 사용하므로 Site URL은 웹 환경용입니다

### Redirect URLs 설정

**⚠️ 중요**: 딥링크를 사용합니다!

코드에서 앱 환경일 때 딥링크(`mompick://auth-callback`)를 사용하도록 설정되어 있습니다.

**Redirect URLs**에는 다음 URL들을 추가하세요:

1. **Add URL** 버튼 클릭
2. 다음 URL들을 추가:
   ```
   http://localhost:3000/auth/callback                    (로컬 개발용 - 선택사항)
   mompick://auth-callback                                (프로덕션 앱용 - 필수)
   ```
   - 각 URL을 하나씩 추가
   - 딥링크 스킴(`mompick://`)도 등록 가능합니다

**참고**: 
- `https://mompick.ai.kr/auth/callback`은 **필요 없습니다**
- Supabase 콜백 URL(`https://xxx.supabase.co/auth/v1/callback`)도 **필요 없습니다**
- 앱에서는 딥링크(`mompick://auth-callback`)를 사용합니다
- 딥링크를 사용하면 웹사이트에 `/auth/callback` 경로가 필요 없습니다

**현재 설정 예시**:
- Site URL: `https://mompick.ai.kr` (프로덕션용)
- Redirect URLs:
  - `http://localhost:3000/auth/callback` (로컬 개발용 - 선택사항)
  - `mompick://auth-callback` (프로덕션 앱용 - 필수)

## 환경 변수 설정

**⚠️ 중요**: 앱에서 OAuth가 제대로 작동하려면 `.env` 파일에 Supabase URL이 설정되어 있어야 합니다!

```env
# Supabase 설정 (필수!)
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**설정 방법**:
1. 프로젝트 루트에 `.env` 파일 생성 (또는 기존 파일 수정)
2. 위의 `REACT_APP_SUPABASE_URL` 추가 (실제 Supabase URL로 변경)
   - 예: `REACT_APP_SUPABASE_URL=https://fxkftrczarwuytnufprv.supabase.co`
3. 앱 재빌드 및 재배포

**참고**: 
- `REACT_APP_WEB_URL`은 **더 이상 필요하지 않습니다**
- 앱에서는 딥링크를 사용하므로 웹사이트 URL이 필요 없습니다
- 환경 변수 변경 후에는 앱을 재빌드해야 합니다
- Android: `npx cap sync android` 후 앱 재빌드
- iOS: `npx cap sync ios` 후 앱 재빌드

## 딥링크 설정

### Android 설정

`android/app/src/main/AndroidManifest.xml`에 이미 설정되어 있습니다:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="mompick" android:host="auth-callback" />
</intent-filter>
```

### iOS 설정

`ios/App/App/Info.plist`에 이미 설정되어 있습니다:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.mompick.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>mompick</string>
        </array>
    </dict>
</array>
```

## 요약

| 환경 | 필요한 URL | 용도 |
|------|-----------|------|
| 개발 웹 | `http://localhost:3000/auth/callback` | 로컬 개발 (React Router 처리) |
| 프로덕션 앱 | `mompick://auth-callback` | 모바일 앱 OAuth (딥링크 사용) |

**중요**: 
- 앱에서 OAuth 로그인을 사용하려면 반드시 **딥링크(`mompick://auth-callback`)**를 모든 OAuth 제공자에 등록해야 합니다
- 실제 웹사이트 URL(`https://mompick.ai.kr/auth/callback`)은 **필요 없습니다**
- 딥링크를 사용하면 웹사이트에 `/auth/callback` 경로가 필요 없습니다

