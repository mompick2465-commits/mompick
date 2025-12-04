# iOS 카카오맵 스크립트 로드 실패 해결 가이드

## 문제 증상
iOS 앱에서 카카오맵 지도 페이지 진입 시 다음과 같은 오류 발생:
```
⚡️  [error] - 카카오 맵 스크립트 로드 실패
⚡️  [error] - 현재 URL: capacitor://localhost/kindergarten-map?type=childcare
⚡️  [error] - 프로토콜: capacitor:
```

## 원인 분석

1. **crossOrigin 설정 문제**: iOS WebView에서 `crossOrigin = 'anonymous'` 설정이 카카오맵 스크립트 로드를 방해할 수 있습니다.
2. **카카오 개발자 콘솔 플랫폼 설정**: `capacitor://localhost`는 일반적인 웹 도메인이 아니므로 카카오 개발자 콘솔에서 특별한 설정이 필요할 수 있습니다.

## 해결 방법

### 1. 코드 수정 (완료)
- iOS에서 `crossOrigin` 설정을 제거했습니다.
- 이제 모든 플랫폼에서 동일한 방식으로 스크립트를 로드합니다.

### 2. 카카오 개발자 콘솔 설정

#### 2.1 플랫폼 등록
1. [카카오 개발자 콘솔](https://developers.kakao.com/)에 접속
2. 내 애플리케이션 → 애플리케이션 선택
3. **앱 설정** → **플랫폼** 메뉴로 이동

#### 2.2 Web 플랫폼 추가
1. **Web 플랫폼 등록** 클릭
2. **사이트 도메인**에 다음을 모두 추가:
   ```
   http://localhost
   http://localhost:3000
   capacitor://localhost
   ```
   > **중요**: `capacitor://localhost`도 추가해야 iOS 앱에서 작동할 수 있습니다.
3. **저장** 클릭

#### 2.3 iOS 네이티브 앱 설정 (선택사항)
만약 Web 플랫폼으로 해결되지 않는다면:
1. **iOS 플랫폼 등록** 클릭
2. **번들 ID**에 `com.mompick.app` 입력
3. **저장** 클릭

### 3. JavaScript 키 확인
1. **앱 키** 메뉴에서 **JavaScript 키** 확인
2. `.env` 파일의 `REACT_APP_KAKAO_MAP_KEY`가 올바른 JavaScript 키인지 확인

### 4. 추가 디버깅

#### 4.1 Safari Web Inspector 사용
1. Mac의 Safari에서 **개발** 메뉴 → **Simulator** → **mompick** 선택
2. 콘솔에서 네트워크 요청 확인
3. `dapi.kakao.com` 요청이 실패하는지 확인

#### 4.2 네트워크 오류 확인
- CORS 오류가 발생하는지 확인
- 403 Forbidden 오류가 발생하는지 확인
- 네트워크 연결 상태 확인

## 예상 결과

수정 후 다음과 같이 정상 작동해야 합니다:
1. 카카오맵 스크립트가 정상적으로 로드됨
2. 지도가 표시됨
3. 마커가 정상적으로 표시됨

## 추가 참고사항

### App Transport Security (ATS)
iOS는 기본적으로 HTTPS 연결을 요구합니다. 카카오맵 API는 HTTPS를 사용하므로 추가 설정이 필요하지 않습니다.

### Info.plist 설정
현재 Info.plist에는 특별한 ATS 예외 설정이 필요하지 않습니다. 카카오맵은 HTTPS를 사용하기 때문입니다.

## 문제가 지속되는 경우

1. **카카오 개발자 콘솔 확인**
   - 플랫폼 설정이 올바른지 확인
   - JavaScript 키가 올바른지 확인

2. **환경변수 확인**
   ```bash
   # .env 파일 확인
   cat .env
   ```

3. **빌드 및 동기화**
   ```bash
   npm run build
   npx cap sync ios
   ```

4. **Xcode에서 Clean Build**
   - Product → Clean Build Folder (Shift + Cmd + K)
   - 다시 빌드 및 실행

