-- pg_cron 상태 확인 쿼리

-- 1. pg_cron 작업 확인
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

-- 2. pg_cron 실행 이력 확인 (최근 20개)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-notifications')
ORDER BY start_time DESC
LIMIT 20;

-- 3. pg_net 요청 이력 확인 (최근 20개)
SELECT 
  id,
  method,
  url,
  headers,
  body,
  status_code,
  content,
  created,
  timeout_milliseconds
FROM net.http_request_queue
ORDER BY created DESC
LIMIT 20;

-- 4. pg_net 완료된 요청 확인 (최근 20개)
SELECT 
  id,
  method,
  url,
  status_code,
  content,
  created,
  completed
FROM net.http_response
ORDER BY created DESC
LIMIT 20;

