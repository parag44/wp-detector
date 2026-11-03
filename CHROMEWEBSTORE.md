# Chrome Web Store Listing — WPScout

> Last Updated: 2026-11-03
> Target Version: v1.4

---

## 1. Store Listing Details

**Extension Name** [REQUIRED]
WPScout - Scout Any WordPress Website

**Short Description** [REQUIRED]
Detect WordPress versions, themes, plugins, server technologies, caching systems, DNS records, and more with a single click.

**Detailed Description** [REQUIRED]
WPScout is the ultimate, instant WordPress stack intelligence and detection tool built for developers, designers, agencies, and web professionals.

With a single click, instantly uncover the complete anatomy of any WordPress website: identify the active theme, parent/child theme hierarchies, installed plugins, live caching status, server software, and DNS infrastructure without opening Developer Tools or parsing page source.

★ KEY FEATURES

• Instant Core & Gutenberg Detection
Detect WordPress version numbers, Gutenberg block library integration, and exposed REST API namespaces. The toolbar icon lights up vibrant orange on WordPress sites and dims on non-WordPress sites.

• Confirmed Plugins Listed First
Scans page stylesheets, scripts, and REST endpoints to enumerate detected plugins. Plugins with verified version numbers are highlighted at the very top of your inventory list with verified status badges.

• 100% Dynamic WordPress.org Icons
Every detected plugin dynamically resolves its official high-resolution icon from the WordPress.org plugin directory across JPEG, GIF, SVG, PNG, and WebP formats. Plugins not hosted on WordPress.org cleanly display the universal plug indicator. Zero third-party tracking or Google favicon queries.

• 4:3 Theme Intelligence & Artwork
Detects the active theme, theme version, author, and parent theme relationships. Displays official theme screenshots matching the WordPress 1200x900 standard, or an elegant responsive 4:3 fallback preview.

• Live HTTP Cache Header Status
Inspect server performance in real time: see live cache status (HIT, MISS, BYPASS, DYNAMIC) across LiteSpeed Cache, WP Rocket, WP-Optimize, W3 Total Cache, NitroPack, Cloudflare, Kinsta, and WP Engine.

• Server, Hosting & DNS Stack
Uncover the web server software (Nginx, Apache, LiteSpeed, Cloudflare), host IP address, datacenter ISP location with country flag, and authoritative nameservers.

• Deep 7-Signal Diagnostic Verification
Inspect the evidence behind every detection: REST API endpoints, Link headers, generator meta tags, /wp-content/ asset paths, /wp-includes/ core scripts, link rel tags, and verified admin login routes.

• One-Click Diagnostic Export & Copy
Copy clean markdown summaries of the entire technology stack to your clipboard or download formatted stack reports for audits, client pitches, and site migrations.

• Dark & Light Mode Support
Seamlessly adapts to your system theme preference with high-contrast, beautiful typography and custom iconography.

---

★ HOW TO USE

1. Navigate to any website in Chrome.
2. Click the WPScout icon in your extension toolbar.
3. Instantly review the active theme, confirmed plugins, server technologies, and diagnostic signals.
4. Click any plugin or theme to view evidence and official WordPress.org directory listings.

---

★ PRIVACY & SECURITY FIRST

WPScout does not track your browsing history, does not sell your data, and runs 100% locally in your browser. All icon assets are retrieved exclusively from official WordPress.org CDNs or local extension resources. No remote scripts, no third-party trackers, and no external cookies.

---

**Category** [REQUIRED]
Developer Tools

**Single Purpose** [REQUIRED]
Detects WordPress themes, plugins, caching engines, and server technologies running on any active website with one click.

**Primary Language** [REQUIRED]
English

---

## 2. Graphics & Asset Inventory

All submission assets have been generated at exact Chrome Web Store specification dimensions and stored in `store-assets/`:

