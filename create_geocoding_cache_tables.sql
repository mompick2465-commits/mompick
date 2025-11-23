-- 지오코딩 캐시 시스템 테이블 생성
-- 타일 기반 역지오코딩 캐시 + 주소 기반 지오코딩 캐시

-- 1. 역지오코딩 캐시 (GPS 위치 → 행정구역)
-- 타일/지오해시 기반으로 개인 위치 저장하지 않음
CREATE TABLE IF NOT EXISTS rgc_cache (
  tile_key TEXT PRIMARY KEY,           -- 지오해시 또는 반올림 좌표 (예: "wydm6m" 또는 "37.536,127.005")
  
  -- 카카오 역지오코딩 결과
  hcode TEXT,                          -- 카카오 행정구역코드
  sido_name TEXT,                      -- 시도명 (서울특별시)
  sgg_name TEXT,                       -- 시군구명 (용산구)
  dong_name TEXT,                      -- 읍면동명 (이촌동)
  address_name TEXT,                   -- 전체 주소명 (서울 용산구 이촌동)
  
  -- 교육부/복지부 API용 코드 매핑
  kindergarten_sido_code INTEGER,      -- 유치원알리미 시도코드
  kindergarten_sgg_code INTEGER,       -- 유치원알리미 시군구코드
  childcare_arcode TEXT,               -- 어린이집 시군구코드
  
  -- 메타데이터
  provider TEXT DEFAULT 'kakao',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 지오코딩 캐시 (주소 → 위경도)
-- 시설 주소별로 저장
CREATE TABLE IF NOT EXISTS geocode_cache (
  address_norm TEXT PRIMARY KEY,      -- 정규화된 주소 (공백/괄호 정리)
  original_address TEXT,              -- 원본 주소
  
  -- 좌표 정보
  lat DOUBLE PRECISION,               -- 위도
  lng DOUBLE PRECISION,               -- 경도
  
  -- 메타데이터
  provider TEXT DEFAULT 'kakao',      -- 지오코딩 제공자
  accuracy TEXT,                      -- 정확도 (EXACT, APPROXIMATE 등)
  address_type TEXT,                  -- 주소 타입 (ROAD, REGION 등)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 지역 코드 매핑 테이블 (마스터 데이터)
-- 카카오 행정구역코드 ↔ 교육부/복지부 API 코드 매핑
CREATE TABLE IF NOT EXISTS region_code_mapping (
  hcode TEXT PRIMARY KEY,             -- 카카오 행정구역코드
  
  -- 지역 정보
  sido_name TEXT NOT NULL,            -- 시도명
  sgg_name TEXT NOT NULL,             -- 시군구명
  
  -- API 코드 매핑
  kindergarten_sido_code INTEGER,     -- 유치원알리미 시도코드
  kindergarten_sgg_code INTEGER,      -- 유치원알리미 시군구코드
  childcare_arcode TEXT,              -- 어린이집 시군구코드
  
  -- 메타데이터
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_rgc_cache_sido_sgg ON rgc_cache(sido_name, sgg_name);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_created ON geocode_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_region_mapping_names ON region_code_mapping(sido_name, sgg_name);

-- RLS (Row Level Security) 설정
ALTER TABLE rgc_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_code_mapping ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (캐시 데이터)
CREATE POLICY "캐시 데이터 읽기 허용" ON rgc_cache FOR SELECT USING (true);
CREATE POLICY "지오코딩 캐시 읽기 허용" ON geocode_cache FOR SELECT USING (true);
CREATE POLICY "지역 매핑 읽기 허용" ON region_code_mapping FOR SELECT USING (true);

-- 서비스 롤만 쓰기 가능
CREATE POLICY "캐시 데이터 쓰기 제한" ON rgc_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "지오코딩 캐시 쓰기 제한" ON geocode_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "지역 매핑 쓰기 제한" ON region_code_mapping FOR ALL USING (auth.role() = 'service_role');

-- 전국 지역 코드 매핑 데이터는 별도 파일에서 실행
-- insert_all_regions.sql 파일을 추가로 실행하세요
