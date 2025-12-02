/// <reference types="@capawesome/capacitor-android-edge-to-edge-support" />
/// <reference types="@capacitor/status-bar" />
import type { CapacitorConfig } from '@capacitor/cli';

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
    webContentsDebuggingEnabled: true, // 디버깅을 위해 활성화
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
