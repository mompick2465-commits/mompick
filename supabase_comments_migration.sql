-- 기존 comments 테이블에 is_edited 컬럼 추가
-- 이 스크립트는 이미 존재하는 테이블에 컬럼을 추가하는 용도입니다.

-- is_edited 컬럼 추가 (기본값 FALSE)
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- 기존 댓글들의 is_edited 값을 FALSE로 설정
UPDATE comments 
SET is_edited = FALSE 
WHERE is_edited IS NULL;

-- 컬럼을 NOT NULL로 설정 (기본값이 있으므로 안전)
ALTER TABLE comments 
ALTER COLUMN is_edited SET NOT NULL;

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Database > Tables > comments에서 is_edited 컬럼이 추가되었는지 확인

-- =====================================================
-- 주의사항:
-- =====================================================
-- - 이 스크립트는 기존 데이터를 보존하면서 컬럼을 추가합니다
-- - 기존 댓글들은 모두 is_edited = FALSE로 설정됩니다
-- - 새로운 댓글들은 기본값 FALSE로 생성됩니다
