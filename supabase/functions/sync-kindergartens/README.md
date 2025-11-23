# 유치원 데이터 동기화 Edge Function

이 Edge Function은 유치원 API에서 데이터를 가져와서 Supabase Storage에 캐시로 저장합니다.

## 사용법

### 단일 지역 동기화
```bash
curl -X POST https://your-project.supabase.co/functions/v1/sync-kindergartens \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sido": "서울특별시", "sgg": "강남구"}'
```

### 다중 지역 동기화
```bash
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

## 환경 변수

- `KINDERGARTEN_API_KEY`: 유치원 API 키
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 롤 키

## 배포

```bash
supabase functions deploy sync-kindergartens
```

## 응답 형식

```json
{
  "success": true,
  "message": "2/2개 지역 동기화 완료",
  "totalDataCount": 150,
  "results": [
    {
      "sido": "서울특별시",
      "sgg": "강남구",
      "success": true,
      "dataCount": 75
    },
    {
      "sido": "서울특별시", 
      "sgg": "서초구",
      "success": true,
      "dataCount": 75
    }
  ]
}
```
