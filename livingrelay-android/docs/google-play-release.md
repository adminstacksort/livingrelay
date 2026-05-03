# Google Play Release Guide

Current setup:

- Package name: `adminstacksort.livingrelay`
- Version: `1.0.0` / `versionCode = 1`
- Target SDK: 35
- Release artifact: Android App Bundle (`.aab`)

## One-Time Play Console Setup

1. Create a Play Console app with package name `adminstacksort.livingrelay`.
2. Opt in to Play App Signing.
3. Complete store listing, privacy policy URL, data safety, content rating, target audience, and app access declarations.
4. Use internal testing for the first upload before production.

Google Play package names are permanent and cannot be reused after creation, so confirm the package name before creating the app.

## Signing

Create an upload keystore outside the repo:

```bash
keytool -genkeypair -v -keystore livingrelay-upload.jks -alias livingrelay-upload -keyalg RSA -keysize 2048 -validity 10000
```

Then build with local-only environment variables:

```bash
export LR_ANDROID_KEYSTORE_PATH=/absolute/path/to/livingrelay-upload.jks
export LR_ANDROID_KEYSTORE_PASSWORD=...
export LR_ANDROID_KEY_ALIAS=livingrelay-upload
export LR_ANDROID_KEY_PASSWORD=...
```

Do not commit keystores, passwords, or signing property files.

## Build The Bundle

```bash
./gradlew :app:bundleProductionRelease
```

Upload:

```text
livingrelay-android/app/build/outputs/bundle/productionRelease/app-production-release.aab
```

Before uploading, confirm `./gradlew :app:signingReport` shows `productionRelease` using your release keystore instead of `Config: null`.

## Internal Testing Flow

1. In Play Console, go to Test and release > Testing > Internal testing.
2. Create a release and upload the `.aab`.
3. Add testers by email list or Google Group.
4. Roll out the internal test.
5. Install from the Play testing link and verify production login/onboarding/work-order flows.

## Production Rollout

1. Promote the tested release from internal testing, or create a new production release with the same `.aab`.
2. Start with a small staged rollout.
3. Watch Android vitals, crash reports, login/onboarding API errors, and Twilio verification delivery.
4. Increase rollout when the first production sessions are clean.

## Policy Notes

- As of the current Google Play policy, new apps and updates must target Android 15 / API 35 or higher. This project targets SDK 35.
- Google Play recommends Android App Bundles with Play App Signing for optimized delivery.
- Android requires release artifacts to be signed before upload; Play App Signing then handles final device APK signing.
