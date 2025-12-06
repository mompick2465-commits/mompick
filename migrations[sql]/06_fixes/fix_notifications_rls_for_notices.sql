-- notifications 테이블 RLS 정책 수정
-- 공지사항(type = 'notice')은 모든 사용자가 조회할 수 있도록 수정

-- 1. 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "notif_select_mine" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

-- 2. 수정된 SELECT 정책 생성
-- 일반 알림: 사용자가 받은 알림 또는 보낸 알림만 조회 가능
-- 공지사항(type = 'notice'): 모든 사용자가 조회 가능
CREATE POLICY "notif_select_mine_and_notices"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  -- 공지사항은 모든 사용자가 조회 가능
  type = 'notice' OR
  -- 일반 알림은 본인이 받은 것 또는 보낸 것만 조회 가능
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND (p.id = notifications.to_user_id OR p.id = notifications.from_user_id)
  )
);

-- 3. 정책 확인
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

