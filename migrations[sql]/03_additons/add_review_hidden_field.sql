-- 리뷰 테이블에 is_hidden 필드 추가
-- 유치원, 어린이집, 놀이시설 리뷰 테이블에 관리자 숨김 처리 기능 추가

-- 1. 유치원 리뷰 테이블에 is_hidden 필드 추가
ALTER TABLE kindergarten_reviews 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 2. 어린이집 리뷰 테이블에 is_hidden 필드 추가
ALTER TABLE childcare_reviews 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 3. 놀이시설 리뷰 테이블에 is_hidden 필드 추가
ALTER TABLE playground_reviews 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 4. 기존 리뷰들의 is_hidden을 FALSE로 설정
UPDATE kindergarten_reviews SET is_hidden = FALSE WHERE is_hidden IS NULL;
UPDATE childcare_reviews SET is_hidden = FALSE WHERE is_hidden IS NULL;
UPDATE playground_reviews SET is_hidden = FALSE WHERE is_hidden IS NULL;

-- 5. 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_kindergarten_reviews_is_hidden ON kindergarten_reviews(is_hidden);
CREATE INDEX IF NOT EXISTS idx_childcare_reviews_is_hidden ON childcare_reviews(is_hidden);
CREATE INDEX IF NOT EXISTS idx_playground_reviews_is_hidden ON playground_reviews(is_hidden);

-- 6. 관리자가 리뷰를 숨김 처리할 수 있도록 RLS 정책 추가
-- (서비스 롤 키를 사용하는 API에서는 RLS를 우회하므로 별도 정책 불필요)

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Database > Tables에서 각 리뷰 테이블에 is_hidden 컬럼이 추가되었는지 확인

-- =====================================================
-- 필드 설명:
-- =====================================================
-- is_hidden:
--   - FALSE: 정상 리뷰 (앱에서 정상 표시)
--   - TRUE: 관리자에 의해 숨김 처리된 리뷰 (앱에서 "관리자에 의해 숨김처리된 칭찬입니다" 표시)





