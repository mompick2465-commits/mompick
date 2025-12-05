-- pg_cron 실행 이력 확인

-- 1. 최근 실행 이력 확인 (최근 20개)
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time,
  CASE 
    WHEN end_time IS NULL THEN EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER
    ELSE EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER
  END AS duration_seconds
FROM cron.job_run_details
WHERE jobid = 3  -- 위에서 확인한 jobid
ORDER BY start_time DESC
LIMIT 20;

-- 2. pg_net 요청 이력 확인
SELECT 
  id,
  method,
  url,
  status_code,
  content,
  created,
  completed,
  error_msg
FROM net.http_response
WHERE url LIKE '%process-scheduled-notifications%'
ORDER BY created DESC
LIMIT 20;

-- 3. pg_net 대기 중인 요청 확인
SELECT 
  id,
  method,
  url,
  headers,
  created
FROM net.http_request_queue
WHERE url LIKE '%process-scheduled-notifications%'
ORDER BY created DESC
LIMIT 10;

