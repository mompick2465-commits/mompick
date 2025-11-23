// 카카오맵 API 타입 정의
declare global {
  interface Window {
    kakao: any;
  }
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapMarker {
  position: LatLng;
  title: string;
  content: string;
  kindergarten?: any;
}

export interface MapBounds {
  sw: LatLng;
  ne: LatLng;
}

export interface SearchResult {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance: string;
  category_name: string;
  phone: string;
}

export interface KindergartenMapData {
  id: string;
  code?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
	type: 'kindergarten' | 'childcare' | 'playground';
  establishment: string;
  officeedu: string;
  telno?: string;
  opertime?: string;
  prmstfcnt: number;
  ag3fpcnt: number;
  ag4fpcnt: number;
  ag5fpcnt: number;
  hpaddr?: string;
  rating?: number;
  distance?: number;
  image?: string;
  // 지역 정보 추가
  sidoCode?: number;
  sggCode?: number;
}
