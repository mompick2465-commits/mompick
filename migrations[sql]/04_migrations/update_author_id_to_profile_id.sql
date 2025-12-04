-- community_posts의 author_id를 profiles의 id로 업데이트

-- 1. 현재 상황 확인
SELECT 
  cp.id as post_id,
  cp.author_id as post_author_id,
  p.id as profile_id,
  p.auth_user_id as profile_auth_user_id
FROM community_posts cp
LEFT JOIN profiles p ON cp.author_id = p.auth_user_id
WHERE cp.author_id IS NOT NULL
LIMIT 10;

-- 2. 외래키 제약 조건 제거 (임시)
ALTER TABLE community_posts 
DROP CONSTRAINT IF EXISTS community_posts_author_id_fkey;

-- 3. author_id를 profiles의 id로 업데이트
UPDATE community_posts 
SET author_id = profiles.id
FROM profiles 
WHERE community_posts.author_id = profiles.auth_user_id
AND profiles.auth_user_id IS NOT NULL;

-- 4. 업데이트 결과 확인
SELECT 
  cp.id as post_id,
  cp.author_id as post_author_id,
  p.id as profile_id,
  p.auth_user_id as profile_auth_user_id
FROM community_posts cp
LEFT JOIN profiles p ON cp.author_id = p.id
WHERE cp.author_id IS NOT NULL
LIMIT 10;

-- 5. 외래키 제약 조건 다시 추가
ALTER TABLE community_posts 
ADD CONSTRAINT community_posts_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 6. 최종 확인
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
