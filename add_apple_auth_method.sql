-- =====================================================
-- profiles 테이블 auth_method에 'apple' 추가
-- =====================================================

-- 1. 기존 CHECK 제약조건 삭제
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_auth_method_check;

-- 2. 'apple'을 포함한 새로운 CHECK 제약조건 추가
ALTER TABLE profiles 
ADD CONSTRAINT profiles_auth_method_check 
CHECK (auth_method IN ('kakao', 'google', 'apple', 'phone'));

-- 3. 제약조건 확인
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND conname = 'profiles_auth_method_check';

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Database > Tables > profiles > Constraints에서 확인


