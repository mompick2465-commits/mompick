-- 댓글 테이블 생성
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name VARCHAR(100) NOT NULL,
  user_profile_image TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at ASC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 댓글을 읽을 수 있도록 정책 생성
CREATE POLICY "댓글 읽기 정책" ON comments
  FOR SELECT USING (true);

-- 인증된 사용자만 댓글을 작성할 수 있도록 정책 생성
CREATE POLICY "댓글 작성 정책" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 작성자만 댓글을 수정할 수 있도록 정책 생성
CREATE POLICY "댓글 수정 정책" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- 작성자만 댓글을 삭제할 수 있도록 정책 생성
CREATE POLICY "댓글 삭제 정책" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 시 updated_at 자동 갱신을 위한 트리거
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 댓글 작성 시 게시글의 comments_count 자동 증가를 위한 함수
CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts 
  SET comments_count = comments_count + 1 
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 댓글 삭제 시 게시글의 comments_count 자동 감소를 위한 함수
CREATE OR REPLACE FUNCTION decrement_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts 
  SET comments_count = comments_count - 1 
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER increment_comments_count_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_comments_count();

CREATE TRIGGER decrement_comments_count_trigger
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_comments_count();

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Database > Tables > comments에서 테이블이 생성되었는지 확인
-- 4. Database > Tables > comments > Policies에서 정책들이 생성되었는지 확인

-- =====================================================
-- 보안 정책 설명:
-- =====================================================
-- Comments:
-- - 모든 사용자가 댓글을 읽을 수 있음
-- - 인증된 사용자만 댓글을 작성할 수 있음
-- - 댓글 작성자만 수정/삭제할 수 있음
-- - 게시글 삭제 시 관련 댓글도 자동 삭제됨 (CASCADE)
-- - 댓글 작성/삭제 시 게시글의 댓글 수가 자동으로 업데이트됨

-- =====================================================
-- 테스트:
-- =====================================================
-- 1. 댓글 작성 테스트
-- 2. 댓글 읽기 테스트
-- 3. 댓글 수정/삭제 테스트
-- 4. 게시글 삭제 시 댓글 자동 삭제 테스트
-- 5. 댓글 수 자동 업데이트 테스트
