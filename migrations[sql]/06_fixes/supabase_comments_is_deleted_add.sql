-- 댓글 테이블에 is_deleted 필드 추가
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 기존 댓글들의 is_deleted를 FALSE로 설정
UPDATE comments 
SET is_deleted = FALSE 
WHERE is_deleted IS NULL;

-- is_deleted 필드에 대한 인덱스 추가 (선택사항)
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON comments(is_deleted);

-- 기존 정책들을 업데이트하여 is_deleted 필드 지원

-- 1. Allow users to update their own comments 정책 업데이트 (is_deleted = FALSE 조건 추가)
ALTER POLICY "Allow users to update their own comments" 
ON "public"."comments"
TO authenticated
USING (
  user_id = auth.uid()::text
  AND is_deleted = FALSE
);

-- 2. Allow users to delete their own comments 정책을 UPDATE로 변경 (실제 삭제 대신 is_deleted 플래그 설정)
ALTER POLICY "Allow users to delete their own comments" 
ON "public"."comments"
TO authenticated
USING (
  user_id = auth.uid()::text
);

-- 3. Allow public read comments 정책은 그대로 유지 (삭제된 댓글도 읽을 수 있음)
-- 기존 정책이 이미 public SELECT를 허용하므로 수정 불필요

-- 4. Allow authenticated users to create comments 정책은 그대로 유지
-- 기존 정책이 이미 authenticated INSERT를 허용하므로 수정 불필요
