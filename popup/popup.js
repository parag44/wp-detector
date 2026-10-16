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
      if (!pluginsMap.has(slug) || (pVer && !pluginsMap.get(slug))) {
        pluginsMap.set(slug, pVer);
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
                 pluginsMap.set(prefix, 'REST API');
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
    plugins: Array.from(pluginsMap.entries()).map(([slug, ver]) => ({ slug, version: ver }))
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

// ==========================================
// 3. MAIN EXECUTION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  let reportData = null;
  
  const els = {
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    refreshBtn: document.getElementById('refresh-btn'),
    copyBtn: document.getElementById('copy-btn'),
    downloadBtn: document.getElementById('download-txt-btn'),
    exportBtn: document.getElementById('export-json-btn'),
    toast: document.getElementById('toast')
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

  async function runDiagnostics() {
    els.loading.classList.remove('hidden');
    els.results.classList.add('hidden');
    els.refreshBtn.classList.add('spinning');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) throw new Error('Cannot run on internal browser pages.');
      
      const res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: detectWordPress });
      const data = res[0].result;
      
      if (!data.isWP) throw new Error('Not a WordPress site or signatures hidden.');

      const urlObj = new URL(tab.url);
      data.hostname = urlObj.hostname;
      
      // Async fetches
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
      els.loading.innerHTML = `<div class="state-card"><p class="state-title" style="color:var(--color-error);">${e.message}</p></div>`;
    } finally {
      els.refreshBtn.classList.remove('spinning');
    }
  }

  function renderDashboard() {
    els.loading.classList.add('hidden');
    els.results.classList.remove('hidden');
    const d = reportData;

    // Summary Cards
    document.getElementById('summary-status').innerHTML = `<span class="status-pill success"><span class="pulse-dot"></span> Active</span>`;
    document.getElementById('summary-version').textContent = d.version !== 'Unknown' ? 'v' + d.version : 'Unknown';
    document.getElementById('summary-plugins').textContent = `${d.plugins.length} Active`;

    // Env & Theme
    const envUrlEl = document.getElementById('env-url');
    envUrlEl.textContent = d.url;
    envUrlEl.title = d.url;
    
    document.getElementById('env-https').innerHTML = d.protocol === 'https:' 
      ? '<span class="badge success">Passed (TLS)</span>' 
      : '<span class="badge error">Warning: HTTP</span>';
      
    const themeLink = document.getElementById('theme-link');
    themeLink.textContent = d.theme;
    themeLink.href = `https://wordpress.org/themes/${d.theme}/`;
    
    document.getElementById('theme-version').textContent = d.themeVersion ? 'v' + d.themeVersion : 'Unknown';

    // Server & DNS
    const proxyBadge = document.getElementById('server-proxy');
    proxyBadge.textContent = d.proxyCDN;
    proxyBadge.className = 'info-val badge ' + (d.proxyCDN !== 'None Detected' ? 'purple' : '');
    
    document.getElementById('server-software').textContent = d.serverSoftware;
    document.getElementById('server-php').textContent = d.phpVersion;
    document.getElementById('server-ip').textContent = d.ip;
    document.getElementById('server-dns').innerHTML = d.dns.replace(/, /g, '<br>');

    // Cache
    const ch = document.getElementById('cache-header-status');
    ch.textContent = d.cacheHeaderStatus;
    ch.className = 'info-val badge ' + (
      d.cacheHeaderStatus === 'HIT' ? 'success' : 
      d.cacheHeaderStatus === 'MISS' ? 'error' : 
      d.cacheHeaderStatus === 'Unknown' ? '' : 'warning'
    );
    document.getElementById('cache-system').textContent = d.cacheSystem;

    // Plugins
    document.getElementById('plugins-count-header').textContent = d.plugins.length;
    renderPluginsList(d.plugins);
  }

  function renderPluginsList(plugins) {
    const list = document.getElementById('plugins-list');
    list.innerHTML = '';
    if (plugins.length === 0) {
      list.innerHTML = '<li class="empty-state">No plugins detected</li>';
      return;
    }
    plugins.forEach(p => {
      const isRest = p.version === 'REST API';
      const badgeClass = isRest ? 'badge purple' : (p.version ? 'badge' : 'badge muted');
      const verText = p.version ? (isRest ? 'REST API' : 'v' + p.version) : 'Unknown';
      list.innerHTML += `<li><a href="https://wordpress.org/plugins/${p.slug}/" target="_blank" rel="noopener noreferrer">${p.slug}</a> <span class="${badgeClass}">${verText}</span></li>`;
    });
  }

  document.getElementById('plugin-search').addEventListener('input', (e) => {
    if (!reportData) return;
    const term = e.target.value.toLowerCase().trim();
    const filtered = reportData.plugins.filter(p => p.slug.toLowerCase().includes(term));
    if (filtered.length === 0) {
      document.getElementById('plugins-list').innerHTML = `<li class="empty-state">No plugins matching "${term}"</li>`;
    } else {
      renderPluginsList(filtered);
    }
  });

  function generateTXT() {
    const d = reportData;
    
    return `# WordPress Stack Report
Generated: ${d.timestamp}
Report Mode: Full Technical Report

## ENVIRONMENT
WordPress Version: ${d.version}
Site URL: ${d.url}
HTTPS: ${d.protocol === 'https:' ? 'Passed' : 'Failed'}
Database: Unknown (Frontend context)

## THEME
Active Theme: ${d.theme}
Version: ${d.themeVersion || 'Unknown'}

## PLUGINS
Total Detected: ${d.plugins.length}
${d.plugins.map(p => `- ${p.slug} (${p.version ? (p.version === 'REST API' ? 'REST API' : 'v' + p.version) : 'Unknown'})`).join('\n')}

## SERVER & HOSTING
Web Server: ${d.serverSoftware}
PHP Version: ${d.phpVersion}
Proxy / CDN: ${d.proxyCDN}
Host IP: ${d.ip}
Nameservers: ${d.dns}

## CACHING
Cache Header Status: ${d.cacheHeaderStatus}
Detected Cache Engine: ${d.cacheSystem}
Persistent Object Cache: Unknown (Frontend context)
`;
  }

  els.refreshBtn.addEventListener('click', runDiagnostics);

  els.copyBtn.addEventListener('click', () => {
    if (!reportData) return;
    navigator.clipboard.writeText(generateTXT()).then(() => {
      showToast('Report copied to clipboard!');
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
    showToast('Downloaded text report');
  });

  els.exportBtn.addEventListener('click', () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wp-stack-report-${reportData.hostname || 'site'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported JSON data');
  });

  runDiagnostics();
});
