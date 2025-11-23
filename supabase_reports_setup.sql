-- 신고 기능을 위한 reports 테이블 생성
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_reason TEXT NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'spam', 'inappropriate', 'harassment', 'other'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 한 사용자가 같은 게시글을 중복 신고할 수 없도록 제한
  UNIQUE(post_id, reporter_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- RLS (Row Level Security) 활성화
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
-- 사용자는 자신이 신고한 내용만 볼 수 있음
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- 사용자는 신고를 생성할 수 있음
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 사용자는 자신의 신고를 수정할 수 있음 (상태 변경 등)
CREATE POLICY "Users can update their own reports" ON reports
  FOR UPDATE USING (auth.uid() = reporter_id);

-- 관리자는 모든 신고를 볼 수 있음 (필요시 별도 관리자 테이블과 연동)
-- CREATE POLICY "Admins can view all reports" ON reports
--   FOR SELECT USING (EXISTS (
--     SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin'
--   ));

-- updated_at 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_reports_updated_at 
  BEFORE UPDATE ON reports 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
