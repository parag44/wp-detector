# Chrome Web Store Listing — WP Detector

> Last Updated: 2026-10-14

## Store Listing

**Extension Name** [REQUIRED]
WP Detector - WordPress Stack & Plugin Checker

**Short Description** [REQUIRED] (Max 132 characters)
Instantly detect WordPress core version, active theme, plugins, web server, CDN, cache status, and DNS info on any website.

**Detailed Description** [REQUIRED]
WP Detector is a fast, lightweight, and comprehensive WordPress stack inspection and diagnostics tool designed for developers, site auditors, designers, and curious web enthusiasts.

With a single click, instantly uncover the entire technology stack powering any WordPress website—including core version, active theme, detected plugins, hosting infrastructure, server software, caching headers, and DNS details.

Whether you're debugging client websites, conducting competitive research, or auditing security, WP Detector provides a clear, clean, and developer-friendly breakdown in seconds.

---

### 🚀 Key Features

🔍 **WordPress Core & Theme Detection**
• Accurately detects whether a site is built with WordPress.
• Displays the exact WordPress core version.
• Identifies the active theme, theme version, and provides direct links to the official WordPress theme directory.

🧩 **Deep Plugin Discovery (Assets + REST API)**
• Scans both loaded frontend scripts and styles to identify installed plugins with version numbers.
• Probes the WordPress REST API namespaces to uncover background plugins that don't load visible frontend assets.
• Search & Filter: Instantly filter through large plugin lists with the built-in search bar.
• Direct links to official WordPress.org plugin directory pages for instant documentation lookup.

⚡ **Server, Hosting & CDN Intelligence**
• Detects the underlying web server software (Nginx, Apache, LiteSpeed, etc.).
• Identifies whether the site sits behind a reverse proxy or CDN (such as Cloudflare, Sucuri, WP Engine, Kinsta, or Pantheon).
• Detects PHP version when exposed via response headers.

🚀 **Real-Time Cache Status Inspection**
• Inspects HTTP response headers to identify active caching systems (Cloudflare, LiteSpeed, Varnish, WP Engine, Kinsta, etc.).
• Displays real-time cache behavior: HIT, MISS, BYPASS, or DYNAMIC.

🌐 **DNS & Host Resolution**
• Resolves the domain's public Host IP address (IPv4 A-record).
• Displays the authoritative Nameservers (NS records) for the apex domain.

📋 **Developer-Friendly Export & Sharing Tools**
• One-Click Copy: Copies a clean, markdown-ready stack summary to your clipboard.
• Download TXT: Save a formatted text report directly to your computer.
• Export JSON: Download structured diagnostic JSON data ready to attach to bug tickets, client audits, or support reports.
• Quick Refresh: Re-run diagnostics on the current page with a single click without closing the popup.

🎨 **Modern, WordPress Admin-Inspired Interface**
• Intuitive card and accordion layout styled after familiar WordPress admin conventions.
• Full Dark Mode support that automatically matches your operating system theme.
• All information sections expanded by default for rapid scanning.

---

### 🔒 100% Privacy Focused & Safe

• WP Detector processes all webpage inspection locally inside your browser.
• No browsing history tracking, no telemetry, and no third-party analytics.
• No account or sign-in required.

---

### 💡 How to Use
1. Navigate to any website.
2. Click the WP Detector icon in your Chrome toolbar.
3. Instantly view the complete WordPress stack and export or copy the details as needed!

---

**Category** [REQUIRED]
Developer Tools

**Single Purpose** [REQUIRED]
Detects and displays WordPress version, themes, plugins, server, cache, and DNS information for the active website.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Created | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ Created | `screenshot-1280x800.png` |
| Screenshot 2 (Retina) [OPTIONAL] | 2560×1600 | ✅ Created | `screenshot-2560x1600-retina.png` |
| Small Promo Tile [RECOMMENDED] | 440×280 (No Alpha) | ✅ Created | `promo-small-440x280.png` / `promo-small-440x280.jpg` |
| Marquee Promo Tile [RECOMMENDED] | 1400×560 (No Alpha) | ✅ Created | `promo-marquee-1400x560.png` / `promo-marquee-1400x560.jpg` |

### Screenshot Notes
- Screenshot 1: Extension popup open on a WordPress site showing WordPress Core, Theme, Plugin list with versions, and Server info.
- Screenshot 2: Server & Performance section showing Cache Status, Host IP, and Nameservers with Dark Mode enabled.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| activeTab | permissions | Required to access the URL and content of the currently active tab when the user clicks the extension icon, allowing the script to scan for WordPress signatures. |
| scripting | permissions | Required to execute the detection script within the context of the active tab to analyze the page's DOM elements, meta tags, and network headers. |
| tabs | permissions | Required to read the URL of the active tab to ensure the extension only runs on valid webpages and not on browser internal pages (e.g., chrome://). |
| https://api.wordpress.org/* | host_permissions | Required to securely check the detected WordPress core version against the official WordPress API to verify release information. |
| https://dns.google/* | host_permissions | Required to perform secure DNS-over-HTTPS lookups to resolve the domain's public host IP (A record) and nameservers (NS records) without using third-party trackers. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
[To be added]

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]
[To be added]

**Contact Email** [REQUIRED]
[To be added]

**Support URL / Email** [RECOMMENDED]
[To be added]

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0 | 2026-10-14 | Initial release with full diagnostics, REST API plugin detection, server/cache inspection, and export tools | Submitted |
| 1.1 | 2026-10-16 | Redesigned modern developer dashboard UI, status pulse badge, toast feedback, and performance polish | Ready for submission |

## Review Notes

### Known Issues / Limitations
- Detects plugins and themes through two complementary methods: (1) frontend assets exposed in scripts/stylesheets, and (2) active WordPress REST API namespaces (`/wp-json`). Plugins that load neither frontend scripts nor public REST API endpoints cannot be detected from an external browser context.
