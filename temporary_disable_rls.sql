-- notifications 테이블 RLS 임시 비활성화 (테스트용)

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

-- 2. RLS 완전 비활성화
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 3. 확인 쿼리
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';

-- 4. 정책 확인 (정책이 모두 삭제되었는지 확인)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- 결과: rowsecurity가 false이고 정책이 없어야 정상
