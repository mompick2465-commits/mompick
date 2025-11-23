# 유치원알리미 API 연동 가이드

## 개요
이 가이드는 MomPick 앱에서 유치원알리미 API를 활용하여 어린이집/유치원 정보를 표시하는 기능에 대한 설명입니다.

## 구현된 기능

### 1. 유치원알리미 API 연동
- **API 엔드포인트**: `https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do`
- **지원 데이터**: 전국 어린이집/유치원 기본 정보
- **데이터 형식**: JSON, XLSX

### 2. 주요 기능

#### 2.1 지역별 검색
- 전국 17개 시도, 229개 시군구 지원
- 시도/시군구 선택 드롭다운으로 간편 검색
- 실시간 데이터 로딩

#### 2.2 현재 위치 기반 검색
- GPS 위치 정보를 활용한 근처 시설 검색
- 반경 5km 내 어린이집/유치원 검색
- 위치 권한 거부 시 수동 지역 선택 가능

#### 2.3 시설 정보 표시
- **기본 정보**: 시설명, 설립유형, 주소, 전화번호
- **운영 정보**: 운영시간, 정원수, 학급수
- **연락처**: 홈페이지 링크 제공
- **위치 정보**: 위도/경도 좌표

### 3. 사용 방법

#### 3.1 메인 페이지에서 접근
1. 메인 페이지의 "어린이집" 또는 "유치원" 아이콘 클릭
2. 시설 목록이 모달로 표시됨

#### 3.2 내 주변 시설 검색
1. "내 주변 시설" 버튼 클릭
2. 위치 권한 허용
3. 근처 5km 내 시설 자동 검색

#### 3.3 지역별 검색
1. 시도/시군구 드롭다운에서 원하는 지역 선택
2. 자동으로 해당 지역 시설 목록 로딩

#### 3.4 시설명/주소 검색
1. 검색창에 시설명 또는 주소 입력
2. 실시간 필터링으로 결과 표시

## API 설정

### 1. 환경변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_KINDERGARTEN_API_KEY=your_api_key_here
```

### 2. API 키 발급
1. [유치원알리미 Open API](https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do) 방문
2. API 이용신청 및 키 발급
3. 발급받은 키를 환경변수에 설정

### 3. API 사용 제한
- **이용허락조건**: 저작자와 출처를 표시하면 영리목적의 이용을 포함한 변경 및 자유이용 허락
- **제공기관**: 교육부
- **심의여부**: 자동승인

## 기술 구현

### 1. 파일 구조
```
src/
├── utils/
│   └── kindergartenApi.ts          # API 연동 유틸리티
├── components/
│   ├── Hero.tsx                    # 메인 페이지 (수정됨)
│   └── KindergartenList.tsx        # 시설 목록 컴포넌트 (신규)
└── vite-env.d.ts                   # 환경변수 타입 정의 (수정됨)
```

### 2. 주요 함수

#### `fetchKindergartenData()`
- 유치원 정보 조회
- 매개변수: 시도코드, 시군구코드, 페이지수, 현재페이지
- 반환값: API 응답 데이터

#### `findRegionCodes()`
- 지역명을 코드로 변환
- 매개변수: 시도명, 시군구명
- 반환값: 시도코드, 시군구코드

#### `findNearbyKindergartens()`
- 현재 위치 기반 근처 시설 검색
- 매개변수: 위도, 경도, 반경(km)
- 반환값: 근처 시설 목록

#### `calculateDistance()`
- 두 좌표 간 거리 계산 (Haversine 공식)
- 매개변수: 위도1, 경도1, 위도2, 경도2
- 반환값: 거리(km)

### 3. 데이터 구조

#### KindergartenInfo 인터페이스
```typescript
interface KindergartenInfo {
  kinderCode: string        // 유치원코드
  officeedu: string         // 교육청명
  subofficeedu: string      // 교육지원청명
  kindername: string        // 유치원명
  establish: string         // 설립유형
  rppnname: string          // 대표자명
  ldgrname: string          // 원장명
  edate: string             // 설립일
  odate: string             // 개원일
  addr: string              // 주소
  telno: string             // 전화번호
  faxno: string             // FAX번호
  hpaddr: string            // 홈페이지
  opertime: string          // 운영시간
  clcnt3: number            // 만3세학급수
  clcnt4: number            // 만4세학급수
  clcnt5: number            // 만5세학급수
  mixclcnt: number          // 혼합학급수
  shclcnt: number           // 특수학급수
  prmstfcnt: number         // 인가총정원수
  ag3fpcnt: number          // 3세정원수
  ag4fpcnt: number          // 4세정원수
  ag5fpcnt: number          // 5세정원수
  mixfpcnt: number          // 혼합정원수
  spcnfpcnt: number         // 특수학급정원수
  ppcnt3: number            // 만3세원아수
  ppcnt4: number            // 만4세원아수
  ppcnt5: number            // 만5세원아수
  mixppcnt: number          // 혼합원아수
  shppcnt: number           // 특수원아수
  pbnttmng: string          // 공시차수
  rpstYn: string            // 직무대리여부
  lttdcdnt: number          // 위도
  lngtcdnt: number          // 경도
}
```

## 사용자 경험

### 1. 직관적인 UI
- 카드 형태의 시설 정보 표시
- 색상 코딩으로 설립유형 구분
- 아이콘을 활용한 정보 분류

### 2. 반응형 디자인
- 모바일 최적화된 레이아웃
- 터치 친화적인 인터페이스
- 부드러운 애니메이션 효과

### 3. 접근성
- 키보드 네비게이션 지원
- 스크린 리더 호환
- 고대비 색상 사용

## 문제 해결

### 1. API 키 오류
- 환경변수 설정 확인
- API 키 유효성 검증
- 네트워크 연결 상태 확인

### 2. 위치 정보 오류
- 브라우저 위치 권한 확인
- HTTPS 환경에서만 GPS 사용 가능
- 위치 권한 거부 시 수동 선택 안내

### 3. 데이터 로딩 오류
- API 서버 상태 확인
- 네트워크 연결 확인
- 콘솔 로그로 상세 오류 확인

## 향후 개선 사항

### 1. 기능 확장
- 즐겨찾기 기능
- 시설 비교 기능
- 리뷰 및 평점 시스템

### 2. 성능 최적화
- 데이터 캐싱
- 무한 스크롤
- 이미지 지연 로딩

### 3. 사용자 경험
- 지도 연동
- 길찾기 기능
- 알림 서비스

## 라이선스 및 출처

- **데이터 제공**: 교육부 유치원알리미
- **API 제공**: 한국교육학술정보원(KERIS)
- **이용허락조건**: 저작자와 출처를 표시하면 영리목적의 이용을 포함한 변경 및 자유이용 허락

---

이 가이드를 통해 유치원알리미 API를 활용한 어린이집/유치원 검색 기능을 효과적으로 사용할 수 있습니다.
