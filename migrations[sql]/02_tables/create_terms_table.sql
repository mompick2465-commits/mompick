-- 약관 테이블 생성
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL UNIQUE, -- 'service', 'privacy', 'data', 'marketing'
  title VARCHAR(255) NOT NULL, -- 약관 제목
  content TEXT NOT NULL, -- 약관 내용 (HTML 가능)
  version INTEGER DEFAULT 1, -- 약관 버전
  is_active BOOLEAN DEFAULT true, -- 활성화 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255), -- 작성자 (관리자)
  updated_by VARCHAR(255) -- 수정자 (관리자)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_terms_category ON terms(category);
CREATE INDEX IF NOT EXISTS idx_terms_is_active ON terms(is_active);

-- RLS 정책 설정 (모든 사용자가 읽기 가능)
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 약관을 읽을 수 있도록 정책 생성
CREATE POLICY "Anyone can read active terms"
  ON terms
  FOR SELECT
  USING (is_active = true);

-- 관리자만 작성/수정/삭제 가능하도록 정책 생성 (서비스 키 사용)
-- 실제로는 관리자 페이지에서 서비스 키를 사용하므로 별도 정책 불필요

-- 초기 데이터 삽입 (선택사항)
INSERT INTO terms (category, title, content, version, is_active) VALUES
('service', '맘픽 서비스 이용약관', '<p>약관 내용을 입력해주세요.</p>', 1, true),
('privacy', '개인정보처리방침', '<p>약관 내용을 입력해주세요.</p>', 1, true),
('data', '데이터 활용 동의', '<p>약관 내용을 입력해주세요.</p>', 1, true),
('marketing', '마케팅 정보 수신 및 활용 동의', '<p>약관 내용을 입력해주세요.</p>', 1, true)
ON CONFLICT (category) DO NOTHING;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_terms_updated_at_trigger
  BEFORE UPDATE ON terms
  FOR EACH ROW
  EXECUTE FUNCTION update_terms_updated_at();

