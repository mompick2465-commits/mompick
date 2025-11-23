-- notifications 테이블 RLS 완전 비활성화

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- 2. RLS 완전 비활성화
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 3. 확인
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

-- 4. 정책이 모두 삭제되었는지 확인
SELECT COUNT(*) as remaining_policies
FROM pg_policies 
WHERE tablename = 'notifications';

-- 결과: rowsecurity가 false이고 remaining_policies가 0이어야 정상
