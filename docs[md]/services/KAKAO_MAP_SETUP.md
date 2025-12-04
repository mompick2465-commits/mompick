# 카카오맵 설정 가이드

## 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경변수를 설정하세요:

```env
# 기존 키들...
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
REACT_APP_KINDERGARTEN_API_KEY=your_existing_kindergarten_key

# 카카오맵 API 키 추가 (필수)
REACT_APP_KAKAO_MAP_KEY=your_kakao_map_api_key_here
```

## 카카오맵 API 키 발급 방법

1. [카카오 개발자 콘솔](https://developers.kakao.com/)에 접속
2. 애플리케이션 생성 또는 선택
3. 플랫폼 설정에서 Web 플랫폼 추가
4. 사이트 도메인 등록 (예: http://localhost:3000)
5. JavaScript 키 복사하여 `REACT_APP_KAKAO_MAP_KEY`에 설정

## 기능 설명

### 지도 기능
- 현재 위치 기반 지도 표시
- 유치원/어린이집 마커 표시
- 마커 클릭 시 정보창 표시
- 현재 위치 버튼으로 위치 재설정

### 검색 및 필터
- 시설명 또는 주소로 검색
- 전체/유치원/어린이집 타입 필터
- 지역순/추천순 정렬

### 리스트 뷰
- 지도 옆에 검색 결과 리스트 표시
- 시설 정보 상세 표시 (주소, 전화번호, 정원 등)
- 거리 정보 표시

## 사용법

1. 메인 페이지에서 유치원 또는 어린이집 아이콘 클릭
2. `/kindergarten-map` 경로로 이동
3. 현재 위치 기반으로 주변 시설 표시
4. 검색, 필터, 정렬 기능 활용

## 주의사항

- 카카오맵 API 키는 반드시 설정해야 합니다 (`REACT_APP_KAKAO_MAP_KEY`)
- 기존 유치원 API 키를 사용합니다 (`REACT_APP_KINDERGARTEN_API_KEY`)
- HTTPS 환경에서 위치 서비스가 정상 작동합니다