| Asset | Dimensions | Status | File Location | Description |
|---|---|---|---|---|
| **Store Icon** | 128×128 PNG | ✅ Ready | `store-assets/store-icon-128x128.png` | Vibrant orange scout lens icon on transparent background |
| **Small Promo Tile** | 440×280 PNG | ✅ Ready | `store-assets/promo-small-440x280.png` | Catalog search card with logo, typography, and feature pills |
| **Marquee Promo Banner** | 1400×560 PNG | ✅ Ready | `store-assets/promo-marquee-1400x560.png` | Large featured header banner with mockup & key highlights |
| **Screenshot 1 (Overview)** | 1280×800 PNG | ✅ Ready | `store-assets/screenshot-1-overview-1280x800.png` | Active theme, confidence score, and confirmed plugins list |
| **Screenshot 2 (Theme)** | 1280×800 PNG | ✅ Ready | `store-assets/screenshot-2-theme-1280x800.png` | 4:3 theme screenshot standard, version, and parent theme |
| **Screenshot 3 (Server)** | 1280×800 PNG | ✅ Ready | `store-assets/screenshot-3-server-1280x800.png` | Live HTTP cache status, web server, ISP, and DNS nameservers |
| **Screenshot 4 (Signals)** | 1280×800 PNG | ✅ Ready | `store-assets/screenshot-4-signals-1280x800.png` | 7 core WordPress detection diagnostic evidence checklist |

---

## 3. Permissions Justification (For CWS Review Form)

The Chrome Web Store Developer Dashboard requires a specific justification for every requested permission. Copy-paste these exact plain-English descriptions into the submission form:

| Permission / Host | Type | Exact Justification for Submission Form |
|---|---|---|
| `activeTab` | permission | Required to inspect the current active webpage's DOM for WordPress generator meta tags, theme stylesheet links, and script paths when the user opens the extension popup. |
| `scripting` | permission | Required to execute the lightweight detection function in the active tab context to read asset URLs and REST API link rel elements. |
| `tabs` | permission | Required to read the current tab's active URL and dynamically update the toolbar action icon between active (WordPress site) and dimmed (non-WordPress site). |
| `https://api.wordpress.org/*` | host_permission | Required to query official WordPress.org plugin and theme API endpoints to fetch official titles, version numbers, and update dates. |
| `https://ps.w.org/*` | host_permission | Required to load official plugin brand thumbnails directly from the official WordPress.org Plugin assets CDN. |
| `https://ts.w.org/*` | host_permission | Required to load official theme screenshot artwork directly from the official WordPress.org Theme assets CDN. |
| `https://dns.google/*` | host_permission | Required to resolve DNS-over-HTTPS queries for the inspected domain's host IP and apex nameservers. |
| `https://ipwho.is/*` | host_permission | Required to resolve the datacenter hosting provider (ISP) and server country location for the inspected IP address. |

---

## 4. Privacy Disclosures & Data Use

In the **Privacy** tab of the Chrome Developer Dashboard, declare:

- **Single Purpose**: Confirmed. Detects WordPress themes, plugins, caching engines, and server technologies.
- **Permission Justification**: Fill in the table above.
- **Data Collection**:
  - Personally Identifiable Information: **NO**
  - Health Info: **NO**
  - Financial & Payment Info: **NO**
  - Authentication Info: **NO**
  - Personal Communications: **NO**
  - Location: **NO** (Server IP geolocation is public domain infrastructure data, not user location)
  - Web History: **NO** (Only the active URL of the clicked tab is inspected locally)
  - User Activity: **NO**
  - Website Content: **NO** (Only publicly exposed HTML meta tags and script src URLs are inspected)
- **Data Selling**: Declare that you **do NOT sell** user data to third parties.
- **Data Use**: Declare that data is **NOT used or transferred** for reasons unrelated to the single purpose.
- **Data Lending**: Declare that data is **NOT used or transferred** to determine creditworthiness.

---

## 5. Submission Package

- **Clean Package Location**: `/Users/parag/Documents/WPScout-ChromeWebStore-v1.4.zip`
- **Package Size**: ~120 KB
- **Package Integrity**: Contains strictly production runtime files (`manifest.json`, `background.js`, `content.js`, `popup/`, `icons/`). Excludes `.git`, `.DS_Store`, `README.md`, test files, and raw store assets.
- **Unpacked Folder**: `v1.4/`
