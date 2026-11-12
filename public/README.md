# Missing assets

These files are referenced by `app/layout.tsx` and `public/manifest.json` but
are not present in the repository. The application runs without them; browsers
request them and log a 404, and the PWA manifest is only partly satisfied.

Add them here before going live:

| File | Size | Referenced by |
| --- | --- | --- |
| `favicon-16x16.png` | 16x16 | `layout.tsx` icons, `manifest.json` |
| `favicon-32x32.png` | 32x32 | `layout.tsx` icons, `manifest.json` |
| `apple-touch-icon.png` | 180x180 | `layout.tsx` icons, `manifest.json` |
| `android-chrome-192x192.png` | 192x192 | `manifest.json` |
| `android-chrome-512x512.png` | 512x512 | `manifest.json` |
| `og-image.png` | 1200x630 | Open Graph and Twitter card previews |
| `safari-pinned-tab.svg` | monochrome SVG | `layout.tsx` pinned tab |

The application icon that does exist is `app/favicon.ico`, which Next.js serves
as the favicon automatically.

The theme colour used throughout is `#001D51`.

`robots.txt` and `manifest.json` in this directory are complete and in use.
