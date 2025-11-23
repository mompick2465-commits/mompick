-- 리뷰 좋아요 알림 시스템을 위한 컬럼 추가

-- 1. notifications 테이블의 type 체크 제약 조건에 'review_like' 추가
-- 기존 제약 조건 제거
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 새로운 제약 조건 추가 (review_like 포함)
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('reply','like','comment','review_like','mention','system'));