# FCM 푸시 알림 구현 요약

## 구현 완료 사항

### 1. 데이터베이스
- ✅ `fcm_tokens` 테이블 생성 SQL (`create_fcm_tokens_table.sql`)
- ✅ RLS 정책 설정 완료

### 2. 클라이언트 코드
- ✅ `src/utils/fcm.ts`: FCM 초기화 및 토큰 관리 유틸리티
- ✅ `src/utils/sendPushNotification.ts`: 푸시 알림 전송 유틸리티
- ✅ `src/utils/notifications.ts`: 알림 생성 시 FCM 푸시 전송 로직 추가
- ✅ `src/App.tsx`: 앱 시작 시 FCM 초기화

### 3. 서버 코드
- ✅ `supabase/functions/send-fcm-push/index.ts`: Supabase Edge Function

### 4. 설정 파일
- ✅ `capacitor.config.ts`: Push Notifications 플러그인 설정 추가
- ✅ `package.json`: @capacitor/push-notifications 패키지 설치 완료

### 5. 문서
- ✅ `FIREBASE_SETUP.md`: Firebase 설정 가이드

## 주요 기능

### 모바일 전용 FCM 초기화
- 웹에서는 FCM이 초기화되지 않음
- Android 및 iOS에서만 작동
- 앱 시작 시 자동으로 FCM 토큰 등록

### 알림 생성 시 자동 푸시 전송
- 좋아요 알림 생성 시 푸시 전송
- 댓글 알림 생성 시 푸시 전송
- 답글 알림 생성 시 푸시 전송
- 리뷰 좋아요 알림 생성 시 푸시 전송

### 토큰 관리
- 로그인 시 자동 토큰 등록
- 토큰 업데이트 지원
- 로그아웃 시 토큰 삭제 (선택사항)

## 다음 단계

### 1. 데이터베이스 설정
```sql
-- Supabase SQL Editor에서 실행
-- create_fcm_tokens_table.sql 파일의 내용 실행
```

### 2. Firebase 설정
- `FIREBASE_SETUP.md` 파일을 참고하여 Firebase 프로젝트 설정
- Android: `google-services.json` 파일 추가
- iOS: `GoogleService-Info.plist` 파일 추가 및 APNs 설정

### 3. Supabase Edge Function 배포
```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# Edge Function 배포
supabase functions deploy send-fcm-push

# 환경 변수 설정
supabase secrets set FCM_SERVER_KEY=your-fcm-server-key
```

### 4. 앱 빌드 및 테스트
```bash
# Android
npm run build
npx cap sync android
npx cap open android

# iOS
npm run build
npx cap sync ios
npx cap open ios
```

## 주의사항

1. **웹에서는 FCM이 작동하지 않음**: `Capacitor.getPlatform() === 'web'` 체크로 웹에서 실행 방지
2. **RLS 정책**: 전화번호 가입 사용자의 경우 RLS 정책이 제대로 작동하지 않을 수 있음. 필요시 Service Role Key 사용 고려
3. **토큰 저장**: 로그인 후에만 토큰이 저장되므로, 로그인 전에는 푸시 알림을 받을 수 없음
4. **Edge Function**: FCM_SERVER_KEY 환경 변수가 올바르게 설정되어야 함

## 테스트 방법

1. 모바일 앱 실행 및 로그인
2. Supabase Dashboard에서 `fcm_tokens` 테이블 확인
3. 다른 사용자로 로그인하여 알림 생성
4. 푸시 알림 수신 확인

## 문제 해결

### 토큰이 저장되지 않는 경우
- 로그인 상태 확인
- RLS 정책 확인
- 브라우저 콘솔에서 오류 메시지 확인

### 푸시 알림이 오지 않는 경우
- Firebase 설정 확인
- Edge Function 로그 확인
- FCM_SERVER_KEY 환경 변수 확인
- 디바이스 알림 권한 확인


