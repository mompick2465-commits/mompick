# Firebase Cloud Messaging (FCM) 설정 가이드

이 문서는 맘픽 앱에서 FCM 푸시 알림을 설정하는 방법을 설명합니다.

## 목차
1. [Firebase 프로젝트 생성](#1-firebase-프로젝트-생성)
2. [Android 설정](#2-android-설정)
3. [iOS 설정](#3-ios-설정)
4. [Supabase Edge Function 설정](#4-supabase-edge-function-설정)
5. [테스트](#5-테스트)

---

## 1. Firebase 프로젝트 생성

### 1.1 Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/)에 접속합니다.
2. "프로젝트 추가"를 클릭하여 새 프로젝트를 생성합니다.
3. 프로젝트 이름을 입력하고 Firebase Analytics를 활성화합니다.

### 1.2 FCM 서버 키 확인

**참고**: 최신 Firebase Console에서는 서버 키가 기본적으로 표시되지 않을 수 있습니다.

**방법 1: 서버 키 찾기 (Legacy API)**

1. Firebase Console에서 프로젝트 설정(톱니바퀴 아이콘)을 클릭합니다.
2. "클라우드 메시징" 탭으로 이동합니다.
3. 페이지를 아래로 스크롤하여 "Cloud Messaging API(기존)" 섹션을 찾습니다.
4. "Cloud Messaging API(기존) 사용 중지됨"이 표시된 경우:
   - "사용 설정" 버튼을 클릭하여 활성화합니다.
   - 페이지를 새로고침하면 "서버 키" 섹션이 나타납니다.
5. "서버 키"를 복사하여 저장합니다.

**방법 2: 서버 키가 보이지 않는 경우**

서버 키가 보이지 않으면 다음을 확인하세요:
- 프로젝트 설정 > 클라우드 메시징 탭에서 페이지를 완전히 스크롤해보세요.
- 브라우저 캐시를 지우고 다시 시도해보세요.
- 다른 브라우저에서 시도해보세요.

**대안: Google Cloud Console에서 서버 키 찾기**

Firebase Console에서 서버 키가 보이지 않는 경우:

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택: `mompick-46b2c` (또는 프로젝트 번호: `718450219650`)
3. **API 및 서비스** > **사용자 인증 정보**로 이동
4. **API 키 만들기** 클릭
5. 생성된 API 키를 복사하거나
6. 또는 **서비스 계정** 섹션에서 `firebase-adminsdk-fbsvc@mompick-46b2c.iam.gserviceaccount.com` 선택
7. **키** 탭 > **키 추가** > **새 키 만들기** > **JSON** 선택하여 다운로드

**참고**: 
- 서버 키는 "클라우드 메시징 API(기존)"를 활성화해야 나타날 수 있습니다.
- 서비스 계정 키(JSON)를 사용하려면 Edge Function 코드를 V1 API로 수정해야 합니다.
- 현재 코드는 서버 키를 사용하므로, 서버 키를 찾는 것이 가장 간단합니다.

---

## 2. Android 설정

### 2.1 Firebase Android 앱 추가
1. Firebase Console에서 "Android 앱 추가"를 클릭합니다.
2. 패키지 이름을 입력합니다: `com.mompick.app`
3. 앱 닉네임을 입력합니다: `맘픽`
4. "앱 등록"을 클릭합니다.

### 2.2 google-services.json 다운로드
1. `google-services.json` 파일을 다운로드합니다.
2. 다운로드한 파일을 `android/app/` 디렉토리에 복사합니다.

### 2.3 Android 프로젝트 설정

#### 2.3.1 android/build.gradle 수정
프로젝트 레벨 `build.gradle` 파일에 Google Services 플러그인을 추가합니다 (최신 방법):

```gradle
plugins {
    // Add the dependency for the Google services Gradle plugin
    id 'com.google.gms.google-services' version '4.4.4' apply false
}
```

#### 2.3.2 android/app/build.gradle 수정
앱 레벨 `build.gradle` 파일에 다음을 추가합니다:

```gradle
plugins {
    id 'com.android.application'
    // Add the Google services Gradle plugin
    id 'com.google.gms.google-services'
    ...
}

dependencies {
    // ... 기존 dependencies
    
    // Import the Firebase BoM
    implementation platform('com.google.firebase:firebase-bom:34.6.0')
    // Firebase Cloud Messaging
    implementation 'com.google.firebase:firebase-messaging'
}
```

### 2.4 AndroidManifest.xml 설정
`android/app/src/main/AndroidManifest.xml` 파일에 다음 권한을 추가합니다:

```xml
<manifest>
    <!-- 기존 권한들 -->
    
    <!-- FCM 권한 추가 -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <application>
        <!-- 기존 설정들 -->
        
        <!-- FCM 기본 채널 설정 -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="mompick_notifications" />
    </application>
</manifest>
```

### 2.5 알림 채널 생성 (필수)

**알림 채널이란?**
- Android 8.0 (API 26) 이상에서 도입된 알림 분류 시스템입니다.
- 앱의 알림을 카테고리별로 분류하여 사용자가 각 채널별로 알림 설정을 관리할 수 있게 해줍니다.
- 예: "맘픽 알림", "마케팅 알림", "시스템 알림" 등으로 분류 가능
- 사용자는 설정에서 각 채널별로 알림을 켜거나 끌 수 있습니다.

**왜 필요한가?**
- Android 8.0 이상에서는 알림 채널 없이는 푸시 알림이 표시되지 않습니다.
- AndroidManifest.xml에 설정한 기본 채널 ID와 일치하는 채널을 코드에서 생성해야 합니다.

앱에서 알림 채널을 생성하려면 `android/app/src/main/java/.../MainActivity.java` 또는 `MainActivity.kt`에 다음 코드를 추가합니다:

```java
// Java 예시
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 알림 채널 생성 (Android 8.0 이상)
        createNotificationChannel();
        
        // ... 기존 코드
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) {
                return;
            }
            
            // 1. 공지사항 채널
            NotificationChannel noticeChannel = new NotificationChannel(
                "mompick_notice",
                "공지사항",
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
        }
    }
}
```

**중요도 레벨:**
- `IMPORTANCE_HIGH`: 소리, 진동, 헤드업 알림 표시 (기본 권장)
- `IMPORTANCE_DEFAULT`: 소리와 진동
- `IMPORTANCE_LOW`: 소리만
- `IMPORTANCE_MIN`: 알림만 표시 (소리/진동 없음)

---

## 3. iOS 설정

### 3.1 Firebase iOS 앱 추가
1. Firebase Console에서 "iOS 앱 추가"를 클릭합니다.
2. 번들 ID를 입력합니다: `com.mompick.app`
3. 앱 닉네임을 입력합니다: `맘픽`
4. "앱 등록"을 클릭합니다.

### 3.2 GoogleService-Info.plist 다운로드
1. `GoogleService-Info.plist` 파일을 다운로드합니다.
2. 다운로드한 파일을 Xcode 프로젝트의 `ios/App/App/` 디렉토리에 복사합니다.
3. Xcode에서 프로젝트를 열고 파일을 프로젝트에 추가합니다.

### 3.3 iOS 프로젝트 설정

#### 3.3.1 Podfile 설정
`ios/Podfile` 파일에 Firebase 관련 pod을 추가합니다:

```ruby
platform :ios, '13.0'

target 'App' do
  # ... 기존 pods
  
  pod 'Firebase/Messaging'
end
```

터미널에서 다음 명령어를 실행합니다:
```bash
cd ios
pod install
```

#### 3.3.2 Capabilities 설정
1. Xcode에서 프로젝트를 엽니다.
2. 프로젝트 타겟을 선택합니다.
3. "Signing & Capabilities" 탭으로 이동합니다.
4. "+ Capability"를 클릭하여 "Push Notifications"를 추가합니다.
5. "Background Modes"를 추가하고 "Remote notifications"를 체크합니다.

#### 3.3.3 AppDelegate 설정
`ios/App/App/AppDelegate.swift` 또는 `AppDelegate.m` 파일을 수정합니다:

**Swift 예시:**
```swift
import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        
        // 알림 권한 요청
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }
        
        Messaging.messaging().delegate = self
        
        return true
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }
    
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("FCM 토큰: \(fcmToken ?? "없음")")
    }
}
```

**Objective-C 예시:**
```objc
#import "AppDelegate.h"
#import <FirebaseCore/FirebaseCore.h>
#import <FirebaseMessaging/FirebaseMessaging.h>
#import <UserNotifications/UserNotifications.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [FIRApp configure];
    
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self;
    [center requestAuthorizationWithOptions:(UNAuthorizationOptionSound | UNAuthorizationOptionAlert | UNAuthorizationOptionBadge) completionHandler:^(BOOL granted, NSError * _Nullable error) {
        if (granted) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [[UIApplication sharedApplication] registerForRemoteNotifications];
            });
        }
    }];
    
    [FIRMessaging messaging].delegate = self;
    
    return YES;
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
    [FIRMessaging messaging].APNSToken = deviceToken;
}

- (void)messaging:(FIRMessaging *)messaging didReceiveRegistrationToken:(NSString *)fcmToken {
    NSLog(@"FCM 토큰: %@", fcmToken);
}

@end
```

#### 3.3.4 APNs 인증서 설정
1. [Apple Developer Portal](https://developer.apple.com/)에 로그인합니다.
2. "Certificates, Identifiers & Profiles"로 이동합니다.
3. "Keys" 섹션에서 새 키를 생성하거나 기존 키를 사용합니다.
4. APNs 키를 다운로드합니다.
5. Firebase Console의 "프로젝트 설정 > 클라우드 메시징 > Apple 앱 구성"에서 APNs 인증 키를 업로드합니다.

---

## 4. Supabase Edge Function 설정

### 4.1 Edge Function 배포

**방법 1: npx 사용 (권장 - 전역 설치 불필요)**

1. Supabase에 로그인합니다:
   ```bash
   npx supabase login
   ```

2. 프로젝트를 연결합니다:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
   > `your-project-ref`는 Supabase Dashboard > Project Settings > General에서 확인할 수 있습니다.

3. Edge Function을 배포합니다:
   ```bash
   npx supabase functions deploy send-fcm-push
   ```

**방법 2: 전역 설치 (선택사항)**

전역 설치를 선호하는 경우:
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy send-fcm-push
```

### 4.2 환경 변수 설정
Supabase Dashboard에서 환경 변수를 설정합니다:

1. Supabase Dashboard > Project Settings > Edge Functions로 이동합니다.
2. "Secrets" 섹션에서 다음 환경 변수를 추가합니다:
   - `FCM_SERVER_KEY`: Firebase Console에서 복사한 서버 키
   - `SUPABASE_URL`: 자동으로 설정됨
   - `SUPABASE_SERVICE_ROLE_KEY`: 자동으로 설정됨

또는 CLI를 사용하여 설정할 수 있습니다:
```bash
npx supabase secrets set FCM_SERVER_KEY=your-fcm-server-key
```

---

## 5. 테스트

### 5.1 데이터베이스 테이블 생성
Supabase SQL Editor에서 `create_fcm_tokens_table.sql` 파일의 내용을 실행합니다.

### 5.2 앱 실행 및 토큰 확인
1. 모바일 앱을 실행합니다.
2. 로그인 후 FCM 토큰이 자동으로 등록됩니다.
3. Supabase Dashboard에서 `fcm_tokens` 테이블을 확인하여 토큰이 저장되었는지 확인합니다.

### 5.3 푸시 알림 테스트
1. Supabase Dashboard > Edge Functions > `send-fcm-push`로 이동합니다.
2. "Invoke function"을 클릭합니다.
3. 다음 JSON을 입력합니다:
   ```json
   {
     "userId": "사용자 프로필 ID",
     "title": "테스트 알림",
     "body": "이것은 테스트 메시지입니다."
   }
   ```
4. "Invoke"를 클릭하여 테스트합니다.

### 5.4 알림 생성 테스트
앱에서 실제 알림을 생성하여 푸시 알림이 전송되는지 확인합니다:
- 게시글에 좋아요 누르기
- 댓글 작성하기
- 답글 작성하기

---

## 문제 해결

### Android에서 알림이 오지 않는 경우
1. `google-services.json` 파일이 올바른 위치에 있는지 확인합니다.
2. `build.gradle` 파일에 Google Services 플러그인이 추가되었는지 확인합니다.
3. AndroidManifest.xml에 권한이 추가되었는지 확인합니다.
4. 디바이스의 알림 권한이 허용되었는지 확인합니다.

### iOS에서 알림이 오지 않는 경우
1. `GoogleService-Info.plist` 파일이 올바른 위치에 있는지 확인합니다.
2. Xcode에서 Push Notifications capability가 활성화되었는지 확인합니다.
3. APNs 인증 키가 Firebase에 업로드되었는지 확인합니다.
4. 디바이스의 알림 권한이 허용되었는지 확인합니다.

### Edge Function 오류
1. FCM_SERVER_KEY 환경 변수가 올바르게 설정되었는지 확인합니다.
2. Edge Function 로그를 확인하여 오류 메시지를 확인합니다.
3. FCM 토큰이 데이터베이스에 저장되었는지 확인합니다.

---

## 참고 자료
- [Firebase Cloud Messaging 문서](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications 문서](https://capacitorjs.com/docs/apis/push-notifications)
- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)

