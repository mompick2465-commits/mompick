-- 예약 알림 자동 처리용 pg_cron 재설정
-- pg_cron이 제대로 작동하지 않을 때 사용

-- 1. 기존 작업 완전히 삭제
DO $$
DECLARE
  job_id INTEGER;
BEGIN
  -- jobname으로 jobid 찾기
  SELECT jobid INTO job_id
  FROM cron.job
  WHERE jobname = 'process-scheduled-notifications';
  
  -- 작업이 있으면 삭제
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
    RAISE NOTICE '기존 작업 삭제됨: jobid = %', job_id;
  ELSE
    RAISE NOTICE '삭제할 작업이 없습니다.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '작업 삭제 중 오류 (무시): %', SQLERRM;
END $$;

-- 2. 필요한 확장 확인
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. 새 작업 등록
DO $$
DECLARE
  new_job_id INTEGER;
BEGIN
  -- cron.schedule 실행 및 jobid 반환
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
  ) INTO new_job_id;
  
  RAISE NOTICE '새 작업 등록됨: jobid = %', new_job_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '작업 등록 중 오류: %', SQLERRM;
END $$;

-- 4. 등록된 작업 확인
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'process-scheduled-notifications';

