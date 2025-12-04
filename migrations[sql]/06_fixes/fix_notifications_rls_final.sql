-- notifications 테이블 RLS 정책 수정
-- from_user_id가 Profile ID를 사용하도록 정책 변경

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

-- 기존 트리거 삭제 (이미 존재하는 경우)
DROP TRIGGER IF EXISTS trigger_update_notification_created_at ON notifications;

-- 수정된 RLS 정책 생성

-- SELECT: 사용자는 자신이 받은 알림만 볼 수 있음 (Profile ID 또는 Auth UID 모두 지원)
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

-- 트리거 재생성
CREATE TRIGGER trigger_update_notification_created_at
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_created_at();

-- 정책 확인
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;
