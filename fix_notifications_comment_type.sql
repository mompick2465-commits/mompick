-- notifications 테이블에 'comment' 타입 추가

-- 1) 기존 CHECK 제약조건 제거
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2) 새로운 CHECK 제약조건 추가 (comment 타입 포함)
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('reply','like','mention','system','comment'));

-- 3) 변경사항 확인
SELECT 
  conname as constraint_name,
  consrc as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';
