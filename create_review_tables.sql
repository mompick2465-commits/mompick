-- 유치원 리뷰 시스템을 위한 테이블 생성

-- 1. 리뷰 테이블
CREATE TABLE IF NOT EXISTS kindergarten_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kindergarten_code VARCHAR(50) NOT NULL, -- 유치원 코드
  user_id UUID NOT NULL, -- 사용자 ID (auth.users와 연결하되 Foreign Key 제약조건 없음)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 별점 (1-5)
  content TEXT NOT NULL, -- 리뷰 내용
  helpful_count INTEGER DEFAULT 0, -- 도움됨 수
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- 인덱스
  CONSTRAINT unique_user_kindergarten_review UNIQUE (kindergarten_code, user_id)
);

-- 2. 리뷰 이미지 테이블
CREATE TABLE IF NOT EXISTS kindergarten_review_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES kindergarten_reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, -- Supabase Storage URL
  image_order INTEGER DEFAULT 0, -- 이미지 순서
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 리뷰 도움됨 테이블 (중복 클릭 방지)
CREATE TABLE IF NOT EXISTS kindergarten_review_helpful (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES kindergarten_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- 사용자 ID (Foreign Key 제약조건 없음)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_review_helpful UNIQUE (review_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_kindergarten_reviews_kindergarten_code ON kindergarten_reviews(kindergarten_code);
CREATE INDEX IF NOT EXISTS idx_kindergarten_reviews_user_id ON kindergarten_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_kindergarten_reviews_created_at ON kindergarten_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kindergarten_reviews_rating ON kindergarten_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_kindergarten_review_images_review_id ON kindergarten_review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_kindergarten_review_helpful_review_id ON kindergarten_review_helpful(review_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE kindergarten_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE kindergarten_review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE kindergarten_review_helpful ENABLE ROW LEVEL SECURITY;

-- 리뷰 테이블 정책
CREATE POLICY "모든 사용자는 리뷰를 조회할 수 있습니다" ON kindergarten_reviews
  FOR SELECT USING (true);

CREATE POLICY "인증된 사용자는 리뷰를 작성할 수 있습니다" ON kindergarten_reviews
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "사용자는 자신의 리뷰만 수정할 수 있습니다" ON kindergarten_reviews
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "사용자는 자신의 리뷰만 삭제할 수 있습니다" ON kindergarten_reviews
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- 리뷰 이미지 테이블 정책
CREATE POLICY "모든 사용자는 리뷰 이미지를 조회할 수 있습니다" ON kindergarten_review_images
  FOR SELECT USING (true);

CREATE POLICY "인증된 사용자는 리뷰 이미지를 추가할 수 있습니다" ON kindergarten_review_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM kindergarten_reviews 
      WHERE id = review_id AND user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "사용자는 자신의 리뷰 이미지만 삭제할 수 있습니다" ON kindergarten_review_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM kindergarten_reviews 
      WHERE id = review_id AND user_id::text = auth.uid()::text
    )
  );

-- 리뷰 도움됨 테이블 정책
CREATE POLICY "모든 사용자는 도움됨 정보를 조회할 수 있습니다" ON kindergarten_review_helpful
  FOR SELECT USING (true);

CREATE POLICY "인증된 사용자는 도움됨을 추가할 수 있습니다" ON kindergarten_review_helpful
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "사용자는 자신의 도움됨만 삭제할 수 있습니다" ON kindergarten_review_helpful
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- updated_at 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거
CREATE TRIGGER update_kindergarten_reviews_updated_at 
  BEFORE UPDATE ON kindergarten_reviews 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 도움됨 수 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE kindergarten_reviews 
        SET helpful_count = helpful_count + 1 
        WHERE id = NEW.review_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE kindergarten_reviews 
        SET helpful_count = helpful_count - 1 
        WHERE id = OLD.review_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 도움됨 수 트리거
CREATE TRIGGER update_review_helpful_count_trigger
  AFTER INSERT OR DELETE ON kindergarten_review_helpful
  FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();
