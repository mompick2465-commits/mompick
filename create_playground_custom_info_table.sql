-- playground_custom_info 테이블 생성
-- 놀이시설 커스텀 정보 저장용 (유치원 관리와 동일한 구조)

CREATE TABLE IF NOT EXISTS playground_custom_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playground_id TEXT NOT NULL UNIQUE, -- 놀이시설 ID (pfctSn)
  playground_name TEXT NOT NULL, -- 놀이시설명
  building_images TEXT[] DEFAULT '{}', -- 건물 사진 URL 배열
  detailed_description TEXT, -- 상세 설명
  facilities TEXT[], -- 시설 정보 배열
  programs TEXT[], -- 프로그램 정보 배열
  is_active BOOLEAN DEFAULT true, -- 활성화 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_playground_custom_info_playground_id ON playground_custom_info(playground_id);
CREATE INDEX IF NOT EXISTS idx_playground_custom_info_is_active ON playground_custom_info(is_active);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_playground_custom_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playground_custom_info_updated_at
  BEFORE UPDATE ON playground_custom_info
  FOR EACH ROW
  EXECUTE FUNCTION update_playground_custom_info_updated_at();

-- RLS 정책 (관리자만 접근 가능하도록 설정)
ALTER TABLE playground_custom_info ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 (앱에서 사용)
CREATE POLICY "Allow public reads from playground_custom_info" ON playground_custom_info
  FOR SELECT USING (true);

-- 인증된 사용자만 작성/수정 가능 (관리자 페이지용)
CREATE POLICY "Allow authenticated writes to playground_custom_info" ON playground_custom_info
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates to playground_custom_info" ON playground_custom_info
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes from playground_custom_info" ON playground_custom_info
  FOR DELETE USING (auth.role() = 'authenticated');





