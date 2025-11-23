-- ad_banners 테이블의 title 컬럼을 선택사항으로 변경
ALTER TABLE ad_banners 
ALTER COLUMN title DROP NOT NULL;

-- 확인
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'ad_banners' 
AND column_name IN ('title', 'description', 'image_url');

