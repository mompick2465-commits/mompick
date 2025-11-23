-- 놀이시설 지역 매핑 테이블 생성
-- 지역선택 배치 결과를 저장하여 재사용하기 위한 테이블

CREATE TABLE IF NOT EXISTS playground_region_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region_codes JSONB NOT NULL, -- { "서울특별시": { "sidoCode": 11, "sggCodes": { "종로구": 11110, ... } }, ... }
  total_sido_count INTEGER NOT NULL,
  total_sgg_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_playground_region_mappings_created_at ON playground_region_mappings(created_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE playground_region_mappings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 정책 생성 (관리자 페이지용)
CREATE POLICY "지역 매핑 읽기 정책" ON playground_region_mappings
  FOR SELECT USING (true);

-- 서비스 역할이 작성할 수 있도록 정책 생성
CREATE POLICY "지역 매핑 작성 정책" ON playground_region_mappings
  FOR INSERT WITH CHECK (true);

-- 서비스 역할이 수정할 수 있도록 정책 생성
CREATE POLICY "지역 매핑 수정 정책" ON playground_region_mappings
  FOR UPDATE USING (true);

-- 업데이트 시 updated_at 자동 갱신을 위한 트리거
CREATE OR REPLACE FUNCTION update_playground_region_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playground_region_mappings_updated_at
  BEFORE UPDATE ON playground_region_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_playground_region_mappings_updated_at();

-- 최신 매핑만 유지하도록 설정 (선택사항)
-- 여러 버전을 유지하려면 이 부분을 제거하세요
-- DELETE FROM playground_region_mappings WHERE id NOT IN (SELECT id FROM playground_region_mappings ORDER BY created_at DESC LIMIT 1);

COMMENT ON TABLE playground_region_mappings IS '놀이시설 지역 매핑 정보를 저장하는 테이블. 지역선택 배치 결과를 캐시하여 재사용합니다.';
COMMENT ON COLUMN playground_region_mappings.region_codes IS '지역 코드 매핑 JSON 데이터';
COMMENT ON COLUMN playground_region_mappings.total_sido_count IS '총 시도 개수';
COMMENT ON COLUMN playground_region_mappings.total_sgg_count IS '총 시군구 개수';

