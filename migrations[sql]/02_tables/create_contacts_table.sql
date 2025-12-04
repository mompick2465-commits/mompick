-- 문의사항 테이블 생성
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'account', 'bug', 'suggestion', 'content', 'payment', 'other'
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'closed'
  admin_response TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신이 작성한 문의사항만 볼 수 있도록 정책 생성
CREATE POLICY "사용자는 자신의 문의사항 조회 가능" ON contacts
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- 인증된 사용자만 문의사항을 작성할 수 있도록 정책 생성
CREATE POLICY "사용자는 문의사항 작성 가능" ON contacts
  FOR INSERT WITH CHECK (true);

-- 사용자는 자신의 문의사항을 수정할 수 있도록 정책 생성 (상태가 pending일 때만)
CREATE POLICY "사용자는 자신의 문의사항 수정 가능" ON contacts
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- 관리자는 모든 문의사항을 볼 수 있도록 정책 생성 (서비스 롤 키 사용)
-- 관리자 페이지에서는 서비스 롤 키를 사용하므로 별도 정책 불필요

-- updated_at 자동 업데이트를 위한 트리거
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 사용법:
-- =====================================================
-- 1. Supabase 대시보드에서 SQL Editor 열기
-- 2. 위 스크립트 복사하여 실행
-- 3. Database > Tables > contacts에서 테이블이 생성되었는지 확인
-- 4. Database > Tables > contacts > Indexes에서 인덱스가 생성되었는지 확인
-- 5. Database > Tables > contacts > Policies에서 RLS 정책이 생성되었는지 확인

-- =====================================================
-- 컬럼 설명:
-- =====================================================
-- id: 고유 식별자 (UUID)
-- user_id: 문의 작성자 ID (profiles 테이블 참조, NULL 가능 - 비로그인 사용자)
-- user_name: 문의 작성자 이름
-- category: 문의 카테고리 ('account', 'bug', 'suggestion', 'content', 'payment', 'other')
-- content: 문의 내용
-- images: 첨부 이미지 URL 배열
-- status: 처리 상태 ('pending', 'in_progress', 'resolved', 'closed')
-- admin_response: 관리자 답변
-- admin_notes: 관리자 메모 (사용자에게 보이지 않음)
-- created_at: 생성일시
-- updated_at: 수정일시


