/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_SUPABASE_URL: string
    readonly REACT_APP_SUPABASE_ANON_KEY: string
    readonly REACT_APP_KAKAO_CLIENT_ID?: string
    readonly REACT_APP_KAKAO_REDIRECT_URI?: string
    readonly REACT_APP_SMS_API_KEY?: string
    readonly REACT_APP_SMS_SENDER_ID?: string
    readonly REACT_APP_KINDERGARTEN_API_KEY?: string
    readonly REACT_APP_KAKAO_MAP_KEY?: string
    readonly REACT_APP_CHILDCARE_API_KEY?: string
    readonly REACT_APP_CHILDCARE_DETAIL_API_KEY?: string
  }
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Capacitor 타입 정의
declare global {
  interface Window {
    Capacitor?: {
      getPlatform(): string
    }
  }
}
