-- 리뷰 이미지용 Supabase Storage 버킷 생성

-- 1. Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('kindergarten-reviews', 'kindergarten-reviews', true);

-- 2. Storage 정책 설정 (RLS)
CREATE POLICY "모든 사용자는 리뷰 이미지를 조회할 수 있습니다" ON storage.objects
  FOR SELECT USING (bucket_id = 'kindergarten-reviews');

CREATE POLICY "인증된 사용자는 리뷰 이미지를 업로드할 수 있습니다" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kindergarten-reviews' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "사용자는 자신이 업로드한 리뷰 이미지만 삭제할 수 있습니다" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'kindergarten-reviews' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
