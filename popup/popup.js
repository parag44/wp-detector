// ==========================================
// 1. CONTENT SCRIPT EXECUTED IN TAB
// ==========================================
async function detectWordPress() {
  let isWP = false;
  let version = 'Unknown';
  let theme = 'Unknown';
  let themeVersion = '';
  const pluginsMap = new Map();

  // 1. Check Generator Meta Tag
  const generatorMeta = document.querySelector('meta[name="generator"]');
  if (generatorMeta && generatorMeta.content.toLowerCase().includes('wordpress')) {
    isWP = true;
    const match = generatorMeta.content.match(/WordPress\s+([0-9a-zA-Z.-]+)/i);
    if (match) version = match[1];
  }

  // 2. Scan stylesheets and scripts for wp-content patterns
  const elements = document.querySelectorAll('link[rel="stylesheet"], script[src]');
  
  elements.forEach(el => {
    const url = el.href || el.src;
    if (!url) return;
    if (url.includes('wp-content/')) isWP = true;

    const themeMatch = url.match(/\/wp-content\/themes\/([^\/]+)\//i);
    if (themeMatch) {
      theme = themeMatch[1];
      const verMatch = url.match(/(?:\?|&)ver=([0-9a-zA-Z.-]+)/i);
      if (verMatch && verMatch[1] !== version) themeVersion = verMatch[1];
    }

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
          evidence: url
        });
      }
    }
  });

  // 3. Try to get headers
  let serverSoftware = 'Unknown';
  let proxyCDN = 'None Detected';
  let phpVersion = 'Unknown';
  let cacheSystem = 'None Detected';
  let cacheHeaderStatus = 'Unknown';
  const urlParams = new URL(document.location.href);

  try {
    const response = await fetch(document.location.href, { method: 'HEAD' });
    
    // Server & Proxy Logic
    const rawServer = response.headers.get('server');
    if (rawServer) {
      if (rawServer.toLowerCase().includes('cloudflare')) {
        proxyCDN = 'Cloudflare';
      } else if (rawServer.toLowerCase().includes('sucuri')) {
        proxyCDN = 'Sucuri';
      } else {
        serverSoftware = rawServer;
      }
    }
    
    // PHP Version
    const poweredBy = response.headers.get('x-powered-by');
    if (poweredBy && poweredBy.toLowerCase().includes('php')) {
      phpVersion = poweredBy;
    }

    // Host Overrides (from headers)
    if (response.headers.has('x-wpengine')) proxyCDN = 'WP Engine (Platform)';
    if (response.headers.has('x-kinsta-cache')) proxyCDN = 'Kinsta (Platform)';
    if (response.headers.has('x-pantheon-styx-edge-cache')) proxyCDN = 'Pantheon (Platform)';

    // Cache Header Status
    const cacheHeaders = ['x-cache', 'cf-cache-status', 'x-kinsta-cache', 'x-wpengine-cache', 'x-pantheon-styx-edge-cache', 'x-litespeed-cache', 'x-varnish-cache'];
    for (const h of cacheHeaders) {
      if (response.headers.has(h)) {
        cacheSystem = h;
        const val = response.headers.get(h).toUpperCase();
        if (val.includes('HIT')) cacheHeaderStatus = 'HIT';
        else if (val.includes('MISS')) cacheHeaderStatus = 'MISS';
        else if (val.includes('BYPASS')) cacheHeaderStatus = 'BYPASS';
        else if (val.includes('DYNAMIC')) cacheHeaderStatus = 'DYNAMIC';
        else cacheHeaderStatus = val.substring(0, 15);
        break;
      }
    }

  } catch (e) {
    // CORS or Network error
  }

  // 4. REST API Namespace detection
  try {
    const origin = urlParams.origin;
    let restRes = await fetch(origin + '/wp-json');
    if (!restRes.ok) {
      restRes = await fetch(origin + '/?rest_route=/');
    }
    
    if (restRes.ok) {
      const restData = await restRes.json();
      if (restData && restData.namespaces && Array.isArray(restData.namespaces)) {
        const coreNamespaces = ['oembed', 'wp', 'wp-site-health', 'wp-block-editor', 'wp-abilities'];
        
        restData.namespaces.forEach(ns => {
          const parts = ns.split('/');
          if (parts.length > 0) {
            let prefix = parts[0].toLowerCase();
            if (!coreNamespaces.includes(prefix) && prefix.length > 1) {
               // Map common discrepancies
               if (prefix === 'ldlms') prefix = 'sfwd-lms'; // LearnDash
               if (prefix === 'yoast') prefix = 'wordpress-seo';
               if (prefix === 'wc') prefix = 'woocommerce';
               
               if (!pluginsMap.has(prefix)) {
                 pluginsMap.set(prefix, {
                   slug: prefix,
                   version: 'REST API',
                   method: 'REST API Namespace',
                   evidence: `${origin}/wp-json/${ns}`
                 });
               }
            }
          }
        });
      }
    }
  } catch (e) {
    // Ignore REST API errors
  }

  return {
    isWP,
    url: document.location.href,
    protocol: urlParams.protocol,
    version,
    theme,
    themeVersion,
    serverSoftware,
    proxyCDN,
    phpVersion,
    cacheSystem,
    cacheHeaderStatus,
    plugins: Array.from(pluginsMap.values())
  };
}

