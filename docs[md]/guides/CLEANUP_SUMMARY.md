# SQL 파일 정리 요약

## 권장 정리 방안

### ✅ 안전하게 삭제 가능한 파일 (6개)

이 파일들은 디버깅/임시/확인용이므로 삭제해도 됩니다:

```
디버깅 파일:
- debug_auth_users.sql
- debug_notifications_rls.sql

확인 파일:
- check_notifications_table.sql
- check_current_rls_policies.sql

임시 파일:
- temporary_disable_rls.sql
- disable_rls_completely.sql
```

### ✅ 반드시 유지해야 할 파일

나머지 모든 SQL 파일들은 **실제 마이그레이션 실행에 필요**하므로 유지하세요.

## 삭제 명령어

Git에 커밋 후 다음 명령어로 삭제:

```bash
# 디버깅 파일 삭제
rm debug_auth_users.sql debug_notifications_rls.sql

# 확인 파일 삭제
rm check_notifications_table.sql check_current_rls_policies.sql

# 임시 파일 삭제
rm temporary_disable_rls.sql disable_rls_completely.sql
```

또는 한 번에:

```bash
rm debug_*.sql check_*.sql temporary_*.sql disable_rls_completely.sql
```

## 주의사항

1. **Git에 먼저 커밋**: 삭제 전에 모든 변경사항을 Git에 커밋하세요
2. **백업**: 필요시 삭제 전에 백업 폴더로 이동하세요
3. **나머지 파일 유지**: 나머지 SQL 파일들은 모두 유지하세요

## 결론

- **6개 파일만 삭제**: 디버깅/임시/확인용 파일
- **나머지는 모두 유지**: 실제 마이그레이션에 필요
- **종합 문서와 함께 사용**: DATABASE_MIGRATION_GUIDE.md와 함께 참조
