-- 어린이집 간편신청 정보 테이블 생성
CREATE TABLE IF NOT EXISTS childcare_application_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  childcare_code TEXT NOT NULL UNIQUE,
  childcare_name TEXT NOT NULL,
  monthly_price INT4,
  available_slots INT4,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE childcare_application_info ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Enable read access for all users" ON childcare_application_info
  FOR SELECT USING (true);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_childcare_application_info_code ON childcare_application_info(childcare_code);
CREATE INDEX IF NOT EXISTS idx_childcare_application_info_active ON childcare_application_info(is_active);

-- 코멘트 추가
COMMENT ON TABLE childcare_application_info IS '어린이집 간편신청 정보';
COMMENT ON COLUMN childcare_application_info.childcare_code IS '어린이집 코드';
COMMENT ON COLUMN childcare_application_info.childcare_name IS '어린이집 이름';
COMMENT ON COLUMN childcare_application_info.monthly_price IS '월 금액 (만원)';
COMMENT ON COLUMN childcare_application_info.available_slots IS '빈자리 개수';

