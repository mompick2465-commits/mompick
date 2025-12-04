-- 어린이집 리뷰 시스템 테이블 및 정책 생성

-- 1. 리뷰 테이블
CREATE TABLE IF NOT EXISTS childcare_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  childcare_code VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  childcare_name TEXT
);

-- 2. 리뷰 이미지 테이블
CREATE TABLE IF NOT EXISTS childcare_review_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES childcare_reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 리뷰 도움됨 테이블
CREATE TABLE IF NOT EXISTS childcare_review_helpful (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES childcare_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_childcare_review_helpful UNIQUE (review_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_childcare_reviews_code ON childcare_reviews(childcare_code);
CREATE INDEX IF NOT EXISTS idx_childcare_reviews_user_id ON childcare_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_childcare_reviews_created_at ON childcare_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_childcare_reviews_rating ON childcare_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_childcare_review_images_review_id ON childcare_review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_childcare_review_helpful_review_id ON childcare_review_helpful(review_id);

-- RLS 활성화
ALTER TABLE childcare_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE childcare_review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE childcare_review_helpful ENABLE ROW LEVEL SECURITY;

-- 리뷰 테이블 정책 (존재 시 삭제 후 생성)
DROP POLICY IF EXISTS "모든 사용자는 어린이집 리뷰를 조회할 수 있습니다" ON childcare_reviews;
CREATE POLICY "모든 사용자는 어린이집 리뷰를 조회할 수 있습니다" ON childcare_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "인증된 사용자는 어린이집 리뷰를 작성할 수 있습니다" ON childcare_reviews;
CREATE POLICY "인증된 사용자는 어린이집 리뷰를 작성할 수 있습니다" ON childcare_reviews
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "사용자는 자신의 어린이집 리뷰만 수정할 수 있습니다" ON childcare_reviews;
CREATE POLICY "사용자는 자신의 어린이집 리뷰만 수정할 수 있습니다" ON childcare_reviews
  FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "사용자는 자신의 어린이집 리뷰만 삭제할 수 있습니다" ON childcare_reviews;
CREATE POLICY "사용자는 자신의 어린이집 리뷰만 삭제할 수 있습니다" ON childcare_reviews
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- 리뷰 이미지 정책 (존재 시 삭제 후 생성)
DROP POLICY IF EXISTS "모든 사용자는 어린이집 리뷰 이미지를 조회할 수 있습니다" ON childcare_review_images;
CREATE POLICY "모든 사용자는 어린이집 리뷰 이미지를 조회할 수 있습니다" ON childcare_review_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "인증된 사용자는 어린이집 리뷰 이미지를 추가할 수 있습니다" ON childcare_review_images;
CREATE POLICY "인증된 사용자는 어린이집 리뷰 이미지를 추가할 수 있습니다" ON childcare_review_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM childcare_reviews 
      WHERE id = review_id AND user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "사용자는 자신의 어린이집 리뷰 이미지만 삭제할 수 있습니다" ON childcare_review_images;
CREATE POLICY "사용자는 자신의 어린이집 리뷰 이미지만 삭제할 수 있습니다" ON childcare_review_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM childcare_reviews 
      WHERE id = review_id AND user_id::text = auth.uid()::text
    )
  );

-- 도움됨 정책 (존재 시 삭제 후 생성)
DROP POLICY IF EXISTS "모든 사용자는 어린이집 도움됨 정보를 조회할 수 있습니다" ON childcare_review_helpful;
CREATE POLICY "모든 사용자는 어린이집 도움됨 정보를 조회할 수 있습니다" ON childcare_review_helpful
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "인증된 사용자는 어린이집 도움됨을 추가할 수 있습니다" ON childcare_review_helpful;
CREATE POLICY "인증된 사용자는 어린이집 도움됨을 추가할 수 있습니다" ON childcare_review_helpful
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "사용자는 자신의 어린이집 도움됨만 삭제할 수 있습니다" ON childcare_review_helpful;
CREATE POLICY "사용자는 자신의 어린이집 도움됨만 삭제할 수 있습니다" ON childcare_review_helpful
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- updated_at 자동 업데이트 함수/트리거
CREATE OR REPLACE FUNCTION update_childcare_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_childcare_reviews_updated_at
  BEFORE UPDATE ON childcare_reviews
  FOR EACH ROW EXECUTE FUNCTION update_childcare_reviews_updated_at();

-- 도움됨 수 자동 업데이트 함수/트리거
CREATE OR REPLACE FUNCTION update_childcare_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE childcare_reviews 
      SET helpful_count = helpful_count + 1 
      WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE childcare_reviews 
      SET helpful_count = helpful_count - 1 
      WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_childcare_review_helpful_count_trigger
  AFTER INSERT OR DELETE ON childcare_review_helpful
  FOR EACH ROW EXECUTE FUNCTION update_childcare_review_helpful_count();


