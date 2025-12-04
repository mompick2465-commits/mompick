-- 게시글 좋아요 테이블 생성
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);

-- 중복 좋아요 방지를 위한 유니크 제약 조건
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_unique ON post_likes(post_id, user_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 좋아요를 읽을 수 있도록 정책 생성
CREATE POLICY "좋아요 읽기 정책" ON post_likes
  FOR SELECT USING (true);

-- 인증된 사용자만 좋아요를 추가할 수 있도록 정책 생성
CREATE POLICY "좋아요 추가 정책" ON post_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id IS NOT NULL)
  );

-- 작성자만 좋아요를 삭제할 수 있도록 정책 생성
CREATE POLICY "좋아요 삭제 정책" ON post_likes
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id IS NOT NULL)
  );

-- 좋아요 추가 시 게시글의 likes_count 자동 증가를 위한 함수
CREATE OR REPLACE FUNCTION increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts 
  SET likes_count = likes_count + 1 
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 좋아요 삭제 시 게시글의 likes_count 자동 감소를 위한 함수
CREATE OR REPLACE FUNCTION decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts 
  SET likes_count = likes_count - 1 
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER increment_likes_count_trigger
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_likes_count();

CREATE TRIGGER decrement_likes_count_trigger
  AFTER DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_likes_count();

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Database > Tables > post_likes에서 테이블이 생성되었는지 확인
-- 4. Database > Tables > post_likes > Policies에서 정책들이 생성되었는지 확인

-- =====================================================
-- 보안 정책 설명:
-- =====================================================
-- Post Likes:
-- - 모든 사용자가 좋아요를 읽을 수 있음
-- - 인증된 사용자만 좋아요를 추가할 수 있음
-- - 좋아요 작성자만 삭제할 수 있음
-- - 게시글 삭제 시 관련 좋아요도 자동 삭제됨 (CASCADE)
-- - 좋아요 추가/삭제 시 게시글의 좋아요 수가 자동으로 업데이트됨
-- - 중복 좋아요 방지 (post_id + user_id 유니크 제약)

-- =====================================================
-- 테스트:
-- =====================================================
-- 1. 좋아요 추가 테스트
-- 2. 좋아요 취소 테스트
-- 3. 중복 좋아요 방지 테스트
-- 4. 게시글 삭제 시 좋아요 자동 삭제 테스트
-- 5. 좋아요 수 자동 업데이트 테스트
