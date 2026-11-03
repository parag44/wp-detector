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
WPScout is a fast, lightweight, and comprehensive WordPress stack inspection and diagnostics tool designed for developers, site auditors, designers, agencies, and curious web enthusiasts.

With a single click, instantly uncover the entire technology stack powering any WordPress website—including core version, active theme, detected plugins, hosting infrastructure, server software, live caching headers, and DNS details.

Whether you're debugging client websites, conducting competitive research, or auditing performance and security, WPScout provides a clear, clean, and developer-friendly breakdown in seconds.

---

### 🚀 Key Features

🔍 **WordPress Core & Theme Intelligence**
• Accurately detects whether a site is built with WordPress.
• Toolbar icon automatically illuminates vibrant orange on WordPress sites and dims on non-WordPress sites.
• Displays exact WordPress core version and Gutenberg block editor integration.
• Identifies active theme name, version, author, child-theme inheritance, and 4:3 aspect-ratio theme screenshot (with a clean "No preview available" state when not hosted).

🧩 **Deep Plugin Discovery (Frontend Assets + REST API)**
• Confirmed Plugins Listed First: Plugins with confirmed version numbers are automatically sorted to the top of your inventory with verified status badges.
• Scans both loaded scripts and stylesheets to identify active plugins and version numbers.
• Probes WordPress REST API namespaces (/wp-json) to uncover background plugins that don't load visible frontend assets.
• 100% Dynamic WordPress.org Icons: Fetches official high-resolution plugin icons across JPEG, PNG, SVG, and WebP formats. Plugins not hosted on WordPress.org display a clean universal plug icon (zero third-party tracking or Google favicon queries).
• Live Search: Instantly search through detected plugins with the built-in search filter.
• Direct links to official WordPress.org plugin directory pages for instant documentation lookup.

⚡ **Server, Hosting & CDN Intelligence**
• Detects the underlying web server software (Nginx, Apache, LiteSpeed, Cloudflare, etc.).
• Identifies reverse proxies and managed hosts (Cloudflare, Sucuri, WP Engine, Kinsta, Automattic / WordPress VIP, Pantheon, etc.).
• Detects PHP version when exposed in server response headers.

🚀 **Real-Time Cache Status Inspection**
• Inspects HTTP response headers to identify active caching engines (LiteSpeed Cache, Cloudflare, WP Rocket, Varnish, WP-Optimize, W3 Total Cache, NitroPack, etc.).
• Displays real-time cache behavior: HIT, MISS, BYPASS, or DYNAMIC.

🌐 **DNS & Datacenter Resolution**
• Resolves the domain's public Host IP address (IPv4 A-record).
• Identifies hosting ISP and geographic datacenter location with country flag.
• Displays authoritative Nameservers (NS records) for the apex domain.

🛡️ **7-Signal Diagnostic Verification**
• Multi-vector proof checklist: REST API endpoints, Link headers, generator meta tags, /wp-content/ asset paths, /wp-includes/ core scripts, link rel tags, and verified admin login routes.

📋 **Developer-Friendly Export & Sharing Tools**
• One-Click Copy: Copies a clean, markdown-ready stack summary to your clipboard.
• Download TXT: Save a formatted text report directly to your computer.
• Export JSON: Download structured diagnostic JSON data ready to attach to bug tickets, client audits, or support reports.
• Quick Refresh: Re-run diagnostics on the current page with a single click without closing the popup.

🎨 **Modern, Streamlined Interface**
• Non-wide, compact popup layout designed for fast scanning.
• Full Dark Mode & Light Mode support that seamlessly adapts to your operating system preference.

---

### 🔒 100% Privacy Focused & Safe

• WPScout processes all webpage inspection locally inside your browser.
• No browsing history tracking, no telemetry, and no third-party analytics.
• No account, sign-in, or API keys required.
• All icons are fetched exclusively from official WordPress.org CDNs or bundled locally.

---

### 💡 How to Use
1. Navigate to any website.
2. Notice the WPScout toolbar icon: it lights up vibrant orange on WordPress sites and dims on non-WordPress sites.
3. Click the WPScout icon in your Chrome toolbar.
4. Instantly view the complete WordPress stack, inspect active plugins and theme details, and export or copy diagnostics as needed!

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
