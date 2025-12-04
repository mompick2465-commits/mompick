-- 유치원 커스텀 정보 테이블 생성
-- API에서 가져온 기본 정보에 추가로 관리자가 입력하는 정보 저장
CREATE TABLE IF NOT EXISTS kindergarten_custom_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kinder_code TEXT NOT NULL UNIQUE, -- 유치원 고유 코드 (API의 kinderCode)
  kinder_name TEXT NOT NULL, -- 유치원명
  
  -- 추가 정보
  building_images TEXT[], -- 건물 사진 URL 배열
  meal_images TEXT[], -- 급식 사진 URL 배열
  detailed_description TEXT, -- 상세 설명
  facilities TEXT[], -- 시설 정보 (예: ['실내체육관', '놀이터', '도서실'])
  programs TEXT[], -- 특별 프로그램 (예: ['영어', '음악', '미술'])
  teacher_student_ratio TEXT, -- 교사 대 학생 비율
  tuition_info TEXT, -- 학비 정보
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true, -- 활성화 여부
  view_count INTEGER DEFAULT 0, -- 조회수
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID, -- 작성자 (관리자 ID)
  updated_by UUID -- 수정자 (관리자 ID)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kindergarten_custom_kinder_code ON kindergarten_custom_info(kinder_code);
CREATE INDEX IF NOT EXISTS idx_kindergarten_custom_active ON kindergarten_custom_info(is_active);

-- RLS 정책 설정
ALTER TABLE kindergarten_custom_info ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 커스텀 정보를 조회할 수 있도록 허용
CREATE POLICY "Anyone can view active custom info" ON kindergarten_custom_info
  FOR SELECT
  USING (is_active = true);

-- 관리자만 커스텀 정보를 관리할 수 있도록 (service role key 사용 시 RLS 우회)
CREATE POLICY "Service role can manage custom info" ON kindergarten_custom_info
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE TRIGGER update_kindergarten_custom_info_updated_at BEFORE UPDATE ON kindergarten_custom_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Supabase Storage 버킷 생성 (kindergarten-images)
-- 이 명령은 Supabase 대시보드에서 수동으로 실행하거나 Storage API로 생성해야 합니다.
-- Bucket name: kindergarten-images
-- Public: true


-- 어린이집 커스텀 정보 테이블 (유치원과 동일한 구조)
CREATE TABLE IF NOT EXISTS childcare_custom_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_code TEXT NOT NULL UNIQUE, -- 어린이집 고유 코드
  facility_name TEXT NOT NULL, -- 어린이집명
  
  -- 추가 정보
  building_images TEXT[], -- 건물 사진 URL 배열
  meal_images TEXT[], -- 급식 사진 URL 배열
  detailed_description TEXT, -- 상세 설명
  facilities TEXT[], -- 시설 정보
  programs TEXT[], -- 특별 프로그램
  teacher_student_ratio TEXT, -- 교사 대 학생 비율
  tuition_info TEXT, -- 학비 정보
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID,
  updated_by UUID
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_childcare_custom_facility_code ON childcare_custom_info(facility_code);
CREATE INDEX IF NOT EXISTS idx_childcare_custom_active ON childcare_custom_info(is_active);

-- RLS 정책
ALTER TABLE childcare_custom_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active childcare custom info" ON childcare_custom_info
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage childcare custom info" ON childcare_custom_info
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 트리거
CREATE TRIGGER update_childcare_custom_info_updated_at BEFORE UPDATE ON childcare_custom_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 소아과 커스텀 정보 테이블
CREATE TABLE IF NOT EXISTS pediatric_custom_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_code TEXT NOT NULL UNIQUE, -- 소아과 고유 코드
  facility_name TEXT NOT NULL, -- 소아과명
  
  -- 추가 정보
  building_images TEXT[], -- 건물/시설 사진 URL 배열
  interior_images TEXT[], -- 내부 사진 URL 배열
  detailed_description TEXT, -- 상세 설명
  equipment TEXT[], -- 의료 장비 정보
  specialty_details TEXT, -- 전문 진료 상세 정보
  parking_info TEXT, -- 주차 정보
  reservation_info TEXT, -- 예약 방법
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID,
  updated_by UUID
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pediatric_custom_facility_code ON pediatric_custom_info(facility_code);
CREATE INDEX IF NOT EXISTS idx_pediatric_custom_active ON pediatric_custom_info(is_active);

-- RLS 정책
ALTER TABLE pediatric_custom_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pediatric custom info" ON pediatric_custom_info
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage pediatric custom info" ON pediatric_custom_info
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 트리거
CREATE TRIGGER update_pediatric_custom_info_updated_at BEFORE UPDATE ON pediatric_custom_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

