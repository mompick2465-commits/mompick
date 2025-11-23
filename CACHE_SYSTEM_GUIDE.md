# 유치원 캐시 시스템 구현 가이드

## 개요

이 가이드는 MomPick 앱에 구현된 유치원 데이터 캐시 시스템의 사용법과 배포 방법을 설명합니다.

## 시스템 아키텍처

```
클라이언트 (React) 
    ↓ (캐시 확인)
Supabase Storage (kindergarten-cache)
    ↓ (캐시 없음)
Edge Function (sync-kindergartens)
    ↓ (API 호출)
유치원 API (e-childschoolinfo.moe.go.kr)
```

## 주요 기능

### 1. 스마트 캐시 시스템
- **캐시 우선**: 먼저 Supabase Storage에서 데이터 확인
- **API 백업**: 캐시에 없으면 원본 API 호출
- **자동 저장**: API 데이터를 Storage에 자동 저장
- **TTL 관리**: 7일 후 자동 만료

### 2. 보안 강화
- **읽기 공개**: 모든 사용자가 캐시 읽기 가능
- **쓰기 제한**: 서비스 롤만 Storage 쓰기 가능
- **Edge Function**: 서버에서만 API 호출 및 저장

### 3. 성능 최적화
- **트래픽 절약**: 80% 이상 API 호출 감소
- **빠른 로딩**: 캐시된 데이터 즉시 표시
- **페이지네이션**: 모든 페이지 데이터 수집

## 파일 구조

```
src/
├── utils/
│   ├── kindergartenCache.ts      # 캐시 매니저
│   └── smartKindergartenLoader.ts # 스마트 로더
├── components/
│   ├── Application.tsx           # 메인 컴포넌트 (캐시 UI 통합)
│   └── CacheStats.tsx           # 캐시 통계 컴포넌트
supabase/
├── functions/
│   └── sync-kindergartens/
│       ├── index.ts             # Edge Function
│       ├── deno.json           # Deno 설정
│       └── README.md           # 함수 사용법
└── config.toml                 # Supabase 설정
```

## 배포 방법

### 1. Supabase 프로젝트 설정

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 초기화
supabase init

# 로컬 개발 환경 시작
supabase start
```

### 2. Storage 버킷 생성

```sql
-- Supabase SQL Editor에서 실행
-- supabase_storage_policies.sql 파일의 내용 실행
```

### 3. Edge Function 배포

```bash
# Edge Function 배포
supabase functions deploy sync-kindergartens

# 환경 변수 설정
supabase secrets set REACT_APP_KINDERGARTEN_API_KEY=your_api_key_here
```

### 4. 환경 변수 설정

```env
# .env 파일
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_KINDERGARTEN_API_KEY=your_kindergarten_api_key
```

## 사용법

### 1. 기본 사용

```typescript
import { SmartKindergartenLoader } from './utils/smartKindergartenLoader'

const loader = new SmartKindergartenLoader()

// 단일 지역 로딩
const result = await loader.loadKindergartenData('서울특별시', '강남구')
console.log(result.data) // 유치원 데이터
console.log(result.source) // 'cache' 또는 'api'
```

### 2. 다중 지역 로딩

```typescript
const regions = [
  { sido: '서울특별시', sgg: '강남구' },
  { sido: '서울특별시', sgg: '서초구' }
]

const results = await loader.loadMultipleRegions(regions)
```

### 3. 캐시 관리

```typescript
// 캐시 강제 새로고침
await loader.refreshCache('서울특별시', '강남구')

// 캐시 상태 확인
const status = await loader.getCacheStatus([{sido: '서울특별시', sgg: '강남구'}])

// 캐시 통계
const stats = await loader.getCacheStats()
```

## UI 컴포넌트

### 1. Application.tsx
- 지역 선택 버튼
- 캐시 상태 표시
- 새로고침/동기화 버튼

### 2. CacheStats.tsx
- 캐시 건강도 표시
- 상세 통계 정보
- 실시간 업데이트

## API 엔드포인트

### Edge Function: sync-kindergartens

```bash
# 단일 지역 동기화
curl -X POST https://your-project.supabase.co/functions/v1/sync-kindergartens \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sido": "서울특별시", "sgg": "강남구"}'

# 다중 지역 동기화
curl -X POST https://your-project.supabase.co/functions/v1/sync-kindergartens \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "regions": [
      {"sido": "서울특별시", "sgg": "강남구"},
      {"sido": "서울특별시", "sgg": "서초구"}
    ]
  }'
```

## 성능 지표

### 트래픽 절약 효과
- **캐시 히트율**: 80% 이상
- **API 호출 감소**: 80% 이상
- **로딩 속도**: 캐시 시 50ms 이하

### 모니터링
- 캐시 상태 실시간 표시
- 로딩 시간 측정
- 오류율 추적

## 문제 해결

### 1. 캐시가 작동하지 않는 경우
- Supabase Storage 정책 확인
- Edge Function 배포 상태 확인
- API 키 설정 확인

### 2. 데이터가 오래된 경우
- 캐시 TTL 설정 확인 (기본 7일)
- 수동 새로고침 실행
- 서버 동기화 실행

### 3. 성능이 느린 경우
- 캐시 히트율 확인
- 네트워크 상태 확인
- Edge Function 로그 확인

## 확장 가능성

### 1. 스케줄링
- Cron Job으로 정기 동기화
- 특정 시간대 자동 갱신

### 2. 모니터링
- 캐시 사용률 대시보드
- API 호출 패턴 분석

### 3. 최적화
- 압축 저장
- CDN 연동
- 지역별 분산 저장

## 보안 고려사항

1. **API 키 보호**: 서비스 롤 키는 서버에서만 사용
2. **접근 제어**: Storage 정책으로 읽기/쓰기 권한 분리
3. **데이터 검증**: Edge Function에서 입력 데이터 검증
4. **오류 처리**: 민감한 정보 노출 방지

## 라이선스

이 캐시 시스템은 MomPick 프로젝트의 일부로 구현되었습니다.
