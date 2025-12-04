-- notifications 테이블 완전한 스키마 + RLS 정책

-- 확장
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) 기존 테이블 삭제 (필요시)
-- DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2) 테이블 생성 (기존 테이블이 있다면 컬럼만 추가/수정)
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL CHECK (type IN ('reply','like','mention','system')),
  post_id       UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id    UUID NULL REFERENCES public.comments(id) ON DELETE SET NULL,
  from_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- 보낸이 (profile.id)
  to_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- 받는이 (profile.id)
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,                              -- 필요시 추가 정보
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) 자기 자신에게 알림 금지 (원치 않으면 제거)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_no_self_notify'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_no_self_notify
      CHECK (from_user_id <> to_user_id);
  END IF;
END $$;

-- 4) 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notif_to_user_id     ON public.notifications(to_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_from_user_id   ON public.notifications(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_post_comment   ON public.notifications(post_id, comment_id);

-- 5) RLS 활성화
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6) 기존 정책 제거
DROP POLICY IF EXISTS "notif_select_mine"        ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_sender_only" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_read_only"   ON public.notifications;
DROP POLICY IF EXISTS "notif_delete_owner"       ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- 7) RLS 정책 생성

-- 1) SELECT: 로그인 사용자는 본인 관련 알림만 조회 (받은 것 + 내가 보낸 것)
CREATE POLICY "notif_select_mine"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND (p.id = notifications.to_user_id OR p.id = notifications.from_user_id)
  )
);

-- 2) INSERT: 로그인 사용자는 "자신의 프로필"을 보낸이로 하는 알림만 생성 가능
CREATE POLICY "notif_insert_sender_only"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.id = notifications.from_user_id
  )
);

-- 3) UPDATE: 수신자만 읽음표시(is_read) 변경 가능
CREATE POLICY "notif_update_read_only"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.id = notifications.to_user_id
  )
)
WITH CHECK (
  -- 업데이트 후에도 여전히 내가 수신자인 행만 유지
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.id = notifications.to_user_id
  )
);

-- 4) DELETE: 수신자 또는 보낸이 본인일 때 삭제 허용
CREATE POLICY "notif_delete_owner"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND (p.id = notifications.to_user_id OR p.id = notifications.from_user_id)
  )
);

-- 8) 정책 확인
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 9) RLS 상태 확인
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
