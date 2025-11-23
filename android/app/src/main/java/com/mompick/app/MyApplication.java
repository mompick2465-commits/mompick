package com.mompick.app;

import android.app.Application;
import com.kakao.vectormap.KakaoMapSdk;

public class MyApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        
        // 카카오맵 SDK 초기화 디버깅
        String nativeKey = BuildConfig.KAKAO_MAP_NATIVE_KEY;
        android.util.Log.d("MyApplication", "BuildConfig 키: " + nativeKey);
        
        if (nativeKey.equals("YOUR_NATIVE_APP_KEY_HERE")) {
            // 환경변수가 없으면 strings.xml에서 가져오기
            nativeKey = getString(R.string.kakao_map_native_key);
            android.util.Log.d("MyApplication", "strings.xml 키: " + nativeKey);
        }
        
        if (!nativeKey.equals("YOUR_NATIVE_APP_KEY_HERE")) {
            KakaoMapSdk.init(this, nativeKey);
            android.util.Log.d("MyApplication", "카카오맵 SDK 초기화 완료 (키: " + nativeKey.substring(0, 8) + "...)");
        } else {
            android.util.Log.w("MyApplication", "카카오맵 네이티브 키가 설정되지 않았습니다");
            android.util.Log.w("MyApplication", "BuildConfig 키: " + BuildConfig.KAKAO_MAP_NATIVE_KEY);
            android.util.Log.w("MyApplication", "strings.xml 키: " + getString(R.string.kakao_map_native_key));
        }
    }
}
