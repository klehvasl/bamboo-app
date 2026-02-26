# PWA Setup Instructions

Your app is now configured as a Progressive Web App! Here's what's been set up:

## What was added:

1. **vite-plugin-pwa** - Automatically generates and manages the service worker
2. **manifest.json** - App metadata for installation
3. **PWA meta tags** - iOS and Android compatibility in index.html
4. **Service worker caching** - API responses are cached for offline use
   - Weather API responses cached for 1 hour
   - Location data cached for 24 hours

## Icons (IMPORTANT - DO THIS NEXT):

You need to create/add these icon files to `/public/`:
- `pwa-192x192.png` (192x192 pixels)
- `pwa-512x512.png` (512x512 pixels)
- `pwa-maskable-192x192.png` (maskable icon for 192x192)
- `pwa-maskable-512x512.png` (maskable icon for 512x512)

Use any icon creator or convert your logo. Maskable icons should have padding around the content.

## How to test on mobile:

1. Run: `npm run build`
2. Preview with: `npm run preview`
3. Open on mobile (same WiFi) at your local IP (run `ipconfig` to find it)
4. Look for an "Install" button in the browser
5. Tap it to add to home screen

## What works offline:

- The entire app UI
- Last cached weather data (for 1 hour)
- Last cached location (for 24 hours)
- All static assets (CSS, images)

## Rebuild after changes:

Run `npm run build` again to update the service worker.

---
Replace the placeholder icons with your own, then the PWA is ready!
