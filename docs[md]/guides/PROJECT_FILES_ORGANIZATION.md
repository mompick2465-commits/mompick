# 프로젝트 파일 정리 가이드

## 현재 루트 디렉토리 파일 분류

### 📚 문서 파일 (docs/ 폴더로 이동)

#### 종합 가이드 문서
- `SETUP_GUIDE.md` - 모든 설정 가이드 통합
- `DATABASE_MIGRATION_GUIDE.md` - 데이터베이스 마이그레이션 가이드
- `MIGRATION_FILES_ORGANIZATION.md` - SQL 파일 정리 가이드
- `CLEANUP_SUMMARY.md` - 정리 요약

#### 플랫폼별 설정 가이드
- `ANDROID_DEVICE_CONNECTION_FIX.md` - Android 디바이스 연결 문제 해결
- `ANDROID_ICON_FIX.md` - Android 아이콘 설정
- `ANDROID_KAKAO_MAP_SETUP.md` - Android 카카오맵 설정
- `IOS_KAKAO_MAP_FIX.md` - iOS 카카오맵 설정

#### 인증 설정 가이드
- `APPLE_SIGN_IN_SETUP.md` - 애플 로그인 설정
- `APPLE_OAUTH_TROUBLESHOOTING.md` - 애플 OAuth 문제 해결

#### 서비스 설정 가이드
- `FIREBASE_SETUP.md` - Firebase 설정
- `FCM_IMPLEMENTATION_SUMMARY.md` - FCM 구현 요약
- `FCM_NOTIFICATION_GUIDE.md` - FCM 알림 가이드
- `FCM_TOKEN_ERROR_GUIDE.md` - FCM 토큰 오류 가이드
- `KAKAO_MAP_SETUP.md` - 카카오맵 설정
- `API_INTEGRATION_GUIDE.md` - API 통합 가이드
- `KINDERGARTEN_API_GUIDE.md` - 유치원 API 가이드
- `CACHE_SYSTEM_GUIDE.md` - 캐시 시스템 가이드
- `supabase_playground_images_storage_manual_setup.md` - Supabase Storage 수동 설정

### ⚙️ 설정 파일 (루트에 유지 - 표준 프로젝트 구조)

#### 필수 설정 파일
- `package.json` - 프로젝트 의존성 및 스크립트
- `package-lock.json` - 의존성 잠금 파일
- `tsconfig.json` - TypeScript 설정
- `tailwind.config.js` - Tailwind CSS 설정
- `postcss.config.js` - PostCSS 설정
- `eslint.config.js` - ESLint 설정
- `capacitor.config.ts` - Capacitor 설정
- `index.html` - 진입점 HTML 파일

### 🗑️ 백업/임시 파일 (archive/ 또는 삭제)

#### 백업 파일
- `supabase.tar.gz` - Supabase 백업 파일 (별도 저장소 권장)
- `ios_backup_20251202_204702/` - iOS 백업 폴더 (삭제 가능)

#### 스크립트 파일
- `get_keyhash.bat` - Windows 배치 파일 (필요시 유지, 아니면 삭제)

### 📄 필수 유지 파일

- `README.md` - 프로젝트 메인 문서 (루트에 유지)

---

## 권장 정리 구조

```
mompick/
├── README.md                    # 프로젝트 메인 문서 (루트 유지)
├── package.json                 # 설정 파일들 (루트 유지)
├── package-lock.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── capacitor.config.ts
├── index.html
│
├── docs/                        # 📚 모든 문서 파일
│   ├── guides/                 # 종합 가이드
│   │   ├── SETUP_GUIDE.md
│   │   ├── DATABASE_MIGRATION_GUIDE.md
│   │   ├── MIGRATION_FILES_ORGANIZATION.md
│   │   └── CLEANUP_SUMMARY.md
│   │
│   ├── platform/               # 플랫폼별 가이드
│   │   ├── android/
│   │   │   ├── ANDROID_DEVICE_CONNECTION_FIX.md
│   │   │   ├── ANDROID_ICON_FIX.md
│   │   │   └── ANDROID_KAKAO_MAP_SETUP.md
│   │   └── ios/
│   │       └── IOS_KAKAO_MAP_FIX.md
│   │
│   ├── auth/                    # 인증 설정 가이드
│   │   ├── APPLE_SIGN_IN_SETUP.md
│   │   └── APPLE_OAUTH_TROUBLESHOOTING.md
│   │
│   └── services/               # 서비스 설정 가이드
│       ├── FIREBASE_SETUP.md
│       ├── FCM_IMPLEMENTATION_SUMMARY.md
│       ├── FCM_NOTIFICATION_GUIDE.md
│       ├── FCM_TOKEN_ERROR_GUIDE.md
│       ├── KAKAO_MAP_SETUP.md
│       ├── API_INTEGRATION_GUIDE.md
│       ├── KINDERGARTEN_API_GUIDE.md
│       ├── CACHE_SYSTEM_GUIDE.md
│       └── supabase_playground_images_storage_manual_setup.md
│
├── migrations[sql]/             # SQL 마이그레이션 파일 (이미 정리됨)
│   ├── 01_initial_setup/
│   ├── 02_tables/
│   ├── 03_additions/
│   ├── 04_migrations/
│   ├── 05_storage/
│   ├── 06_fixes/
│   └── archive/
│
├── archive/                     # 🗑️ 백업/임시 파일
│   ├── supabase.tar.gz
│   └── ios_backup_20251202_204702/  # (선택: 삭제 가능)
│
├── scripts/                     # 스크립트 파일 (이미 존재)
│   └── get_keyhash.bat          # (필요시 유지)
│
├── src/                         # 소스 코드
├── public/                      # 정적 파일
├── ios/                         # iOS 프로젝트
├── android/                     # Android 프로젝트
└── supabase/                    # Supabase 설정
```

