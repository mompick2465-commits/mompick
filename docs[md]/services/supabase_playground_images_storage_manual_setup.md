# playground-images Storage 버킷 설정 가이드

Supabase Storage 버킷과 정책을 대시보드에서 수동으로 설정하는 방법입니다.

## 1단계: 버킷 생성

1. Supabase 대시보드 > **Storage** 메뉴로 이동
2. **New Bucket** 버튼 클릭
3. 다음 설정 입력:
   - **Name**: `playground-images`
   - **Public bucket**: ✅ 체크 (공개 버킷)
   - **File size limit**: `100` MB (선택사항)
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp, image/heic` (선택사항)
4. **Create bucket** 버튼 클릭

## 2단계: RLS 정책 설정

Storage > **Policies** 탭으로 이동하여 다음 정책들을 생성하세요.

### 정책 1: 공개 읽기 (Public Read)

- **Policy name**: `Allow public reads from playground-images`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition**:
```sql
bucket_id = 'playground-images'
```

### 정책 2: 인증된 사용자 업로드 (Authenticated Upload)

- **Policy name**: `Allow authenticated uploads to playground-images`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'playground-images' AND auth.role() = 'authenticated'
```

### 정책 3: 서비스 역할 업로드 (Service Role Upload) - 관리자용

- **Policy name**: `Allow service role uploads to playground-images`
- **Allowed operation**: `INSERT`
- **Target roles**: `service_role`
- **Policy definition**:
```sql
bucket_id = 'playground-images' AND auth.role() = 'service_role'
```

### 정책 4: 파일 수정 (Update)

- **Policy name**: `Allow authenticated updates to playground-images`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated, service_role`
- **Policy definition**:
```sql
bucket_id = 'playground-images' AND (auth.uid() = owner OR auth.role() = 'service_role')
```

### 정책 5: 파일 삭제 (Delete)

- **Policy name**: `Allow authenticated deletes from playground-images`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated, service_role`
- **Policy definition**:
```sql
bucket_id = 'playground-images' AND (auth.uid() = owner OR auth.role() = 'service_role')
```

## 3단계: 확인

1. Storage > **Buckets**에서 `playground-images` 버킷이 생성되었는지 확인
2. Storage > **Policies**에서 위 5개 정책이 모두 생성되었는지 확인
3. 관리자 페이지에서 놀이시설 건물 사진 업로드 테스트

## 문제 해결

### 권한 오류가 발생하는 경우

- Supabase 프로젝트의 Storage 기능이 활성화되어 있는지 확인
- 프로젝트 소유자 권한으로 로그인했는지 확인
- Storage > Settings에서 RLS가 활성화되어 있는지 확인

### 업로드가 실패하는 경우

- 버킷 이름이 정확히 `playground-images`인지 확인
- 정책이 올바르게 설정되었는지 확인
- 서비스 역할 키가 올바르게 설정되었는지 확인





