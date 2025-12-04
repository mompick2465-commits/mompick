-- community_posts와 profiles 테이블 사이의 외래키 관계 설정

-- 1. 기존 외래키 제약 조건이 있다면 제거
ALTER TABLE community_posts 
DROP CONSTRAINT IF EXISTS community_posts_author_id_fkey;

-- 2. 새로운 외래키 제약 조건 추가
ALTER TABLE community_posts 
ADD CONSTRAINT community_posts_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);

-- 4. RLS 정책 확인 및 업데이트 (필요한 경우)
-- community_posts 테이블에 RLS가 활성화되어 있다면 적절한 정책이 있는지 확인

-- 5. 테이블 관계 확인을 위한 쿼리 예시
-- SELECT 
--   cp.id as post_id,
--   cp.content,
--   cp.author_id,
--   p.id as profile_id,
--   p.full_name,
--   p.auth_user_id
-- FROM community_posts cp
-- LEFT JOIN profiles p ON cp.author_id = p.id
-- LIMIT 5;
