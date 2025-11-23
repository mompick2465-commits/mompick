-- notifications 테이블의 외래키 제약 조건 수정

-- 1. 기존 외래키 제약 조건 확인
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='notifications';

-- 2. 기존 외래키 제약 조건 제거
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_post_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_comment_id_fkey;

-- 3. 새로운 외래키 제약 조건 추가 (여러 테이블 참조 허용)
-- post_id는 community_posts 또는 kindergarten_reviews 테이블을 참조할 수 있도록 설정
-- comment_id는 comments 테이블을 참조

-- post_id 외래키 제약 조건 (community_posts 테이블 참조)
ALTER TABLE notifications ADD CONSTRAINT notifications_post_id_community_fkey 
FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE;

-- comment_id 외래키 제약 조건 (comments 테이블 참조)  
ALTER TABLE notifications ADD CONSTRAINT notifications_comment_id_fkey 
FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;

-- 4. 제약 조건 확인
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='notifications';
