-- ad_banners 테이블에 show_click_text 컬럼 추가
ALTER TABLE ad_banners 
ADD COLUMN IF NOT EXISTS show_click_text BOOLEAN DEFAULT false;

-- 기본값 설정
UPDATE ad_banners 
SET show_click_text = false 
WHERE show_click_text IS NULL;

-- 확인
SELECT id, title, link_url, show_click_text 
FROM ad_banners 
LIMIT 5;

