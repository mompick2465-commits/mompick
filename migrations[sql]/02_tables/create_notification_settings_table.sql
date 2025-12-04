-- 알림 설정 테이블 생성
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notice BOOLEAN NOT NULL DEFAULT true,      -- 공지사항 알림
  post BOOLEAN NOT NULL DEFAULT true,       -- 게시글 알림 (like)
  comment BOOLEAN NOT NULL DEFAULT true,     -- 댓글 알림
  reply BOOLEAN NOT NULL DEFAULT true,      -- 답글 알림
  review BOOLEAN NOT NULL DEFAULT true,    -- 칭찬 알림 (review_like)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER trigger_update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- RLS 활성화
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
-- 사용자는 자신의 알림 설정만 조회 가능
DROP POLICY IF EXISTS "Users can view their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can view their own notification settings"
ON public.notification_settings
FOR SELECT
TO authenticated
USING (
  -- OAuth 사용자: auth_user_id로 확인
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE auth_user_id = auth.uid()
  )
  -- 전화번호 가입 사용자: 인증된 사용자는 자신의 설정 조회 가능
  OR auth.role() = 'authenticated'
);

-- 사용자는 자신의 알림 설정만 수정 가능
DROP POLICY IF EXISTS "Users can update their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can update their own notification settings"
ON public.notification_settings
FOR UPDATE
TO authenticated
USING (
  -- OAuth 사용자: auth_user_id로 확인
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE auth_user_id = auth.uid()
  )
  -- 전화번호 가입 사용자: 인증된 사용자는 자신의 설정 수정 가능
  OR auth.role() = 'authenticated'
)
WITH CHECK (
  -- 수정 시에도 동일한 조건 확인
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE auth_user_id = auth.uid()
  )
  OR auth.role() = 'authenticated'
);

-- 사용자는 자신의 알림 설정을 생성 가능
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can insert their own notification settings"
ON public.notification_settings
FOR INSERT
TO authenticated
WITH CHECK (
  -- OAuth 사용자: auth_user_id로 확인
  user_id IN (
    SELECT id FROM public.profiles 
    WHERE auth_user_id = auth.uid()
  )
  -- 전화번호 가입 사용자: 인증된 사용자는 자신의 설정 생성 가능
  OR auth.role() = 'authenticated'
);

-- 기존 사용자들을 위한 기본 설정 생성 (선택사항)
-- INSERT INTO public.notification_settings (user_id)
-- SELECT id FROM public.profiles
-- WHERE id NOT IN (SELECT user_id FROM public.notification_settings)
-- ON CONFLICT (user_id) DO NOTHING;

