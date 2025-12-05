# 앱 OAuth 리다이렉트 URL 오류 해결 가이드

## 문제 증상

앱에서 OAuth 로그인(카카오, 구글, 애플) 시 redirect URL 오류가 발생합니다.

## 원인 진단

### 1. 환경 변수가 빌드에 포함되지 않음

React 앱의 환경 변수는 **빌드 타임**에 주입됩니다. 따라서:
- `.env` 파일을 수정한 후 **반드시 재빌드**해야 합니다
- `npm run build` 실행 후 `npx cap sync` 실행해야 합니다

### 2. 실제 사용되는 URL 확인

앱에서 OAuth 로그인 버튼을 클릭할 때 콘솔 로그를 확인하세요:

```
🌐 웹 환경 OAuth 리다이렉트 URL: ...
또는
📱 앱 환경 OAuth 리다이렉트 URL: ...
```

이 로그에서 실제로 사용되는 URL을 확인할 수 있습니다.

## 해결 방법

### 단계 1: 환경 변수 확인

`.env` 파일에 다음이 있는지 확인:

```env
REACT_APP_WEB_URL=https://mompick.ai.kr
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
```

### 단계 2: 재빌드 및 동기화

1. **웹 빌드**:
   ```bash
   npm run build
   ```

2. **Capacitor 동기화**:
   ```bash
   npx cap sync android
   # 또는 iOS의 경우
   npx cap sync ios
   ```

3. **앱 재빌드 및 재설치**:
   - Android Studio에서 앱 재빌드
   - 또는 Xcode에서 앱 재빌드

### 단계 3: OAuth 제공자 설정 확인

각 OAuth 제공자(카카오, 구글, 애플)의 개발자 콘솔에서 다음 URL이 등록되어 있는지 확인:

```
https://mompick.ai.kr/auth/callback
```

### 단계 4: Supabase 설정 확인

Supabase 대시보드 > Authentication > URL Configuration에서:

- **Redirect URLs**에 다음이 있는지 확인:
  ```
  https://mompick.ai.kr/auth/callback
  ```

### 단계 5: 디버깅

앱에서 OAuth 로그인 버튼을 클릭하고:

1. **앱의 개발자 도구** 열기 (Android: Chrome에서 `chrome://inspect`)
2. **콘솔 로그** 확인:
   - `📱 앱 환경 OAuth 리다이렉트 URL: ...` 메시지 확인
   - 실제로 사용되는 URL이 무엇인지 확인

3. **에러 메시지** 확인:
   - 어떤 OAuth 제공자에서 오류가 발생하는지
   - 정확한 에러 메시지 내용

## 일반적인 문제

### 문제 1: `http://localhost/auth/callback` 사용됨

**원인**: `REACT_APP_WEB_URL`이 설정되지 않음

**해결**:
1. `.env` 파일에 `REACT_APP_WEB_URL=https://mompick.ai.kr` 추가
2. `npm run build` 실행
3. `npx cap sync android` (또는 ios) 실행
4. 앱 재빌드

### 문제 2: Supabase URL 사용됨

**원인**: `REACT_APP_WEB_URL`이 없어서 Supabase URL에서 자동 추출됨

**해결**: 위와 동일

### 문제 3: OAuth 제공자에서 "redirect_uri_mismatch" 오류

**원인**: OAuth 제공자(카카오, 구글, 애플)에 등록된 URL과 실제 사용되는 URL이 다름

**해결**:
1. 콘솔 로그에서 실제 사용되는 URL 확인
2. 해당 URL을 OAuth 제공자 개발자 콘솔에 등록

## 확인 체크리스트

- [ ] `.env` 파일에 `REACT_APP_WEB_URL=https://mompick.ai.kr` 설정됨
- [ ] `npm run build` 실행 완료
- [ ] `npx cap sync` 실행 완료
- [ ] 앱 재빌드 및 재설치 완료
- [ ] 카카오 개발자 콘솔에 `https://mompick.ai.kr/auth/callback` 등록됨
- [ ] 구글 클라우드 콘솔에 `https://mompick.ai.kr/auth/callback` 등록됨
- [ ] 애플 개발자 콘솔에 `https://mompick.ai.kr/auth/callback` 등록됨
- [ ] Supabase Redirect URLs에 `https://mompick.ai.kr/auth/callback` 등록됨
- [ ] 앱 콘솔 로그에서 올바른 URL이 사용되는지 확인됨

## 추가 디버깅

앱에서 OAuth 로그인 시도 후 다음 정보를 확인하세요:

1. **콘솔 로그의 리다이렉트 URL**
2. **에러 메시지의 전체 내용**
3. **어떤 OAuth 제공자에서 오류 발생** (카카오/구글/애플)

이 정보를 바탕으로 더 정확한 해결책을 제시할 수 있습니다.

