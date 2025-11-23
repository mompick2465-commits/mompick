-- favorites 테이블의 target_type CHECK 제약 조건에 'playground' 추가

-- 1. 기존 CHECK 제약 조건 삭제
ALTER TABLE favorites 
DROP CONSTRAINT IF EXISTS favorites_target_type_check;

-- 2. 새로운 CHECK 제약 조건 추가 (playground 포함)
ALTER TABLE favorites 
ADD CONSTRAINT favorites_target_type_check 
CHECK (target_type IN ('kindergarten', 'childcare', 'hospital', 'playground'));

-- 3. 제약 조건 확인
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'favorites'::regclass
  AND conname = 'favorites_target_type_check';

