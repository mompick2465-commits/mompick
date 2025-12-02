import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Firebase 초기화
        FirebaseApp.configure()
        
        // 알림 권한 요청
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("❌ 알림 권한 요청 오류: \(error.localizedDescription)")
            } else if granted {
                print("✅ 알림 권한 승인됨")
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                    print("📱 APNs 등록 요청 완료")
                }
            } else {
                print("❌ 알림 권한 거부됨")
            }
        }
        
        Messaging.messaging().delegate = self
        
        // Override point for customization after application launch.
        return true
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("✅ APNs 디바이스 토큰 수신: \(token)")
        Messaging.messaging().apnsToken = deviceToken
        print("✅ APNs 토큰을 Firebase에 전달 완료")
    }
    
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        if let token = fcmToken {
            print("✅ FCM 토큰 수신: \(token)")
        } else {
            print("❌ FCM 토큰이 nil입니다")
        }
        
        // FCM 토큰을 JavaScript로 전달
        if let token = fcmToken {
            DispatchQueue.main.async {
                // Capacitor 브릿지를 통해 JavaScript로 토큰 전달
                if let bridge = self.window?.rootViewController as? CAPBridgeViewController {
                    // JavaScript로 FCM 토큰 전달 (WebView 로드 완료 대기)
                    let tokenPreview = String(token.prefix(20))
                    let jsCode = """
                        (function() {
                            try {
                                console.log('🔔 AppDelegate에서 FCM 토큰 수신:', '\(tokenPreview)...');
                                
                                // 전역 변수에 먼저 저장 (이벤트 리스너가 등록되기 전에 토큰이 전달될 수 있음)
                                if (typeof window !== 'undefined') {
                                    window._pendingFCMToken = '\(token)';
                                    console.log('✅ FCM 토큰을 window._pendingFCMToken에 저장');
                                }
                                
                                // 이벤트 발생
                                const event = new CustomEvent('fcmTokenReceived', { detail: '\(token)' });
                                window.dispatchEvent(event);
                                console.log('✅ fcmTokenReceived 이벤트 발생 완료');
                                
                                // Capacitor PushNotifications 플러그인에 토큰 전달 시도
                                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
                                    try {
                                        window.Capacitor.Plugins.PushNotifications.triggerRegistration({ value: '\(token)' });
                                    } catch(e) {
                                        console.log('PushNotifications triggerRegistration 오류:', e);
                                    }
                                }
                            } catch(e) {
                                console.error('FCM 토큰 처리 오류:', e);
                            }
                        })();
                    """
                    
                    // WebView가 로드되었는지 확인하고 실행
                    if let webView = bridge.webView {
                        // 여러 번 시도 (WebView가 완전히 로드되도록)
                        var attemptCount = 0
                        let maxAttempts = 5
                        
                        func trySendToken() {
                            attemptCount += 1
                            
                            // 약간의 지연 후 실행
                            DispatchQueue.main.asyncAfter(deadline: .now() + Double(attemptCount) * 0.5) {
                                webView.evaluateJavaScript(jsCode) { result, error in
                                    if let error = error {
                                        print("FCM 토큰 전달 오류 (시도 \(attemptCount)): \(error.localizedDescription)")
                                        // 오류가 발생하면 재시도
                                        if attemptCount < maxAttempts {
                                            trySendToken()
                                        }
                                    } else {
                                        print("FCM 토큰 JavaScript로 전달 완료 (시도 \(attemptCount))")
                                    }
                                }
                            }
                        }
                        
                        // 첫 시도
                        trySendToken()
                    }
                }
            }
        }
    }
    
    // APNs 등록 실패 처리
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ APNs 등록 실패: \(error.localizedDescription)")
        print("❌ 오류 상세: \(error)")
        
        // 시뮬레이터에서는 푸시 알림이 작동하지 않음
        #if targetEnvironment(simulator)
        print("⚠️ 시뮬레이터에서는 푸시 알림이 작동하지 않습니다. 실제 기기에서 테스트하세요.")
        #endif
    }
    
    // 포그라운드에서 알림 수신 시 처리
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let userInfo = notification.request.content.userInfo
        print("포그라운드 알림 수신: \(userInfo)")
        
        // 포그라운드에서도 알림 표시
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }
    
    // 알림 탭 시 처리
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("알림 탭됨: \(userInfo)")
        
        // Capacitor에 알림 이벤트 전달
        NotificationCenter.default.post(name: NSNotification.Name("CAPDidReceiveRemoteNotification"), object: nil, userInfo: userInfo)
        
        completionHandler()
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Safe Area 처리를 위한 WebView 설정
        if let bridge = self.window?.rootViewController as? CAPBridgeViewController {
            // WebView의 contentInsetAdjustmentBehavior를 설정하여 Safe Area 자동 조정
            if let webView = bridge.webView {
                if #available(iOS 11.0, *) {
                    // overlaysWebView: true일 때는 .automatic으로 설정하여 Safe Area 자동 처리
                    webView.scrollView.contentInsetAdjustmentBehavior = .automatic
                }
            }
        }
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
