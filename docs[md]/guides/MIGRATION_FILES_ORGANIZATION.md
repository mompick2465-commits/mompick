# SQL 마이그레이션 파일 정리 가이드

## 파일 분류

### ✅ 유지해야 할 파일 (필수)

#### 1. 초기 설정 파일
- `supabase_setup.sql` - 기본 설정
- `supabase_storage_setup.sql` - Storage 기본 설정
- `supabase_storage_policies.sql` - Storage 정책

#### 2. 테이블 생성 파일 (create_*)
모든 `create_*.sql` 파일들은 새 환경에서 필요합니다.

#### 3. 컬럼 추가 파일 (add_*)
모든 `add_*.sql` 파일들은 스키마 업데이트에 필요합니다.

#### 4. 데이터 마이그레이션 파일
- `insert_*.sql` - 초기 데이터
- `update_*.sql` - 데이터 업데이트
- `migrate_*.sql` - 스키마 마이그레이션

#### 5. Storage 설정 파일
모든 Storage 관련 파일들

### ⚠️ 검토 필요 파일 (조건부 유지)

#### RLS 정책 수정 파일 (fix_*)
- 이미 적용되었다면 참조용으로만 필요
- 하지만 다른 환경에 적용할 때 필요할 수 있음
- **권장**: 유지 (새 환경/롤백 시 필요)

### 🗑️ 정리 가능 파일 (선택적 삭제)

#### 1. 디버깅 파일
- `debug_*.sql` - 디버깅용, 삭제 가능
- `check_*.sql` - 확인용, 삭제 가능

#### 2. 임시 파일
- `disable_rls_completely.sql` - 임시 비활성화용, 삭제 가능
- `temporary_disable_rls.sql` - 임시용, 삭제 가능

#### 3. 백업 파일
- `supabase.tar.gz` - 압축 파일은 별도 저장소로 이동 권장

## 정리 방안

### 방안 1: 디렉토리로 정리 (권장)

