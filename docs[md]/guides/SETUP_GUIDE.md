# 맘픽 프로젝트 설정 가이드

이 문서는 맘픽 프로젝트의 모든 설정 가이드를 종합적으로 정리한 문서입니다.

## 목차

1. [환경 변수 설정](#환경-변수-설정)
2. [인증 시스템 설정](#인증-시스템-설정)
3. [Firebase 및 FCM 설정](#firebase-및-fcm-설정)
4. [카카오맵 설정](#카카오맵-설정)
5. [API 통합](#api-통합)
6. [플랫폼별 설정](#플랫폼별-설정)
7. [문제 해결](#문제-해결)

---

## 환경 변수 설정

### 필수 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# Supabase 설정
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 카카오맵 API 키 (JavaScript 키 사용)
REACT_APP_KAKAO_MAP_KEY=your_kakao_map_js_key_here

# 카카오 REST API 키 (지오코딩/역지오코딩용)
REACT_APP_KAKAO_REST_KEY=your_kakao_rest_api_key_here

# 카카오맵 네이티브 앱 키 (Android/iOS 네이티브 맵용)
KAKAO_MAP_NATIVE_KEY=your_kakao_map_native_key_here

# 유치원 정보 API 키
REACT_APP_KINDERGARTEN_API_KEY=your_kindergarten_api_key_here

# 어린이집 API 키
REACT_APP_CHILDCARE_API_KEY=your_childcare_api_key_here
REACT_APP_CHILDCARE_DETAIL_API_KEY=your_childcare_detail_api_key_here
REACT_APP_CHILDCARE_SEARCH_API_KEY=your_childcare_search_api_key_here
```

### 환경 변수 확인 방법

- **Supabase URL 및 Key**: [Supabase Dashboard](https://app.supabase.com) > Project Settings > API
- **카카오맵 API 키**: [카카오 개발자 콘솔](https://developers.kakao.com/)
- **유치원 API 키**: [유치원알리미 Open API](https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do)

---

## 인증 시스템 설정

### Supabase 인증 기본 설정

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. Authentication > Providers에서 OAuth 제공자 설정

### 카카오톡 OAuth 설정

#### 1. 카카오 개발자 콘솔 설정

1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. 애플리케이션 생성 또는 선택
3. 플랫폼 > Web > 사이트 도메인에 다음 도메인 추가:
   - `http://localhost:3000` (개발용)
   - `https://your-domain.com` (배포용)
   - `capacitor://localhost` (앱용)
   - `http://localhost` (앱용)
4. 카카오 로그인 > Redirect URI에 추가:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
5. JavaScript 키 복사

#### 2. Supabase 설정

1. Supabase Dashboard > Authentication > Providers > Kakao
2. Client ID와 Client Secret 입력
3. Redirect URL 확인

### 구글 OAuth 설정

#### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. OAuth 2.0 클라이언트 ID 생성
3. 승인된 리디렉션 URI에 추가:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

#### 2. Supabase 설정

1. Supabase Dashboard > Authentication > Providers > Google
2. Client ID와 Client Secret 입력

### 애플 로그인 설정

자세한 설정 방법은 [APPLE_SIGN_IN_SETUP.md](./APPLE_SIGN_IN_SETUP.md) 문서를 참고하세요.

#### 주요 단계

1. **Apple Developer Portal 설정**
   - App ID에 Sign in with Apple capability 추가
   - Service ID 생성 (웹용)
   - Return URL 설정: `https://[your-project-ref].supabase.co/auth/v1/callback`

2. **Supabase 설정**
   - Service ID: `com.mompick.app.signin`
   - Secret Key: Key 파일(.p8)로 생성한 JWT 또는 Service ID의 Client Secret

3. **iOS 앱 설정**
   - Xcode에서 Sign in with Apple capability 확인
   - `ios/App/App/App.entitlements` 파일 확인

자세한 내용: [APPLE_SIGN_IN_SETUP.md](./APPLE_SIGN_IN_SETUP.md)

### 애플 로그인 문제 해결

자세한 문제 해결 방법은 [APPLE_OAUTH_TROUBLESHOOTING.md](./APPLE_OAUTH_TROUBLESHOOTING.md) 문서를 참고하세요.

---

## Firebase 및 FCM 설정

### Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 추가 클릭
3. 프로젝트 이름 입력 및 Firebase Analytics 활성화

### FCM 서버 키 확인

#### 방법 1: Firebase Console에서 확인

1. Firebase Console > 프로젝트 설정 (톱니바퀴 아이콘)
2. "클라우드 메시징" 탭 이동
3. "Cloud Messaging API(기존)" 섹션 찾기
4. "사용 설정" 클릭하여 활성화
5. 페이지 새로고침 후 "서버 키" 복사

#### 방법 2: Google Cloud Console에서 확인

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. API 및 서비스 > 사용자 인증 정보 이동
4. API 키 만들기 또는 서비스 계정 키 생성

### Android 설정

자세한 설정 방법은 [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) 문서를 참고하세요.

#### 주요 단계

1. **Firebase Android 앱 추가**
   - 패키지 이름: `com.mompick.app`
   - `google-services.json` 다운로드
   - `android/app/` 디렉토리에 복사

2. **Android 프로젝트 설정**
   - `android/build.gradle`에 Google Services 플러그인 추가
   - `android/app/build.gradle`에 Firebase BoM 및 FCM 의존성 추가

3. **AndroidManifest.xml 설정**
   - 인터넷 권한 추가
   - 알림 권한 추가
   - 기본 알림 채널 설정

4. **알림 채널 생성**
   - Android 8.0 이상에서 필수
   - MainActivity에서 알림 채널 생성 코드 추가

자세한 내용: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

### iOS 설정

#### 주요 단계

1. **Firebase iOS 앱 추가**
   - 번들 ID: `com.mompick.app`
   - `GoogleService-Info.plist` 다운로드
   - `ios/App/App/` 디렉토리에 복사

2. **Podfile 설정**
   ```ruby
   pod 'Firebase/Messaging'
   ```
   - `pod install` 실행

3. **Capabilities 설정**
   - Xcode에서 Push Notifications capability 추가
   - Background Modes > Remote notifications 체크

4. **APNs 인증서 설정**
   - Apple Developer Portal에서 APNs 키 생성
   - Firebase Console에 APNs 인증 키 업로드

자세한 내용: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

### Supabase Edge Function 설정

#### Edge Function 배포

```bash
# Supabase CLI 설치 (전역 설치 없이 npx 사용 권장)
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy send-fcm-push
```

#### 환경 변수 설정

Supabase Dashboard 또는 CLI로 환경 변수 설정:

```bash
npx supabase secrets set FCM_SERVER_KEY=your-fcm-server-key
```

자세한 내용: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md), [FCM_IMPLEMENTATION_SUMMARY.md](./FCM_IMPLEMENTATION_SUMMARY.md)

### FCM 문제 해결

자세한 문제 해결 방법은 [FCM_TOKEN_ERROR_GUIDE.md](./FCM_TOKEN_ERROR_GUIDE.md) 문서를 참고하세요.

---

## 카카오맵 설정

### 카카오맵 API 키 발급

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 애플리케이션 생성 또는 선택
3. 플랫폼 설정에서 Web 플랫폼 추가
4. 사이트 도메인 등록:
   - `http://localhost:3000` (개발용)
   - `https://your-domain.com` (배포용)
   - `capacitor://localhost` (앱용)
   - `http://localhost` (앱용)
5. **JavaScript 키** 복사하여 `REACT_APP_KAKAO_MAP_KEY`에 설정
6. **REST API 키** 복사하여 `REACT_APP_KAKAO_REST_KEY`에 설정 (지오코딩용)
7. **네이티브 앱 키** 복사하여 `KAKAO_MAP_NATIVE_KEY`에 설정 (Android/iOS 네이티브 맵용)

### Android 설정

자세한 설정 방법은 [ANDROID_KAKAO_MAP_SETUP.md](./ANDROID_KAKAO_MAP_SETUP.md) 문서를 참고하세요.

### iOS 설정

자세한 설정 방법은 [IOS_KAKAO_MAP_FIX.md](./IOS_KAKAO_MAP_FIX.md) 문서를 참고하세요.

### 웹 설정

자세한 설정 방법은 [KAKAO_MAP_SETUP.md](./KAKAO_MAP_SETUP.md) 문서를 참고하세요.

---

## API 통합

### 유치원알리미 API 연동

자세한 설정 방법은 [KINDERGARTEN_API_GUIDE.md](./KINDERGARTEN_API_GUIDE.md) 문서를 참고하세요.

#### 주요 기능

- 지역별 검색
- 현재 위치 기반 검색
- 시설 정보 표시

#### API 키 발급

1. [유치원알리미 Open API](https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do) 방문
2. API 이용신청 및 키 발급
3. 환경 변수에 설정: `REACT_APP_KINDERGARTEN_API_KEY`

### API 통합 가이드

CORS 정책으로 인한 브라우저 직접 호출 제한 문제 해결 방법은 [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) 문서를 참고하세요.

#### 해결 방법

1. **백엔드 프록시 서버 구축** (권장)
2. **Netlify Functions 사용**
3. **Vercel API Routes 사용**

### 캐시 시스템

자세한 캐시 시스템 구현 가이드는 [CACHE_SYSTEM_GUIDE.md](./CACHE_SYSTEM_GUIDE.md) 문서를 참고하세요.

#### 주요 기능

- 스마트 캐시 시스템
- 보안 강화
- 성능 최적화

---

## 플랫폼별 설정

### Android 설정

#### 디바이스 연결 문제 해결

자세한 문제 해결 방법은 [ANDROID_DEVICE_CONNECTION_FIX.md](./ANDROID_DEVICE_CONNECTION_FIX.md) 문서를 참고하세요.

#### 주요 해결 방법

1. USB 디버깅 확인
2. USB 연결 모드 확인
3. ADB 재시작
4. Android Studio에서 디바이스 새로고침
5. 무선 디버깅 사용 (Android 11+)

#### 아이콘 설정

자세한 설정 방법은 [ANDROID_ICON_FIX.md](./ANDROID_ICON_FIX.md) 문서를 참고하세요.

### iOS 설정

#### 카카오맵 설정

자세한 설정 방법은 [IOS_KAKAO_MAP_FIX.md](./IOS_KAKAO_MAP_FIX.md) 문서를 참고하세요.

---

## 문제 해결

### 일반적인 문제

#### 환경 변수가 로드되지 않는 경우

1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. 환경 변수 이름이 올바른지 확인 (VITE_ 접두사 필수)
3. 개발 서버 재시작

#### OAuth 로그인이 작동하지 않는 경우

1. Redirect URL이 올바르게 설정되었는지 확인
2. OAuth 제공자 콘솔에서 도메인/URL이 등록되었는지 확인
3. Supabase 대시보드에서 제공자 설정 확인

#### FCM 토큰이 저장되지 않는 경우

1. 로그인 상태 확인
2. RLS 정책 확인
3. 브라우저 콘솔에서 오류 메시지 확인

#### 푸시 알림이 오지 않는 경우

1. Firebase 설정 확인
2. Edge Function 로그 확인
3. FCM_SERVER_KEY 환경 변수 확인
4. 디바이스 알림 권한 확인

### 문서별 상세 문제 해결

- **FCM 문제**: [FCM_TOKEN_ERROR_GUIDE.md](./FCM_TOKEN_ERROR_GUIDE.md)
- **애플 로그인 문제**: [APPLE_OAUTH_TROUBLESHOOTING.md](./APPLE_OAUTH_TROUBLESHOOTING.md)
- **Android 디바이스 연결**: [ANDROID_DEVICE_CONNECTION_FIX.md](./ANDROID_DEVICE_CONNECTION_FIX.md)

---

## 설정 체크리스트

### 초기 설정

- [ ] Supabase 프로젝트 생성
- [ ] 환경 변수 파일 (.env) 생성
- [ ] Supabase URL 및 Key 설정
- [ ] 데이터베이스 테이블 생성 (DATABASE_MIGRATION_GUIDE.md 참고)

### 인증 설정

- [ ] 카카오톡 OAuth 설정
- [ ] 구글 OAuth 설정
- [ ] 애플 로그인 설정 (iOS 앱인 경우)
- [ ] 전화번호 인증 테스트

### Firebase 설정

- [ ] Firebase 프로젝트 생성
- [ ] Android 앱 추가 및 google-services.json 설정
- [ ] iOS 앱 추가 및 GoogleService-Info.plist 설정
- [ ] FCM 서버 키 확인
- [ ] Supabase Edge Function 배포
- [ ] FCM 환경 변수 설정

### API 설정

- [ ] 카카오맵 API 키 발급 및 설정
- [ ] 유치원 API 키 발급 및 설정
- [ ] API 통합 테스트

### 플랫폼별 설정

#### Android

- [ ] 알림 채널 생성
- [ ] 카카오맵 설정
- [ ] 디바이스 연결 테스트

#### iOS

- [ ] APNs 인증서 설정
- [ ] 카카오맵 설정
- [ ] Sign in with Apple capability 확인

---

## 추가 리소스

### 공식 문서

- [Supabase 문서](https://supabase.com/docs)
- [Firebase 문서](https://firebase.google.com/docs)
- [카카오 개발자 문서](https://developers.kakao.com/docs)
- [Capacitor 문서](https://capacitorjs.com/docs)

### 프로젝트 문서

- [README.md](./README.md): 프로젝트 기본 정보
- [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md): 데이터베이스 마이그레이션 가이드
- [FCM_NOTIFICATION_GUIDE.md](./FCM_NOTIFICATION_GUIDE.md): FCM 알림 가이드

---

## 설정 완료 후 확인 사항

1. **인증 테스트**
   - 카카오톡 로그인
   - 구글 로그인
   - 애플 로그인 (iOS)
   - 전화번호 인증

2. **알림 테스트**
   - FCM 토큰 등록 확인
   - 푸시 알림 수신 테스트
   - 알림 설정 확인

3. **지도 테스트**
   - 카카오맵 표시 확인
   - 현재 위치 표시 확인
   - 시설 검색 확인

4. **API 테스트**
   - 유치원 정보 API 호출 확인
   - 캐시 시스템 작동 확인

---

이 문서는 프로젝트의 모든 설정 가이드를 종합적으로 정리한 것입니다. 각 기능에 대한 자세한 내용은 해당 문서를 참고하세요.
