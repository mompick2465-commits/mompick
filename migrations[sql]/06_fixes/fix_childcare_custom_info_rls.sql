-- childcare_custom_info 테이블 RLS 정책 설정
-- 앱에서 커스텀 정보(건물 사진 등)를 조회할 수 있도록 허용

-- RLS 활성화
ALTER TABLE childcare_custom_info ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Anyone can view active childcare custom info" ON childcare_custom_info;
DROP POLICY IF EXISTS "Service role can manage childcare custom info" ON childcare_custom_info;

-- 모든 사용자가 활성화된 커스텀 정보를 조회할 수 있도록 허용
CREATE POLICY "Anyone can view active childcare custom info" ON childcare_custom_info
  FOR SELECT
  USING (is_active = true);

-- Service role이 모든 작업을 할 수 있도록 허용 (관리자 페이지용)
CREATE POLICY "Service role can manage childcare custom info" ON childcare_custom_info
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 코멘트 추가
COMMENT ON TABLE childcare_custom_info IS '어린이집 커스텀 정보 (관리자가 추가하는 건물사진, 상세설명 등)';
COMMENT ON COLUMN childcare_custom_info.facility_code IS '어린이집 고유 코드 (stcode)';
COMMENT ON COLUMN childcare_custom_info.facility_name IS '어린이집명';
COMMENT ON COLUMN childcare_custom_info.building_images IS '건물 사진 URL 배열';
COMMENT ON COLUMN childcare_custom_info.meal_images IS '급식 사진 URL 배열';

