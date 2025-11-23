-- 캐시 테이블 RLS 정책 수정
-- 일반 사용자도 캐시 데이터 읽기/쓰기 가능하도록 수정

-- 기존 정책 삭제
DROP POLICY IF EXISTS "캐시 데이터 읽기 허용" ON rgc_cache;
DROP POLICY IF EXISTS "캐시 데이터 쓰기 제한" ON rgc_cache;
DROP POLICY IF EXISTS "지오코딩 캐시 읽기 허용" ON geocode_cache;
DROP POLICY IF EXISTS "지오코딩 캐시 쓰기 제한" ON geocode_cache;

-- 새로운 정책 생성 (모든 사용자 읽기/쓰기 허용)
CREATE POLICY "캐시 데이터 모든 접근 허용" ON rgc_cache FOR ALL USING (true);
CREATE POLICY "지오코딩 캐시 모든 접근 허용" ON geocode_cache FOR ALL USING (true);

-- region_code_mapping은 읽기만 허용 (마스터 데이터)
DROP POLICY IF EXISTS "지역 매핑 읽기 허용" ON region_code_mapping;
DROP POLICY IF EXISTS "지역 매핑 쓰기 제한" ON region_code_mapping;
CREATE POLICY "지역 매핑 읽기 허용" ON region_code_mapping FOR SELECT USING (true);
CREATE POLICY "지역 매핑 쓰기 제한" ON region_code_mapping FOR ALL USING (auth.role() = 'service_role');
