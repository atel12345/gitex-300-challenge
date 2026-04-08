# GITEX 300 Challenge

Expo Router camera app for the GITEX Africa 300-stand challenge.

The app captures photos, stores them in the app, and saves confirmed shots to the phone gallery. It is built as a managed Expo project and is ready for EAS Android preview builds.

## Requirements

You need these tools before building or running the app:

- Node.js 18 or newer
- npm
- Git
- An Expo account
- EAS CLI for cloud builds
- An Android device or emulator for local testing
- Optional: Android Studio and JDK 17 if you want to build locally instead of using EAS

## Dependencies

This repository pins the app dependencies in [package.json](package.json) and locks exact installs with [package-lock.json](package-lock.json).

Runtime dependencies:

- `expo` - Expo SDK runtime and native build integration
- `expo-router` - File-based routing and app entrypoint
- `react` and `react-native` - UI runtime and platform primitives
- `expo-camera` - Camera preview and photo capture
- `expo-media-library` - Save photos to the phone gallery
- `expo-file-system` - File handling for captured images
- `expo-asset` - Asset support required by Expo prebuild/build steps
- `expo-haptics` - Capture feedback
- `expo-system-ui` - Native system UI handling
- `expo-constants` - App/environment metadata
- `expo-linking` - Deep link support
- `expo-status-bar` - Status bar styling
- `react-native-reanimated` - Animation support
- `react-native-safe-area-context` - Safe area layout handling
- `react-native-screens` - Native navigation and screen primitives
- `@react-native-async-storage/async-storage` - Persist captured photo metadata

Development dependencies:

- `@babel/core`
- `babel-plugin-module-resolver`

## Project Layout

```text
gitex-app/
├── app/
│   └── index.jsx
├── assets/
│   └── icon.png
├── app.json
├── babel.config.js
├── eas.json
├── package.json
└── package-lock.json
```

## Local Setup

```bash
npm install
```

Then start the app:

```bash
npx expo start
```

If you want to test on a phone, install Expo Go and scan the QR code.

## Build Tutorial

### Android APK with EAS

This is the recommended path for the APK used by the app.

```bash
npm install
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The `preview` profile is configured to produce an APK in [eas.json](eas.json). When the build finishes, Expo gives you a download link for the APK.

### Local Android run

If you want to run the native Android app locally:

```bash
npm install
npx expo run:android
```

### iOS run

If you are on macOS and have the Apple tooling installed:

```bash
npm install
npx expo run:ios
```

## Features

- Live camera viewfinder with corner guides
- 300-shot countdown counter
- Haptic and flash feedback when taking a photo
- Preview screen before saving a shot
- Horizontal gallery strip for saved shots
- Save-to-gallery support through `expo-media-library`
- In-app delete action for removing a photo from the app history
- Persistent storage through AsyncStorage

## Build Notes

- The app entrypoint is `expo-router/entry`.
- Gallery permissions are configured in [app.json](app.json).
- The Android preview build profile is set to produce an APK, not an AAB.
- If you change native dependencies or permissions, rebuild with EAS so the app binary picks up the changes.

## GitHub Publishing

To publish this repository to GitHub, create an empty GitHub repo and push this local project:

```bash
git add .
git commit -m "Initial project repository"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Notes

- Photos are kept in app storage for the local gallery view and are also saved to the phone gallery when permission is granted.
- The gallery delete action removes the shot from the app only.
