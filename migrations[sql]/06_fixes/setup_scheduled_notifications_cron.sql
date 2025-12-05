-- 예약 알림 자동 처리용 pg_cron 설정
-- Supabase SQL Editor에서 실행하여 주기적으로 예약 알림을 처리합니다.

-- 필요한 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 작업이 있으면 삭제 (오류 무시)
DO $$
BEGIN
  PERFORM cron.unschedule('process-scheduled-notifications');
EXCEPTION
  WHEN OTHERS THEN
    -- 작업이 없으면 무시
    NULL;
END $$;

-- 매 1분마다 예약 알림 처리 Edge Function 호출
SELECT cron.schedule(
  'process-scheduled-notifications',
  '*/1 * * * *', -- 매 1분마다 실행
  $$
  SELECT
    net.http_post(
      url := 'https://fxkftrczarwuytnufprv.supabase.co/functions/v1/process-scheduled-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4a2Z0cmN6YXJ3dXl0bnVmcHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwODM5NzgsImV4cCI6MjA3MTY1OTk3OH0.L0zzO_KooHRwJdf6z92Cla05pSH8UF7PRGVDK8lS3Ns'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- 참고: 
-- 1. YOUR_PROJECT_URL을 실제 Supabase 프로젝트 URL로 변경하세요
-- 2. YOUR_ANON_KEY를 실제 Supabase Anon Key로 변경하세요
-- 3. 또는 Edge Function에 인증을 추가하고 Service Role Key를 사용하세요

