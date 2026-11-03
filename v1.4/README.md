# WP Detector v1.4 (Experimental)

> Modern, compact developer diagnostics extension with multi-tier detection signals, real plugin & theme thumbnails, server & ISP geolocation, and interactive tabbed interface.

---

## 🚀 What's New in v1.4

### 1. Compact Non-Wide Layout (420px)
- Transformed from the wide two-column layout into a modern, compact, vertical tabbed popup inspired by top developer tools (WPSNIFFER, Arraystory, etc.).
- Fits standard Chrome extension popups with zero horizontal scrolling.
- Light and Dark modes with automatic OS system preference detection and one-click manual theme toggle.

### 2. 7 Verified Detection Signals
Reliably diagnoses and scores WordPress presence against 7 distinct structural criteria:
1. **wp-json API detected**: Probes `/wp-json` and `/?rest_route=/` for REST namespaces.
2. **wp-json in Link header**: Checks HTTP response `Link` headers for `<.../wp-json/>; rel="https://api.w.org/"`.
3. **WordPress generator meta tag**: Inspects `<meta name="generator" content="WordPress ...">` and RSS feed tags.
4. **/wp-content/ pattern detected**: Scans all frontend scripts, stylesheets, and asset paths.
5. **/wp-includes/ pattern detected**: Inspects core WordPress library paths (`jquery`, `wp-emoji`, `block-library`).
6. **wp-json link rel detected**: Checks DOM `<link rel="https://api.w.org/">` and `<link rel="alternate" type="application/json">`.
7. **WordPress admin/login paths detected**: Checks for `wp-login.php`, `wp-admin`, and active `#wpadminbar` sessions.

### 3. Real Plugin & Theme Thumbnails
- **Plugin Icons**: Fetches official WordPress.org CDN icons (`https://ps.w.org/{slug}/assets/icon-128x128.png`) with automatic fallback to high-res or initial-letter category glyphs.
- **Theme Screenshots**: Displays full preview screenshots via official theme CDN (`https://ts.w.org/wp-content/themes/{slug}/screenshot.jpg` and `.png`) or local theme assets.

### 4. Server, Hosting & Geolocation Specs
- **Host IP Resolution**: Resolves A record via Google DNS-over-HTTPS.
- **ISP & Hosting Provider**: Automatically detects hosting entity (e.g., `Automattic, Inc`, `Cloudflare`, `Kinsta`, `WP Engine`, etc.).
- **Server Geolocation**: Displays country flag and location (e.g. `🇺🇸 San Francisco, California, US`).
- **Live Caching Status**: Accurately reflects cache hits via `GET` streaming with `AbortController` (WP-Optimize, LiteSpeed, WP Rocket, Cloudflare, FastCGI).

### 5. Interactive Polish & Support
- **Sample "Buy Me a Coffee" Button**: Warm, friendly support button in the header and footer.
- **Instant Search & Filter Chips**: Filter plugins by `All`, `With Version`, `REST API`, `Cache`, `SEO`, and `Forms`.
- **Copy & Export**: One-click Markdown stack summary, theme info, or full JSON payload export.

---

## 🛠️ How to Test in Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select the **`v1.4`** folder:
   `/Users/parag/Documents/wp extension/v1.4`
5. Click on the extension icon on any WordPress or non-WordPress site to inspect!
