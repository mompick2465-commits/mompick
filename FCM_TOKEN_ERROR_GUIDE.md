# FCM 토큰 오류 가이드

## NOT_FOUND 오류

### 의미
- FCM 토큰이 유효하지 않거나 만료됨
- 앱이 삭제되었거나 재설치됨
- Firebase 프로젝트 설정이 변경됨

### 현재 상황
- **성공: 1** - 유효한 토큰 1개로 알림 전송 성공
- **실패: 1** - 유효하지 않은 토큰 1개로 전송 실패
- **전체 토큰 수: 2** - 같은 사용자가 2개의 토큰 보유

### 자동 처리
Edge Function에서 `NOT_FOUND` 오류가 발생하면:
1. 해당 토큰을 자동으로 삭제합니다
2. 다음 알림 전송 시에는 유효한 토큰만 사용됩니다

### 확인 방법

#### 1. 데이터베이스에서 토큰 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT 
  id,
  user_id,
  platform,
  created_at,
  updated_at,
  LEFT(token, 20) || '...' as token_preview
FROM fcm_tokens
WHERE user_id = '사용자_프로필_ID'
ORDER BY updated_at DESC;
```

#### 2. Edge Function 로그 확인
- Supabase 대시보드 > Edge Functions > send-fcm-push > Logs
- "🗑️ 유효하지 않은 토큰 삭제 중" 로그 확인

### 해결 방법

#### 자동 해결 (권장)
- Edge Function이 자동으로 유효하지 않은 토큰을 삭제합니다
- 다음 알림 전송 시에는 문제가 해결됩니다

#### 수동 삭제
필요한 경우 데이터베이스에서 직접 삭제:
```sql
-- 특정 사용자의 모든 토큰 확인
SELECT * FROM fcm_tokens WHERE user_id = '사용자_프로필_ID';

-- 유효하지 않은 토큰 삭제 (선택사항)
-- DELETE FROM fcm_tokens WHERE user_id = '사용자_프로필_ID';
```

### 예상 시나리오

1. **같은 사용자가 여러 기기에서 로그인**
   - 각 기기마다 다른 토큰 생성
   - 하나의 기기에서 앱 삭제/재설치 시 해당 토큰이 무효화됨
   - → 정상적인 동작입니다

2. **앱 재설치**
   - 기존 토큰이 무효화되고 새 토큰 생성
   - → 정상적인 동작입니다

3. **Firebase 프로젝트 변경**
   - 프로젝트 ID가 변경되면 기존 토큰이 무효화됨
   - → Edge Function의 `FCM_PROJECT_ID` 확인 필요

### 결론

이 오류는 **정상적인 동작**입니다:
- ✅ 유효한 토큰으로 알림 전송 성공
- ✅ 유효하지 않은 토큰은 자동 삭제됨
- ✅ 다음 알림 전송 시 문제 없음

추가 조치가 필요하지 않습니다. Edge Function이 자동으로 처리합니다.

