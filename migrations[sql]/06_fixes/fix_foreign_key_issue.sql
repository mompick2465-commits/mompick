-- 외래키 제약 조건 문제 해결

-- 1. 먼저 현재 상황 확인
-- community_posts의 author_id와 profiles의 id를 비교
SELECT 
  cp.id as post_id,
  cp.author_id as post_author_id,
  p.id as profile_id,
  p.auth_user_id as profile_auth_user_id
FROM community_posts cp
LEFT JOIN profiles p ON cp.author_id = p.id
WHERE cp.author_id IS NOT NULL
LIMIT 10;

-- 2. auth_user_id와 매칭되는 게시글 확인
SELECT 
  cp.id as post_id,
  cp.author_id as post_author_id,
  p.id as profile_id,
  p.auth_user_id as profile_auth_user_id
FROM community_posts cp
LEFT JOIN profiles p ON cp.author_id = p.auth_user_id
WHERE cp.author_id IS NOT NULL
LIMIT 10;

-- 3. 외래키 제약 조건 제거 (임시)
ALTER TABLE community_posts 
DROP CONSTRAINT IF EXISTS community_posts_author_id_fkey;

-- 4. author_id를 profiles의 id로 업데이트
-- auth_user_id와 매칭되는 profiles의 id로 변경
UPDATE community_posts 
SET author_id = profiles.id
FROM profiles 
WHERE community_posts.author_id = profiles.auth_user_id
AND profiles.auth_user_id IS NOT NULL;

-- 5. 매칭되지 않는 게시글 확인
SELECT 
  cp.id as post_id,
  cp.author_id as post_author_id,
  cp.content
FROM community_posts cp
LEFT JOIN profiles p ON cp.author_id = p.id
WHERE p.id IS NULL
AND cp.author_id IS NOT NULL;

-- 6. 매칭되지 않는 게시글의 author_id를 NULL로 설정 (또는 삭제)
-- 주의: 실제 운영에서는 이 부분을 신중하게 결정해야 함
UPDATE community_posts 
SET author_id = NULL
WHERE author_id NOT IN (SELECT id FROM profiles);

-- 7. 외래키 제약 조건 다시 추가
ALTER TABLE community_posts 
ADD CONSTRAINT community_posts_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 8. 최종 확인
SELECT 
  cp.id as post_id,
  cp.author_id as post_author_id,
  p.id as profile_id,
  p.full_name,
  p.auth_user_id
FROM community_posts cp
LEFT JOIN profiles p ON cp.author_id = p.id
WHERE cp.author_id IS NOT NULL
LIMIT 10;
