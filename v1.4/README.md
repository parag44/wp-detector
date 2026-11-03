# SiteIntelix Detect (v1.4)

> **Know What's Behind Every Website.**
>
> Detect WordPress versions, themes, plugins, server technologies, caching systems, DNS records, and more with a single click.

---

## 🚀 What's New in v1.4

### 1. 100% Reliable Plugin & Theme Icon Detection
- **Multi-Tier Icon Resolver**: Solves missing icons for both directory plugins and premium/custom plugins (matching and exceeding WPSniffer).
- **Directory Plugins**: Cascades through official WordPress.org CDN formats (`.png`, `256x256.png`, `.svg`, `.jpg`, `.gif` with asset cache busting).
- **Premium & Commercial Plugins**: Resolves direct brand domains for Gravity Forms, Yoast, Rank Math, Schema Pro, WP Rocket, NitroPack, Elementor Pro, Divi, Beaver Builder, WPBakery, UpdraftPlus, etc. via high-res Google favicon integration (`sz=64`).
- **Theme Screenshots**: Live preview via official theme CDN (`ts.w.org`) and local theme directories.

### 2. Compact Non-Wide Layout (420px)
- Built with a clean, vertical, tabbed interface inspired by professional developer extensions (WPSNIFFER, Arraystory, etc.).
- Perfectly fits standard Chrome extension popups with zero horizontal scroll.
- Adaptive Light and Dark skins with automatic OS preference detection and manual toggle.

### 3. 7 Verified Detection Signals
Evaluates and displays exact technical evidence for:
1. **wp-json API detected**: Probes `/wp-json` and `/?rest_route=/` for REST namespaces.
2. **wp-json in Link header**: Checks HTTP response `Link` headers for `<.../wp-json/>; rel="https://api.w.org/"`.
3. **WordPress generator meta tag**: Inspects `<meta name="generator" content="WordPress ...">` and RSS feed tags.
4. **/wp-content/ pattern detected**: Scans all frontend scripts, stylesheets, and asset paths with count.
5. **/wp-includes/ pattern detected**: Inspects core WordPress library paths (`jquery`, `wp-emoji`, `block-library`).
6. **wp-json link rel detected**: Checks DOM `<link rel="https://api.w.org/">` and `<link rel="alternate" type="application/json">`.
7. **WordPress admin/login paths detected**: Checks for `wp-login.php`, `wp-admin`, and active `#wpadminbar` sessions.

### 4. Server, Hosting & Geolocation Specs
- **Host IP Resolution**: Resolves A record via Google DNS-over-HTTPS.
- **ISP & Hosting Provider**: Automatically detects hosting entity (e.g., `Automattic, Inc`, `Cloudflare`, `Kinsta`, `WP Engine`, etc.).
- **Server Geolocation**: Displays country flag and location (e.g. `🇺🇸 San Francisco, California, US`).
- **Live Caching Status**: Accurately reflects live cache hits via `GET` streaming with `AbortController` (WP-Optimize, LiteSpeed, WP Rocket, Cloudflare, FastCGI).

### 5. Instant Filtering, Copy & Export
- **Search & Filter Chips**: Filter plugins by `All`, `With Version`, `REST API`, `Cache`, `SEO`, and `Forms`.
- **Diagnostics Export**: One-click Markdown stack summary, theme specifications, or complete JSON payload export.

---

## 🛠️ How to Test in Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select the **`v1.4`** folder:
   ```
   /Users/parag/Documents/wp extension/v1.4
   ```
5. Click on the extension icon on any WordPress site to inspect!
