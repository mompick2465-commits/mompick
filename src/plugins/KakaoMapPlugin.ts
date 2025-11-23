import { registerPlugin } from '@capacitor/core';

export interface KakaoMapPlugin {
  initializeMap(options: { lat: number, lng: number }): Promise<void>;
  addMarker(options: { lat: number, lng: number, title: string }): Promise<void>;
  removeMarker(options: { markerId: string }): Promise<void>;
  setMapCenter(options: { lat: number, lng: number }): Promise<void>;
  getCurrentLocation(): Promise<{ lat: number, lng: number }>;
}

const KakaoMapPlugin = registerPlugin<KakaoMapPlugin>('KakaoMapPlugin');

export default KakaoMapPlugin;