// ==========================================
// 2. POPUP LOGIC & UTILITIES
// ==========================================
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

async function checkWPCoreUpdate(currentVersion) {
  if (!currentVersion || currentVersion === 'Unknown') return null;
  try {
    const res = await fetch('https://api.wordpress.org/core/version-check/1.7/');
    const data = await res.json();
    if (data && data.offers && data.offers.length > 0) {
      const latest = data.offers[0].version;
      const outdated = currentVersion !== latest && currentVersion.localeCompare(latest, undefined, { numeric: true, sensitivity: 'base' }) < 0;
      return { outdated, latest };
    }
  } catch (e) {}
  return null;
}

// Helper: Categorize plugin and return category icon SVG + color class
function getPluginCategoryInfo(slug) {
  const s = slug.toLowerCase();
  
  if (s.includes('access') || s.includes('ada') || s.includes('screen-reader')) {
    return {
      cls: 'cat-green',
      svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="7.5" r="1.5" fill="currentColor"></circle><path d="M7 11h10M12 11v4M9.5 19.5l2.5-4.5 2.5 4.5"></path></svg>'
    };
  }
  if (s.includes('config') || s.includes('tool') || s.includes('admin') || s.includes('manager') || s.includes('settings')) {
    return {
      cls: 'cat-blue',
      svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
    };
  }
  if (s.includes('parsely') || s.includes('wp-') || s.includes('wordpress')) {
    return {
      cls: 'cat-blue',
      svg: '<svg viewBox="0 0 1000 1000" width="14" height="14" fill="currentColor"><path d="M500 0C223.8 0 0 223.8 0 500c0 276.2 223.8 500 500 500s500-223.8 500-500C1000 223.8 776.2 0 500 0zm0 34.6c257.1 0 465.4 208.3 465.4 465.4 0 94.7-28.3 182.7-76.7 256.4L640.4 274.6c18.5-.9 35.8-2.6 35.8-2.6 15.3-1.7 13.6-24.1-1.7-23.2 0 0-46.7 3.4-76.6 3.4-28.2 0-75.7-3.4-75.7-3.4-15.3-.9-17 21.5-1.7 23.2 0 0 16.5 1.7 33.2 2.6L465.2 537 363.3 274.6c18.5-.9 35.8-2.6 35.8-2.6 15.3-1.7 13.6-24.1-1.7-23.2 0 0-46.7 3.4-76.6 3.4-28.2 0-75.7-3.4-75.7-3.4-15.3-.9-17 21.5-1.7 23.2 0 0 16.5 1.7 33.2 2.6L129 780.8C65.5 704.9 34.6 606.8 34.6 500 34.6 242.9 242.9 34.6 500 34.6z"/></svg>'
    };
  }
  if (s.includes('elastic') || s.includes('database') || s.includes('search') || s.includes('sql') || s.includes('query')) {
    return {
      cls: 'cat-purple',
      svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="12" y2="17"></line></svg>'
    };
  }

  // Default: Puzzle piece
  return {
    cls: 'cat-purple',
    svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v4h1.5a2.5 2.5 0 0 1 0 5H2v4a2 2 0 0 0 2 2h4v-1.5a2.5 2.5 0 0 1 5 0V21h4a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"></path></svg>'
  };
}

