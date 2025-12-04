/// <reference types="@capawesome/capacitor-android-edge-to-edge-support" />
/// <reference types="@capacitor/status-bar" />
import type { CapacitorConfig } from '@capacitor/cli';

// 프로덕션 빌드에서는 디버깅 비활성화
const isDevelopment = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.mompick.app',
  appName: 'mompick',
  webDir: 'build',
  server: {
    androidScheme: 'http',
    iosScheme: 'http'
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: false,
    // 프로덕션 빌드에서는 디버깅 비활성화 (개발 시에만 활성화)
    webContentsDebuggingEnabled: isDevelopment,
    adjustMarginsForEdgeToEdge: 'auto',
    useLegacyBridge: false
  },
  ios: {
    backgroundColor: '#ffffff',
    contentInset: 'automatic'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#ffffff',
      style: 'LIGHT'
    },
    NavigationBar: {
      backgroundColor: 'transparent',
      buttonColor: '#000000'
    },
    Keyboard: {
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
