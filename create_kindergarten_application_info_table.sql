-- 유치원 간편신청 정보 테이블 생성
-- 관리자 페이지에서 각 유치원의 월 금액과 빈자리 개수를 관리하기 위한 테이블

CREATE TABLE IF NOT EXISTS kindergarten_application_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kinder_code TEXT NOT NULL UNIQUE,
  kinder_name TEXT,
  monthly_price INTEGER, -- 월 금액 (만원 단위)
  available_slots INTEGER, -- 빈자리 개수
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kinder_application_info_code ON kindergarten_application_info(kinder_code);
CREATE INDEX IF NOT EXISTS idx_kinder_application_info_active ON kindergarten_application_info(is_active);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_kindergarten_application_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kindergarten_application_info_updated_at
BEFORE UPDATE ON kindergarten_application_info
FOR EACH ROW
EXECUTE FUNCTION update_kindergarten_application_info_updated_at();

-- RLS 정책 설정
ALTER TABLE kindergarten_application_info ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능
CREATE POLICY "Enable read access for all users"
ON kindergarten_application_info
FOR SELECT
USING (is_active = true);

-- 인증된 사용자만 수정 가능 (관리자 전용)
CREATE POLICY "Enable write access for authenticated users"
ON kindergarten_application_info
FOR ALL
USING (auth.role() = 'authenticated');

-- 주석 추가
COMMENT ON TABLE kindergarten_application_info IS '유치원 간편신청 정보 (월 금액, 빈자리 개수)';
COMMENT ON COLUMN kindergarten_application_info.kinder_code IS '유치원 코드 (고유 식별자)';
COMMENT ON COLUMN kindergarten_application_info.monthly_price IS '월 금액 (만원 단위)';
COMMENT ON COLUMN kindergarten_application_info.available_slots IS '빈자리 개수';
COMMENT ON COLUMN kindergarten_application_info.is_active IS '활성화 여부';

