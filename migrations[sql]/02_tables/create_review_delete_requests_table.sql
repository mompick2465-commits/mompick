-- 칭찬(리뷰) 삭제요청 테이블 생성
CREATE TABLE IF NOT EXISTS review_delete_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL, -- 리뷰 ID (review_type에 따라 다른 테이블 참조)
  review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('playground', 'kindergarten', 'childcare')), -- 리뷰 타입
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- 요청한 사용자 (profile.id)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')), -- 상태: 대기중, 승인됨, 거절됨
  admin_notes TEXT, -- 관리자 메모
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 같은 리뷰에 대한 중복 요청 방지
  UNIQUE(review_id, review_type, requester_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_review_delete_requests_review_id ON review_delete_requests(review_id, review_type);
CREATE INDEX IF NOT EXISTS idx_review_delete_requests_requester_id ON review_delete_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_review_delete_requests_status ON review_delete_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_delete_requests_created_at ON review_delete_requests(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE review_delete_requests ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
-- 사용자는 자신이 요청한 삭제요청만 볼 수 있음
CREATE POLICY "Users can view their own delete requests" ON review_delete_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND (id = requester_id OR user_type = 'admin')
    )
  );

-- 사용자는 삭제요청을 생성할 수 있음
CREATE POLICY "Users can create delete requests" ON review_delete_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND id = requester_id
    )
  );

-- 관리자는 모든 삭제요청을 볼 수 있음
CREATE POLICY "Admins can view all delete requests" ON review_delete_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- 관리자는 삭제요청을 수정할 수 있음 (상태 변경 등)
CREATE POLICY "Admins can update delete requests" ON review_delete_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- updated_at 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_review_delete_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_review_delete_requests_updated_at
  BEFORE UPDATE ON review_delete_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_review_delete_requests_updated_at();

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Database > Tables > review_delete_requests에서 테이블이 생성되었는지 확인
-- 4. Database > Tables > review_delete_requests > Policies에서 정책들이 생성되었는지 확인

-- =====================================================
-- 테이블 설명:
-- =====================================================
-- review_id: 리뷰 ID (review_type에 따라 playground_reviews, kindergarten_reviews, childcare_reviews 중 하나)
-- review_type: 리뷰 타입 ('playground', 'kindergarten', 'childcare')
-- requester_id: 삭제요청한 사용자의 profile ID
-- status: 요청 상태 ('pending': 대기중, 'approved': 승인됨, 'rejected': 거절됨)
-- admin_notes: 관리자가 남긴 메모