// Format version display and identify fingerprints/hashes
function formatVersionDisplay(version) {
  if (!version) return { text: 'Version unknown', badge: 'Unknown', isHash: false };
  if (version === 'REST API') return { text: 'REST API detected', badge: 'REST API', isHash: false };

  // Check if version looks like a hash / fingerprint (e.g., vecf94842061bea03d54b or a hex string)
  if (version.length > 15 || /^[0-9a-f]{8,}$/i.test(version.replace(/^v/i, ''))) {
    return { text: `${version}`, badge: 'Unknown', isHash: true };
  }

  // Conventional semantic version
  const cleaned = version.startsWith('v') ? version : 'v' + version;
  return { text: cleaned, badge: 'Unknown', isHash: false };
}

// ==========================================
// 3. MAIN EXECUTION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  let reportData = null;
  let activeFilter = 'all';

  const els = {
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    refreshBtn: document.getElementById('refresh-btn'),
    copyBtn: document.getElementById('copy-btn'),
    downloadBtn: document.getElementById('download-txt-btn'),
    rawCodeBtn: document.getElementById('raw-code-btn'),
    toast: document.getElementById('toast'),
    rawModal: document.getElementById('raw-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalCopyBtn: document.getElementById('modal-copy-btn'),
    modalDownloadBtn: document.getElementById('modal-download-btn'),
    rawJsonContent: document.getElementById('raw-json-content'),
    pluginSearch: document.getElementById('plugin-search'),
    pluginsList: document.getElementById('plugins-list'),
    serverIp: document.getElementById('server-ip')
  };

  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(window.__toastTimeout);
    window.__toastTimeout = setTimeout(() => {
      els.toast.classList.add('hidden');
    }, 2200);
  }

  function getPreviewMockData() {
    return {
      isWP: true,
      url: 'https://www.nasa.gov/',
      protocol: 'https:',
      hostname: 'www.nasa.gov',
      version: '7.0.7',
      theme: 'nasa',
      themeVersion: '',
      serverSoftware: 'nginx',
      proxyCDN: 'None Detected',
      phpVersion: 'Unknown',
      cacheSystem: 'None Detected',
      cacheHeaderStatus: 'Unknown',
      ip: '192.0.66.108',
      dns: 'a12-64.akam.net, a5-66.akam.net',
      updateCheck: null,
      timestamp: new Date().toISOString(),
      plugins: [
        { slug: 'popup-maker', version: '1.18.4', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/popup-maker/assets/js/site.min.js?ver=1.18.4' },
        { slug: 'gravityforms', version: '2.8.6', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/gravityforms/js/gravityforms.min.js?ver=2.8.6' },
        { slug: 'nasa-blocks', version: '1.2.0', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/nasa-blocks/build/index.js?ver=1.2.0' },
        { slug: 'wp-parsely', version: 'vecf94842061bea03d54b', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/wp-parsely/build/loader.js?ver=vecf94842061bea03d54b' },
        { slug: 'accessibility-checker', version: '1.49.0', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/accessibility-checker/assets/js/frontend.js?ver=1.49.0' },
        { slug: 'accessibility-checker-pro', version: '1.49.0', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/accessibility-checker-pro/assets/js/frontend.js?ver=1.49.0' },
        { slug: 'gravity-forms-config', version: '1.0.0', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/gravity-forms-config/assets/script.js?ver=1.0.0' },
        { slug: 'elasticpress', version: '4.5.12', method: 'REST API Namespace (/wp-json/elasticpress/v1)', evidence: 'https://www.nasa.gov/wp-json/elasticpress/v1' },
        { slug: 'safe-svg', version: '2.2.4', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/safe-svg/assets/safe-svg.js?ver=2.2.4' },
        { slug: 'wordpress-seo', version: '22.8', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/wordpress-seo/js/dist/frontend.js?ver=22.8' },
        { slug: 'redirection', version: '5.4.2', method: 'REST API Namespace (/wp-json/redirection/v1)', evidence: 'https://www.nasa.gov/wp-json/redirection/v1' },
        { slug: 'tablepress', version: '2.3.1', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/tablepress/assets/js/tablepress.js?ver=2.3.1' },
        { slug: 'user-role-editor', version: '4.64.2', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/user-role-editor/js/ure.js?ver=4.64.2' },
        { slug: 'simple-custom-post-order', version: '2.5.7', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/simple-custom-post-order/js/scporder.js?ver=2.5.7' },
        { slug: 'wp-smushit', version: '3.16.3', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/wp-smushit/app/assets/js/smush.min.js?ver=3.16.3' },
        { slug: 'regenerate-thumbnails', version: '', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/regenerate-thumbnails/regenerate-thumbnails.js' },
        { slug: 'cookie-law-info', version: '3.2.4', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/cookie-law-info/public/js/cookie-law-info-public.js?ver=3.2.4' },
        { slug: 'duplicate-post', version: '4.5', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/duplicate-post/duplicate-post.js?ver=4.5' },
        { slug: 'wp-mail-smtp', version: '4.0.1', method: 'REST API Namespace (/wp-json/wp-mail-smtp/v1)', evidence: 'https://www.nasa.gov/wp-json/wp-mail-smtp/v1' },
        { slug: 'broken-link-checker', version: '2.3.0', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/broken-link-checker/core/blc.js?ver=2.3.0' },
        { slug: 'contact-form-7', version: '5.9.5', method: 'REST API Namespace (/wp-json/contact-form-7/v1)', evidence: 'https://www.nasa.gov/wp-json/contact-form-7/v1' },
        { slug: 'jetpack', version: '13.4.1', method: 'REST API Namespace (/wp-json/jetpack/v4)', evidence: 'https://www.nasa.gov/wp-json/jetpack/v4' },
        { slug: 'autoptimize', version: '3.1.11', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/autoptimize/classes/external/js/lazysizes.min.js?ver=3.1.11' },
        { slug: 'advanced-custom-fields-pro', version: '6.2.9', method: 'REST API Namespace (/wp-json/acf/v3)', evidence: 'https://www.nasa.gov/wp-json/acf/v3' },
        { slug: 'litespeed-cache', version: '6.2.0.1', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/litespeed-cache/assets/js/litespeed.js?ver=6.2.0.1' },
        { slug: 'updraftplus', version: '', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/updraftplus/admin.js' },
        { slug: 'wordfence', version: '7.11.5', method: 'REST API Namespace (/wp-json/wordfence/v1)', evidence: 'https://www.nasa.gov/wp-json/wordfence/v1' },
        { slug: 'better-search-replace', version: '', method: 'Frontend Asset', evidence: 'https://www.nasa.gov/wp-content/plugins/better-search-replace/assets/js/bsr.js' }
      ]
    };
  }

  function renderEmptyState(type, detail) {
    els.results.classList.add('hidden');
    els.loading.classList.remove('hidden');

    const scanLink = document.getElementById('header-scan-link');
    if (scanLink) {
      if (detail && detail.startsWith('http')) {
        scanLink.textContent = detail;
        scanLink.href = detail;
        scanLink.title = detail;
      } else if (detail) {
        scanLink.textContent = detail;
        scanLink.removeAttribute('href');
      } else {
        scanLink.textContent = type === 'internal_page' ? 'chrome://internal' : 'No target URL';
        scanLink.removeAttribute('href');
      }
    }

    if (type === 'internal_page') {
      els.loading.innerHTML = `
        <div class="not-wp-container">
          <div class="not-wp-card">
            <div class="not-wp-icon-badge">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-detected);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            </div>
            <h2 class="not-wp-title">Internal Browser Page</h2>
            <span class="conf-badge badge-detected">Restricted Page</span>
            <p class="not-wp-desc">
              Browser security policies prevent extensions from executing diagnostics on internal pages (such as <code>chrome://</code>, <code>edge://</code>, or New Tab).
            </p>
            <div class="not-wp-checklist">
              <div class="checklist-header">How to run diagnostics</div>
              <div class="check-item">
                <svg class="check-icon-info" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Navigate to any public website in a standard tab</span>
              </div>
              <div class="check-item">
                <svg class="check-icon-info" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Click the WP Stack Report icon in your toolbar</span>
              </div>
              <div class="check-item">
                <svg class="check-icon-info" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>WordPress core version, active theme &amp; plugin stack scan automatically</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (type === 'not_wordpress') {
      els.loading.innerHTML = `
        <div class="not-wp-container">
          <div class="not-wp-card">
            <div class="not-wp-icon-badge">
              <svg viewBox="0 0 1000 1000" class="wp-gray-svg"><path d="M500 0C223.8 0 0 223.8 0 500c0 276.2 223.8 500 500 500s500-223.8 500-500C1000 223.8 776.2 0 500 0zm0 34.6c257.1 0 465.4 208.3 465.4 465.4 0 94.7-28.3 182.7-76.7 256.4L640.4 274.6c18.5-.9 35.8-2.6 35.8-2.6 15.3-1.7 13.6-24.1-1.7-23.2 0 0-46.7 3.4-76.6 3.4-28.2 0-75.7-3.4-75.7-3.4-15.3-.9-17 21.5-1.7 23.2 0 0 16.5 1.7 33.2 2.6L465.2 537 363.3 274.6c18.5-.9 35.8-2.6 35.8-2.6 15.3-1.7 13.6-24.1-1.7-23.2 0 0-46.7 3.4-76.6 3.4-28.2 0-75.7-3.4-75.7-3.4-15.3-.9-17 21.5-1.7 23.2 0 0 16.5 1.7 33.2 2.6L129 780.8C65.5 704.9 34.6 606.8 34.6 500 34.6 242.9 242.9 34.6 500 34.6z"/></svg>
              <span class="not-wp-badge-sub">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              </span>
            </div>

            <h2 class="not-wp-title">No WordPress Detected</h2>
            <span class="conf-badge badge-neutral">Non-WordPress Site</span>
            
            <p class="not-wp-desc">
              We inspected the page headers, DOM signatures, and script paths, but found no evidence of an active WordPress installation.
            </p>

            <div class="not-wp-checklist">
              <div class="checklist-header">Diagnostic Checks Performed</div>
              <div class="check-item">
                <svg class="check-icon-no" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                <span>No <code>/wp-content/</code> or <code>/wp-includes/</code> asset paths</span>
              </div>
              <div class="check-item">
                <svg class="check-icon-no" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                <span>No WordPress generator meta tag identified</span>
              </div>
              <div class="check-item">
                <svg class="check-icon-no" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                <span>No public <code>/wp-json</code> REST API endpoints reachable</span>
              </div>
            </div>

            <div class="not-wp-actions">
              <button class="btn-rescan" id="rescan-empty-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                Rescan Page
              </button>
            </div>
          </div>
        </div>
      `;
      const rescanBtn = document.getElementById('rescan-empty-btn');
      if (rescanBtn) rescanBtn.addEventListener('click', runDiagnostics);
    } else {
      els.loading.innerHTML = `
        <div class="not-wp-container">
          <div class="not-wp-card">
            <div class="not-wp-icon-badge">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-issue);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 class="not-wp-title">Diagnostics Incomplete</h2>
            <span class="conf-badge badge-error">Inspection Issue</span>
            <p class="not-wp-desc">${detail || 'An unexpected issue occurred while analyzing this tab.'}</p>
            <div class="not-wp-actions">
              <button class="btn-rescan" id="rescan-empty-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                Retry Diagnostics
              </button>
            </div>
          </div>
        </div>
      `;
      const rescanBtn = document.getElementById('rescan-empty-btn');
      if (rescanBtn) rescanBtn.addEventListener('click', runDiagnostics);
    }
  }

  async function runDiagnostics() {
    reportData = null;
    els.loading.innerHTML = `
      <div class="spinner"></div>
      <p class="state-title">Running Diagnostics...</p>
      <span class="state-desc">Inspecting headers, DOM signatures &amp; REST API namespaces</span>
    `;
    els.loading.classList.remove('hidden');
    els.results.classList.add('hidden');
    els.refreshBtn.classList.add('spinning');

    let currentTabUrl = '';

    try {
      if (!window.chrome || !chrome.tabs || !chrome.tabs.query) {
        // Fallback for offline preview, screenshots, and direct browser inspection
        reportData = getPreviewMockData();
        renderDashboard();
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
        renderEmptyState('internal_page', tab ? tab.url : '');
        return;
      }

      currentTabUrl = tab.url;

      // Update header scan link immediately
      const scanLink = document.getElementById('header-scan-link');
      if (scanLink) {
        scanLink.textContent = tab.url;
        scanLink.href = tab.url;
        scanLink.title = tab.url;
      }

      const res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: detectWordPress });
      const data = res && res[0] ? res[0].result : null;

      if (!data || !data.isWP) {
        renderEmptyState('not_wordpress', tab.url);
        return;
      }

      const urlObj = new URL(tab.url);
      data.hostname = urlObj.hostname;

      // Async DNS & version fetches
      const [ip, ns, updateCheck] = await Promise.all([
        getHostIP(data.hostname),
        getNameservers(data.hostname),
        checkWPCoreUpdate(data.version)
      ]);

      data.ip = ip;
      data.dns = ns;
      data.updateCheck = updateCheck;
      data.timestamp = new Date().toISOString();

      reportData = data;
      renderDashboard();
    } catch (e) {
      const errMsg = e && e.message ? e.message : String(e);
      if (errMsg.includes('internal browser pages') || errMsg.includes('Cannot access a chrome://') || errMsg.includes('The extensions gallery cannot be scripted')) {
        renderEmptyState('internal_page', currentTabUrl);
      } else if (errMsg.includes('Not a WordPress site')) {
        renderEmptyState('not_wordpress', currentTabUrl);
      } else {
        renderEmptyState('error', errMsg);
      }
    } finally {
      els.refreshBtn.classList.remove('spinning');
    }
  }

  function renderDashboard() {
    els.loading.classList.add('hidden');
    els.results.classList.remove('hidden');
    const d = reportData;

    // Header Scan Link
    const scanLink = document.getElementById('header-scan-link');
    if (scanLink) {
      scanLink.textContent = d.url;
      scanLink.href = d.url;
      scanLink.title = d.url;
    }

    // Overview Bar
    document.getElementById('summary-status').textContent = 'Active';
    document.getElementById('summary-version').textContent = d.version !== 'Unknown' ? 'v' + d.version : 'Unknown';
    document.getElementById('summary-plugins').textContent = `${d.plugins.length} Active`;

    // Card 1: WordPress Environment & Theme
    const envUrl = document.getElementById('env-url');
    const envUrlText = document.getElementById('env-url-text');
    if (envUrl && envUrlText) {
      envUrl.href = d.url;
      envUrl.title = d.url;
      envUrlText.textContent = d.url;
    }

    const envHttps = document.getElementById('env-https');
    if (envHttps) {
      envHttps.innerHTML = d.protocol === 'https:'
        ? '<span class="conf-badge badge-confirmed"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Passed (TLS)</span>'
        : '<span class="conf-badge badge-error">Warning: HTTP</span>';
    }

    const themeLink = document.getElementById('theme-link');
    if (themeLink) {
      themeLink.textContent = d.theme;
      themeLink.href = `https://wordpress.org/themes/${d.theme}/`;
    }

    const themeVer = document.getElementById('theme-version');
    if (themeVer) {
      themeVer.textContent = d.themeVersion ? 'v' + d.themeVersion : 'Unknown';
      themeVer.className = 'conf-badge ' + (d.themeVersion ? 'badge-detected' : 'badge-neutral');
    }

    // Card 2: Server, Proxy & DNS
    const proxyEl = document.getElementById('server-proxy');
    if (proxyEl) {
      proxyEl.textContent = d.proxyCDN;
      proxyEl.className = 'conf-badge ' + (d.proxyCDN !== 'None Detected' ? 'badge-rest' : 'badge-neutral');
    }

    document.getElementById('server-software').textContent = d.serverSoftware;
    
    const phpEl = document.getElementById('server-php');
    if (phpEl) {
      phpEl.textContent = d.phpVersion;
      phpEl.className = 'conf-badge ' + (d.phpVersion !== 'Unknown' ? 'badge-detected' : 'badge-neutral');
    }

    const ipEl = document.getElementById('server-ip');
    if (ipEl) {
      ipEl.textContent = d.ip;
    }

    const dnsEl = document.getElementById('server-dns');
    if (dnsEl) {
      dnsEl.innerHTML = d.dns.replace(/, /g, '<br>');
    }

    const cacheEl = document.getElementById('cache-header-status');
    if (cacheEl) {
      cacheEl.textContent = d.cacheHeaderStatus;
      if (d.cacheSystem && d.cacheSystem !== 'None Detected') {
        cacheEl.title = `Detected Header: ${d.cacheSystem}`;
      } else {
        cacheEl.title = '';
      }
      cacheEl.className = 'conf-badge ' + (
        d.cacheHeaderStatus === 'HIT' ? 'badge-confirmed' :
        d.cacheHeaderStatus === 'MISS' ? 'badge-inferred' :
        d.cacheHeaderStatus === 'DYNAMIC' ? 'badge-detected' : 'badge-neutral'
      );
    }

    // Right Column: Plugin Inventory
    document.getElementById('plugins-count-header').textContent = d.plugins.length;
    const allCount = document.getElementById('filter-all-count');
    if (allCount) allCount.textContent = d.plugins.length;

    renderFilteredPlugins();
  }

  function renderFilteredPlugins() {
    if (!reportData) return;
    const list = els.pluginsList;
    list.innerHTML = '';

    const term = els.pluginSearch.value.toLowerCase().trim();

    let filtered = reportData.plugins.filter(p => {
      // Search match
      const slugMatch = p.slug.toLowerCase().includes(term);
      const verMatch = (p.version || '').toLowerCase().includes(term);
      const methodMatch = (p.method || '').toLowerCase().includes(term);
      const matchesSearch = !term || slugMatch || verMatch || methodMatch;

      // Filter chip match
      let matchesFilter = true;
      if (activeFilter === 'versioned') {
        matchesFilter = p.version && p.version !== 'Unknown' && p.version !== 'REST API';
      } else if (activeFilter === 'unknown') {
        matchesFilter = !p.version || p.version === 'Unknown';
      } else if (activeFilter === 'rest') {
        matchesFilter = p.version === 'REST API' || (p.method && p.method.includes('REST'));
      }

      return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
      list.innerHTML = `<li class="empty-state">No plugins matching current search &amp; filter</li>`;
      return;
    }

    filtered.forEach(p => {
      const verInfo = formatVersionDisplay(p.version);
      const cat = getPluginCategoryInfo(p.slug);
      const isRest = p.version === 'REST API' || (p.method && p.method.includes('REST'));
      const badgeCls = isRest ? 'badge-rest' : 'badge-neutral';
      const badgeText = isRest ? 'REST API' : 'Unknown';

      const li = document.createElement('li');
      li.className = 'plugin-row-item';

      li.innerHTML = `
        <div class="plugin-row-header" role="button" tabindex="0" aria-expanded="false">
          <div class="plugin-row-left">
            <div class="plugin-cat-icon ${cat.cls}">
              ${cat.svg}
            </div>
            <div class="plugin-names-wrap">
              <span class="plugin-slug" title="${p.slug}">${p.slug}</span>
              <span class="plugin-ver-sub">${verInfo.text}</span>
            </div>
          </div>
          <div class="plugin-row-right">
            <span class="conf-badge ${badgeCls}">${badgeText}</span>
            <svg class="row-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
        <div class="plugin-row-details">
          <div class="detail-line"><span class="detail-lbl">Detection Method:</span> ${p.method || 'Frontend Asset Inspection'}</div>
          ${p.evidence ? `<div class="detail-line"><span class="detail-lbl">Evidence / Path:</span> <span class="mono">${p.evidence}</span></div>` : ''}
          <div class="detail-line">
            <a href="https://wordpress.org/plugins/${p.slug}/" class="detail-link" target="_blank" rel="noopener noreferrer">
              Open on WordPress.org
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      `;

      // Expand / Collapse interaction
      const rowHeader = li.querySelector('.plugin-row-header');
      rowHeader.addEventListener('click', () => {
        const isOpen = li.classList.toggle('open');
        rowHeader.setAttribute('aria-expanded', isOpen);
      });
      rowHeader.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const isOpen = li.classList.toggle('open');
          rowHeader.setAttribute('aria-expanded', isOpen);
        }
      });

      list.appendChild(li);
    });
  }

  // Filter Chips Click Handling
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      renderFilteredPlugins();
    });
  });

  // Search Input Handling
  els.pluginSearch.addEventListener('input', () => {
    renderFilteredPlugins();
  });

  // Click to copy Host IP
  if (els.serverIp) {
    els.serverIp.addEventListener('click', () => {
      const ip = els.serverIp.textContent;
      if (ip && ip !== 'Unknown') {
        navigator.clipboard.writeText(ip).then(() => {
          showToast(`Copied IP: ${ip}`);
        });
      }
    });
  }

  // Plain Text Report Generator
  function generateTXT() {
    const d = reportData;
    if (!d) return '';
    
    return `# WordPress Stack Report
Generated: ${d.timestamp}
Site URL: ${d.url}

## ENVIRONMENT
WordPress Core: ${d.version}
HTTPS: ${d.protocol === 'https:' ? 'Passed (TLS)' : 'Warning: HTTP'}
Active Theme: ${d.theme} (${d.themeVersion ? 'v' + d.themeVersion : 'Unknown'})
Environment Type: Frontend Extracted

## SERVER, PROXY & DNS
Proxy / CDN: ${d.proxyCDN}
Web Server: ${d.serverSoftware}
PHP Version: ${d.phpVersion}
Host IP: ${d.ip}
Nameservers: ${d.dns}
Cache Status: ${d.cacheHeaderStatus}

## DETECTED PLUGINS (${d.plugins.length})
${d.plugins.map(p => `- ${p.slug} (${p.version || 'Version unknown'}) [${p.method || 'Frontend'}]`).join('\n')}
`;
  }

  // Actions
  els.refreshBtn.addEventListener('click', runDiagnostics);

  els.copyBtn.addEventListener('click', () => {
    if (!reportData) return;
    navigator.clipboard.writeText(generateTXT()).then(() => {
      showToast('Support summary copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy report');
    });
  });

  els.downloadBtn.addEventListener('click', () => {
    if (!reportData) return;
    const blob = new Blob([generateTXT()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wp-stack-report-${reportData.hostname || 'site'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded report TXT');
  });

  // Raw Diagnostic Modal Handlers
  function openRawModal() {
    if (!reportData) return;
    els.rawJsonContent.textContent = JSON.stringify(reportData, null, 2);
    els.rawModal.classList.remove('hidden');
  }

  function closeRawModal() {
    els.rawModal.classList.add('hidden');
  }

  els.rawCodeBtn.addEventListener('click', openRawModal);
  els.modalCloseBtn.addEventListener('click', closeRawModal);
  els.rawModal.addEventListener('click', (e) => {
    if (e.target === els.rawModal) closeRawModal();
  });

  els.modalCopyBtn.addEventListener('click', () => {
    if (!reportData) return;
    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2)).then(() => {
      showToast('Raw JSON copied to clipboard!');
    });
  });

  els.modalDownloadBtn.addEventListener('click', () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wp-stack-report-${reportData.hostname || 'site'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded JSON report');
  });

  runDiagnostics();
});
