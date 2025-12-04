-- favorites 테이블에 지역 코드 컬럼 추가
-- 어린이집: arcode (시군구코드) 저장
-- 유치원: sido_code, sgg_code 저장

-- 1. arcode 컬럼 추가 (어린이집용)
ALTER TABLE favorites
ADD COLUMN IF NOT EXISTS arcode TEXT;

-- 2. sido_code 컬럼 추가 (유치원용)
ALTER TABLE favorites
ADD COLUMN IF NOT EXISTS sido_code TEXT;

-- 3. sgg_code 컬럼 추가 (유치원용)
ALTER TABLE favorites
ADD COLUMN IF NOT EXISTS sgg_code TEXT;

-- 4. target_metadata JSONB 컬럼 추가 (추가 메타데이터용, 선택사항)
ALTER TABLE favorites
ADD COLUMN IF NOT EXISTS target_metadata JSONB DEFAULT '{}'::jsonb;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_favorites_arcode ON favorites(arcode) WHERE arcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_sido_sgg ON favorites(sido_code, sgg_code) WHERE sido_code IS NOT NULL AND sgg_code IS NOT NULL;

COMMENT ON COLUMN favorites.arcode IS '어린이집 시군구 코드 (target_type=childcare일 때 사용)';
COMMENT ON COLUMN favorites.sido_code IS '유치원 시도 코드 (target_type=kindergarten일 때 사용)';
COMMENT ON COLUMN favorites.sgg_code IS '유치원 시군구 코드 (target_type=kindergarten일 때 사용)';
COMMENT ON COLUMN favorites.target_metadata IS '추가 메타데이터 (JSON 형식)';

