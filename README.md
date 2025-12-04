# 맘픽 (MomPick)

맘픽은 학부모와 교사를 위한 교육 서비스 플랫폼입니다.

## 주요 기능

- 🏠 **어린이집/유치원 검색**: 지역별 시설 검색 및 정보 제공
- 📊 **유치원 상세 정보**: 종합적인 유치원 정보 제공
  - 기본 정보 (설립유형, 정원, 현원, 교사:원아 비율)
  - 안전·위생 현황 (환경위생, 안전점검 상태)
  - 급식 운영 (급식 형태, 영양사 상주, 알레르기 관리)
  - 통학차량 (운영 여부, 차량 수, 동승 보호자)
  - 방과후 과정 (운영 프로그램, 시간)
  - 교사진·학급 정보
- 🏥 **소아과 정보**: 주변 소아과 병원 정보
- 📝 **간편 신청**: 교육 서비스 신청 시스템
- 🗺️ **지역 추천**: 사용자 위치 기반 맞춤 추천
- 👥 **커뮤니티**: 학부모 간 정보 공유 및 경험담
- 🚨 **신고 시스템**: 부적절한 게시글 신고 기능

### 커뮤니티 신고 시스템
- **자동 감지**: 자신이 쓴 글에는 수정/삭제 메뉴, 다른 사람이 쓴 글에는 신고 버튼 표시
- **신고 유형**: 스팸/광고성, 부적절한 내용, 괴롭힘/폭력, 기타
- **중복 신고 방지**: 한 사용자가 같은 게시글을 중복 신고할 수 없음
- **관리자 기능**: 신고 접수 및 처리 상태 관리

## 회원가입 시스템

### 지원하는 인증 방식
1. **전화번호 인증**: SMS를 통한 6자리 인증번호 확인
2. **카카오톡 인증**: 카카오 계정을 통한 간편 가입
3. **구글 인증**: 구글 계정을 통한 간편 가입

### 사용자 유형
- **학부모**: 자녀의 교육 서비스를 찾는 사용자
- **교사**: 교육 서비스를 제공하는 사용자

## 기술 스택

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Backend**: Supabase
- **Build Tool**: Vite

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 카카오맵 API 키 (JavaScript 키 사용)
REACT_APP_KAKAO_MAP_KEY=your_kakao_map_js_key_here

# 카카오 REST API 키 (지오코딩/역지오코딩용)
REACT_APP_KAKAO_REST_KEY=your_kakao_rest_api_key_here

# 카카오맵 네이티브 앱 키 (Android/iOS 네이티브 맵용)
KAKAO_MAP_NATIVE_KEY=your_kakao_map_native_key_here

# 유치원 정보 API 키
REACT_APP_KINDERGARTEN_API_KEY=your_kindergarten_api_key_here

# 어린이집 API 키
REACT_APP_CHILDCARE_API_KEY=your_childcare_api_key_here
REACT_APP_CHILDCARE_DETAIL_API_KEY=your_childcare_detail_api_key_here
REACT_APP_CHILDCARE_SEARCH_API_KEY=your_childcare_search_api_key_here
```

#### 카카오맵 API 키 발급 방법
1. [Kakao Developers](https://developers.kakao.com)에서 애플리케이션 생성
2. 플랫폼 > Web > 사이트 도메인에 다음 도메인들을 추가:
   - `http://localhost:3000` (개발용)
   - `https://your-domain.com` (배포용)
   - `capacitor://localhost` (앱용)
   - `http://localhost` (앱용)
3. **JavaScript 키**를 복사하여 `REACT_APP_KAKAO_MAP_KEY`에 설정
4. **REST API 키**를 복사하여 `REACT_APP_KAKAO_REST_KEY`에 설정 (지오코딩용)
5. **네이티브 앱 키**를 복사하여 `KAKAO_MAP_NATIVE_KEY`에 설정 (Android/iOS 네이티브 맵용)

