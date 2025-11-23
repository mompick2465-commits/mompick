-- 최근 N일간 로그인한 활성 사용자 수를 반환하는 함수
-- Supabase SQL Editor에서 실행하여 함수를 생성하세요

CREATE OR REPLACE FUNCTION get_active_users_count(days_ago INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_count INTEGER;
  date_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  -- N일 전 날짜 계산
  date_threshold := NOW() - (days_ago || ' days')::INTERVAL;
  
  -- auth.users 테이블에서 최근 N일간 로그인한 고유 사용자 수 계산
  SELECT COUNT(DISTINCT id)
  INTO active_count
  FROM auth.users
  WHERE last_sign_in_at >= date_threshold
    AND last_sign_in_at IS NOT NULL;
  
  RETURN COALESCE(active_count, 0);
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_active_users_count(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_users_count(INTEGER) TO anon;





