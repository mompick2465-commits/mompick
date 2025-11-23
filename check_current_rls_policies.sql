-- 현재 notifications 테이블의 RLS 정책 상태 확인

-- 1. RLS 활성화 상태 확인
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '활성화됨'
    ELSE '비활성화됨'
  END as rls_status
FROM pg_tables 
WHERE tablename = 'notifications';

-- 2. 현재 적용된 정책들 확인
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 3. 현재 인증된 사용자 확인 (테스트용)
SELECT auth.uid() as current_user_id;

-- 4. notifications 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
