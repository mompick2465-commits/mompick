-- comments 테이블에 필요한 컬럼들 추가
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 1. parent_id 컬럼 추가 (답글 기능용)
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- 2. is_deleted 컬럼 추가 (댓글 삭제 상태 관리)
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 3. parent_id 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- 4. 기존 댓글들의 parent_id를 NULL로 설정 (최상위 댓글)
UPDATE comments SET parent_id = NULL WHERE parent_id IS NULL;

-- 5. 기존 댓글들의 is_deleted를 FALSE로 설정
UPDATE comments SET is_deleted = FALSE WHERE is_deleted IS NULL;

-- 실행 완료 후 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'comments' 
ORDER BY ordinal_position;
