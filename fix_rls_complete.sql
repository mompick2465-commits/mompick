-- RLS 정책 완전 수정
-- 캐시 테이블들의 RLS를 비활성화하거나 완전 개방

-- 캐시 테이블들은 RLS 비활성화 (성능 + 단순화)
ALTER TABLE rgc_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE geocode_cache DISABLE ROW LEVEL SECURITY;

-- 기존 정책들 모두 삭제
DROP POLICY IF EXISTS "캐시 데이터 읽기 허용" ON rgc_cache;
DROP POLICY IF EXISTS "캐시 데이터 쓰기 제한" ON rgc_cache;
DROP POLICY IF EXISTS "캐시 데이터 모든 접근 허용" ON rgc_cache;
DROP POLICY IF EXISTS "지오코딩 캐시 읽기 허용" ON geocode_cache;
DROP POLICY IF EXISTS "지오코딩 캐시 쓰기 제한" ON geocode_cache;
DROP POLICY IF EXISTS "지오코딩 캐시 모든 접근 허용" ON geocode_cache;

-- region_code_mapping은 읽기 전용 유지
DROP POLICY IF EXISTS "지역 매핑 읽기 허용" ON region_code_mapping;
DROP POLICY IF EXISTS "지역 매핑 쓰기 제한" ON region_code_mapping;
CREATE POLICY "지역 매핑 읽기 허용" ON region_code_mapping FOR SELECT USING (true);
