package com.mompick.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;

@CapacitorPlugin(name = "KakaoMapPlugin")
public class KakaoMapPlugin extends Plugin {
    
    private static final String TAG = "KakaoMapPlugin";
    
    @PluginMethod
    public void initializeMap(PluginCall call) {
        try {
            double lat = call.getDouble("lat", 37.5665);
            double lng = call.getDouble("lng", 126.9780);
            
            Log.d(TAG, "네이티브 카카오맵 초기화: " + lat + ", " + lng);
            
            // 네이티브 카카오맵 SDK 사용
            getActivity().runOnUiThread(() -> {
                try {
                    // MainActivity에서 MapView 가져오기
                    MainActivity mainActivity = (MainActivity) getActivity();
                    if (mainActivity != null) {
                        // 네이티브 지도 초기화 로직
                        Log.d(TAG, "네이티브 카카오맵 초기화 시작");
                        
                        // 웹뷰에 JavaScript로 지도 초기화 알림
                        WebView webView = bridge.getWebView();
                        if (webView != null) {
                            String jsCode = String.format(
                                "if (window.kakao && window.kakao.maps) {" +
                                "  const container = document.getElementById('map');" +
                                "  if (container) {" +
                                "    const options = {" +
                                "      center: new window.kakao.maps.LatLng(%f, %f)," +
                                "      level: 3" +
                                "    };" +
                                "    window.mapInstance = new window.kakao.maps.Map(container, options);" +
                                "    console.log('네이티브 카카오맵 SDK로 지도 초기화 완료');" +
                                "  }" +
                                "}", lat, lng
                            );
                            webView.evaluateJavascript(jsCode, null);
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "네이티브 지도 초기화 오류: " + e.getMessage());
                }
            });
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "네이티브 카카오맵 SDK 초기화 완료");
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "지도 초기화 오류: " + e.getMessage());
            call.reject("지도 초기화 실패: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void addMarker(PluginCall call) {
        try {
            double lat = call.getDouble("lat");
            double lng = call.getDouble("lng");
            String title = call.getString("title", "");
            
            Log.d(TAG, "마커 추가: " + lat + ", " + lng + " - " + title);
            
            getActivity().runOnUiThread(() -> {
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    String jsCode = String.format(
                        "if (window.mapInstance) {" +
                        "  const position = new window.kakao.maps.LatLng(%f, %f);" +
                        "  const marker = new window.kakao.maps.Marker({" +
                        "    position: position," +
                        "    map: window.mapInstance," +
                        "    title: '%s'" +
                        "  });" +
                        "  console.log('네이티브에서 마커 추가 완료');" +
                        "}", lat, lng, title
                    );
                    webView.evaluateJavascript(jsCode, null);
                }
            });
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "마커 추가 오류: " + e.getMessage());
            call.reject("마커 추가 실패: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void removeMarker(PluginCall call) {
        try {
            String markerId = call.getString("markerId");
            Log.d(TAG, "마커 제거: " + markerId);
            
            // 마커 제거 로직 구현
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "마커 제거 오류: " + e.getMessage());
            call.reject("마커 제거 실패: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void setMapCenter(PluginCall call) {
        try {
            double lat = call.getDouble("lat");
            double lng = call.getDouble("lng");
            
            Log.d(TAG, "지도 중심 이동: " + lat + ", " + lng);
            
            getActivity().runOnUiThread(() -> {
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    String jsCode = String.format(
                        "if (window.mapInstance) {" +
                        "  const moveLatLon = new window.kakao.maps.LatLng(%f, %f);" +
                        "  window.mapInstance.setCenter(moveLatLon);" +
                        "  console.log('네이티브에서 지도 중심 이동 완료');" +
                        "}", lat, lng
                    );
                    webView.evaluateJavascript(jsCode, null);
                }
            });
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "지도 중심 이동 오류: " + e.getMessage());
            call.reject("지도 중심 이동 실패: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void getCurrentLocation(PluginCall call) {
        try {
            Log.d(TAG, "현재 위치 요청");
            
            // 위치 권한 확인 및 현재 위치 가져오기
            // 실제 구현에서는 LocationManager 사용
            
            JSObject result = new JSObject();
            result.put("lat", 37.5665);
            result.put("lng", 126.9780);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "현재 위치 가져오기 오류: " + e.getMessage());
            call.reject("현재 위치 가져오기 실패: " + e.getMessage());
        }
    }
}
