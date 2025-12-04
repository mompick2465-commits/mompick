-- 광고배너 타입 enum
CREATE TYPE banner_type AS ENUM ('splash', 'modal');

-- 광고배너 테이블 생성
CREATE TABLE IF NOT EXISTS ad_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_type banner_type NOT NULL, -- 'splash' (메인 스플래시) 또는 'modal' (하단 모달)
  title TEXT, -- 광고 제목 (선택)
  description TEXT, -- 광고 설명 (선택)
  image_url TEXT NOT NULL, -- 이미지 URL (Supabase Storage 경로) - 필수
  link_url TEXT, -- 클릭 시 이동할 링크 (선택)
  show_click_text BOOLEAN DEFAULT false, -- "클릭하여 자세히 보기" 문구 표시 여부
  order_index INTEGER DEFAULT 0, -- 표시 순서 (스플래시 캐러셀용)
  is_active BOOLEAN DEFAULT true, -- 활성화 여부
  start_date TIMESTAMP WITH TIME ZONE, -- 광고 시작일 (선택)
  end_date TIMESTAMP WITH TIME ZONE, -- 광고 종료일 (선택)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ad_banners_type ON ad_banners(banner_type);
CREATE INDEX IF NOT EXISTS idx_ad_banners_order ON ad_banners(order_index);
CREATE INDEX IF NOT EXISTS idx_ad_banners_active ON ad_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_ad_banners_dates ON ad_banners(start_date, end_date);

-- RLS 정책 설정
ALTER TABLE ad_banners ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 배너를 조회할 수 있도록 허용
CREATE POLICY "Anyone can view active banners" ON ad_banners
  FOR SELECT
  USING (
    is_active = true 
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
  );

-- 관리자만 배너를 관리할 수 있도록 (service role key 사용 시 RLS 우회)
CREATE POLICY "Service role can manage banners" ON ad_banners
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 업데이트 시 updated_at 자동 갱신 트리거 함수 (이미 존재할 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_ad_banners_updated_at BEFORE UPDATE ON ad_banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Supabase Storage 버킷 생성 (ad-banners)
-- 이 명령은 Supabase 대시보드에서 수동으로 실행하거나 Storage API로 생성해야 합니다.
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('ad-banners', 'ad-banners', true);

-- 샘플 데이터 삽입 (선택사항)
-- 주의: image_url은 Supabase Storage의 전체 URL을 사용하거나, 
-- 메인 앱의 public 폴더 경로를 사용해야 합니다.
-- 예: https://your-project.supabase.co/storage/v1/object/public/ad-banners/image.png
-- 또는 메인 앱 기준: http://localhost:5173/adimg/lifestandardimg1.png

-- 샘플 데이터는 주석 처리 (실제 이미지 URL로 변경 후 사용)
-- INSERT INTO ad_banners (banner_type, title, description, image_url, link_url, order_index, is_active)
-- VALUES 
--   ('splash', '라이프 스탠다드', '냄새먹는 달걀', 'https://your-supabase-url/storage/v1/object/public/ad-banners/lifestandardimg1.png', 'https://lifestandard.kr/product/...', 0, true),
--   ('splash', '어린이 들판', '아동용 노래,애니 유튜브', 'https://your-supabase-url/storage/v1/object/public/ad-banners/childstvimg.png', 'https://www.youtube.com/@CHILDS-o4c', 1, true),
--   ('modal', '특별 이벤트', '지금 가입하고 혜택 받으세요!', 'https://your-supabase-url/storage/v1/object/public/ad-banners/modal-event.png', 'https://example.com/event', 0, true)
-- ON CONFLICT DO NOTHING;

