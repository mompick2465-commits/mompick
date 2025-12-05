-- 간단한 pg_cron 설정 (직접 실행)

-- 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 작업 삭제
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'process-scheduled-notifications';

-- 새 작업 등록
SELECT cron.schedule(
  'process-scheduled-notifications',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fxkftrczarwuytnufprv.supabase.co/functions/v1/process-scheduled-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4a2Z0cmN6YXJ3dXl0bnVmcHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwODM5NzgsImV4cCI6MjA3MTY1OTk3OH0.L0zzO_KooHRwJdf6z92Cla05pSH8UF7PRGVDK8lS3Ns'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 작업 확인
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-notifications';

