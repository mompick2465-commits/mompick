# FCM 푸시 알림 동작 가이드

## 📱 FCM 알림이 표시되는 방식

### 1. **백그라운드 (앱이 완전히 종료된 상태)**
- ✅ **정상 동작**: 시스템 알림으로 표시됨
- 알림을 탭하면 앱이 실행되고 `pushNotificationActionPerformed` 리스너가 호출됨
- Android 시스템 트레이에 알림이 표시됨

### 2. **포그라운드 (앱이 열려있는 상태)**
- ⚠️ **현재 상태**: Capacitor Push Notifications 플러그인은 기본적으로 포그라운드 알림을 자동으로 표시하지 않음
- `pushNotificationReceived` 리스너에서 알림을 받지만, 시스템 알림으로 표시되지 않음
- 수동으로 알림을 표시하려면 추가 구현이 필요함

### 3. **백그라운드 (앱이 백그라운드에 있는 상태)**
- ✅ **정상 동작**: 시스템 알림으로 표시됨
- 알림을 탭하면 앱이 포그라운드로 전환되고 `pushNotificationActionPerformed` 리스너가 호출됨

## 🔍 FCM 토큰 등록 디버깅

### 콘솔 로그 확인 사항

앱 실행 시 다음 로그들이 순서대로 나타나야 합니다:

```
🔔 FCM 초기화 시작 - 플랫폼: android
🔔 권한 확인 중...
🔔 현재 권한 상태: {receive: "granted"}
✅ 푸시 알림 권한 승인됨
🔔 FCM 리스너 등록 중...
✅ FCM 리스너 등록 완료
🔔 PushNotifications.register() 호출 중...
✅ PushNotifications.register() 완료
✅ FCM 초기화 완료
✅ FCM 토큰 수신: [토큰 값]
🔔 토큰 저장 시작...
🔔 saveFCMToken 시작 - 토큰: [토큰 일부]...
🔔 Auth 사용자 확인: 있음 ([사용자 ID]) 또는 없음
🔔 프로필 조회 중...
🔔 프로필 ID: [프로필 ID]
🔔 saveTokenForProfile 시작: {profileId: "...", platform: "android", ...}
🔔 새 토큰 삽입 중...
✅ FCM 토큰 저장 완료
✅ 데이터베이스에 저장된 토큰 ID: [토큰 ID]
```

### 문제 해결 체크리스트

1. **토큰이 수신되지 않는 경우**
   - ✅ 권한이 승인되었는지 확인 (`receive: "granted"`)
   - ✅ `PushNotifications.register()` 호출이 완료되었는지 확인
   - ✅ `registrationError` 리스너에 오류가 없는지 확인

2. **토큰은 수신되지만 저장되지 않는 경우**
   - ✅ 사용자 프로필이 존재하는지 확인
   - ✅ `fcm_tokens` 테이블의 RLS 정책 확인
   - ✅ Supabase 연결 상태 확인

3. **데이터베이스에 토큰이 없는 경우**
   - ✅ 콘솔에서 "FCM 토큰 저장 완료" 로그 확인
   - ✅ Supabase 대시보드에서 `fcm_tokens` 테이블 직접 확인
   - ✅ RLS 정책으로 인한 삽입 실패 여부 확인

## 🧪 테스트 방법

### 1. FCM 토큰 등록 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT * FROM fcm_tokens 
WHERE user_id = '사용자_프로필_ID'
ORDER BY created_at DESC;
```

### 2. 수동으로 푸시 알림 전송 테스트
```javascript
// 브라우저 콘솔에서 실행
const { data, error } = await supabase.functions.invoke('send-fcm-push', {
  body: {
    userId: '사용자_프로필_ID',
    title: '테스트 알림',
    body: '이것은 테스트 알림입니다.',
    data: {
      type: 'comment',
      notificationId: 'test-id',
      postId: 'test-post-id'
    }
  }
});
console.log('결과:', data, error);
```

### 3. Edge Function 로그 확인
- Supabase 대시보드 > Edge Functions > send-fcm-push > Logs
- 토큰 조회, FCM 전송 결과 확인

## 📝 현재 구현 상태

### ✅ 구현 완료
- FCM 토큰 등록 및 저장
- 백그라운드 알림 수신
- 알림 클릭 시 앱 열기
- 상세한 디버깅 로그

### ⚠️ 개선 필요
- 포그라운드 알림 표시 (현재는 리스너만 호출됨)
- 알림 채널 설정 (Android 8.0+)
- 알림 아이콘 및 사운드 커스터마이징

## 🔧 포그라운드 알림 표시 (선택사항)

포그라운드에서도 알림을 표시하려면 추가 구현이 필요합니다:

```typescript
// src/utils/fcm.ts에 추가
import { LocalNotifications } from '@capacitor/local-notifications'

PushNotifications.addListener('pushNotificationReceived', async (notification) => {
  console.log('📱 푸시 알림 수신 (포그라운드):', notification)
  
  // 포그라운드에서도 알림 표시
  await LocalNotifications.schedule({
    notifications: [{
      title: notification.title || '새 알림',
      body: notification.body || '',
      id: Date.now(),
      extra: notification.data
    }]
  })
})
```

## 📊 알림 전송 상태 확인

Edge Function에서 반환하는 응답:
```json
{
  "message": "푸시 알림 전송 완료",
  "sent": 1,      // 성공한 토큰 수
  "failed": 0     // 실패한 토큰 수
}
```

실패한 경우:
- 토큰이 유효하지 않음 (자동으로 삭제됨)
- FCM 서비스 계정 키 오류
- 네트워크 오류

