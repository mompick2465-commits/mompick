-- playground_review_helpful 테이블의 user_id 외래키 수정
-- profiles(id)를 참조하도록 변경

-- 1. 기존 외래키 제약조건 제거
ALTER TABLE playground_review_helpful 
DROP CONSTRAINT IF EXISTS playground_review_helpful_user_id_fkey;

-- 2. 새로운 외래키 제약조건 추가 (profiles.id 참조)
ALTER TABLE playground_review_helpful 
ADD CONSTRAINT playground_review_helpful_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. review_id 외래키 확인 및 수정 (필요한 경우)
ALTER TABLE playground_review_helpful 
DROP CONSTRAINT IF EXISTS playground_review_helpful_review_id_fkey;

ALTER TABLE playground_review_helpful 
ADD CONSTRAINT playground_review_helpful_review_id_fkey 
FOREIGN KEY (review_id) REFERENCES playground_reviews(id) ON DELETE CASCADE;

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_playground_review_helpful_user_id ON playground_review_helpful(user_id);
CREATE INDEX IF NOT EXISTS idx_playground_review_helpful_review_id ON playground_review_helpful(review_id);

-- 5. 현재 데이터 확인 (user_id가 profiles.id에 존재하는지)
SELECT 
  prh.id as helpful_id,
  prh.user_id,
  prh.review_id,
  p.id as profile_id,
  CASE 
    WHEN p.id IS NOT NULL THEN 'OK'
    ELSE 'MISSING_PROFILE'
  END as status
FROM playground_review_helpful prh
LEFT JOIN profiles p ON prh.user_id = p.id
WHERE p.id IS NULL
LIMIT 10;

-- 6. 문제가 있는 데이터가 있다면 삭제 (주의: 실제 운영환경에서는 백업 후 진행)
-- DELETE FROM playground_review_helpful 
-- WHERE user_id NOT IN (SELECT id FROM profiles);

-- 실행 완료 후 확인
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'playground_review_helpful'
  AND tc.constraint_type = 'FOREIGN KEY';





