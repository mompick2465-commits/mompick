# 데이터베이스 마이그레이션 가이드

이 문서는 맘픽 프로젝트의 모든 SQL 마이그레이션 스크립트를 종합적으로 정리한 가이드입니다.

## 목차

1. [초기 설정](#초기-설정)
2. [테이블 생성](#테이블-생성)
3. [컬럼 추가](#컬럼-추가)
4. [RLS 정책 설정](#rls-정책-설정)
5. [데이터 마이그레이션](#데이터-마이그레이션)
6. [버그 수정 및 정책 수정](#버그-수정-및-정책-수정)
7. [Storage 설정](#storage-설정)
8. [실행 순서](#실행-순서)

---

## 초기 설정

### 1. Supabase 기본 설정

#### `supabase_setup.sql`
- 커뮤니티 게시글 테이블 (`community_posts`) 생성
- Storage 버킷 설정 (community-images)
- RLS 정책 설정
- `profiles` 테이블 RLS 정책 설정

**주요 테이블:**
- `community_posts`: 커뮤니티 게시글

**주요 기능:**
- 커뮤니티 이미지 스토리지 버킷 생성
- 프로필 RLS 정책 설정

---

## 테이블 생성

### 사용자 및 인증 관련

#### `create_terms_table.sql`
- 약관 테이블 (`terms`) 생성
- 약관 카테고리: service, privacy, data, marketing
- 초기 약관 데이터 삽입

#### `create_user_terms_agreements_table.sql`
- 사용자 약관 동의 정보 테이블 (`user_terms_agreements`) 생성
- 각 사용자의 약관별 동의 정보 저장
- RLS 정책: 사용자는 자신의 약관 동의 정보만 관리 가능

#### `create_fcm_tokens_table.sql`
- FCM 토큰 저장 테이블 (`fcm_tokens`) 생성
- 플랫폼별 토큰 관리 (android, ios)
- RLS 정책: 사용자는 자신의 토큰만 관리 가능

#### `create_contacts_table.sql`
- 연락처 테이블 생성
- 시설 연락처 정보 저장

#### `create_notification_settings_table.sql`
- 알림 설정 테이블 생성
- 사용자별 알림 설정 관리

### 커뮤니티 관련

#### `supabase_comments_setup.sql`
- 댓글 시스템 테이블 생성
- 댓글 및 답글 기능
- 좋아요 기능

#### `supabase_comments_reply_setup.sql`
- 답글 기능 추가 설정

#### `supabase_likes_setup.sql`
- 좋아요 테이블 생성

#### `supabase_favorites_setup.sql`
- 즐겨찾기 테이블 생성

### 리뷰 시스템

#### `create_review_tables.sql`
- 유치원 리뷰 시스템 테이블 생성
  - `kindergarten_reviews`: 유치원 리뷰
  - `kindergarten_review_images`: 리뷰 이미지
  - `kindergarten_review_helpful`: 도움됨 기능
- 인덱스 및 RLS 정책 포함

#### `create_childcare_review_tables.sql`
- 어린이집 리뷰 시스템 테이블 생성
  - `childcare_reviews`: 어린이집 리뷰
  - `childcare_review_images`: 리뷰 이미지
  - `childcare_review_helpful`: 도움됨 기능
- RLS 정책 및 트리거 포함

#### `create_review_delete_requests_table.sql`
- 리뷰 삭제 요청 테이블 생성

### 시설 정보 관련

#### `create_kindergarten_custom_info_table.sql`
- 유치원 커스텀 정보 테이블 생성
- API 기본 정보 + 관리자 추가 정보

#### `create_kindergarten_application_info_table.sql`
- 유치원 신청 정보 테이블 생성

#### `create_kindergarten_meals_table.sql`
- 유치원 급식 정보 테이블 생성

#### `create_childcare_application_info_table.sql`
- 어린이집 신청 정보 테이블 생성

#### `create_playground_custom_info_table.sql`
- 놀이터 커스텀 정보 테이블 생성

#### `create_playground_region_mappings_table.sql`
- 놀이터 지역 매핑 테이블 생성

### 알림 시스템

#### `supabase_notifications_table.sql`
- 알림 테이블 기본 생성

#### `complete_notifications_schema.sql`
- 알림 테이블 완전한 스키마 + RLS 정책
- 알림 타입: reply, like, mention, system
- 자기 자신에게 알림 금지 제약조건

### 신고 시스템

#### `supabase_reports_setup.sql`
- 신고 테이블 생성 및 설정

### 배너 및 캐시

#### `create_main_banners_table.sql`
- 메인 배너 테이블 생성

#### `create_geocoding_cache_tables.sql`
- 지오코딩 캐시 테이블 생성

#### `create_childcare_cache_bucket.sql`
- 어린이집 캐시 Storage 버킷 설정

#### `create_playground_cache_bucket.sql`
- 놀이터 캐시 Storage 버킷 설정

---

## 컬럼 추가

### 유치원 관련

#### `add_kindergarten_name_column.sql`
- 유치원명 컬럼 추가

#### `add_is_active_column.sql`
- 활성화 여부 컬럼 추가

### 리뷰 관련

#### `add_review_hidden_field.sql`
- 리뷰 숨김 필드 추가

#### `add_request_reason_to_review_delete_requests.sql`
- 리뷰 삭제 요청에 사유 추가

### 신고 관련

#### `add_reports_facility_name.sql`
- 신고 테이블에 시설명 추가

#### `add_show_click_text_column.sql`
- 클릭 텍스트 표시 컬럼 추가

### 즐겨찾기 관련

#### `add_favorites_region_codes.sql`
- 즐겨찾기에 지역 코드 추가

### 알림 관련

#### `add_comment_notification_type.sql`
- 댓글 알림 타입 추가

### 인증 관련

#### `add_apple_auth_method.sql`
- 애플 인증 방식 추가

---

## RLS 정책 설정

### 완전한 RLS 정책

#### `complete_rls_policies.sql`
- 알림 테이블 완전한 RLS 정책 설정

### 프로필 관련

#### `fix_profiles_rls.sql`
- 프로필 RLS 정책 수정

#### `fix_profiles_rls_for_signup.sql`
- 회원가입 시 프로필 RLS 정책 수정

#### `fix_profiles_rls_for_notifications.sql`
- 알림을 위한 프로필 RLS 정책 수정

### 알림 관련

#### `fix_notifications_rls.sql`
- 알림 RLS 정책 기본 수정

#### `fix_notifications_rls_final.sql`
- 알림 RLS 정책 최종 수정

#### `fix_notifications_rls_proper.sql`
- 알림 RLS 정책 적절한 수정

#### `fix_notifications_rls_simple.sql`
- 알림 RLS 정책 간단한 수정

#### `fix_review_notifications.sql`
- 리뷰 알림 RLS 정책 수정

### 시설 정보 관련

#### `fix_childcare_custom_info_rls.sql`
- 어린이집 커스텀 정보 RLS 정책 수정

#### `fix_childcare_meals_rls.sql`
- 어린이집 급식 RLS 정책 수정

#### `fix_childcare_helpful_policies.sql`
- 어린이집 도움됨 RLS 정책 수정

### 캐시 관련

#### `fix_cache_rls_policies.sql`
- 캐시 RLS 정책 수정

### 연락처 관련

#### `fix_contacts_rls.sql`
- 연락처 RLS 정책 수정

### 신고 관련

#### `fix_reports_policies.sql`
- 신고 RLS 정책 수정

---

## 데이터 마이그레이션

### 알림 시스템

#### `migrate_notifications_schema.sql`
- 알림 스키마 마이그레이션

### 지역 데이터

#### `insert_all_regions.sql`
- 모든 지역 데이터 삽입

#### `insert_missing_regions.sql`
- 누락된 지역 데이터 삽입

### 외래키 및 관계

#### `update_author_id_to_profile_id.sql`
- 작성자 ID를 프로필 ID로 업데이트

#### `update_reports_generic_targets.sql`
- 신고 타겟을 제네릭하게 업데이트

#### `update_ad_banners_title_optional.sql`
- 광고 배너 제목을 선택사항으로 업데이트

---

## 버그 수정 및 정책 수정

### 알림 관련

#### `fix_notifications_comment_type.sql`
- 댓글 알림 타입 수정

#### `fix_notifications_foreign_key.sql`
- 알림 외래키 수정

#### `fix_notifications_post_id_null.sql`
- 알림 post_id NULL 허용 수정

### 댓글 관련

#### `supabase_comments_fix.sql`
- 댓글 시스템 버그 수정

#### `supabase_comments_is_deleted_add.sql`
- 댓글 is_deleted 필드 추가

#### `supabase_comments_migration.sql`
- 댓글 마이그레이션

### 외래키 관련

#### `fix_foreign_key_issue.sql`
- 외래키 이슈 수정

#### `supabase_foreign_key_setup.sql`
- 외래키 설정

#### `fix_community_posts_foreign_key.sql`
- 커뮤니티 게시글 외래키 수정

#### `fix_playground_review_helpful_foreign_key.sql`
- 놀이터 리뷰 도움됨 외래키 수정

### 즐겨찾기 관련

#### `fix_favorites_target_type_check.sql`
- 즐겨찾기 타겟 타입 체크 수정

### 지역 관련

#### `fix_missing_regions_in_mapping_table.sql`
- 매핑 테이블에 누락된 지역 추가

### 캐시 관련

#### `fix_rgc_cache_data.sql`
- RGC 캐시 데이터 수정

### 리뷰 관련

#### `fix_reports_review_image_duplicate.sql`
- 리뷰 이미지 중복 신고 수정

#### `recreate_childcare_rls_policies.sql`
- 어린이집 RLS 정책 재생성

### 신고 관련

#### `allow_profile_report_duplicate.sql`
- 프로필 신고 중복 허용

#### `allow_rejected_review_delete_requests.sql`
- 거부된 리뷰 삭제 요청 허용

### 프로필 관련

#### `supabase_profiles_auth_fix.sql`
- 프로필 인증 버그 수정

#### `supabase_profiles_auth_fix_v2.sql`
- 프로필 인증 버그 수정 (v2)

### RLS 관련

#### `supabase_rls_policy_fix.sql`
- RLS 정책 버그 수정

#### `fix_rls_complete.sql`
- RLS 완전 수정

#### `disable_rls_completely.sql`
- RLS 완전 비활성화 (임시)

#### `temporary_disable_rls.sql`
- RLS 임시 비활성화

---

## Storage 설정

### Storage 기본 설정

#### `supabase_storage_setup.sql`
- Storage 기본 설정

#### `supabase_storage_policies.sql`
- Storage RLS 정책 설정

### 리뷰 이미지 Storage

#### `setup_review_storage.sql`
- 리뷰 이미지 Storage 설정

#### `supabase_storage_childcare_reviews.sql`
- 어린이집 리뷰 Storage 설정

### 어린이집 이미지 Storage

#### `create_childcare_images_storage.sql`
- 어린이집 이미지 Storage 설정

### 놀이터 이미지 Storage

#### `supabase_playground_images_storage_setup.sql`
- 놀이터 이미지 Storage 설정

#### `supabase_playground_cache_storage_setup.sql`
- 놀이터 캐시 Storage 설정

---

## 실행 순서

### 1. 초기 설정 (최우선)

```sql
-- 1. Supabase 기본 설정
supabase_setup.sql

-- 2. 프로필 인증 수정 (필요시)
supabase_profiles_auth_fix.sql
supabase_profiles_auth_fix_v2.sql
```

### 2. 기본 테이블 생성

```sql
-- 사용자 관련
create_terms_table.sql
create_user_terms_agreements_table.sql
create_contacts_table.sql
create_notification_settings_table.sql
create_fcm_tokens_table.sql

-- 커뮤니티 관련
supabase_comments_setup.sql
supabase_comments_reply_setup.sql
supabase_likes_setup.sql
supabase_favorites_setup.sql
supabase_reports_setup.sql

-- 알림 시스템
supabase_notifications_table.sql
complete_notifications_schema.sql
```

### 3. 시설 정보 테이블

```sql
create_kindergarten_custom_info_table.sql
create_kindergarten_application_info_table.sql
create_kindergarten_meals_table.sql
create_childcare_application_info_table.sql
create_playground_custom_info_table.sql
create_playground_region_mappings_table.sql
create_main_banners_table.sql
```

### 4. 리뷰 시스템

```sql
create_review_tables.sql
create_childcare_review_tables.sql
create_review_delete_requests_table.sql
```

### 5. 캐시 시스템

```sql
create_geocoding_cache_tables.sql
create_childcare_cache_bucket.sql
create_playground_cache_bucket.sql
```

### 6. Storage 설정

```sql
supabase_storage_setup.sql
supabase_storage_policies.sql
setup_review_storage.sql
supabase_storage_childcare_reviews.sql
create_childcare_images_storage.sql
supabase_playground_images_storage_setup.sql
```

### 7. 컬럼 추가

```sql
add_kindergarten_name_column.sql
add_is_active_column.sql
add_review_hidden_field.sql
add_request_reason_to_review_delete_requests.sql
add_reports_facility_name.sql
add_show_click_text_column.sql
add_favorites_region_codes.sql
add_comment_notification_type.sql
add_apple_auth_method.sql
```

### 8. 데이터 삽입

```sql
insert_all_regions.sql
insert_missing_regions.sql
```

### 9. 데이터 마이그레이션

```sql
migrate_notifications_schema.sql
update_author_id_to_profile_id.sql
update_reports_generic_targets.sql
update_ad_banners_title_optional.sql
```

### 10. RLS 정책 설정

```sql
complete_rls_policies.sql
fix_profiles_rls.sql
fix_profiles_rls_for_signup.sql
fix_profiles_rls_for_notifications.sql
fix_notifications_rls_final.sql
fix_childcare_custom_info_rls.sql
fix_childcare_meals_rls.sql
fix_childcare_helpful_policies.sql
fix_cache_rls_policies.sql
fix_contacts_rls.sql
fix_reports_policies.sql
```

### 11. 버그 수정

```sql
fix_notifications_comment_type.sql
fix_notifications_foreign_key.sql
fix_notifications_post_id_null.sql
fix_foreign_key_issue.sql
fix_community_posts_foreign_key.sql
fix_playground_review_helpful_foreign_key.sql
fix_favorites_target_type_check.sql
fix_missing_regions_in_mapping_table.sql
fix_rgc_cache_data.sql
fix_reports_review_image_duplicate.sql
allow_profile_report_duplicate.sql
allow_rejected_review_delete_requests.sql
recreate_childcare_rls_policies.sql
fix_review_notifications.sql
```

---

## 주요 테이블 목록

### 사용자 및 인증
- `profiles`: 사용자 프로필
- `terms`: 약관
- `user_terms_agreements`: 사용자 약관 동의
- `fcm_tokens`: FCM 토큰

### 커뮤니티
- `community_posts`: 커뮤니티 게시글
- `comments`: 댓글
- `likes`: 좋아요
- `favorites`: 즐겨찾기
- `reports`: 신고

### 알림
- `notifications`: 알림
- `notification_settings`: 알림 설정

### 리뷰
- `kindergarten_reviews`: 유치원 리뷰
- `kindergarten_review_images`: 유치원 리뷰 이미지
- `kindergarten_review_helpful`: 유치원 리뷰 도움됨
- `childcare_reviews`: 어린이집 리뷰
- `childcare_review_images`: 어린이집 리뷰 이미지
- `childcare_review_helpful`: 어린이집 리뷰 도움됨
- `review_delete_requests`: 리뷰 삭제 요청

### 시설 정보
- `kindergarten_custom_info`: 유치원 커스텀 정보
- `kindergarten_application_info`: 유치원 신청 정보
- `kindergarten_meals`: 유치원 급식
- `childcare_application_info`: 어린이집 신청 정보
- `playground_custom_info`: 놀이터 커스텀 정보
- `playground_region_mappings`: 놀이터 지역 매핑

### 기타
- `main_banners`: 메인 배너
- `contacts`: 연락처
- `geocoding_cache`: 지오코딩 캐시

---

## 주요 Storage 버킷

- `community-images`: 커뮤니티 이미지
- `kindergarten-cache`: 유치원 캐시
- `childcare-cache`: 어린이집 캐시
- `playground-cache`: 놀이터 캐시
- `review-images`: 리뷰 이미지

---

## 주의사항

1. **실행 순서**: 위의 실행 순서를 따라야 합니다. 순서를 바꾸면 오류가 발생할 수 있습니다.

2. **RLS 정책**: RLS 정책은 데이터 보안에 중요합니다. 테스트 환경에서는 임시로 비활성화할 수 있지만, 프로덕션에서는 반드시 활성화해야 합니다.

3. **외래키**: 외래키 제약조건이 있는 테이블은 참조하는 테이블이 먼저 생성되어야 합니다.

4. **Storage 버킷**: Storage 버킷은 SQL로 생성할 수 있지만, Supabase 대시보드에서 수동으로 생성하는 것이 더 안전합니다.

5. **백업**: 마이그레이션 전에 반드시 데이터베이스 백업을 수행하세요.

---

## 디버깅

### RLS 정책 확인

```sql
-- 특정 테이블의 RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- RLS 활성화 상태 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'table_name';
```

### 외래키 확인

```sql
-- 테이블의 외래키 확인
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'table_name';
```

### 인덱스 확인

```sql
-- 테이블의 인덱스 확인
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'table_name';
```

---

이 문서는 프로젝트의 모든 SQL 마이그레이션 스크립트를 종합적으로 정리한 것입니다. 새로운 마이그레이션이 추가되면 이 문서도 업데이트해야 합니다.
