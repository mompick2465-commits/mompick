-- childcare_meals 테이블 RLS 정책 설정
-- 앱에서 급식 정보를 조회할 수 있도록 허용

-- RLS 활성화
ALTER TABLE childcare_meals ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Anyone can view active childcare meals" ON childcare_meals;
DROP POLICY IF EXISTS "Service role can manage childcare meals" ON childcare_meals;

-- 모든 사용자가 활성화된 급식 정보를 조회할 수 있도록 허용
CREATE POLICY "Anyone can view active childcare meals" ON childcare_meals
  FOR SELECT
  USING (is_active = true);

-- Service role이 모든 작업을 할 수 있도록 허용 (관리자 페이지용)
CREATE POLICY "Service role can manage childcare meals" ON childcare_meals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_childcare_meals_code ON childcare_meals(childcare_code);
CREATE INDEX IF NOT EXISTS idx_childcare_meals_date ON childcare_meals(meal_date);
CREATE INDEX IF NOT EXISTS idx_childcare_meals_active ON childcare_meals(is_active);

-- 코멘트 추가
COMMENT ON TABLE childcare_meals IS '어린이집 급식 정보';
COMMENT ON COLUMN childcare_meals.childcare_code IS '어린이집 고유 코드';
COMMENT ON COLUMN childcare_meals.meal_date IS '급식 날짜';
COMMENT ON COLUMN childcare_meals.meal_images IS '급식 사진 URL 배열';
COMMENT ON COLUMN childcare_meals.menu_description IS '메뉴 설명';

