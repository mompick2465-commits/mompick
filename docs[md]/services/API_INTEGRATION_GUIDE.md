# API 통합 가이드

## 현재 상황
- 유치원/어린이집 API가 CORS 정책으로 인해 브라우저에서 직접 호출 불가
- 현재는 샘플 데이터를 사용하여 기능 구현

## 해결 방법

### 1. 백엔드 프록시 서버 구축 (권장)
```javascript
// Express.js 예시
app.get('/api/kindergartens', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query
    const response = await fetch(`https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do?key=${API_KEY}&pageCnt=50&currentPage=1&sidoCode=11&sggCode=11680`)
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

### 2. Netlify Functions 사용
```javascript
// netlify/functions/kindergartens.js
exports.handler = async (event, context) => {
  try {
    const response = await fetch(`https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do?key=${process.env.KINDERGARTEN_API_KEY}&pageCnt=50&currentPage=1&sidoCode=11&sggCode=11680`)
    const data = await response.json()
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(data)
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
```

### 3. Vercel API Routes 사용
```javascript
// pages/api/kindergartens.js
export default async function handler(req, res) {
  try {
    const response = await fetch(`https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do?key=${process.env.KINDERGARTEN_API_KEY}&pageCnt=50&currentPage=1&sidoCode=11&sggCode=11680`)
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

## 현재 구현된 기능
✅ **샘플 데이터 기반 지도 표시**
- 현재 위치 기반 마커 표시
- 유치원/어린이집 타입별 필터링
- 검색 및 정렬 기능
- 지도와 리스트 연동

## 다음 단계
1. 백엔드 프록시 서버 구축
2. API 키 환경변수 설정
3. 실제 데이터로 교체
4. 에러 처리 및 로딩 상태 개선

## 사용 가능한 API
- **유치원**: `https://e-childschoolinfo.moe.go.kr/api/notice/basicInfo2.do`
- **어린이집**: `https://api.childcare.go.kr/mediate/rest/cpms/api/000000/openapi/rest/center/centerList`

## 환경변수
```env
REACT_APP_KINDERGARTEN_API_KEY=your_api_key_here
REACT_APP_KAKAO_MAP_KEY=your_kakao_map_key_here
```
