-- 사용자 약관 동의 정보 테이블 생성
-- 각 사용자가 약관에 동의한 정보를 저장

CREATE TABLE IF NOT EXISTS user_terms_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 약관 동의 여부
  service_agreed BOOLEAN NOT NULL DEFAULT false, -- 맘픽 서비스 이용약관 동의 (필수)
  privacy_agreed BOOLEAN NOT NULL DEFAULT false, -- 개인정보처리방침 동의 (필수)
  data_agreed BOOLEAN NOT NULL DEFAULT false, -- 데이터 활용 동의 (필수)
  marketing_agreed BOOLEAN NOT NULL DEFAULT false, -- 마케팅 정보 수신 및 활용 동의 (선택)
  
  -- 약관 버전 정보 (나중에 약관이 변경되었을 때 추적용)
  service_terms_version INTEGER DEFAULT 1,
  privacy_terms_version INTEGER DEFAULT 1,
  data_terms_version INTEGER DEFAULT 1,
  marketing_terms_version INTEGER DEFAULT 1,
  
  -- 데이터 활용 동의 하위 항목 동의 정보 (JSONB)
  data_sub_terms JSONB DEFAULT '{
    "serviceOperation": false,
    "userExperience": false,
    "appStability": false,
    "marketing": false,
    "anonymousStats": false
  }'::jsonb,
  
  -- 동의 일시
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 메타 정보
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 한 사용자는 하나의 약관 동의 기록만 가질 수 있음 (최신 동의 정보)
  CONSTRAINT unique_user_terms_agreement UNIQUE (user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_terms_agreements_user_id ON user_terms_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_terms_agreements_agreed_at ON user_terms_agreements(agreed_at DESC);

-- data_sub_terms 컬럼이 없으면 추가 (기존 테이블에 컬럼 추가)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_terms_agreements' 
    AND column_name = 'data_sub_terms'
  ) THEN
    ALTER TABLE user_terms_agreements 
    ADD COLUMN data_sub_terms JSONB DEFAULT '{
      "serviceOperation": false,
      "userExperience": false,
      "appStability": false,
      "marketing": false,
      "anonymousStats": false
    }'::jsonb;
  END IF;
END $$;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_user_terms_agreements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS update_user_terms_agreements_updated_at_trigger ON user_terms_agreements;

CREATE TRIGGER update_user_terms_agreements_updated_at_trigger
  BEFORE UPDATE ON user_terms_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_terms_agreements_updated_at();

-- RLS 정책 설정
ALTER TABLE user_terms_agreements ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (중복 방지)
DROP POLICY IF EXISTS "Users can read own terms agreements" ON user_terms_agreements;
DROP POLICY IF EXISTS "Users can create own terms agreements" ON user_terms_agreements;
DROP POLICY IF EXISTS "Users can update own terms agreements" ON user_terms_agreements;
DROP POLICY IF EXISTS "Users can delete own terms agreements" ON user_terms_agreements;

-- 사용자는 자신의 약관 동의 정보만 읽을 수 있음
CREATE POLICY "Users can read own terms agreements"
  ON user_terms_agreements
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 약관 동의 정보를 생성할 수 있음
CREATE POLICY "Users can create own terms agreements"
  ON user_terms_agreements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 약관 동의 정보를 수정할 수 있음
CREATE POLICY "Users can update own terms agreements"
  ON user_terms_agreements
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 약관 동의 정보를 삭제할 수 있음
CREATE POLICY "Users can delete own terms agreements"
  ON user_terms_agreements
  FOR DELETE
  USING (auth.uid() = user_id);

-- 코멘트 추가
COMMENT ON TABLE user_terms_agreements IS '사용자별 약관 동의 정보 저장 테이블';
COMMENT ON COLUMN user_terms_agreements.user_id IS '사용자 ID (profiles.auth_user_id 참조)';
COMMENT ON COLUMN user_terms_agreements.service_agreed IS '맘픽 서비스 이용약관 동의 여부 (필수)';
COMMENT ON COLUMN user_terms_agreements.privacy_agreed IS '개인정보처리방침 동의 여부 (필수)';
COMMENT ON COLUMN user_terms_agreements.data_agreed IS '데이터 활용 동의 여부 (필수)';
COMMENT ON COLUMN user_terms_agreements.marketing_agreed IS '마케팅 정보 수신 및 활용 동의 여부 (선택)';
COMMENT ON COLUMN user_terms_agreements.data_sub_terms IS '데이터 활용 동의 하위 항목 동의 정보 (JSONB): serviceOperation(필수), userExperience(선택), appStability(선택), marketing(선택), anonymousStats(선택)';
COMMENT ON COLUMN user_terms_agreements.agreed_at IS '약관 동의 일시';

