import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.justincase.app',
  appName: 'Just In Case',
  webDir: 'dist',
  android: {
    backgroundColor: '#141416',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 180,
      backgroundColor: '#141416',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#141416',
      overlaysWebView: false,
    },
  },
}

export default config
