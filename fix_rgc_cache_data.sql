-- rgc_cache 테이블의 잘못된 지역 코드 데이터 수정
-- 남양주시 관련 캐시 데이터 확인 및 수정

-- 1. 현재 캐시된 데이터 확인
SELECT 
    tile_key,
    sido_name,
    sgg_name,
    kindergarten_sido_code,
    kindergarten_sgg_code,
    childcare_arcode
FROM rgc_cache 
WHERE sido_name = '경기도' AND sgg_name = '남양주시'
   OR kindergarten_sgg_code = 41360
   OR tile_key LIKE '%wydqs8%';

-- 2. 잘못된 데이터 수정 (남양주시의 경우)
UPDATE rgc_cache 
SET 
    kindergarten_sido_code = 41,
    kindergarten_sgg_code = 41360,
    childcare_arcode = '41360'
WHERE sido_name = '경기도' 
  AND sgg_name = '남양주시'
  AND (kindergarten_sido_code != 41 OR kindergarten_sgg_code != 41360);

-- 3. 서울 중구로 잘못 매핑된 남양주시 데이터 수정
UPDATE rgc_cache 
SET 
    sido_name = '경기도',
    sgg_name = '남양주시',
    kindergarten_sido_code = 41,
    kindergarten_sgg_code = 41360,
    childcare_arcode = '41360'
WHERE kindergarten_sgg_code = 11140 
  AND (sido_name = '경기도' OR sgg_name LIKE '%남양주%');

-- 4. 수정 후 확인
SELECT 
    tile_key,
    sido_name,
    sgg_name,
    kindergarten_sido_code,
    kindergarten_sgg_code,
    childcare_arcode
FROM rgc_cache 
WHERE sido_name = '경기도' AND sgg_name = '남양주시';
