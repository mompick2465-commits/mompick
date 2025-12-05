# Google Cloud 프로젝트 정리 가이드

## 현재 상황

- **`mompick-46b2c`**: 현재 사용 중 (Firebase/FCM, OAuth)
- **`mompick-470215`**: 예전에 사용하던 프로젝트 (Supabase 연동 끊김)

## 삭제 전 확인 체크리스트

`mompick-470215` 프로젝트를 삭제하기 전에 다음을 확인하세요:

### 1. Google Cloud Console에서 확인

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. **`mompick-470215`** 프로젝트 선택
3. 다음 항목들을 확인:

#### ✅ OAuth 클라이언트 ID 확인
- **API 및 서비스** > **사용자 인증 정보** 이동
- **OAuth 2.0 클라이언트 ID** 목록 확인
- **중요**: 현재 Supabase에 설정된 클라이언트 ID가 이 프로젝트에 있는지 확인
  - Supabase 대시보드 > Authentication > Providers > Google에서 클라이언트 ID 확인
  - Google Cloud Console의 클라이언트 ID와 비교
  - **일치하면 삭제하면 안 됩니다!**

#### ✅ API 키 확인
- **API 및 서비스** > **사용자 인증 정보** > **API 키** 섹션 확인
- 사용 중인 API 키가 있는지 확인
- 코드에서 사용 중인 API 키가 있는지 확인

#### ✅ 서비스 계정 확인
- **IAM 및 관리자** > **서비스 계정** 확인
- 활성 서비스 계정이 있는지 확인
- Firebase Admin SDK나 다른 서비스에서 사용 중인지 확인

#### ✅ Firebase 프로젝트 확인
- [Firebase Console](https://console.firebase.google.com) 접속
- `mompick-470215` 프로젝트가 Firebase에 연결되어 있는지 확인
- 연결되어 있다면:
  - Firebase 프로젝트 설정에서 Google Cloud 프로젝트 번호 확인
  - 현재 사용 중인 Firebase 프로젝트와 비교

#### ✅ 활성화된 API 확인
- **API 및 서비스** > **사용 설정된 API** 확인
- 사용 중인 API가 있는지 확인
- 특히 다음 API들 확인:
  - Identity Toolkit API (OAuth용)
  - Firebase 관련 API들

### 2. Supabase 대시보드에서 확인

1. Supabase 대시보드 접속
2. **Authentication** > **Providers** > **Google** 이동
3. 현재 설정된 **Client ID** 확인
4. Google Cloud Console의 `mompick-470215` 프로젝트에서 이 Client ID가 있는지 확인
5. **일치하면 삭제하면 안 됩니다!**

### 3. 코드베이스에서 확인

코드베이스를 확인한 결과:
- ✅ `mompick-470215`는 코드에서 사용되지 않음
- ✅ `mompick-46b2c`만 사용 중 (FCM 프로젝트 ID)

## 삭제 가능 여부 판단

### ✅ 삭제해도 되는 경우

다음 조건을 모두 만족하면 삭제해도 됩니다:

1. ✅ Supabase에 설정된 OAuth 클라이언트 ID가 `mompick-46b2c` 프로젝트에 있음
2. ✅ `mompick-470215` 프로젝트에 활성 OAuth 클라이언트 ID가 없음
3. ✅ `mompick-470215` 프로젝트에 사용 중인 API 키가 없음
4. ✅ `mompick-470215` 프로젝트에 Firebase 프로젝트가 연결되어 있지 않음
5. ✅ `mompick-470215` 프로젝트에 활성 서비스 계정이 없음

### ❌ 삭제하면 안 되는 경우

다음 중 하나라도 해당하면 삭제하면 안 됩니다:

1. ❌ Supabase에 설정된 OAuth 클라이언트 ID가 `mompick-470215` 프로젝트에 있음
2. ❌ `mompick-470215` 프로젝트에 사용 중인 리소스가 있음
3. ❌ `mompick-470215` 프로젝트에 Firebase 프로젝트가 연결되어 있음
4. ❌ 확실하지 않은 경우

## 안전한 삭제 방법

### 방법 1: 비활성화 후 삭제 (권장)

1. **프로젝트 비활성화**
   - Google Cloud Console에서 프로젝트 선택
   - **설정** > **프로젝트 삭제** 클릭
   - 프로젝트 ID 입력하여 확인
   - **비활성화** 선택 (30일간 보관됨)

2. **30일 후 확인**
   - 30일 동안 문제가 없는지 확인
   - 문제가 없으면 자동 삭제됨
   - 문제가 있으면 복구 가능

### 방법 2: 즉시 삭제

1. **모든 리소스 확인 완료 후**
2. Google Cloud Console에서 프로젝트 선택
3. **설정** > **프로젝트 삭제** 클릭
4. 프로젝트 ID 입력하여 확인
5. **삭제** 선택

**⚠️ 주의**: 삭제 후 복구 불가능합니다!

## 확인 후 조치

### 확인 결과: 삭제 가능
- 위의 체크리스트를 모두 확인했고 문제가 없다면 삭제해도 됩니다
- 비활성화 후 삭제하는 것을 권장합니다

### 확인 결과: 삭제 불가
- Supabase에 설정된 OAuth 클라이언트 ID가 이 프로젝트에 있다면:
  1. `mompick-46b2c` 프로젝트에서 새로운 OAuth 클라이언트 ID 생성
  2. Supabase에 새로운 클라이언트 ID 설정
  3. 테스트 후 기존 프로젝트 삭제

## 요약

| 확인 항목 | 상태 | 조치 |
|---------|------|------|
| 코드에서 사용 여부 | ❌ 사용 안 함 | 삭제 가능 |
| Supabase OAuth 설정 | ⚠️ 확인 필요 | Supabase 대시보드에서 확인 |
| OAuth 클라이언트 ID | ⚠️ 확인 필요 | Google Cloud Console에서 확인 |
| Firebase 연결 | ⚠️ 확인 필요 | Firebase Console에서 확인 |
| 기타 리소스 | ⚠️ 확인 필요 | Google Cloud Console에서 확인 |

**결론**: 위의 체크리스트를 모두 확인한 후, 문제가 없으면 삭제해도 됩니다. 확실하지 않으면 비활성화 후 30일 후 삭제하는 것을 권장합니다.

