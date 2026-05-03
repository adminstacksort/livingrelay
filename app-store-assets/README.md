# LivingRelay iOS App Store Assets

Generated assets for the iOS App Store Connect product page.

Production target:

- Project: `livingrelay-ios/LivingRelay.xcodeproj`
- Scheme: `LivingRelay Production`
- Bundle ID: `adminstacksort.livingrelay`
- API: `https://app.livingrelay.com`

## iPhone 6.5-inch screenshots

Directory: `iphone-6-5/screenshots`

- Count: 10 PNG screenshots
- Size: 1242 x 2688 px
- Format: PNG

## iPhone app previews

Directory: `iphone-6-5/previews`

- Count: 3 MP4 previews
- Size: 886 x 1920 px
- Duration: 16-20 seconds
- Video: H.264 High Profile Level 4.0, progressive, 30 fps
- Audio: stereo AAC silent track

## Other assets

- `icon/livingrelay-app-icon-1024.png`: 1024 x 1024 PNG app icon candidate
- `metadata/app-store-metadata.md`: app name, subtitle, promotional text, description, keywords, URLs, category, review notes, and copyright

## Generator

Regenerate screenshots, icon, and metadata with:

```bash
swift -module-cache-path /private/tmp/livingrelay-swift-module-cache scripts/generate-ios-submission-assets.swift
```

The MP4 previews are encoded from the generated screenshot scenes with `ffmpeg`.

## Source specs checked

- Apple screenshot specs: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
- Apple app preview specs: https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications
