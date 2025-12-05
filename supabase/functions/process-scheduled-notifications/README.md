# 예약 알림 자동 처리 Edge Function

이 Edge Function은 예약 시간이 된 알림을 자동으로 발송합니다.

## 환경 변수 설정

Supabase Dashboard에서 다음 환경 변수를 설정해야 합니다:

1. **SUPABASE_URL**: Supabase 프로젝트 URL
   - 예: `https://fxkftrczarwuytnufprv.supabase.co`

2. **SUPABASE_SERVICE_ROLE_KEY**: Supabase Service Role Key
   - Supabase Dashboard → Settings → API → service_role key

## 설정 방법

1. Supabase Dashboard 접속
2. Edge Functions → `process-scheduled-notifications` 선택
3. Settings → Secrets 탭
4. 다음 환경 변수 추가:
   - `SUPABASE_URL`: 프로젝트 URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key

## 배포

```bash
supabase functions deploy process-scheduled-notifications
```

## pg_cron 설정

SQL 파일(`migrations[sql]/06_fixes/setup_scheduled_notifications_cron.sql`)을 실행하여 1분마다 자동 실행되도록 설정합니다.

## 테스트

```bash
curl -X POST https://fxkftrczarwuytnufprv.supabase.co/functions/v1/process-scheduled-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

