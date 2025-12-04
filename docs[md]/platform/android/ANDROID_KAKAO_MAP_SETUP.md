# 안드로이드 앱에서 카카오맵 설정 가이드

## 문제 해결 완료 사항

다음과 같은 수정사항이 적용되었습니다:

### 1. 환경변수 설정
- `.env.local` 파일에 `REACT_APP_KAKAO_MAP_KEY` 설정 필요
- API 키가 없을 때 명확한 에러 메시지 표시

### 2. 안드로이드 WebView 설정 개선
- 네트워크 보안 설정 추가 (`network_security_config.xml`)
- AndroidManifest.xml에 네트워크 보안 설정 적용
- MainActivity에서 WebView 설정 최적화

### 3. 카카오맵 로드 로직 개선
- 안드로이드 환경에서 더 긴 로드 대기 시간 적용
- CORS 문제 해결을 위한 `crossOrigin` 속성 추가
- 더 자세한 에러 메시지 및 디버깅 로그

## 설정 방법

### 1. 환경변수 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 카카오맵 API 키 (필수)
REACT_APP_KAKAO_MAP_KEY=your_kakao_map_api_key_here

# 기타 API 키들
REACT_APP_KINDERGARTEN_API_KEY=your_kindergarten_api_key_here
REACT_APP_SMS_API_KEY=your_sms_api_key_here
REACT_APP_SMS_SENDER_ID=your_sms_sender_id_here
```

### 2. 카카오맵 API 키 발급

1. [카카오 개발자 콘솔](https://developers.kakao.com/)에 접속
2. 애플리케이션 생성 또는 선택
3. 플랫폼 설정에서 **Web 플랫폼** 추가
4. 사이트 도메인 등록:
   - 개발용: `http://localhost:3000`
   - 프로덕션용: `https://yourdomain.com`
   - 안드로이드 앱용: `file://` (또는 앱의 실제 도메인)
5. **JavaScript 키** 복사하여 `REACT_APP_KAKAO_MAP_KEY`에 설정

### 3. 안드로이드 앱 빌드 및 실행

```bash
# 1. 웹 앱 빌드
npm run build

# 2. Capacitor 동기화
npx cap sync android

# 3. 안드로이드 스튜디오에서 실행
npx cap open android
```

## 디버깅 방법

### 1. 안드로이드 스튜디오에서 로그 확인
- Logcat에서 "MainActivity", "KeyHash", "카카오" 등의 키워드로 필터링
- WebView 설정 및 카카오맵 로드 상태 확인

### 2. 웹뷰 디버깅 활성화
- `capacitor.config.ts`에서 `webContentsDebuggingEnabled: true` 설정
- Chrome DevTools로 웹뷰 디버깅 가능

### 3. 네트워크 연결 확인
- 앱에서 인터넷 연결 상태 확인
- 카카오맵 API 서버 접근 가능 여부 확인

## 주의사항

1. **API 키 도메인 설정**: 카카오 개발자 콘솔에서 앱의 도메인을 정확히 등록해야 합니다.
2. **HTTPS 요구사항**: 프로덕션 환경에서는 HTTPS가 필요할 수 있습니다.
3. **위치 권한**: 안드로이드 앱에서 위치 서비스를 사용하려면 위치 권한이 필요합니다.
4. **네트워크 보안**: 개발 환경에서는 HTTP 허용이 설정되어 있지만, 프로덕션에서는 HTTPS를 권장합니다.

## 문제 해결

### 카카오맵이 여전히 표시되지 않는 경우

1. **API 키 확인**: `.env.local` 파일의 키가 올바른지 확인
2. **도메인 설정**: 카카오 개발자 콘솔에서 올바른 도메인이 등록되었는지 확인
3. **네트워크 연결**: 앱이 인터넷에 연결되어 있는지 확인
4. **권한 설정**: 위치 권한이 허용되었는지 확인
5. **로그 확인**: 안드로이드 스튜디오 Logcat에서 에러 메시지 확인

### 추가 도움이 필요한 경우

- 카카오 개발자 문서: https://developers.kakao.com/docs
- Capacitor 문서: https://capacitorjs.com/docs
- 안드로이드 WebView 문서: https://developer.android.com/reference/android/webkit/WebView
