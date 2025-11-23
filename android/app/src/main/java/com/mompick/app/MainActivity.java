package com.mompick.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.util.Base64;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.kakao.vectormap.KakaoMap;
import com.kakao.vectormap.MapView;
import com.kakao.vectormap.MapLifeCycleCallback;
import com.kakao.vectormap.LatLng;
import com.kakao.vectormap.KakaoMapReadyCallback;
import com.mompick.app.KakaoMapPlugin;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class MainActivity extends BridgeActivity {
    private MapView mapView;
    private KakaoMap kakaoMap;
    
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 알림 채널 생성 (Android 8.0 이상)
        createNotificationChannel();
        
        // 플러그인 등록
        registerPlugin(KakaoMapPlugin.class);
        
        configureWebView();
        initializeKakaoMap();
        getKeyHash(); // onCreate에서도 키 해시 생성
    }
    
    /**
     * FCM 푸시 알림을 위한 알림 채널 생성
     * Android 8.0 (API 26) 이상에서 필요합니다.
     * 알림 설정 페이지의 카테고리별로 채널을 생성합니다.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) {
                return;
            }
            
            // 1. 공지사항 채널
            NotificationChannel noticeChannel = new NotificationChannel(
                "mompick_notice",  // 채널 ID
                "공지사항",        // 사용자에게 보이는 채널 이름
                NotificationManager.IMPORTANCE_HIGH
            );
            noticeChannel.setDescription("서비스 공지 및 중요 알림 수신");
            notificationManager.createNotificationChannel(noticeChannel);
            
            // 2. 게시글 채널 (좋아요 알림)
            NotificationChannel postChannel = new NotificationChannel(
                "mompick_post",
                "게시글",
                NotificationManager.IMPORTANCE_HIGH
            );
            postChannel.setDescription("내 게시글 관련 활동 알림");
            notificationManager.createNotificationChannel(postChannel);
            
            // 3. 댓글 채널
            NotificationChannel commentChannel = new NotificationChannel(
                "mompick_comment",
                "댓글",
                NotificationManager.IMPORTANCE_HIGH
            );
            commentChannel.setDescription("내 게시글에 달린 댓글 알림");
            notificationManager.createNotificationChannel(commentChannel);
            
            // 4. 답글 채널
            NotificationChannel replyChannel = new NotificationChannel(
                "mompick_reply",
                "답글",
                NotificationManager.IMPORTANCE_HIGH
            );
            replyChannel.setDescription("내 댓글에 달린 답글 알림");
            notificationManager.createNotificationChannel(replyChannel);
            
            // 5. 리뷰 채널
            NotificationChannel reviewChannel = new NotificationChannel(
                "mompick_review",
                "리뷰",
                NotificationManager.IMPORTANCE_HIGH
            );
            reviewChannel.setDescription("리뷰 관련 활동 알림");
            notificationManager.createNotificationChannel(reviewChannel);
            
            // 기본 채널 (하위 호환성을 위해 유지)
            NotificationChannel defaultChannel = new NotificationChannel(
                "mompick_notifications",  // AndroidManifest.xml과 일치
                "맘픽 알림",
                NotificationManager.IMPORTANCE_HIGH
            );
            defaultChannel.setDescription("맘픽 앱의 모든 알림을 받습니다.");
            notificationManager.createNotificationChannel(defaultChannel);
            
            Log.d("MainActivity", "알림 채널 생성 완료: notice, post, comment, reply, review");
        }
    }
    
    @Override
    public void onResume() {
        super.onResume();
        getKeyHash();
    }
    
    private void configureWebView() {
        try {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                WebSettings webSettings = webView.getSettings();
                
                // 기본 설정
                webSettings.setJavaScriptEnabled(true);
                webSettings.setDomStorageEnabled(true);
                webSettings.setAllowFileAccess(true);
                webSettings.setAllowContentAccess(true);
                webSettings.setAllowFileAccessFromFileURLs(true);
                webSettings.setAllowUniversalAccessFromFileURLs(true);
                webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
                webSettings.setLoadWithOverviewMode(true);
                webSettings.setUseWideViewPort(true);
                webSettings.setBuiltInZoomControls(false);
                webSettings.setDisplayZoomControls(false);
                webSettings.setSupportZoom(true);
                webSettings.setGeolocationEnabled(true);
                webSettings.setDatabaseEnabled(true);
                
                // 카카오맵을 위한 추가 설정
                webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                webSettings.setLoadsImagesAutomatically(true);
                webSettings.setBlockNetworkImage(false);
                webSettings.setBlockNetworkLoads(false);
                webSettings.setRenderPriority(WebSettings.RenderPriority.HIGH);
                webSettings.setPluginState(WebSettings.PluginState.ON);
                
                // 지도 타일 로딩을 위한 추가 설정
                webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
                webSettings.setLoadsImagesAutomatically(true);
                webSettings.setBlockNetworkImage(false);
                webSettings.setBlockNetworkLoads(false);
                
                // 카카오맵 타일 로딩을 위한 추가 설정
                webSettings.setMediaPlaybackRequiresUserGesture(false);
                webSettings.setAllowFileAccessFromFileURLs(true);
                webSettings.setAllowUniversalAccessFromFileURLs(true);
                webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                
                // 하드웨어 가속은 WebView 자체에서 자동으로 처리됨
                
                // User Agent 설정 (카카오맵 호환성)
                String userAgent = webSettings.getUserAgentString();
                // 카카오맵을 위한 최적화된 User Agent
                webSettings.setUserAgentString("Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36");
                
                Log.d("MainActivity", "WebView configured for KakaoMap");
                Log.d("MainActivity", "User Agent: " + webSettings.getUserAgentString());
            }
        } catch (Exception e) {
            Log.e("MainActivity", "Error configuring WebView", e);
        }
    }
    
    private void initializeKakaoMap() {
        try {
            // 카카오맵 초기화
            String nativeKey = getString(R.string.kakao_map_native_key);
            Log.d("KakaoMap", "네이티브 키: " + nativeKey);
            
            // MapView 초기화 (실제로는 웹뷰에서 사용하므로 여기서는 로그만 출력)
            Log.d("KakaoMap", "카카오맵 SDK 초기화 완료");
            
        } catch (Exception e) {
            Log.e("KakaoMap", "카카오맵 초기화 오류: " + e.getMessage());
        }
    }
    
    private void getKeyHash() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(
                "com.mompick.app", 
                PackageManager.GET_SIGNATURES
            );
            
            Log.i("KeyHash", "=== 키 해시 생성 시작 ===");
            Log.i("KeyHash", "패키지명: " + info.packageName);
            Log.i("KeyHash", "서명 개수: " + info.signatures.length);
            
            for (int i = 0; i < info.signatures.length; i++) {
                Signature signature = info.signatures[i];
                MessageDigest md = MessageDigest.getInstance("SHA");
                md.update(signature.toByteArray());
                String keyHash = Base64.encodeToString(md.digest(), Base64.DEFAULT);
                
                // 줄바꿈 제거
                keyHash = keyHash.replace("\n", "").replace("\r", "");
                
                Log.i("KeyHash", "=== 키 해시 " + (i + 1) + " ===");
                Log.i("KeyHash", "키 해시: " + keyHash);
                Log.i("KeyHash", "키 해시 길이: " + keyHash.length());
                System.out.println("=== 키 해시 " + (i + 1) + " ===");
                System.out.println("키 해시: " + keyHash);
            }
            Log.i("KeyHash", "=== 키 해시 생성 완료 ===");
            
        } catch (PackageManager.NameNotFoundException e) {
            Log.e("KeyHash", "패키지명을 찾을 수 없습니다: " + e.getMessage());
        } catch (NoSuchAlgorithmException e) {
            Log.e("KeyHash", "알고리즘을 찾을 수 없습니다: " + e.getMessage());
        } catch (Exception e) {
            Log.e("KeyHash", "키 해시 생성 중 오류: " + e.getMessage());
        }
    }
}
