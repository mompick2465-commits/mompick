-- review_delete_requests 테이블에 삭제요청 사유 필드 추가
ALTER TABLE review_delete_requests 
ADD COLUMN IF NOT EXISTS request_reason TEXT;

-- 기존 데이터의 request_reason을 NULL로 설정 (이미 NULL이지만 명시적으로 설정)
UPDATE review_delete_requests 
SET request_reason = NULL 
WHERE request_reason IS NULL;

-- 코멘트 추가
COMMENT ON COLUMN review_delete_requests.request_reason IS '사용자가 작성한 삭제요청 사유 (최대 500자)';



