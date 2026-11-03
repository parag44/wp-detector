// ==========================================================================
// WP Detector v1.4 (Experimental) - Core Diagnostics Engine
// ==========================================================================

// 1. CONTENT SCRIPT EXECUTED IN TAB
async function detectWordPress() {
  let isWP = false;
  let version = 'Unknown';
  let theme = 'Unknown';
  let themeVersion = '';
  let themeAuthor = '';
  let themeStylesheet = '';
  let isChildTheme = false;
  let parentTheme = '';
  let isUserLoggedIn = false;
  let pageBuilder = 'None Detected';
  let hasGutenberg = false;

  const pluginsMap = new Map();
  const urlParams = new URL(document.location.href);
  const origin = urlParams.origin;

  // 7 Explicit Detection Signals as requested
  const signals = {
    api: { id: 'sig-api', detected: false, detail: 'Not detected' },
    linkHeader: { id: 'sig-link-header', detected: false, detail: 'Not detected' },
    generator: { id: 'sig-generator', detected: false, detail: 'Not detected' },
    wpContent: { id: 'sig-wp-content', detected: false, count: 0, detail: 'Not detected' },
    wpIncludes: { id: 'sig-wp-includes', detected: false, count: 0, detail: 'Not detected' },
    linkRel: { id: 'sig-link-rel', detected: false, detail: 'Not detected' },
    adminPaths: { id: 'sig-admin-paths', detected: false, detail: 'Not detected' }
  };

  // --- Signal 3: WordPress Generator Meta Tag ---
  const generatorMeta = document.querySelector('meta[name="generator"][content*="WordPress" i]');
  if (generatorMeta) {
    isWP = true;
    signals.generator.detected = true;
    signals.generator.detail = generatorMeta.outerHTML.substring(0, 80);
    const match = generatorMeta.content.match(/WordPress\s+([0-9a-zA-Z.-]+)/i);
    if (match) version = match[1];
  }

  // Check RSS Feed generators
  const rssLink = document.querySelector('link[type*="rss+xml"], link[rel="alternate"][type*="xml"]');
  if (rssLink && rssLink.href && rssLink.href.includes('/feed')) {
    if (!signals.generator.detected) {
      signals.generator.detected = true;
      signals.generator.detail = `RSS Feed: ${rssLink.href}`;
    }
  }

  // --- Signal 6: wp-json Link Rel Detected ---
  const linkRelWp = document.querySelector('link[rel="https://api.w.org/"], link[rel="alternate"][type="application/json"][href*="wp-json"]');
  const linkRsd = document.querySelector('link[rel="EditURI"][type="application/rsd+xml"]');
  if (linkRelWp) {
    isWP = true;
    signals.linkRel.detected = true;
    signals.linkRel.detail = `<link rel="https://api.w.org/" href="${linkRelWp.href}">`;
  } else if (linkRsd) {
    isWP = true;
    signals.linkRel.detected = true;
    signals.linkRel.detail = `<link rel="EditURI" href="${linkRsd.href}">`;
  }

  // --- Signal 7: WordPress Admin / Login Paths & Admin Bar ---
  const adminBar = document.getElementById('wpadminbar');
  const bodyLogged = document.body && (document.body.classList.contains('logged-in') || document.body.classList.contains('admin-bar'));
  if (adminBar || bodyLogged) {
    isWP = true;
    isUserLoggedIn = true;
    signals.adminPaths.detected = true;
    signals.adminPaths.detail = 'Logged in session detected (wpadminbar present)';
  } else {
    const loginLink = document.querySelector('a[href*="wp-login.php"], a[href*="wp-admin"], form[action*="wp-login.php"]');
    if (loginLink) {
      isWP = true;
      signals.adminPaths.detected = true;
      signals.adminPaths.detail = `Admin route: ${loginLink.getAttribute('href') || loginLink.getAttribute('action')}`;
    }
  }

  // --- Gutenberg Blocks Check ---
  const gutenbergEl = document.querySelector('[class*="wp-block-"], [class*="wp-container-"], link[href*="block-library"]');
  if (gutenbergEl) {
    hasGutenberg = true;
  }

  // --- Page Builder Check ---
  if (document.querySelector('.elementor, link[href*="elementor"]')) pageBuilder = 'Elementor';
  else if (document.querySelector('.et_pb_section, link[href*="divi"]')) pageBuilder = 'Divi';
  else if (document.querySelector('.fl-builder, link[href*="beaver-builder"]')) pageBuilder = 'Beaver Builder';
  else if (document.querySelector('.vc_row, link[href*="js_composer"]')) pageBuilder = 'WPBakery';
  else if (document.querySelector('.brx-body, link[href*="bricks"]')) pageBuilder = 'Bricks';
  else if (document.querySelector('.ct-section, link[href*="oxygen"]')) pageBuilder = 'Oxygen';
  else if (hasGutenberg) pageBuilder = 'Gutenberg (Block Editor)';

  // --- Signal 4 & 5: /wp-content/ and /wp-includes/ Asset Scans ---
  const elements = document.querySelectorAll('link[rel="stylesheet"], script[src], img[src]');
  let wpContentCount = 0;
  let wpIncludesCount = 0;

  elements.forEach(el => {
    const url = el.href || el.src;
    if (!url) return;

    if (url.includes('/wp-content/')) {
      isWP = true;
      wpContentCount++;
      if (!signals.wpContent.detected) {
        signals.wpContent.detected = true;
        signals.wpContent.detail = `Asset: ${url.substring(0, 75)}`;
      }
    }

    if (url.includes('/wp-includes/')) {
      isWP = true;
      wpIncludesCount++;
      if (!signals.wpIncludes.detected) {
        signals.wpIncludes.detected = true;
        signals.wpIncludes.detail = `Core: ${url.substring(0, 75)}`;
      }
    }

    // Active Theme Extraction
    const themeMatch = url.match(/\/wp-content\/themes\/([^\/]+)\//i);
    if (themeMatch) {
      const detectedTheme = themeMatch[1];
      if (theme === 'Unknown') {
        theme = detectedTheme;
        themeStylesheet = url;
      } else if (theme !== detectedTheme && !isChildTheme) {
        isChildTheme = true;
        parentTheme = detectedTheme;
      }

      const verMatch = url.match(/(?:\?|&)ver=([0-9a-zA-Z.-]+)/i);
      if (verMatch && verMatch[1] !== version && !themeVersion) {
        themeVersion = verMatch[1];
      }
    }

    // Plugin Assets Extraction
    const pluginMatch = url.match(/\/wp-content\/plugins\/([^\/]+)\//i);
    if (pluginMatch) {
      const slug = pluginMatch[1];
      let pVer = '';
      const verMatch = url.match(/(?:\?|&)ver=([0-9a-zA-Z.-]+)/i);
      if (verMatch && verMatch[1] !== version) pVer = verMatch[1];

      const existing = pluginsMap.get(slug);
      if (!existing || (pVer && !existing.version)) {
        pluginsMap.set(slug, {
          slug,
          version: pVer,
          method: 'Frontend Asset',
          sourceTag: 'URL',
          evidence: url
        });
      }
    }
  });

  signals.wpContent.count = wpContentCount;
  signals.wpIncludes.count = wpIncludesCount;

  // --- HTTP Headers & Cache Status (via GET + AbortController) ---
  let serverSoftware = 'Unknown';
  let proxyCDN = 'None Detected';
  let phpVersion = 'Unknown';
  let cacheSystem = 'None Detected';
  let cacheHeaderStatus = 'Unknown';
  let cacheDetail = '';

  function parseCacheStatus(raw) {
    if (!raw) return 'Unknown';
    const s = raw.trim();
    const upper = s.toUpperCase();

    if (upper.includes('SAVING')) return 'Saving to Cache';
    if (upper.includes('NOT CACHED') || upper.includes('NO-CACHE') || upper.includes('BYPASS') || upper.includes('DISABLED') || upper.includes('EXCLUDED')) return 'BYPASS';
    if (upper.includes('HIT') || upper.includes('CACHED') || upper.includes('SUPERCACHE') || upper.includes('WP-CACHE') || upper === 'ACTIVE') return 'HIT';
    if (upper.includes('MISS')) return 'MISS';
    if (upper.includes('DYNAMIC')) return 'DYNAMIC';
    if (upper.includes('EXPIRED')) return 'EXPIRED';
    if (upper.includes('STALE')) return 'STALE';
    if (upper.includes('REVALIDATED')) return 'REVALIDATED';
    return s.length > 20 ? s.substring(0, 20) : s;
  }

  const knownCacheRules = [
    { header: 'wpo-cache-status', system: 'WP-Optimize', pluginSlug: 'wp-optimize' },
    { header: 'x-wpo-cache-status', system: 'WP-Optimize', pluginSlug: 'wp-optimize' },
    { header: 'x-litespeed-cache', system: 'LiteSpeed Cache', pluginSlug: 'litespeed-cache' },
    { header: 'wp-super-cache', system: 'WP Super Cache', pluginSlug: 'wp-super-cache' },
    { header: 'x-super-cache', system: 'WP Super Cache', pluginSlug: 'wp-super-cache' },
    { header: 'x-w3tc-pagecache', system: 'W3 Total Cache', pluginSlug: 'w3-total-cache' },
    { header: 'x-flying-press-cache', system: 'FlyingPress', pluginSlug: 'flying-press' },
    { header: 'x-nitro-cache', system: 'NitroPack', pluginSlug: 'nitropack' },
    { header: 'x-breeze-cache', system: 'Breeze Cache', pluginSlug: 'breeze' },
    { header: 'x-cache-handler', system: 'Cache Enabler', pluginSlug: 'cache-enabler' },
    { header: 'cf-cache-status', system: 'Cloudflare' },
    { header: 'x-kinsta-cache', system: 'Kinsta Cache' },
    { header: 'x-wpengine-cache', system: 'WP Engine Cache' },
    { header: 'x-pantheon-styx-edge-cache', system: 'Pantheon Styx' },
    { header: 'x-fastcgi-cache', system: 'Nginx FastCGI' },
    { header: 'x-varnish-cache', system: 'Varnish' },
    { header: 'x-cache-status', system: 'Server Cache' },
    { header: 'x-cache', system: 'Edge/Server Cache' }
  ];

  try {
    const abortCtrl = new AbortController();
    let response;
    try {
      response = await fetch(document.location.href, {
        method: 'GET',
        signal: abortCtrl.signal
      });
    } catch (e) {
      response = await fetch(document.location.href, { method: 'HEAD' });
    }

    // --- Signal 2: wp-json in Link Header ---
    const linkHeader = response.headers.get('link');
    if (linkHeader && (linkHeader.includes('rel="https://api.w.org/"') || linkHeader.includes('/wp-json/'))) {
      isWP = true;
      signals.linkHeader.detected = true;
      signals.linkHeader.detail = linkHeader.length > 80 ? linkHeader.substring(0, 80) + '...' : linkHeader;
    }

    // Server Software & Proxy
    const rawServer = response.headers.get('server');
    if (rawServer) {
      if (rawServer.toLowerCase().includes('cloudflare')) proxyCDN = 'Cloudflare';
      else if (rawServer.toLowerCase().includes('sucuri')) proxyCDN = 'Sucuri';
      else serverSoftware = rawServer;
    }

    // PHP Version
    const poweredBy = response.headers.get('x-powered-by');
    if (poweredBy && poweredBy.toLowerCase().includes('php')) {
      phpVersion = poweredBy;
    }

    // Platform Overrides
    if (response.headers.has('x-wpengine')) proxyCDN = 'WP Engine (Platform)';
    if (response.headers.has('x-kinsta-cache')) proxyCDN = 'Kinsta (Platform)';
    if (response.headers.has('x-pantheon-styx-edge-cache')) proxyCDN = 'Pantheon (Platform)';

    // Cache Headers
    for (const rule of knownCacheRules) {
      if (response.headers.has(rule.header)) {
        cacheSystem = rule.system;
        const rawVal = response.headers.get(rule.header);
        cacheHeaderStatus = parseCacheStatus(rawVal);
        cacheDetail = `${rule.header}: ${rawVal}`;

        if (rule.pluginSlug && !pluginsMap.has(rule.pluginSlug)) {
          pluginsMap.set(rule.pluginSlug, {
            slug: rule.pluginSlug,
            version: '',
            method: 'HTTP Cache Header',
            sourceTag: 'HEADER',
            evidence: `${rule.header}: ${rawVal}`
          });
        }
        break;
      }
    }

    // Wildcard cache fallback
    if (cacheSystem === 'None Detected') {
      response.headers.forEach((val, key) => {
        if (cacheSystem !== 'None Detected') return;
        const lKey = key.toLowerCase();
        if (lKey.includes('cache-status') || (lKey.includes('cache') && !lKey.includes('cache-control'))) {
          cacheSystem = key;
          cacheHeaderStatus = parseCacheStatus(val);
          cacheDetail = `${key}: ${val}`;
        }
      });
    }

    abortCtrl.abort();
  } catch (e) {
    // Ignore fetch error
  }

  // --- HTML Comment Inspection for Caching (DOM fallback) ---
  if (cacheSystem === 'None Detected' || cacheHeaderStatus === 'Unknown' || cacheHeaderStatus === 'BYPASS') {
    try {
      const iter = document.createNodeIterator(document, NodeFilter.SHOW_COMMENT, () => NodeFilter.FILTER_ACCEPT);
      let node;
      while ((node = iter.nextNode())) {
        const text = (node.nodeValue || '').trim();
        if (/cached\s+by\s+wp-optimize|wpo-cache/i.test(text)) {
          cacheSystem = 'WP-Optimize';
          cacheHeaderStatus = 'HIT';
          cacheDetail = 'HTML Comment: WP-Optimize';
          if (!pluginsMap.has('wp-optimize')) {
            pluginsMap.set('wp-optimize', { slug: 'wp-optimize', version: '', method: 'HTML Comment Signature', sourceTag: 'DOM', evidence: text.substring(0, 80) });
          }
          break;
        } else if (/wp\s*rocket/i.test(text)) {
          cacheSystem = 'WP Rocket';
          cacheHeaderStatus = 'HIT';
          cacheDetail = 'HTML Comment: WP Rocket';
          if (!pluginsMap.has('wp-rocket')) {
            pluginsMap.set('wp-rocket', { slug: 'wp-rocket', version: '', method: 'HTML Comment Signature', sourceTag: 'DOM', evidence: text.substring(0, 80) });
          }
          break;
        } else if (/wp\s*fastest\s*cache/i.test(text)) {
          cacheSystem = 'WP Fastest Cache';
          cacheHeaderStatus = 'HIT';
          cacheDetail = 'HTML Comment: WP Fastest Cache';
          if (!pluginsMap.has('wp-fastest-cache')) {
            pluginsMap.set('wp-fastest-cache', { slug: 'wp-fastest-cache', version: '', method: 'HTML Comment Signature', sourceTag: 'DOM', evidence: text.substring(0, 80) });
          }
          break;
        } else if (/w3\s*total\s*cache/i.test(text)) {
          cacheSystem = 'W3 Total Cache';
          cacheHeaderStatus = 'HIT';
          cacheDetail = 'HTML Comment: W3 Total Cache';
          if (!pluginsMap.has('w3-total-cache')) {
            pluginsMap.set('w3-total-cache', { slug: 'w3-total-cache', version: '', method: 'HTML Comment Signature', sourceTag: 'DOM', evidence: text.substring(0, 80) });
          }
          break;
        } else if (/supercache|cached\s+page\s+served\s+by\s+wp-cache/i.test(text)) {
          cacheSystem = 'WP Super Cache';
          cacheHeaderStatus = 'HIT';
          cacheDetail = 'HTML Comment: WP Super Cache';
          if (!pluginsMap.has('wp-super-cache')) {
            pluginsMap.set('wp-super-cache', { slug: 'wp-super-cache', version: '', method: 'HTML Comment Signature', sourceTag: 'DOM', evidence: text.substring(0, 80) });
          }
          break;
        } else if (/litespeed\s*cache/i.test(text)) {
          cacheSystem = 'LiteSpeed Cache';
          cacheHeaderStatus = 'HIT';
          cacheDetail = 'HTML Comment: LiteSpeed Cache';
          if (!pluginsMap.has('litespeed-cache')) {
            pluginsMap.set('litespeed-cache', { slug: 'litespeed-cache', version: '', method: 'HTML Comment Signature', sourceTag: 'DOM', evidence: text.substring(0, 80) });
          }
          break;
        }
      }
    } catch (e) {}
  }

  // --- Signal 1: wp-json API Detected ---
  let restSiteName = '';
  let restDescription = '';
  try {
    let restRes = await fetch(origin + '/wp-json');
    if (!restRes.ok) restRes = await fetch(origin + '/?rest_route=/');

    if (restRes.ok) {
      const restData = await restRes.json();
      if (restData && restData.namespaces && Array.isArray(restData.namespaces)) {
        isWP = true;
        signals.api.detected = true;
        signals.api.detail = `${origin}/wp-json (${restData.namespaces.length} namespaces)`;

        if (restData.name) restSiteName = restData.name;
        if (restData.description) restDescription = restData.description;

        const coreNamespaces = ['oembed', 'wp', 'wp-site-health', 'wp-block-editor', 'wp-abilities'];
        restData.namespaces.forEach(ns => {
          const parts = ns.split('/');
          if (parts.length > 0) {
            let prefix = parts[0].toLowerCase();
            if (!coreNamespaces.includes(prefix) && prefix.length > 1) {
              if (prefix === 'ldlms') prefix = 'sfwd-lms';
              if (prefix === 'yoast') prefix = 'wordpress-seo';
              if (prefix === 'wc') prefix = 'woocommerce';

              if (!pluginsMap.has(prefix)) {
                pluginsMap.set(prefix, {
                  slug: prefix,
                  version: 'REST API',
                  method: 'REST API Namespace',
                  sourceTag: 'API',
                  evidence: `${origin}/wp-json/${ns}`
                });
              }
            }
          }
        });
      }
    }
  } catch (e) {}

  // Calculate Overall Confidence Score based on confirmed signals
  let signalScore = 0;
  if (signals.api.detected) signalScore++;
  if (signals.linkHeader.detected) signalScore++;
  if (signals.generator.detected) signalScore++;
  if (signals.wpContent.detected) signalScore++;
  if (signals.wpIncludes.detected) signalScore++;
  if (signals.linkRel.detected) signalScore++;
  if (signals.adminPaths.detected) signalScore++;

  let confidence = '0%';
  if (signalScore >= 5) confidence = '98%';
  else if (signalScore >= 3) confidence = '90%';
  else if (signalScore >= 1) confidence = '75%';

  // Categorize Plugins & Normalize Titles
  function categorizePlugin(slug) {
    const s = slug.toLowerCase();
    if (s.includes('form') || s === 'contact-form-7' || s === 'gravityforms' || s === 'wpforms') return 'Forms';
    if (s.includes('seo') || s.includes('schema') || s === 'wordpress-seo') return 'SEO';
    if (s.includes('cache') || s.includes('optimize') || s.includes('rocket') || s === 'autoptimize') return 'Cache';
    if (s.includes('security') || s.includes('fence') || s.includes('firewall') || s === 'wordfence') return 'Security';
    if (s.includes('woo') || s.includes('shop') || s.includes('cart')) return 'E-Commerce';
    if (s.includes('elementor') || s.includes('builder') || s.includes('blocks') || s.includes('gutenberg')) return 'Blocks';
    if (s.includes('analytics') || s.includes('parsely') || s.includes('pixel') || s.includes('track')) return 'Analytics';
    if (s.includes('access') || s.includes('wcag') || s.includes('ada')) return 'Accessibility';
    return 'Plugin';
  }

  function formatPluginName(slug) {
    const knownNames = {
      'wordpress-seo': 'Yoast SEO',
      'contact-form-7': 'Contact Form 7',
      'woocommerce': 'WooCommerce',
      'wp-optimize': 'WP-Optimize',
      'litespeed-cache': 'LiteSpeed Cache',
      'wp-super-cache': 'WP Super Cache',
      'w3-total-cache': 'W3 Total Cache',
      'seo-by-rank-math': 'Rank Math SEO',
      'gravityforms': 'Gravity Forms',
      'popup-maker': 'Popup Maker',
      'wp-parsely': 'Parse.ly Analytics',
      'elementor': 'Elementor Website Builder',
      'accessibility-checker': 'Equalize Digital Accessibility Checker',
      'wordfence': 'Wordfence Security',
      'updraftplus': 'UpdraftPlus Backup'
    };
    if (knownNames[slug]) return knownNames[slug];
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const plugins = Array.from(pluginsMap.values()).map(p => {
    return {
      ...p,
      name: formatPluginName(p.slug),
      category: categorizePlugin(p.slug),
      iconUrl: `https://ps.w.org/${p.slug}/assets/icon-128x128.png`,
      iconFallbackUrl: `https://ps.w.org/${p.slug}/assets/icon-256x256.png`
    };
  });

  return {
    isWP,
    pageTitle: restSiteName || document.title || 'WordPress Site',
    faviconUrl: document.querySelector('link[rel~="icon"]')?.href || `${origin}/favicon.ico`,
    url: document.location.href,
    origin,
    protocol: urlParams.protocol,
    version,
    theme,
    themeVersion,
    themeAuthor,
    themeStylesheet,
    isChildTheme,
    parentTheme,
    isUserLoggedIn,
    pageBuilder,
    hasGutenberg,
    serverSoftware,
    proxyCDN,
    phpVersion,
    cacheSystem,
    cacheHeaderStatus,
    cacheDetail,
    signals,
    signalScore,
    confidence,
    plugins
  };
}

// ==========================================================================
// 2. POPUP CONTROLLER & NETWORK ENHANCEMENTS
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  let reportData = null;

  // DOM Elements
  const els = {
    loading: document.getElementById('state-loading'),
    empty: document.getElementById('state-empty'),
    siteTitle: document.getElementById('site-title'),
    siteUrl: document.getElementById('site-url'),
    siteFavicon: document.getElementById('site-favicon'),
    refreshBtn: document.getElementById('refresh-btn'),
    copyBtn: document.getElementById('copy-btn'),
    exportBtn: document.getElementById('export-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    tabs: document.querySelectorAll('.nav-tab'),
    panes: document.querySelectorAll('.tab-pane'),
    pluginSearch: document.getElementById('plugin-search'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    filterChips: document.querySelectorAll('.chip'),
    pluginsList: document.getElementById('plugins-list'),
    toast: document.getElementById('toast'),
    emptyRescanBtn: document.getElementById('btn-empty-rescan')
  };

  // --- Theme Toggle (Dark/Light) with OS Preference Detection ---
  let savedTheme = localStorage.getItem('wp_detector_theme');
  if (!savedTheme) {
    savedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'theme-light' : 'theme-dark';
  }
  document.body.className = savedTheme;

  els.themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('theme-dark');
    const newTheme = isDark ? 'theme-light' : 'theme-dark';
    document.body.className = newTheme;
    localStorage.setItem('wp_detector_theme', newTheme);
  });

  // --- Tab Navigation ---
  function switchTab(tabId) {
    els.tabs.forEach(t => {
      const active = t.getAttribute('data-tab') === tabId;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active);
    });

    els.panes.forEach(p => {
      p.classList.toggle('hidden', p.id !== `pane-${tabId}`);
    });
  }

  els.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Quick navigation shortcuts from Overview cards
  document.getElementById('card-click-plugins')?.addEventListener('click', () => switchTab('plugins'));
  document.getElementById('card-click-theme')?.addEventListener('click', () => switchTab('theme'));
  document.getElementById('card-click-signals')?.addEventListener('click', () => switchTab('signals'));
  document.getElementById('btn-goto-theme')?.addEventListener('click', () => switchTab('theme'));
  document.getElementById('btn-goto-hosting')?.addEventListener('click', () => switchTab('hosting'));

  // --- DNS & IP Whois Utilities ---
  async function getHostIP(hostname) {
    try {
      const res = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
      const data = await res.json();
      if (data.Answer && data.Answer.length > 0) {
        return data.Answer.map(a => a.data).find(ip => ip.match(/^[0-9.]+$/)) || 'Unknown';
      }
    } catch (e) {}
    return 'Unknown';
  }

  async function getNameservers(hostname) {
    try {
      const parts = hostname.split('.');
      let apex = hostname;
      if (parts.length > 2) apex = parts.slice(-2).join('.');
      const res = await fetch(`https://dns.google/resolve?name=${apex}&type=NS`);
      const data = await res.json();
      if (data.Answer && data.Answer.length > 0) {
        return data.Answer.map(a => a.data.replace(/\.$/, '')).slice(0, 2).join(', ');
      }
    } catch (e) {}
    return 'Unknown';
  }

  async function getISPAndLocation(ip) {
    if (!ip || ip === 'Unknown' || ip.startsWith('127.') || ip === 'localhost') {
      return { isp: 'Localhost / Private', location: 'Internal Network' };
    }
    try {
      const res = await fetch(`https://ipwho.is/${ip}`);
      const data = await res.json();
      if (data && data.success) {
        const flag = data.flag && data.flag.emoji ? `${data.flag.emoji} ` : '';
        const loc = [data.city, data.region, data.country_code].filter(Boolean).join(', ');
        return {
          isp: data.connection && data.connection.isp ? data.connection.isp : 'Unknown',
          location: `${flag}${loc}`
        };
      }
    } catch (e) {}
    return { isp: 'Unknown', location: 'Unknown' };
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    setTimeout(() => els.toast.classList.add('hidden'), 2200);
  }

  // --- Offline / Sample Mock Data for Preview Testing ---
  function getSampleMockData() {
    return {
      isWP: true,
      pageTitle: 'NASA',
      faviconUrl: 'https://www.nasa.gov/wp-content/themes/nasa/assets/images/favicon.ico',
      url: 'https://www.nasa.gov/',
      origin: 'https://www.nasa.gov',
      protocol: 'https:',
      version: '7.0.8',
      theme: 'nasa',
      themeVersion: '1.1.1',
      themeAuthor: 'Lone Rock Point',
      themeStylesheet: 'https://www.nasa.gov/wp-content/themes/nasa/style.css',
      isChildTheme: false,
      parentTheme: '',
      isUserLoggedIn: false,
      pageBuilder: 'Gutenberg (Block Editor)',
      hasGutenberg: true,
      serverSoftware: 'nginx/1.26.1',
      proxyCDN: 'WordPress VIP (Automattic)',
      phpVersion: 'PHP/8.2.30',
      cacheSystem: 'Server Cache',
      cacheHeaderStatus: 'HIT',
      cacheDetail: 'x-cache: HIT',
      ip: '192.0.66.108',
      isp: 'Automattic, Inc',
      location: '🇺🇸 San Francisco, California, US',
      dns: 'a12-64.akam.net, a5-66.akam.net',
      confidence: '98%',
      signalScore: 7,
      signals: {
        api: { id: 'sig-api', detected: true, detail: 'https://www.nasa.gov/wp-json (24 namespaces)' },
        linkHeader: { id: 'sig-link-header', detected: true, detail: '<https://www.nasa.gov/wp-json/>; rel="https://api.w.org/"' },
        generator: { id: 'sig-generator', detected: true, detail: '<meta name="generator" content="WordPress 7.0.8">' },
        wpContent: { id: 'sig-wp-content', detected: true, count: 42, detail: '42 assets found in /wp-content/' },
        wpIncludes: { id: 'sig-wp-includes', detected: true, count: 18, detail: '18 assets found in /wp-includes/' },
        linkRel: { id: 'sig-link-rel', detected: true, detail: '<link rel="https://api.w.org/" href="https://www.nasa.gov/wp-json/">' },
        adminPaths: { id: 'sig-admin-paths', detected: true, detail: 'Verified public login endpoint /wp-login.php' }
      },
      plugins: [
        { slug: 'accessibility-checker', name: 'Equalize Digital Accessibility Checker', version: '1.51.1', category: 'Accessibility', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/accessibility-checker/assets/js/frontend.js' },
        { slug: 'gravityforms', name: 'Gravity Forms', version: '2.8.6', category: 'Forms', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/gravityforms/js/gravityforms.min.js' },
        { slug: 'nasa-blocks', name: 'Nasa Blocks', version: '1.2.0', category: 'Blocks', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/nasa-blocks/build/index.js' },
        { slug: 'popup-maker', name: 'Popup Maker', version: '1.18.4', category: 'Forms', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/popup-maker/assets/js/site.min.js' },
        { slug: 'seo-by-rank-math', name: 'Rank Math SEO', version: '1.0.280', category: 'SEO', sourceTag: 'API', evidence: 'https://www.nasa.gov/wp-json/rankmath/v1' },
        { slug: 'wp-parsely', name: 'Parse.ly Analytics', version: '3.14.0', category: 'Analytics', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/wp-parsely/build/loader.js' },
        { slug: 'litespeed-cache', name: 'LiteSpeed Cache', version: '6.2.0.1', category: 'Cache', sourceTag: 'HEADER', evidence: 'x-litespeed-cache: hit' },
        { slug: 'wp-optimize', name: 'WP-Optimize', version: '3.7.0', category: 'Cache', sourceTag: 'DOM', evidence: '<!-- Cached by WP-Optimize -->' },
        { slug: 'wordfence', name: 'Wordfence Security', version: '7.11.5', category: 'Security', sourceTag: 'API', evidence: 'https://www.nasa.gov/wp-json/wordfence/v1' },
        { slug: 'safe-svg', name: 'Safe SVG', version: '2.2.4', category: 'Plugin', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/safe-svg/assets/safe-svg.js' },
        { slug: 'contact-form-7', name: 'Contact Form 7', version: '5.9.5', category: 'Forms', sourceTag: 'API', evidence: 'https://www.nasa.gov/wp-json/contact-form-7/v1' }
      ]
    };
  }

  // --- Render Diagnostics Dashboard ---
  function renderDashboard(data) {
    els.loading.classList.add('hidden');
    els.empty.classList.add('hidden');

    // Header Info
    els.siteTitle.textContent = data.pageTitle || 'WordPress Site';
    els.siteUrl.textContent = data.origin || data.url;
    els.siteUrl.href = data.url;
    els.siteUrl.title = data.url;

    if (data.faviconUrl) {
      els.siteFavicon.src = data.faviconUrl;
      els.siteFavicon.onerror = () => { els.siteFavicon.src = '../icons/icon-48.png'; };
    }

    // Sub Status Bar
    document.getElementById('pill-core-version').textContent = data.version !== 'Unknown' ? `v${data.version}` : 'Version Hidden';
    const gutenbergPill = document.getElementById('pill-gutenberg');
    if (data.hasGutenberg) gutenbergPill.classList.remove('hidden');
    else gutenbergPill.classList.add('hidden');

    const restPill = document.getElementById('pill-rest-api');
    if (data.signals.api.detected) restPill.classList.remove('hidden');
    else restPill.classList.add('hidden');

    // Overview 4 Metric Cards
    document.getElementById('metric-confidence').textContent = data.confidence;
    document.getElementById('metric-plugins').textContent = data.plugins.length;
    document.getElementById('tab-plugins-count').textContent = data.plugins.length;
    document.getElementById('chip-all-count').textContent = data.plugins.length;
    document.getElementById('metric-theme-name').textContent = data.theme !== 'Unknown' ? data.theme : 'Theme';
    document.getElementById('metric-signals-count').textContent = `${data.signalScore} / 7`;
    document.getElementById('tab-signals-score').textContent = `${data.signalScore}/7`;
    document.getElementById('signals-score-circle').textContent = data.signalScore;

    // Overview Theme Summary Card
    document.getElementById('overview-theme-name').textContent = data.theme !== 'Unknown' ? data.theme : 'Active Theme';
    document.getElementById('overview-theme-version').textContent = data.themeVersion ? `v${data.themeVersion}` : 'Active';
    document.getElementById('overview-theme-author').textContent = data.themeAuthor ? `By ${data.themeAuthor}` : `Slug: ${data.theme}`;

    // Theme Thumbnail in Overview
    const overviewThumb = document.getElementById('overview-theme-thumb');
    const overviewPlaceholder = document.getElementById('overview-theme-placeholder');
    if (data.theme !== 'Unknown') {
      const tsUrl = `https://ts.w.org/wp-content/themes/${data.theme}/screenshot.jpg`;
      overviewThumb.src = tsUrl;
      overviewThumb.onload = () => {
        overviewThumb.classList.remove('hidden');
        overviewPlaceholder.classList.add('hidden');
      };
      overviewThumb.onerror = () => {
        // Try png
        overviewThumb.src = `https://ts.w.org/wp-content/themes/${data.theme}/screenshot.png`;
        overviewThumb.onerror = () => {
          overviewThumb.classList.add('hidden');
          overviewPlaceholder.classList.remove('hidden');
        };
      };
    } else {
      overviewThumb.classList.add('hidden');
      overviewPlaceholder.classList.remove('hidden');
    }

    // Overview Server & Stack Table
    document.getElementById('overview-hosting').textContent = data.proxyCDN !== 'None Detected' ? data.proxyCDN : (data.isp || 'Self-Hosted');
    document.getElementById('overview-server').textContent = data.serverSoftware;
    const cacheBadge = document.getElementById('overview-cache-badge');
    cacheBadge.textContent = data.cacheSystem !== 'None Detected' ? `${data.cacheSystem}: ${data.cacheHeaderStatus}` : data.cacheHeaderStatus;
    cacheBadge.className = 'status-pill ' + (data.cacheHeaderStatus === 'HIT' ? 'pill-green' : data.cacheHeaderStatus === 'BYPASS' ? 'pill-amber' : 'pill-neutral');
    document.getElementById('overview-builder').textContent = data.pageBuilder;
    const ipEl = document.getElementById('overview-ip');
    ipEl.textContent = data.ip;

    // --- Tab 3: Theme Hero Card ---
    document.getElementById('theme-big-title').textContent = data.theme !== 'Unknown' ? data.theme : 'Custom Theme';
    document.getElementById('theme-pill-slug').textContent = `Slug: ${data.theme}`;
    document.getElementById('theme-pill-ver').textContent = data.themeVersion ? `v${data.themeVersion}` : 'Version unknown';
    if (data.isChildTheme) {
      document.getElementById('theme-pill-child').classList.remove('hidden');
    }
    document.getElementById('theme-spec-name').textContent = data.theme;
    document.getElementById('theme-spec-slug').textContent = data.theme;
    document.getElementById('theme-spec-version').textContent = data.themeVersion || 'Not exposed';
    document.getElementById('theme-spec-author').textContent = data.themeAuthor || 'Author not detected';
    document.getElementById('theme-fallback-name').textContent = data.theme;

    const fullThumb = document.getElementById('theme-full-screenshot');
    const fullFallback = document.getElementById('theme-full-fallback');
    if (data.theme !== 'Unknown') {
      fullThumb.src = `https://ts.w.org/wp-content/themes/${data.theme}/screenshot.jpg`;
      fullThumb.onload = () => {
        fullThumb.classList.remove('hidden');
        fullFallback.classList.add('hidden');
      };
      fullThumb.onerror = () => {
        fullThumb.src = `https://ts.w.org/wp-content/themes/${data.theme}/screenshot.png`;
        fullThumb.onerror = () => {
          fullThumb.classList.add('hidden');
          fullFallback.classList.remove('hidden');
        };
      };
      document.getElementById('theme-wp-link').href = `https://wordpress.org/themes/${data.theme}/`;
    }

    // --- Tab 4: Hosting & Server Table ---
    document.getElementById('host-ip').textContent = data.ip;
    document.getElementById('host-isp').textContent = data.isp || 'Detecting...';
    document.getElementById('host-location').textContent = data.location || 'Unknown';
    document.getElementById('host-server').textContent = data.serverSoftware;
    document.getElementById('host-cdn').textContent = data.proxyCDN;
    const hostCacheBadge = document.getElementById('host-cache-badge');
    hostCacheBadge.textContent = data.cacheSystem !== 'None Detected' ? `${data.cacheSystem}: ${data.cacheHeaderStatus}` : data.cacheHeaderStatus;
    hostCacheBadge.className = 'status-pill ' + (data.cacheHeaderStatus === 'HIT' ? 'pill-green' : data.cacheHeaderStatus === 'BYPASS' ? 'pill-amber' : 'pill-neutral');
    document.getElementById('host-php').textContent = data.phpVersion;
    document.getElementById('host-dns').innerHTML = (data.dns || 'Unknown').replace(/, /g, '<br>');

    // --- Tab 5: Detection Signals Checklist ---
    const sigKeys = ['api', 'linkHeader', 'generator', 'wpContent', 'wpIncludes', 'linkRel', 'adminPaths'];
    sigKeys.forEach(key => {
      const sig = data.signals[key];
      const itemEl = document.getElementById(sig.id);
      if (itemEl) {
        const badge = itemEl.querySelector('.sig-badge');
        const detailEl = itemEl.querySelector('.signal-evidence');
        if (sig.detected) {
          badge.className = 'sig-badge sig-passed';
          badge.innerHTML = '&#10003;';
          detailEl.textContent = sig.detail;
          detailEl.style.color = 'var(--color-success)';
        } else {
          badge.className = 'sig-badge sig-failed';
          badge.innerHTML = '&mdash;';
          detailEl.textContent = 'Not present on this page';
          detailEl.style.color = 'var(--text-muted)';
        }
      }
    });

    // --- Tab 2: Render Plugins List ---
    renderFilteredPlugins();
  }

  // --- Plugin Inventory Rendering & Search ---
  let activeFilter = 'all';

  function renderFilteredPlugins() {
    if (!reportData) return;
    const container = els.pluginsList;
    container.innerHTML = '';

    const term = (els.pluginSearch.value || '').toLowerCase().trim();

    const filtered = reportData.plugins.filter(p => {
      const matchSearch = !term || p.slug.toLowerCase().includes(term) || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
      if (!matchSearch) return false;

      if (activeFilter === 'all') return true;
      if (activeFilter === 'known') return p.version && p.version !== 'REST API';
      if (activeFilter === 'api') return p.sourceTag === 'API';
      if (activeFilter === 'cache') return p.category === 'Cache';
      if (activeFilter === 'seo') return p.category === 'SEO';
      if (activeFilter === 'forms') return p.category === 'Forms';
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="state-container" style="min-height:180px;">
          <p style="font-size:12px;color:var(--text-muted);">No matching plugins found.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const row = document.createElement('div');
      row.className = 'plugin-item';

      const tagClass = p.sourceTag === 'URL' ? 'tag-url' : p.sourceTag === 'API' ? 'tag-api' : p.sourceTag === 'HEADER' ? 'tag-header' : 'tag-dom';

      const iconSrc = `https://ps.w.org/${p.slug}/assets/icon-128x128.png`;
      const fallbackGlyph = p.name.charAt(0).toUpperCase();

      row.innerHTML = `
        <div class="plugin-row-main">
          <div class="plugin-thumb-wrap">
            <img src="${iconSrc}" class="plugin-thumb-img" alt="${p.slug}">
            <span class="plugin-glyph-fallback hidden">${fallbackGlyph}</span>
          </div>
          <div class="plugin-info-block">
            <div class="plugin-title-line">
              <a href="https://wordpress.org/plugins/${p.slug}/" class="plugin-title-link" target="_blank" rel="noopener noreferrer">${p.name}</a>
              <span class="badge-tag ${tagClass}">${p.sourceTag}</span>
            </div>
            <div class="plugin-sub-line">
              <span>${p.version ? (p.version === 'REST API' ? 'REST API' : 'v' + p.version) : 'Version unknown'}</span>
              <span>&bull;</span>
              <span class="category-tag">${p.category}</span>
            </div>
          </div>
          <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="plugin-accordion hidden">
          <div class="evidence-box">${p.evidence}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
            <span>Detected via: <strong>${p.method}</strong></span>
            <a href="https://wordpress.org/plugins/${p.slug}/" target="_blank" rel="noopener noreferrer" style="color:var(--color-accent);font-weight:600;">View on WP.org &rarr;</a>
          </div>
        </div>
      `;

      // Thumbnail error fallback logic
      const img = row.querySelector('.plugin-thumb-img');
      const fallback = row.querySelector('.plugin-glyph-fallback');
      img.onerror = () => {
        img.src = `https://ps.w.org/${p.slug}/assets/icon-256x256.png`;
        img.onerror = () => {
          img.classList.add('hidden');
          fallback.classList.remove('hidden');
        };
      };

      // Expand/Collapse Accordion
      const mainRow = row.querySelector('.plugin-row-main');
      const acc = row.querySelector('.plugin-accordion');
      mainRow.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'a') return;
        acc.classList.toggle('hidden');
      });

      container.appendChild(row);
    });
  }

  // Search input events
  els.pluginSearch.addEventListener('input', () => {
    els.searchClearBtn.classList.toggle('hidden', !els.pluginSearch.value);
    renderFilteredPlugins();
  });

  els.searchClearBtn.addEventListener('click', () => {
    els.pluginSearch.value = '';
    els.searchClearBtn.classList.add('hidden');
    renderFilteredPlugins();
  });

  // Filter chips click
  els.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      els.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter');
      renderFilteredPlugins();
    });
  });

  // --- Copy & Export Actions ---
  function generateReportText() {
    if (!reportData) return '';
    const d = reportData;
    return `# WordPress Stack Report (v1.4)
Target URL: ${d.url}
Title: ${d.pageTitle}
Confidence: ${d.confidence} (${d.signalScore}/7 signals confirmed)

## SUMMARY
Core Version: ${d.version}
Active Theme: ${d.theme} (${d.themeVersion ? 'v' + d.themeVersion : 'Version unknown'})
Page Builder: ${d.pageBuilder}
Logged In: ${d.isUserLoggedIn ? 'Yes' : 'No'}

## SERVER & HOSTING
Web Server: ${d.serverSoftware}
Platform/Proxy: ${d.proxyCDN}
Host IP: ${d.ip}
ISP: ${d.isp}
Location: ${d.location}
PHP: ${d.phpVersion}
Live Cache: ${d.cacheHeaderStatus} (${d.cacheSystem})
Nameservers: ${d.dns}

## 7 DETECTION SIGNALS
1. wp-json API: ${d.signals.api.detected ? 'CONFIRMED (' + d.signals.api.detail + ')' : 'NO'}
2. wp-json in Link header: ${d.signals.linkHeader.detected ? 'CONFIRMED' : 'NO'}
3. WordPress generator meta tag: ${d.signals.generator.detected ? 'CONFIRMED' : 'NO'}
4. /wp-content/ pattern: ${d.signals.wpContent.detected ? 'CONFIRMED (' + d.signals.wpContent.count + ' occurrences)' : 'NO'}
5. /wp-includes/ pattern: ${d.signals.wpIncludes.detected ? 'CONFIRMED (' + d.signals.wpIncludes.count + ' occurrences)' : 'NO'}
6. wp-json link rel: ${d.signals.linkRel.detected ? 'CONFIRMED' : 'NO'}
7. Admin/login paths: ${d.signals.adminPaths.detected ? 'CONFIRMED' : 'NO'}

## DETECTED PLUGINS (${d.plugins.length})
${d.plugins.map(p => `- ${p.name} (${p.slug}) [${p.version || 'Version unknown'}] (${p.category})`).join('\n')}
`;
  }

  els.copyBtn.addEventListener('click', () => {
    if (!reportData) return;
    navigator.clipboard.writeText(generateReportText()).then(() => {
      showToast('Diagnostic report copied to clipboard!');
    }).catch(() => showToast('Failed to copy'));
  });

  document.getElementById('btn-copy-theme')?.addEventListener('click', () => {
    if (!reportData) return;
    const t = reportData;
    const txt = `Theme: ${t.theme}\nVersion: ${t.themeVersion || 'Unknown'}\nAuthor: ${t.themeAuthor || 'Unknown'}\nURL: ${t.url}`;
    navigator.clipboard.writeText(txt).then(() => showToast('Theme specs copied!'));
  });

  els.exportBtn.addEventListener('click', () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wp-stack-${new URL(reportData.url).hostname}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported JSON payload!');
  });

  // Copy IP click listener
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('copyable')) {
      const text = e.target.textContent.trim();
      navigator.clipboard.writeText(text).then(() => showToast(`Copied: ${text}`));
    }
  });

  // Check URL hash for initial tab selection (e.g. #plugins)
  if (window.location.hash) {
    const hashTab = window.location.hash.replace('#', '');
    if (['overview', 'plugins', 'theme', 'hosting', 'signals'].includes(hashTab)) {
      switchTab(hashTab);
    }
  }

  // --- Run Diagnostics Workflow ---
  async function runDiagnostics() {
    reportData = null;
    els.loading.classList.remove('hidden');
    els.empty.classList.add('hidden');
    els.refreshBtn.classList.add('spinning');

    let currentTabUrl = '';

    try {
      if (!window.chrome || !chrome.tabs || !chrome.tabs.query) {
        // Fallback for standalone preview / browser testing
        const sample = getSampleMockData();
        reportData = sample;
        renderDashboard(sample);
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
        els.loading.classList.add('hidden');
        els.empty.classList.remove('hidden');
        document.getElementById('empty-title').textContent = 'Internal Browser Page';
        document.getElementById('empty-desc').textContent = 'Chrome extensions cannot inspect browser-internal pages.';
        return;
      }

      currentTabUrl = tab.url;
      els.siteUrl.textContent = tab.url;

      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: detectWordPress
      });

      const data = res && res[0] ? res[0].result : null;

      if (!data || !data.isWP) {
        els.loading.classList.add('hidden');
        els.empty.classList.remove('hidden');
        document.getElementById('empty-title').textContent = 'Non-WordPress Site';
        document.getElementById('empty-desc').textContent = 'No WordPress core files, REST API endpoints, or theme stylesheets were detected on this page.';
        return;
      }

      const urlObj = new URL(tab.url);
      data.hostname = urlObj.hostname;

      // Parallel Network Lookups (DNS IP, Nameservers, ISP / Geolocation)
      const [ip, ns] = await Promise.all([
        getHostIP(data.hostname),
        getNameservers(data.hostname)
      ]);

      data.ip = ip;
      data.dns = ns;

      const geo = await getISPAndLocation(ip);
      data.isp = geo.isp;
      data.location = geo.location;

      reportData = data;
      renderDashboard(data);

    } catch (e) {
      els.loading.classList.add('hidden');
      els.empty.classList.remove('hidden');
      document.getElementById('empty-title').textContent = 'Diagnostics Incomplete';
      document.getElementById('empty-desc').textContent = e.message || 'Unable to scan page.';
    } finally {
      els.refreshBtn.classList.remove('spinning');
    }
  }

  els.refreshBtn.addEventListener('click', runDiagnostics);
  els.emptyRescanBtn.addEventListener('click', runDiagnostics);

  // Initial Run
  runDiagnostics();
});
