-- kindergarten_reviews 테이블에 유치원 이름 컬럼 추가
ALTER TABLE kindergarten_reviews 
ADD COLUMN kindergarten_name TEXT;

-- 기존 데이터가 있다면 유치원 이름 업데이트 (선택사항)
-- UPDATE kindergarten_reviews 
-- SET kindergarten_name = (
--   SELECT name 
--   FROM kindergartens 
--   WHERE kindergartens.code = kindergarten_reviews.kindergarten_code
-- );
