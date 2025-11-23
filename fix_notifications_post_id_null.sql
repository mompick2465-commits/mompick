-- notifications 테이블의 post_id 필드를 nullable로 수정

-- 1. post_id 필드의 NOT NULL 제약 조건 제거
ALTER TABLE notifications ALTER COLUMN post_id DROP NOT NULL;

-- 2. 제약 조건 확인
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND column_name IN ('post_id', 'comment_id')
ORDER BY column_name;
