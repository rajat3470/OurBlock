# mohallaMitr — Store listing assets

Ready-to-upload branding and screenshots for **App Store Connect** and **Google Play Console**.

## Brand

| File | Use |
|------|-----|
| `brand/logo-icon-1024.png` | App icon / marketing mark (1024×1024) |
| `brand/logo-wordmark.png` | Horizontal logo with wordmark |
| `brand/splash.png` | Full splash / launch visual |

App runtime assets live in `apps/mobile/assets/` (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`).

## iOS App Store (`ios/6.7/`)

Sized for **6.7" iPhone** displays (**1290 × 2796**).

| File | Suggested caption |
|------|-------------------|
| `001-home.png` | Shop your society |
| `002-store.png` | Order from nearby stores |
| `003-orders.png` | Track every order |
| `004-business.png` | Run your shop |
| `005-brand.png` | Brand intro |

Upload in App Store Connect → Your App → App Store → iPhone screenshots (6.7").

## Google Play (`android/`)

### Phone screenshots (`android/phone/`) — **1080 × 1920**

Same five creatives as iOS (`001`–`005`).

### Feature graphic (`android/feature-graphic/`) — **1024 × 500**

Required for the Play Store listing header.

## Suggested store copy

- **Name:** mohallaMitr  
- **Short description:** Your society marketplace — shop local stores and get delivery at your door.  
- **Keywords (iOS):** society, marketplace, local delivery, neighborhood, grocery, hyperlocal  

## Notes

- Screenshots are marketing mockups for listing review; replace with device captures from TestFlight / internal testing when you want pixel-perfect UI fidelity.
- After changing `assets/icon.png` or splash settings, rebuild native apps (`npx expo prebuild` or a fresh EAS build) so iOS/Android pick up the new branding.
