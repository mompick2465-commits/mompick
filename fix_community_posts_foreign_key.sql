-- community_posts 테이블의 author_id 외래키 수정
-- profiles(id) 대신 profiles(auth_user_id)를 참조하도록 변경

-- 1. profiles.auth_user_id에 unique 제약조건 추가 (외래키 참조를 위해 필요)
ALTER TABLE profiles ADD CONSTRAINT profiles_auth_user_id_unique UNIQUE (auth_user_id);

-- 2. 기존 외래키 제약조건 제거
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_author_id_fkey;

-- 3. 새로운 외래키 제약조건 추가 (profiles.auth_user_id 참조)
ALTER TABLE community_posts 
ADD CONSTRAINT community_posts_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES profiles(auth_user_id) ON DELETE CASCADE;

-- 3. 인덱스 재생성 (필요한 경우)
DROP INDEX IF EXISTS idx_community_posts_author_id;
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);

-- 4. 현재 데이터 확인 (author_id가 profiles.auth_user_id에 존재하는지)
SELECT 
  cp.id as post_id,
  cp.author_id,
  p.auth_user_id,
  CASE 
    WHEN p.auth_user_id IS NOT NULL THEN 'OK'
    ELSE 'MISSING_PROFILE'
  END as status
FROM community_posts cp
LEFT JOIN profiles p ON cp.author_id = p.auth_user_id
WHERE p.auth_user_id IS NULL;

-- 5. 문제가 있는 데이터가 있다면 삭제 (주의: 실제 운영환경에서는 백업 후 진행)
-- DELETE FROM community_posts 
-- WHERE author_id NOT IN (SELECT auth_user_id FROM profiles WHERE auth_user_id IS NOT NULL);
