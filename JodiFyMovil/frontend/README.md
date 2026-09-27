# JodiFy Mobile

Mobile app for JodiFy — Free Music For Friends. Built with Expo Router, React Native, TypeScript, and Zustand.

## 🎯 Features

- **Neon Obsidian Design System** — Custom dark theme with violet/cyan/pink accents, glassmorphism, fluid animations
- **Full Playback Engine** — expo-audio with background playback, lock screen controls, media session
- **Offline-First** — Download songs for offline listening, smart queue persistence
- **Real-time Jams** — Create/join listening parties with WebSocket sync
- **Karaoke Lyrics** — Synced LRC parsing with word-by-word highlighting
- **10-Band Equalizer** — Native equalizer with presets and visualizer
- **Cross-Device Handoff** — Continue playback seamlessly across devices
- **Sleep Timer** — Auto-pause with haptic feedback

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54 + React Native 0.76 |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based) |
| State | Zustand v5 + Immer |
| Data Fetching | TanStack Query v5 |
| Animations | Reanimated 3 + Gesture Handler |
| Audio | expo-audio (AV) |
| Storage | MMKV (react-native-mmkv) |
| Testing | Vitest + React Native Testing Library + Detox |
| CI/CD | GitHub Actions |

## 📁 Project Structure

```
JodiFyMovil/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout
│   ├── (tabs)/             # Tab screens
│   │   ├── _layout.tsx     # Tab layout + modals
│   │   ├── index.tsx       # Home
│   │   ├── library.tsx     # Library
│   │   ├── community.tsx   # Community
│   │   └── settings.tsx    # Settings
│   ├── auth.tsx            # Auth modal
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── ui/             # PressableFluid, GlassCard, FluidSheet, etc.
│   │   ├── player/         # MiniPlayer, FullscreenPlayer, VinylDisc, etc.
│   │   └── layout/         # TabBar, Header
│   ├── hooks/              # usePlayerEngine, useSleepTimer, useReducedMotion
│   ├── stores/             # Zustand stores (player, library, eq, jam, ui, settings)
│   ├── services/           # API, auth, songs, downloads, lyrics, jam, etc.
│   ├── lib/                # constants, types, utils, mmkv, lrc
│   ├── theme/              # Neon Obsidian design system
│   └── __tests__/          # Unit, integration, e2e tests
├── assets/                 # Fonts, images, sounds
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Expo CLI: `npm install -g expo-cli`

### Installation

```bash
cd JodiFyMovil/frontend
npm install
```

### Development

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Testing

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# E2E tests (iOS)
npm run e2e

# E2E tests (Android)
npm run e2e:android
```

### Code Quality

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## 🎨 Design System

The **Neon Obsidian v3** design system includes:

- **Colors**: Deep obsidian backgrounds with violet (#7F00FF), cyan (#00E5FF), pink (#FF007A) accents
- **Typography**: Outfit (headings) + Manrope (body) + JetBrains Mono (mono)
- **Motion**: Spring physics (damping 26, stiffness 320), reduced motion support
- **Touch**: 48-64pt targets, haptic feedback per interaction
- **Components**: GlassCard, DoubleBezelCard, FluidSheet, PressableFluid

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```bash
EXPO_PUBLIC_API_BASE=https://jodify-backend.onrender.com
EXPO_PUBLIC_SOCKET_URL=wss://jodify-backend.onrender.com
```

### Backend API

The app connects to the JodiFy backend (FastAPI + MongoDB). Ensure the backend is running and accessible.

## 📦 Building for Production

### iOS

```bash
npx expo run:ios --configuration Release
# Or with EAS Build
eas build --platform ios
```

### Android

```bash
npx expo run:android --variant Release
# Or with EAS Build
eas build --platform android
```

### Web

```bash
npx expo export --platform web
```

## 🧪 Testing Strategy

- **Unit Tests** (Vitest): Stores, services, utils — 80%+ coverage
- **Integration Tests** (React Native Testing Library): Screen rendering, navigation flows
- **E2E Tests** (Detox): Critical user paths on real devices/simulators
- **Visual Regression** (Storybook + Chromatic): Component library stories

## 🔐 Security

- JWT tokens stored in encrypted MMKV
- HTTPS enforced for all API calls
- Biometric authentication ready (Keychain/Keystore)
- No secrets in code — use Expo secrets or `.env`

## 📄 License

MIT License — see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- Issues: [GitHub Issues](https://github.com/Leija05/jodify/issues)
- Discord: [JodiFy Community](https://discord.gg/jodify)