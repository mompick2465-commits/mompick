-- notifications 테이블의 type 컬럼에 'comment' 타입 추가
-- 기존 CHECK 제약조건을 삭제하고 새로운 제약조건 추가

-- 1. 기존 CHECK 제약조건 삭제
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. 새로운 CHECK 제약조건 추가 (comment 타입 포함)
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'reply', 'comment'));
