-- 거절된 삭제요청에 대한 재요청 허용
-- 기존 UNIQUE 제약 조건을 제거하고, pending 상태인 경우에만 중복을 방지하는 부분 유니크 인덱스로 변경

-- 1. 기존 UNIQUE 제약 조건 제거
ALTER TABLE review_delete_requests 
DROP CONSTRAINT IF EXISTS review_delete_requests_review_id_review_type_requester_id_key;

-- 2. pending 상태인 경우에만 중복을 방지하는 부분 유니크 인덱스 생성
-- 같은 사용자가 같은 리뷰에 대해 pending 상태의 요청을 여러 개 만들 수 없도록 함
CREATE UNIQUE INDEX IF NOT EXISTS review_delete_requests_pending_unique 
ON review_delete_requests(review_id, review_type, requester_id) 
WHERE status = 'pending';

-- 3. 코멘트 추가
COMMENT ON INDEX review_delete_requests_pending_unique IS 
'pending 상태인 삭제요청에 대해서만 중복을 방지합니다. rejected 상태인 경우 재요청이 가능합니다.';