```
migrations/
├── 01_initial_setup/          # 초기 설정
│   ├── supabase_setup.sql
│   ├── supabase_storage_setup.sql
│   └── supabase_storage_policies.sql
├── 02_tables/                  # 테이블 생성
│   ├── create_childcare_application_info_table.sql
│   ├── create_childcare_review_tables.sql
│   ├── create_contacts_table.sql
│   ├── create_fcm_tokens_table.sql
│   ├── create_geocoding_cache_tables.sql
│   ├── create_kindergarten_application_info_table.sql
│   ├── create_kindergarten_custom_info_table.sql
│   ├── create_kindergarten_meals_table.sql
│   ├── create_main_banners_table.sql
│   ├── create_notification_settings_table.sql
│   ├── create_playground_custom_info_table.sql
│   ├── create_playground_region_mappings_table.sql
│   ├── create_review_delete_requests_table.sql
│   ├── create_review_tables.sql
│   ├── create_terms_table.sql
│   ├── create_user_terms_agreements_table.sql
│   ├── complete_notifications_schema.sql
│   ├── supabase_comments_setup.sql
│   ├── supabase_comments_reply_setup.sql
│   ├── supabase_favorites_setup.sql
│   ├── supabase_foreign_key_setup.sql
│   ├── supabase_likes_setup.sql
│   ├── supabase_notifications_table.sql
│   └── supabase_reports_setup.sql
├── 03_additions/               # 컬럼 추가
│   ├── add_apple_auth_method.sql
│   ├── add_comment_notification_type.sql
│   ├── add_favorites_region_codes.sql
│   ├── add_is_active_column.sql
│   ├── add_kindergarten_name_column.sql
│   ├── add_reports_facility_name.sql
│   ├── add_request_reason_to_review_delete_requests.sql
│   ├── add_review_hidden_field.sql
│   └── add_show_click_text_column.sql
├── 04_migrations/              # 데이터 마이그레이션
│   ├── migrate_notifications_schema.sql
│   ├── insert_all_regions.sql
│   ├── insert_missing_regions.sql
│   ├── update_ad_banners_title_optional.sql
│   ├── update_author_id_to_profile_id.sql
│   ├── update_reports_generic_targets.sql
│   ├── remove_kindergarten_application_info.sql
│   ├── allow_profile_report_duplicate.sql
│   └── allow_rejected_review_delete_requests.sql
├── 05_storage/                 # Storage 설정
│   ├── create_childcare_cache_bucket.sql
│   ├── create_childcare_images_storage.sql
│   ├── create_playground_cache_bucket.sql
│   ├── setup_review_storage.sql
│   ├── supabase_playground_cache_storage_setup.sql
│   ├── supabase_playground_images_storage_setup.sql
│   └── supabase_storage_childcare_reviews.sql
├── 06_fixes/                   # 버그 수정 및 RLS 정책 (참조용)
│   ├── complete_rls_policies.sql
│   ├── fix_cache_rls_policies.sql
│   ├── fix_childcare_custom_info_rls.sql
│   ├── fix_childcare_helpful_policies.sql
│   ├── fix_childcare_meals_rls.sql
│   ├── fix_community_posts_foreign_key.sql
│   ├── fix_contacts_rls.sql
│   ├── fix_favorites_target_type_check.sql
│   ├── fix_foreign_key_issue.sql
│   ├── fix_missing_regions_in_mapping_table.sql
│   ├── fix_notifications_comment_type.sql
│   ├── fix_notifications_foreign_key.sql
│   ├── fix_notifications_post_id_null.sql
│   ├── fix_notifications_rls.sql
│   ├── fix_notifications_rls_final.sql
│   ├── fix_notifications_rls_proper.sql
│   ├── fix_notifications_rls_simple.sql
│   ├── fix_playground_review_helpful_foreign_key.sql
│   ├── fix_profiles_rls.sql
│   ├── fix_profiles_rls_for_notifications.sql
│   ├── fix_profiles_rls_for_signup.sql
│   ├── fix_reports_policies.sql
│   ├── fix_reports_review_image_duplicate.sql
│   ├── fix_review_notifications.sql
│   ├── fix_rgc_cache_data.sql
│   ├── fix_rls_complete.sql
│   ├── recreate_childcare_rls_policies.sql
│   ├── supabase_comments_fix.sql
│   ├── supabase_comments_is_deleted_add.sql
│   ├── supabase_comments_migration.sql
│   ├── supabase_profiles_auth_fix.sql
│   ├── supabase_profiles_auth_fix_v2.sql
│   └── supabase_rls_policy_fix.sql
└── archive/                    # 더 이상 필요 없는 파일 (삭제 가능)
    ├── debug_auth_users.sql
    ├── debug_notifications_rls.sql
    ├── check_current_rls_policies.sql
    ├── check_notifications_table.sql
    ├── disable_rls_completely.sql
    └── temporary_disable_rls.sql
```

### 방안 2: 선택적 삭제만

디버깅/임시 파일만 삭제하고 나머지는 유지

### 방안 3: 모두 유지 (최안전)

Git에 있으면 히스토리는 보존되므로 모두 유지
단, 루트 디렉토리가 복잡해질 수 있음

## 권장사항

1. **현재 상태 유지 + 디렉토리 정리** (방안 1)
   - 파일들은 유지하되 `migrations/` 폴더로 정리
   - 종합 문서에서 경로 업데이트

2. **디버깅 파일만 삭제**
   - `debug_*.sql`, `check_*.sql` 같은 파일만 삭제
   - 나머지는 모두 유지

3. **Git 커밋 후 정리**
   - 모든 파일을 Git에 커밋
   - 그 후 선택적으로 정리
   - 언제든 `git checkout`으로 복구 가능

## 실행할 수 있는 정리 작업

### 디버깅 파일 삭제
```bash
rm debug_*.sql check_*.sql
```

### 임시 파일 삭제
```bash
rm disable_rls_completely.sql temporary_disable_rls.sql
```

### 디렉토리 생성 및 이동 (방안 1)
```bash
mkdir -p migrations/{01_initial_setup,02_tables,03_additions,04_migrations,05_storage,06_fixes,archive}
# 파일들을 적절한 디렉토리로 이동
```

