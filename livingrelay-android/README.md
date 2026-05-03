# LivingRelay Android

Native Kotlin + Jetpack Compose Android app for the real LivingRelay product.

This project mirrors the production iOS app in `../livingrelay-ios`:

- Phone + PIN login with SMS verification
- Property onboarding with phone verification
- Role-aware dashboard for admin/manager, owner, tenant, and vendor users
- Property switching, work-order metrics, approvals, vendor dispatch, invoices, and tenant requests
- Separate staging and production flavors

## Environments

- `staging`
  - Application ID: `adminstacksort.livingrelay.staging`
  - API: `https://staging.livingrelay.com`
- `production`
  - Application ID: `adminstacksort.livingrelay`
  - API: `https://app.livingrelay.com`

The API URLs are defined in `app/build.gradle.kts` as flavor-specific `BuildConfig.API_BASE_URL` values.

## Build

Install Android Studio with JDK 17 and Android SDK 35, then open this folder:

```text
livingrelay-android
```

Command line builds:

```bash
./gradlew :app:assembleStagingDebug
./gradlew :app:assembleProductionDebug
./gradlew :app:bundleProductionRelease
```

The Play Store upload artifact is:

```text
app/build/outputs/bundle/productionRelease/app-production-release.aab
```

## Testing Checklist

1. Run `stagingDebug` on an emulator and a physical Android phone.
2. Confirm the app shows `STAGING` and loads `/api/health` successfully.
3. Create a property with a real or dev-verification phone flow.
4. Log out and log back in with phone + PIN + verification code.
5. Test manager flow: approve, owner approve, text vendor, create invoice.
6. Test tenant flow: create a maintenance request and confirm it appears in manager view.
7. Test owner flow: approve a waiting repair and mark invoice paid.
8. Test vendor flow: accept and decline matching trade jobs.
9. Repeat a smoke pass with `productionDebug` before building `productionRelease`.

## Release

See `docs/google-play-release.md`.
