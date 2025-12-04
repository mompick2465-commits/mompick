-- notifications 테이블 RLS 정책 올바르게 설정

-- 1. RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (혹시 남아있을 경우)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

-- 3. 올바른 RLS 정책 생성

-- SELECT: 사용자는 자신이 받은 알림만 볼 수 있음
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- INSERT: 사용자는 다른 사용자에게 알림을 생성할 수 있음 
-- (from_user_id가 현재 사용자의 profile id와 일치해야 함)
CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    from_user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- UPDATE: 사용자는 자신이 받은 알림만 업데이트할 수 있음 (읽음 처리 등)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- 4. 정책 확인
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 5. RLS 상태 확인
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