---

## 실행 명령어

### 1. 문서 폴더 구조 생성

```bash
# 문서 폴더 생성
mkdir -p docs/{guides,platform/{android,ios},auth,services}

# 종합 가이드 이동
mv SETUP_GUIDE.md docs/guides/
mv DATABASE_MIGRATION_GUIDE.md docs/guides/
mv MIGRATION_FILES_ORGANIZATION.md docs/guides/
mv CLEANUP_SUMMARY.md docs/guides/

# 플랫폼별 가이드 이동
mv ANDROID_DEVICE_CONNECTION_FIX.md docs/platform/android/
mv ANDROID_ICON_FIX.md docs/platform/android/
mv ANDROID_KAKAO_MAP_SETUP.md docs/platform/android/
mv IOS_KAKAO_MAP_FIX.md docs/platform/ios/

# 인증 가이드 이동
mv APPLE_SIGN_IN_SETUP.md docs/auth/
mv APPLE_OAUTH_TROUBLESHOOTING.md docs/auth/

# 서비스 가이드 이동
mv FIREBASE_SETUP.md docs/services/
mv FCM_IMPLEMENTATION_SUMMARY.md docs/services/
mv FCM_NOTIFICATION_GUIDE.md docs/services/
mv FCM_TOKEN_ERROR_GUIDE.md docs/services/
mv KAKAO_MAP_SETUP.md docs/services/
mv API_INTEGRATION_GUIDE.md docs/services/
mv KINDERGARTEN_API_GUIDE.md docs/services/
mv CACHE_SYSTEM_GUIDE.md docs/services/
mv supabase_playground_images_storage_manual_setup.md docs/services/
```

### 2. 백업 파일 정리

```bash
# archive 폴더 생성
mkdir -p archive

# 백업 파일 이동
mv supabase.tar.gz archive/

# iOS 백업 폴더 이동 (또는 삭제)
mv ios_backup_20251202_204702 archive/  # 또는 rm -rf ios_backup_20251202_204702
```

### 3. 스크립트 파일 정리 (선택)

```bash
# get_keyhash.bat이 필요하면 scripts/ 폴더로 이동
mv get_keyhash.bat scripts/  # 또는 삭제: rm get_keyhash.bat
```

---

## README.md 업데이트 필요

문서를 이동한 후 `README.md`의 문서 링크를 업데이트해야 합니다:

```markdown
## 📚 종합 가이드 문서

- **[docs/guides/SETUP_GUIDE.md](./docs/guides/SETUP_GUIDE.md)**: 모든 설정 가이드 통합 문서
- **[docs/guides/DATABASE_MIGRATION_GUIDE.md](./docs/guides/DATABASE_MIGRATION_GUIDE.md)**: 데이터베이스 마이그레이션 가이드
```

---

## 정리 후 최종 구조

```
루트 디렉토리 (깔끔하게):
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── capacitor.config.ts
├── index.html
├── docs/              (모든 문서)
├── migrations[sql]/   (SQL 파일)
├── archive/           (백업 파일)
├── scripts/           (스크립트)
├── src/               (소스 코드)
├── public/            (정적 파일)
├── ios/               (iOS 프로젝트)
├── android/           (Android 프로젝트)
└── supabase/          (Supabase 설정)
```

---

## 주의사항

1. **문서 내 링크 업데이트**: 문서를 이동한 후 문서 간 상호 참조 링크를 업데이트해야 합니다.
2. **Git 커밋**: 정리 전에 모든 변경사항을 Git에 커밋하세요.
3. **README.md**: 프로젝트 메인 문서는 루트에 유지하세요.
4. **설정 파일**: package.json, tsconfig.json 등은 루트에 유지 (표준 프로젝트 구조).

---

## 선택적 정리

### 간단한 정리 (권장)

문서만 `docs/` 폴더로 이동하고, 백업 파일만 `archive/`로 이동:

```bash
mkdir -p docs archive

# 모든 MD 파일을 docs로 이동 (README.md 제외)
mv *.md docs/ 2>/dev/null || true
mv README.md .  # README는 다시 루트로

# 백업 파일 이동
mv supabase.tar.gz archive/
```

### 상세 정리 (완전한 구조)

위의 "실행 명령어" 섹션의 모든 명령어를 실행하여 완전한 구조로 정리.

