-- 유치원 급식 정보 테이블 생성
-- 날짜별로 급식 사진과 설명을 저장

CREATE TABLE IF NOT EXISTS kindergarten_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kindergarten_code TEXT NOT NULL, -- 유치원 코드 (kindercode)
  meal_date DATE NOT NULL, -- 급식 날짜
  
  -- 급식 정보
  meal_images TEXT[], -- 급식 사진 URL 배열
  menu_description TEXT, -- 메뉴 설명 (예: "쌀밥, 된장찌개, 불고기, 김치")
  side_dishes TEXT[], -- 반찬 목록
  nutrition_info TEXT, -- 영양 정보 (예: "칼로리: 500kcal, 단백질: 20g")
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID, -- 작성자 (관리자 ID)
  updated_by UUID, -- 수정자 (관리자 ID)
  
  -- 유니크 제약: 한 유치원의 특정 날짜는 하나의 급식 정보만 존재
  UNIQUE(kindergarten_code, meal_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kindergarten_meals_code ON kindergarten_meals(kindergarten_code);
CREATE INDEX IF NOT EXISTS idx_kindergarten_meals_date ON kindergarten_meals(meal_date);
CREATE INDEX IF NOT EXISTS idx_kindergarten_meals_code_date ON kindergarten_meals(kindergarten_code, meal_date);

-- RLS 정책 설정
ALTER TABLE kindergarten_meals ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 급식 정보를 조회할 수 있도록 허용
CREATE POLICY "Anyone can view active meals" ON kindergarten_meals
  FOR SELECT
  USING (is_active = true);

-- 관리자만 급식 정보를 관리할 수 있도록 (service role key 사용 시 RLS 우회)
CREATE POLICY "Service role can manage meals" ON kindergarten_meals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE TRIGGER update_kindergarten_meals_updated_at BEFORE UPDATE ON kindergarten_meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 어린이집 급식 정보 테이블 (유치원과 동일한 구조)
CREATE TABLE IF NOT EXISTS childcare_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  childcare_code TEXT NOT NULL, -- 어린이집 코드
  meal_date DATE NOT NULL,
  
  -- 급식 정보
  meal_images TEXT[],
  menu_description TEXT,
  side_dishes TEXT[],
  nutrition_info TEXT,
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID,
  updated_by UUID,
  
  UNIQUE(childcare_code, meal_date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_childcare_meals_code ON childcare_meals(childcare_code);
CREATE INDEX IF NOT EXISTS idx_childcare_meals_date ON childcare_meals(meal_date);
CREATE INDEX IF NOT EXISTS idx_childcare_meals_code_date ON childcare_meals(childcare_code, meal_date);

-- RLS 정책
ALTER TABLE childcare_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active childcare meals" ON childcare_meals
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage childcare meals" ON childcare_meals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 트리거
CREATE TRIGGER update_childcare_meals_updated_at BEFORE UPDATE ON childcare_meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

