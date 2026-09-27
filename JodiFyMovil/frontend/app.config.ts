import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'JodiFy',
  slug: 'jodify-mobile',
  scheme: 'jodify',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#030305',
  },
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/your-project-id',
  },
  runtimeVersion: { policy: 'appVersion' },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.jodify.mobile',
    buildNumber: '1',
    infoPlist: {
      UIBackgroundModes: ['audio', 'remote-notification'],
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      NSCameraUsageDescription: 'JodiFy needs camera access for profile photos',
      NSPhotoLibraryUsageDescription: 'JodiFy needs photo library access for cover art',
      NSMicrophoneUsageDescription: 'JodiFy needs microphone for voice messages',
    },
    associatedDomains: ['applinks:jodify.app'],
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#030305',
    },
    package: 'com.jodify.mobile',
    versionCode: 1,
    permissions: [
      'android.permission.INTERNET',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.WAKE_LOCK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.MEDIA_CONTENT_CONTROL',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        data: { scheme: 'jodify', host: '*' },
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
    output: 'static',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#030305',
        image: './assets/images/splash.png',
        dark: { image: './assets/images/splash.png', backgroundColor: '#030305' },
        imageWidth: 200,
      },
    ],
    [
      'expo-updates',
      {
        username: 'your-expo-username',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },
  extra: {
    router: { origin: false },
    eas: { projectId: 'your-project-id' },
    apiBase: process.env.EXPO_PUBLIC_API_BASE!,
    socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL!,
  },
  owner: 'your-expo-username',
});