#### 유치원 정보 API 키 발급 방법
1. [유치원알리미](https://e-childschoolinfo.moe.go.kr)에서 API 키 발급
2. 발급받은 키를 `REACT_APP_KINDERGARTEN_API_KEY`에 설정

### 3. OAuth 설정 (카카오톡, 구글 로그인)
Supabase 대시보드에서 OAuth 제공자를 설정해야 합니다:

#### 카카오톡 OAuth 설정
1. [Kakao Developers](https://developers.kakao.com)에서 애플리케이션 생성
2. 플랫폼 > Web > 사이트 도메인에 `http://localhost:3000` 추가
3. 카카오 로그인 > Redirect URI에 `http://localhost:3000/auth/callback` 추가
4. Client ID와 Client Secret을 Supabase 대시보드 > Authentication > Providers > Kakao에 입력

#### 구글 OAuth 설정
1. [Google Cloud Console](https://console.cloud.google.com)에서 OAuth 2.0 클라이언트 ID 생성
2. 승인된 리디렉션 URI에 `http://localhost:3000/auth/callback` 추가
3. Client ID와 Client Secret을 Supabase 대시보드 > Authentication > Providers > Google에 입력

### 4. Supabase 설정

**📚 상세한 데이터베이스 마이그레이션 가이드는 [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md) 문서를 참고하세요.**

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 마이그레이션 스크립트 실행:
   - 초기 설정: `supabase_setup.sql` 실행
   - 나머지 테이블 생성은 [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md)의 실행 순서를 따르세요

기본 테이블 구조는 다음과 같습니다:

```sql
-- profiles 테이블
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE,
  user_type TEXT CHECK (user_type IN ('parent', 'teacher')) NOT NULL,
  full_name TEXT NOT NULL,
  auth_method TEXT CHECK (auth_method IN ('kakao', 'google', 'phone', 'apple')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- community_posts 테이블
CREATE TABLE community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  location TEXT NOT NULL,
  hashtags TEXT[],
  images TEXT[],
  emojis TEXT[],
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. 개발 서버 실행
```bash
npm start
```

## 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── Splash.tsx     # 스플래시 화면
│   ├── SignUp.tsx     # 회원가입 페이지
│   ├── Header.tsx     # 헤더 네비게이션
│   ├── Hero.tsx       # 메인 홈 화면
│   ├── Services.tsx   # 서비스 소개
│   ├── Community.tsx  # 커뮤니티
│   └── Footer.tsx     # 푸터
├── contexts/           # React Context
│   └── PageContext.tsx # 페이지 상태 관리
├── lib/               # 유틸리티 및 설정
│   └── supabase.ts   # Supabase 클라이언트
└── assets/            # 이미지 및 리소스
```

## 라우팅 구조

- `/` - 스플래시 화면
- `/signup` - 회원가입 페이지
- `/main` - 메인 애플리케이션
- `/kindergarten-map` - 유치원/어린이집 지도 검색
- `/kindergarten/:kindercode` - 유치원 상세 정보 페이지

## 📚 종합 가이드 문서

프로젝트 설정 및 운영에 필요한 종합 가이드 문서:

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: 모든 설정 가이드 통합 문서
  - 환경 변수 설정
  - 인증 시스템 설정 (카카오, 구글, 애플)
  - Firebase 및 FCM 설정
  - 카카오맵 설정
  - API 통합
  - 플랫폼별 설정 (Android, iOS)
  - 문제 해결

- **[DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md)**: 데이터베이스 마이그레이션 가이드
  - 모든 SQL 스크립트 분류 및 설명
  - 테이블 생성 순서
  - RLS 정책 설정
  - Storage 설정
  - 실행 순서 및 체크리스트

## 개발 가이드

### 새로운 컴포넌트 추가
1. `src/components/` 디렉토리에 컴포넌트 파일 생성
2. TypeScript 인터페이스 정의
3. Tailwind CSS로 스타일링
4. Framer Motion으로 애니메이션 추가

### 상태 관리
- 페이지 상태: `PageContext` 사용
- 로컬 상태: `useState` 훅 사용
- 전역 상태: 필요시 추가 Context 생성

## 배포

### 빌드
```bash
npm run build
```

### 정적 호스팅
빌드된 `dist` 폴더를 Netlify, Vercel, 또는 GitHub Pages에 배포할 수 있습니다.

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.
