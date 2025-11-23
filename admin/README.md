# MomPick 관리자 페이지

MomPick 서비스의 관리자 대시보드입니다. Next.js 14와 TypeScript로 구축되었습니다.

## 주요 기능

### 📊 대시보드
- 서비스 현황 통계
- 최근 신고 현황
- 사용자 활동 현황

### 👥 사용자 관리
- 등록된 사용자 목록 조회
- 사용자 타입별 필터링 (부모/교사)
- 사용자 검색 및 상세 정보 확인
- 사용자 활성화/비활성화

### 🚨 신고 관리
- 커뮤니티 게시글 신고 목록
- 신고 상태 관리 (대기중/검토완료/해결완료)
- 신고 상세 정보 및 게시글 내용 확인
- 신고 처리 및 상태 업데이트

### 🏫 유치원 관리
- 등록된 유치원 목록 조회
- 유치원 정보 수정 및 관리
- 유치원 활성화/비활성화
- 새 유치원 등록

### 👶 어린이집 관리
- 어린이집 목록 조회 및 관리
- 어린이집 유형별 필터링 (국공립/민간/법인)
- 어린이집 정보 수정 및 삭제
- 리뷰 관리

### 🏥 소아과 관리
- 소아과 의료기관 목록 관리
- 의료기관 유형별 분류 (병원/의원/전문의원)
- 진료시간 및 전문과목 관리
- 응급실 운영 여부 및 건강보험 적용 여부 관리

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **UI 컴포넌트**: Radix UI
- **아이콘**: Lucide React
- **데이터베이스**: Supabase
- **인증**: Supabase Auth

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 관리자 인증을 위한 서비스 키 (서버 사이드에서만 사용)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Next.js 설정
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 3. 개발 서버 실행
```bash
npm run dev
```

개발 서버가 `http://localhost:3001`에서 실행됩니다.

## 프로젝트 구조

```
admin/
├── src/
│   ├── app/                    # Next.js App Router 페이지
│   │   ├── page.tsx           # 대시보드
│   │   ├── users/             # 사용자 관리
│   │   ├── reports/           # 신고 관리
│   │   ├── kindergartens/     # 유치원 관리
│   │   ├── childcare/         # 어린이집 관리
│   │   └── pediatric/         # 소아과 관리
│   ├── components/
│   │   ├── layout/            # 레이아웃 컴포넌트
│   │   └── ui/                # UI 컴포넌트
│   └── lib/                   # 유틸리티 및 설정
│       ├── supabase.ts        # Supabase 클라이언트
│       └── utils.ts           # 유틸리티 함수
├── public/                    # 정적 파일
└── package.json
```

## 주요 컴포넌트

### AdminLayout
전체 관리자 페이지의 레이아웃을 담당하는 컴포넌트로, 사이드바와 헤더를 포함합니다.

### Sidebar
관리자 페이지의 네비게이션 메뉴를 제공합니다.

### Header
상단 헤더로 알림 및 사용자 정보를 표시합니다.

## API 연동

현재는 더미 데이터를 사용하고 있으며, 실제 서비스에서는 다음과 같은 API 엔드포인트와 연동해야 합니다:

- `GET /api/users` - 사용자 목록 조회
- `GET /api/reports` - 신고 목록 조회
- `GET /api/kindergartens` - 유치원 목록 조회
- `GET /api/childcare` - 어린이집 목록 조회
- `GET /api/pediatric` - 소아과 목록 조회

## 데이터베이스 스키마

관리자 페이지는 다음과 같은 Supabase 테이블들과 연동됩니다:

- `profiles` - 사용자 프로필
- `reports` - 신고 정보
- `community_posts` - 커뮤니티 게시글
- `childcare_reviews` - 어린이집 리뷰

## 배포

### Vercel 배포
```bash
npm run build
```

### 환경 변수 설정
배포 시 다음 환경 변수들을 설정해야 합니다:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 보안 고려사항

1. **관리자 권한 확인**: 실제 서비스에서는 관리자 권한을 확인하는 미들웨어를 추가해야 합니다.
2. **RLS 정책**: Supabase의 Row Level Security 정책을 적절히 설정해야 합니다.
3. **서비스 키 보안**: 서비스 키는 서버 사이드에서만 사용하고 클라이언트에 노출되지 않도록 주의해야 합니다.

## 향후 개선 사항

- [ ] 관리자 인증 시스템 구현
- [ ] 실시간 알림 시스템
- [ ] 데이터 내보내기 기능
- [ ] 고급 검색 및 필터링
- [ ] 사용자 활동 로그
- [ ] 대시보드 차트 및 그래프
- [ ] 모바일 반응형 최적화

## 라이선스

이 프로젝트는 MomPick 서비스의 일부입니다.