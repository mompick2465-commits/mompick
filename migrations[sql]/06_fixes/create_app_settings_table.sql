-- 앱 설정 테이블 생성
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- RLS 활성화
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
-- 모든 인증된 사용자는 설정을 조회할 수 있음 (앱에서 읽기 위해)
DROP POLICY IF EXISTS "Authenticated users can view app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- 서비스 역할만 수정 가능 (관리자 페이지에서만 수정)
DROP POLICY IF EXISTS "Service role can manage app settings" ON public.app_settings;
CREATE POLICY "Service role can manage app settings"
ON public.app_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 초기 설정 데이터 삽입
INSERT INTO public.app_settings (key, value, description)
VALUES 
  (
    'update_modal',
    '{"enabled": false, "version": "1.0.0", "message": "새로운 버전이 출시되었습니다. 더 나은 서비스를 위해 업데이트해주세요.", "appStoreUrl": "", "playStoreUrl": ""}'::jsonb,
    '업데이트 모달 설정'
  )
ON CONFLICT (key) DO NOTHING;

