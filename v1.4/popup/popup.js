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

  // --- Signal 4 & 5: /wp-content/ and /wp-includes/ Asset Scans (Layer 1) ---
  const elements = document.querySelectorAll('link[href], script[src], img[src], source[srcset]');
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

    // Active Theme Extraction from external URLs
    const themeMatch = url.match(/\/wp-content\/themes\/([^\/]+)\//i);
    if (themeMatch) {
      const detectedTheme = themeMatch[1].toLowerCase();
      if (!['plugins', 'uploads', 'themes'].includes(detectedTheme)) {
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

  // --- MULTI-LAYER PLUGIN SCANNER (INLINE SCRIPTS, LOCALIZED JS & INLINE CSS) ---
  // Many modern WordPress plugins (such as Advanced Accordion Block, WooCommerce, Elementor,
  // Tutor LMS, etc.) localize data via wp_localize_script() into inline <script> tags
  // (e.g. <script id="jquery-core-js-extra"> var aagb_local_object = {"assets": ".../advanced-accordion-block/assets/"} </script>)
  // Scanning inline script textContent ensures these plugins are always detected even without raw script[src] files.
  const inlineScripts = document.querySelectorAll('script');
  inlineScripts.forEach(scriptEl => {
    const text = scriptEl.textContent;
    if (!text || !text.includes('/wp-content/plugins/')) return;

    const pluginMatches = text.matchAll(/\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\//gi);
    for (const match of pluginMatches) {
      const slug = match[1].toLowerCase();
      if (!['plugins', 'uploads', 'themes', 'mu-plugins', 'core'].includes(slug)) {
        isWP = true;
        wpContentCount++;
        const snippetIndex = Math.max(0, match.index - 35);
        const snippet = text.substring(snippetIndex, snippetIndex + 140).replace(/\s+/g, ' ').trim();
        const existing = pluginsMap.get(slug);
        if (!existing) {
          pluginsMap.set(slug, {
            slug,
            version: '',
            method: 'Inline Script Data (wp_localize_script)',
            sourceTag: 'DOM',
            evidence: scriptEl.id ? `<script id="${scriptEl.id}"> ...${snippet}...` : snippet
          });
        }
      }
    }
  });

  // Also scan all inline <style> tags for plugin asset paths (e.g. @font-face, SVG, background URLs)
  const inlineStyleBlocks = document.querySelectorAll('style');
  inlineStyleBlocks.forEach(styleEl => {
    const text = styleEl.textContent;
    if (!text || !text.includes('/wp-content/plugins/')) return;

    const pluginMatches = text.matchAll(/\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\//gi);
    for (const match of pluginMatches) {
      const slug = match[1].toLowerCase();
      if (!['plugins', 'uploads', 'themes', 'mu-plugins', 'core'].includes(slug)) {
        isWP = true;
        const existing = pluginsMap.get(slug);
        if (!existing) {
          const snippetIndex = Math.max(0, match.index - 25);
          const snippet = text.substring(snippetIndex, snippetIndex + 120).replace(/\s+/g, ' ').trim();
          pluginsMap.set(slug, {
            slug,
            version: '',
            method: 'Inlined CSS Asset',
            sourceTag: 'DOM',
            evidence: styleEl.id ? `<style id="${styleEl.id}"> ...${snippet}...` : snippet
          });
        }
      }
    }
  });

  // Scan inlined style and script ID handles for block signatures (e.g. id="aagb-separate-accordion-css")
  const idElements = document.querySelectorAll('style[id], script[id]');
  idElements.forEach(el => {
    const id = (el.id || '').toLowerCase();
    if (id.startsWith('aagb-') || id.includes('advanced-accordion')) {
      if (!pluginsMap.has('advanced-accordion-block')) {
        pluginsMap.set('advanced-accordion-block', {
          slug: 'advanced-accordion-block',
          version: '',
          method: 'Block Asset Handle',
          sourceTag: 'DOM',
          evidence: `<${el.tagName.toLowerCase()} id="${el.id}">`
        });
      }
    }
  });

  // --- MULTI-LAYER CASCADE THEME DETECTION (WPOPTIC-STYLE) ---

  // Layer 2: <body> Class Inspection (Standard for modern FSE & Block Themes)
  // WordPress core get_body_class() injects "wp-theme-[slug]" or "theme-[slug]"
  if (document.body && document.body.className) {
    const classTokens = document.body.className.split(/\s+/);
    for (const token of classTokens) {
      const childMatch = token.match(/^wp-child-theme-([a-zA-Z0-9_-]+)$/i);
      if (childMatch) {
        const candidate = childMatch[1].toLowerCase();
        if (theme === 'Unknown') {
          theme = candidate;
        } else if (theme !== candidate) {
          isChildTheme = true;
          parentTheme = theme;
          theme = candidate;
        }
        isWP = true;
      }

      const bodyThemeMatch = token.match(/^(?:wp-theme|theme)-([a-zA-Z0-9_-]+)$/i);
      if (bodyThemeMatch) {
        const candidate = bodyThemeMatch[1].toLowerCase();
        if (!['dark', 'light', 'default', 'custom', 'preview', 'editor', 'mode', 'active', 'ui'].includes(candidate)) {
          if (theme === 'Unknown') {
            theme = candidate;
            isWP = true;
          }
        }
      }
    }
  }

  // Layer 3: Inlined <style> ID Handles
  // When themes use wp_style_add_data( $handle, 'path', ... ) or inline stylesheets,
  // WordPress outputs <style id="[handle]-style-inline-css"> or <style id="[handle]-style-css">.
  if (theme === 'Unknown') {
    const styleTags = document.querySelectorAll('style[id]');
    for (let i = 0; i < styleTags.length; i++) {
      const id = styleTags[i].id;
      if (!id) continue;
      const handleMatch = id.match(/^([a-zA-Z0-9_-]+)-(?:style|theme)(?:-inline)?-css$/i);
      if (handleMatch) {
        const candidate = handleMatch[1].toLowerCase();
        if (!['global-styles', 'wp-block-library', 'classic-theme', 'core', 'wp', 'block-library'].includes(candidate)) {
          theme = candidate;
          isWP = true;
          break;
        }
      }
    }
  }

  // Layer 4: Text Content of Inlined <style> Blocks (e.g. bundled @font-face or asset URLs)
  if (theme === 'Unknown') {
    const styleTags = document.querySelectorAll('style');
    for (let i = 0; i < styleTags.length && i < 25; i++) {
      const text = styleTags[i].textContent;
      if (text && text.includes('/wp-content/themes/')) {
        const match = text.match(/\/wp-content\/themes\/([^\/'"\\)]+)\//i);
        if (match) {
          const candidate = match[1].toLowerCase();
          if (!['plugins', 'uploads', 'themes'].includes(candidate)) {
            theme = candidate;
            isWP = true;
            break;
          }
        }
      }
    }
  }

  // Layer 5: Direct style.css Inspection & Header Extraction (WPOPTIC / Theme Standard)
  // Calls [origin]/wp-content/themes/[slug]/style.css to parse the official WordPress
  // header comment (Theme Name, Version, Author, Author URI, Description, Template).
  let themeName = '';
  let themeDescription = '';
  let themeAuthorUri = '';

  if (theme !== 'Unknown') {
    try {
      const styleUrl = `${origin}/wp-content/themes/${theme}/style.css`;
      const styleRes = await fetch(styleUrl);
      if (styleRes.ok) {
        const cssText = await styleRes.text();
        if (cssText) {
          const nameMatch = cssText.match(/Theme Name:\s*([^\r\n*]+)/i);
          const verMatch = cssText.match(/Version:\s*([^\r\n*]+)/i);
          const authorMatch = cssText.match(/Author:\s*([^\r\n*]+)/i);
          const authorUriMatch = cssText.match(/Author URI:\s*([^\r\n*]+)/i);
          const templateMatch = cssText.match(/Template:\s*([^\r\n*]+)/i);
          const descMatch = cssText.match(/Description:\s*([^\r\n*]+)/i);

          if (nameMatch) themeName = nameMatch[1].trim();
          if (verMatch && (!themeVersion || verMatch[1] !== version)) themeVersion = verMatch[1].trim();
          if (authorMatch && !themeAuthor) themeAuthor = authorMatch[1].trim().replace(/<[^>]+>/g, '');
          if (authorUriMatch) themeAuthorUri = authorUriMatch[1].trim();
          if (templateMatch && !isChildTheme) {
            isChildTheme = true;
            parentTheme = templateMatch[1].trim();
          }
          if (descMatch) themeDescription = descMatch[1].trim();
          if (!themeStylesheet) themeStylesheet = styleUrl;
        }
      }
    } catch (e) {}
  }

  // If theme was found via inlined block theme signals or style.css, ensure wpContent signal reflects it
  if (theme !== 'Unknown' && !signals.wpContent.detected) {
    signals.wpContent.detected = true;
    signals.wpContent.detail = `Theme detected (${themeName || theme})`;
  }

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
    if (s.includes('lms') || s.includes('tutor') || s.includes('course') || s.includes('learn') || s.includes('academy') || s.includes('sensei') || s.includes('lifter')) return 'LMS';
    if (s.includes('form') || s === 'contact-form-7' || s === 'gravityforms' || s === 'wpforms') return 'Forms';
    if (s.includes('seo') || s.includes('schema') || s === 'wordpress-seo') return 'SEO';
    if (s.includes('cache') || s.includes('optimize') || s.includes('rocket') || s === 'autoptimize') return 'Cache';
    if (s.includes('security') || s.includes('fence') || s.includes('firewall') || s === 'wordfence') return 'Security';
    if (s.includes('woo') || s.includes('shop') || s.includes('cart')) return 'E-Commerce';
    if (s.includes('elementor') || s.includes('builder') || s.includes('blocks') || s.includes('block') || s.includes('gutenberg') || s.includes('accordion')) return 'Blocks';
    if (s.includes('analytics') || s.includes('parsely') || s.includes('pixel') || s.includes('track')) return 'Analytics';
    if (s.includes('access') || s.includes('wcag') || s.includes('ada')) return 'Accessibility';
    return 'Plugin';
  }

  function formatPluginName(slug) {
    const knownNames = {
      'tutor': 'Tutor LMS',
      'tutor-pro': 'Tutor LMS Pro',
      'advanced-accordion-block': 'Advanced Accordion Gutenberg Block',
      'wordpress-seo': 'Yoast SEO',
      'wordpress-seo-premium': 'Yoast SEO Premium',
      'contact-form-7': 'Contact Form 7',
      'woocommerce': 'WooCommerce',
      'wp-optimize': 'WP-Optimize',
      'litespeed-cache': 'LiteSpeed Cache',
      'wp-super-cache': 'WP Super Cache',
      'w3-total-cache': 'W3 Total Cache',
      'seo-by-rank-math': 'Rank Math SEO',
      'seo-by-rank-math-pro': 'Rank Math SEO Pro',
      'gravityforms': 'Gravity Forms',
      'popup-maker': 'Popup Maker',
      'wp-parsely': 'Parse.ly Analytics',
      'elementor': 'Elementor Website Builder',
      'elementor-pro': 'Elementor Pro',
      'advanced-custom-fields': 'Advanced Custom Fields (ACF)',
      'advanced-custom-fields-pro': 'Advanced Custom Fields Pro',
      'acf-pro': 'Advanced Custom Fields Pro',
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
    themeName: themeName || '',
    themeVersion,
    themeAuthor,
    themeAuthorUri: themeAuthorUri || '',
    themeDescription: themeDescription || '',
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
    if (tabId === 'plugins') {
      tabId = 'overview';
      setTimeout(() => {
        document.getElementById('plugins-section')?.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('plugin-search')?.focus();
      }, 50);
    }
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
  document.getElementById('card-click-plugins')?.addEventListener('click', () => {
    switchTab('overview');
    document.getElementById('plugins-section')?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('plugin-search')?.focus();
  });
  document.getElementById('card-click-theme')?.addEventListener('click', () => switchTab('theme'));
  document.getElementById('card-click-signals')?.addEventListener('click', () => switchTab('signals'));
  document.getElementById('btn-goto-theme')?.addEventListener('click', () => switchTab('theme'));
  document.getElementById('btn-goto-hosting')?.addEventListener('click', () => switchTab('hosting'));

  // Optional hash-based tab activation (e.g. #plugins, #theme)
  const initialHash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (['overview', 'plugins', 'theme', 'hosting', 'signals'].includes(initialHash)) {
    switchTab(initialHash);
  }

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
        { slug: 'tutor', name: 'Tutor LMS – eLearning and online course solution', version: '4.2.0', category: 'LMS', sourceTag: 'URL', evidence: 'http://tutorlms.wp/wp-content/plugins/tutor/assets/js/tutor.front.js' },
        { slug: 'tutor-pro', name: 'Tutor LMS Pro', version: '4.2.0', category: 'LMS', sourceTag: 'URL', evidence: 'http://tutorlms.wp/wp-content/plugins/tutor-pro/assets/js/tutor-pro.js' },
        { slug: 'kirki', name: 'Kirki Customizer Framework', version: '5.1.0', category: 'Framework', sourceTag: 'API', evidence: 'http://tutorlms.wp/wp-json/kirki/v1' },
        { slug: 'accessibility-checker', name: 'Equalize Digital Accessibility Checker – WCAG, ADA, Section 508', version: '1.51.1', category: 'Accessibility', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/accessibility-checker/assets/js/frontend.js' },
        { slug: 'gravityforms', name: 'Gravityforms', version: '2.8.6', category: 'Forms', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/gravityforms/js/gravityforms.min.js' },
        { slug: 'gravity-forms-config', name: 'Gravity Forms Config', version: '', category: 'Forms', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/gravity-forms-config/config.js' },
        { slug: 'nasa-blocks', name: 'Nasa Blocks', version: '', category: 'Blocks', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/nasa-blocks/build/index.js' },
        { slug: 'nasa-hds-core-setup', name: 'Nasa Hds Core Setup', version: '', category: 'Plugin', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/nasa-hds-core-setup/setup.js' },
        { slug: 'popup-maker', name: 'Popup Maker – Boost Sales, Conversions, Optins, Popups', version: '1.25.0', category: 'Forms', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/popup-maker/assets/js/site.min.js' },
        { slug: 'schema-pro', name: 'Schema Pro', version: 'REST API', category: 'Schema', sourceTag: 'DOM', evidence: 'https://www.nasa.gov/wp-json/schema-pro/v1' },
        { slug: 'seo-by-rank-math', name: 'Rank Math SEO – AI SEO Tools to Dominate SEO Rankings', version: '1.0.280', category: 'SEO', sourceTag: 'API', evidence: 'https://www.nasa.gov/wp-json/rankmath/v1' },
        { slug: 'wp-parsely', name: 'Parse.ly Analytics', version: '3.14.0', category: 'Analytics', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/wp-parsely/build/loader.js' },
        { slug: 'litespeed-cache', name: 'LiteSpeed Cache', version: '6.2.0.1', category: 'Cache', sourceTag: 'HEADER', evidence: 'x-litespeed-cache: hit' },
        { slug: 'wp-optimize', name: 'WP-Optimize', version: '3.7.0', category: 'Cache', sourceTag: 'DOM', evidence: '<!-- Cached by WP-Optimize -->' },
        { slug: 'wordfence', name: 'Wordfence Security', version: '7.11.5', category: 'Security', sourceTag: 'API', evidence: 'https://www.nasa.gov/wp-json/wordfence/v1' },
        { slug: 'safe-svg', name: 'Safe SVG', version: '2.2.4', category: 'Plugin', sourceTag: 'URL', evidence: 'https://www.nasa.gov/wp-content/plugins/safe-svg/assets/safe-svg.js' },
        { slug: 'contact-form-7', name: 'Contact Form 7', version: '5.9.5', category: 'Forms', sourceTag: 'API', evidence: 'https://www.nasa.gov/wp-json/contact-form-7/v1' }
      ]
    };
  }

  // --- Empty / Non-WordPress State Handler ---
  function showEmptyState(title, desc, pillText = 'No Signatures', isInternal = false) {
    els.loading.classList.add('hidden');
    els.empty.classList.remove('hidden');

    // Hide all tab content panes completely
    els.panes.forEach(p => {
      p.classList.add('hidden');
      p.classList.remove('active');
    });

    // Hide the entire tab navigation bar
    const navTabs = document.querySelector('.nav-tabs');
    if (navTabs) navTabs.classList.add('hidden');

    // Dim and disable action buttons (copy/export)
    if (els.copyBtn) {
      els.copyBtn.style.opacity = '0.35';
      els.copyBtn.style.pointerEvents = 'none';
    }
    if (els.exportBtn) {
      els.exportBtn.style.opacity = '0.35';
      els.exportBtn.style.pointerEvents = 'none';
    }

    // Update live quick status badges in header
    const pillWp = document.getElementById('pill-wp-status');
    const pillWpText = document.getElementById('pill-wp-text');
    const pillVer = document.getElementById('pill-core-version');
    const pillGut = document.getElementById('pill-gutenberg');
    const pillApi = document.getElementById('pill-rest-api');

    if (pillWp) {
      pillWp.className = 'status-pill pill-neutral';
      if (pillWpText) pillWpText.textContent = isInternal ? 'BROWSER PAGE' : 'NON-WORDPRESS';
    }
    if (pillVer) pillVer.classList.add('hidden');
    if (pillGut) pillGut.classList.add('hidden');
    if (pillApi) pillApi.classList.add('hidden');

    // Update empty card content
    const emptyTitle = document.getElementById('empty-title');
    const emptyDesc = document.getElementById('empty-desc');
    const emptyPill = document.getElementById('empty-pill');
    const emptyChecklist = document.getElementById('empty-checklist');

    if (emptyTitle) emptyTitle.textContent = title;
    if (emptyDesc) emptyDesc.textContent = desc;
    if (emptyPill) emptyPill.textContent = pillText;
    if (emptyChecklist) {
      if (isInternal) {
        emptyChecklist.classList.add('hidden');
      } else {
        emptyChecklist.classList.remove('hidden');
      }
    }
  }

  // --- Render Diagnostics Dashboard ---
  function renderDashboard(data) {
    els.loading.classList.add('hidden');
    els.empty.classList.add('hidden');

    // Unhide the tab navigation bar
    const navTabs = document.querySelector('.nav-tabs');
    if (navTabs) navTabs.classList.remove('hidden');

    // Re-enable copy & export buttons
    if (els.copyBtn) {
      els.copyBtn.style.opacity = '1';
      els.copyBtn.style.pointerEvents = 'auto';
    }
    if (els.exportBtn) {
      els.exportBtn.style.opacity = '1';
      els.exportBtn.style.pointerEvents = 'auto';
    }

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
    const pillWp = document.getElementById('pill-wp-status');
    const pillWpText = document.getElementById('pill-wp-text');
    if (pillWp) pillWp.className = 'status-pill status-wp';
    if (pillWpText) pillWpText.textContent = 'WORDPRESS';

    const pillVer = document.getElementById('pill-core-version');
    if (pillVer) {
      pillVer.classList.remove('hidden');
      pillVer.textContent = data.version !== 'Unknown' ? `v${data.version}` : 'Version Hidden';
    }

    const gutenbergPill = document.getElementById('pill-gutenberg');
    if (data.hasGutenberg) gutenbergPill.classList.remove('hidden');
    else gutenbergPill.classList.add('hidden');

    const restPill = document.getElementById('pill-rest-api');
    if (data.signals.api.detected) restPill.classList.remove('hidden');
    else restPill.classList.add('hidden');

    // Activate Overview tab
    switchTab('overview');

    // Overview 4 Metric Cards
    document.getElementById('metric-confidence').textContent = data.confidence;
    document.getElementById('metric-plugins').textContent = data.plugins.length;
    const ovPlCount = document.getElementById('overview-plugins-count');
    if (ovPlCount) ovPlCount.textContent = data.plugins.length;
    const tabPlCount = document.getElementById('tab-plugins-count');
    if (tabPlCount) tabPlCount.textContent = data.plugins.length;
    const chipAll = document.getElementById('chip-all-count');
    if (chipAll) chipAll.textContent = data.plugins.length;
    const displayTheme = data.themeName || formatThemeName(data.theme);
    document.getElementById('metric-theme-name').textContent = data.theme !== 'Unknown' ? displayTheme : 'Theme';
    document.getElementById('metric-signals-count').textContent = `${data.signalScore} / 7`;
    document.getElementById('tab-signals-score').textContent = `${data.signalScore}/7`;
    document.getElementById('signals-score-circle').textContent = data.signalScore;

    // Overview Theme Summary Card
    document.getElementById('overview-theme-name').textContent = data.theme !== 'Unknown' ? displayTheme : 'Active Theme';
    document.getElementById('overview-theme-version').textContent = data.themeVersion ? `v${data.themeVersion}` : 'Active';
    document.getElementById('overview-theme-author').textContent = data.themeAuthor ? `By ${data.themeAuthor}` : `Slug: ${data.theme}`;

    // Theme Thumbnail in Overview
    const themeCandidates = getThemeScreenshotCandidates(data);
    const overviewThumb = document.getElementById('overview-theme-thumb');
    const overviewPlaceholder = document.getElementById('overview-theme-placeholder');
    loadThemeScreenshot(overviewThumb, overviewPlaceholder, themeCandidates);

    // Overview Server & Stack Table (safeguarded if present)
    const ovHost = document.getElementById('overview-hosting');
    if (ovHost) ovHost.textContent = data.proxyCDN !== 'None Detected' ? data.proxyCDN : (data.isp || 'Self-Hosted');
    const ovServer = document.getElementById('overview-server');
    if (ovServer) ovServer.textContent = data.serverSoftware;
    const cacheBadge = document.getElementById('overview-cache-badge');
    if (cacheBadge) {
      cacheBadge.textContent = data.cacheSystem !== 'None Detected' ? `${data.cacheSystem}: ${data.cacheHeaderStatus}` : data.cacheHeaderStatus;
      cacheBadge.className = 'status-pill ' + (data.cacheHeaderStatus === 'HIT' ? 'pill-green' : data.cacheHeaderStatus === 'BYPASS' ? 'pill-amber' : 'pill-neutral');
    }
    const ovBuilder = document.getElementById('overview-builder');
    if (ovBuilder) ovBuilder.textContent = data.pageBuilder;
    const ipEl = document.getElementById('overview-ip');
    if (ipEl) ipEl.textContent = data.ip;

    // --- Tab 3: Theme Hero Card ---
    document.getElementById('theme-big-title').textContent = data.theme !== 'Unknown' ? displayTheme : 'Custom Theme';
    document.getElementById('theme-pill-slug').textContent = `Slug: ${data.theme}`;
    document.getElementById('theme-pill-ver').textContent = data.themeVersion ? `v${data.themeVersion}` : 'Version unknown';
    if (data.isChildTheme) {
      document.getElementById('theme-pill-child').classList.remove('hidden');
    }
    document.getElementById('theme-spec-name').textContent = displayTheme;
    document.getElementById('theme-spec-slug').textContent = data.theme;
    document.getElementById('theme-spec-version').textContent = data.themeVersion || 'Not exposed';
    document.getElementById('theme-spec-author').textContent = data.themeAuthor || 'Author not detected';
    const fallbackNameEl = document.getElementById('theme-fallback-name');
    if (fallbackNameEl) fallbackNameEl.textContent = displayTheme;

    // Asynchronously resolve official Theme metadata from local site style.css & WordPress.org API
    if (data.theme && data.theme !== 'Unknown') {
      // 1. Direct style.css fetch from visited site (authoritative for active site & custom/bespoke themes)
      fetchSiteThemeStyleCss(data.origin, data.theme).then(styleMeta => {
        if (!styleMeta) return;
        if (styleMeta.name) {
          const ovName = document.getElementById('overview-theme-name');
          if (ovName) ovName.textContent = styleMeta.name;
          const metricName = document.getElementById('metric-theme-name');
          if (metricName) metricName.textContent = styleMeta.name;
          const bigTitle = document.getElementById('theme-big-title');
          if (bigTitle) bigTitle.textContent = styleMeta.name;
          const specName = document.getElementById('theme-spec-name');
          if (specName) specName.textContent = styleMeta.name;
          const fbName = document.getElementById('theme-fallback-name');
          if (fbName) fbName.textContent = styleMeta.name;
        }
        if (styleMeta.version && (!data.themeVersion || data.themeVersion === 'Active')) {
          const ovVer = document.getElementById('overview-theme-version');
          if (ovVer) ovVer.textContent = `v${styleMeta.version}`;
          const pillVer = document.getElementById('theme-pill-ver');
          if (pillVer) pillVer.textContent = `v${styleMeta.version}`;
          const specVer = document.getElementById('theme-spec-version');
          if (specVer) specVer.textContent = styleMeta.version;
        }
        if (styleMeta.author && (!data.themeAuthor || data.themeAuthor.includes('Unknown'))) {
          const ovAuth = document.getElementById('overview-theme-author');
          if (ovAuth) ovAuth.textContent = `By ${styleMeta.author}`;
          const specAuth = document.getElementById('theme-spec-author');
          if (specAuth) specAuth.textContent = styleMeta.author;
        }
      });

      // 2. WordPress.org Themes API (fallback / enrichment for official repository themes)
      fetchWpOrgThemeMetadata(data.theme).then(meta => {
        if (!meta) return;
        if (meta.name && !data.themeName) {
          const ovName = document.getElementById('overview-theme-name');
          if (ovName) ovName.textContent = meta.name;
          const metricName = document.getElementById('metric-theme-name');
          if (metricName) metricName.textContent = meta.name;
          const bigTitle = document.getElementById('theme-big-title');
          if (bigTitle) bigTitle.textContent = meta.name;
          const specName = document.getElementById('theme-spec-name');
          if (specName) specName.textContent = meta.name;
          const fbName = document.getElementById('theme-fallback-name');
          if (fbName) fbName.textContent = meta.name;
        }
        if (meta.version && (!data.themeVersion || data.themeVersion === 'Active')) {
          const ovVer = document.getElementById('overview-theme-version');
          if (ovVer) ovVer.textContent = `v${meta.version}`;
          const pillVer = document.getElementById('theme-pill-ver');
          if (pillVer) pillVer.textContent = `v${meta.version}`;
          const specVer = document.getElementById('theme-spec-version');
          if (specVer) specVer.textContent = meta.version;
        }
        if (meta.author && !data.themeAuthor) {
          const ovAuth = document.getElementById('overview-theme-author');
          if (ovAuth) ovAuth.textContent = `By ${meta.author}`;
          const specAuth = document.getElementById('theme-spec-author');
          if (specAuth) specAuth.textContent = meta.author;
        }
      });
    }

    const fullThumb = document.getElementById('theme-full-screenshot');
    const fullFallback = document.getElementById('theme-full-fallback');
    loadThemeScreenshot(fullThumb, fullFallback, themeCandidates);
    if (data.theme !== 'Unknown') {
      document.getElementById('theme-wp-link').href = `https://wordpress.org/themes/${data.theme}/`;
    }

    // --- Tab 4: Hosting & Server Table ---
    document.getElementById('host-ip').textContent = data.ip;
    document.getElementById('host-isp').textContent = data.isp || 'Detecting...';
    document.getElementById('host-location').textContent = data.location || 'Unknown';
    document.getElementById('host-server').textContent = data.serverSoftware;
    const hostBuilder = document.getElementById('host-builder');
    if (hostBuilder) hostBuilder.textContent = data.pageBuilder;
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

  // --- Smart Pro / Commercial Title Derivation Engine ---
  // When a commercial/pro add-on (e.g. tutor-pro, elementor-pro, advanced-custom-fields-pro)
  // falls back to its base plugin repository on WordPress.org for icons and metadata,
  // this extracts the clean core brand name and constructs the correct Pro/Premium/Addon title
  // rather than overriding it with the free plugin's marketing tagline.
  function deriveProPluginTitle(rawBaseName, proSlug, baseSlug) {
    if (!rawBaseName) {
      return proSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // 1. Decode HTML entities (e.g. &#8211; -> –, &amp; -> &)
    let name = rawBaseName
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim();

    // 2. Extract brand name before marketing slogans, taglines, or separators
    // Matches "Tutor LMS – eLearning and online course solution" -> "Tutor LMS"
    // Matches "Elementor Website Builder – More than Just a Page Builder" -> "Elementor Website Builder"
    // Matches "WPForms - Easy Form Builder" -> "WPForms"
    // Matches "Yoast SEO: WordPress SEO Plugin" -> "Yoast SEO"
    // Matches "Advanced Custom Fields (ACF)" -> "Advanced Custom Fields"
    const separatorMatch = name.match(/^(.+?)\s*(?:[–—]| - | : |: | \| )\s*(.+)$/);
    if (separatorMatch && separatorMatch[1].trim().length >= 2) {
      name = separatorMatch[1].trim();
    }

    // 3. Clean up common marketing fluff at end of brand name
    name = name.replace(/\s*\((?:acf|free|lite)\)/i, '');
    name = name.replace(/\s+website builder$/i, '');
    name = name.replace(/\s+page builder$/i, '');
    name = name.replace(/\s+builder$/i, '');
    name = name.replace(/\s+customizer framework$/i, '');
    name = name.replace(/\s+wordpress plugin$/i, '');
    name = name.replace(/\s+plugin for wordpress$/i, '');
    name = name.replace(/\s+framework$/i, '');
    name = name.trim();

    // 4. Determine edition suffix from pro slug
    const proLower = proSlug.toLowerCase();
    let edition = 'Pro';
    if (proLower.endsWith('-premium')) {
      edition = 'Premium';
    } else if (proLower.endsWith('-addons') || proLower.endsWith('-addon')) {
      edition = 'Addons';
    } else if (proLower.endsWith('-extensions') || proLower.endsWith('-extension')) {
      edition = 'Extensions';
    } else if (proLower.endsWith('-plus')) {
      edition = 'Plus';
    } else if (proLower.endsWith('-unlimited')) {
      edition = 'Unlimited';
    } else if (proLower.endsWith('-core')) {
      edition = 'Core';
    }

    // 5. Avoid duplicate suffix (e.g. if name is already "Tutor LMS Pro")
    if (name.toLowerCase().endsWith(edition.toLowerCase())) {
      return name;
    }

    return `${name} ${edition}`;
  }

  // --- Dynamic WordPress.org Plugin Information API Cache ---
  const wpOrgMetadataCache = new Map();

  async function fetchWpOrgPluginMetadata(slug) {
    if (!slug) return null;
    const cleanSlug = slug.toLowerCase().trim();
    if (wpOrgMetadataCache.has(cleanSlug)) {
      return wpOrgMetadataCache.get(cleanSlug);
    }

    const baseSlug = cleanSlug.replace(/-(?:pro|premium|addon|addons|extension|extensions|plugin|core|config|lite|master|plus|unlimited)$/i, '');
    const slugsToTry = [cleanSlug];
    if (baseSlug && baseSlug !== cleanSlug) slugsToTry.push(baseSlug);

    for (const s of slugsToTry) {
      try {
        const res = await fetch(`https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=${encodeURIComponent(s)}&request[fields][icons]=1`, { cache: 'force-cache' });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.name || data.icons)) {
            const iconUrl = data.icons ? (data.icons['2x'] || data.icons['1x'] || data.icons.svg || data.icons.default) : null;
            
            // Smart Pro / Commercial Title Derivation:
            // When querying baseSlug because the Pro variant isn't in the free wp.org repo,
            // dynamically derive the Pro title (e.g. "Tutor LMS Pro") instead of overwriting with the free repo's title!
            let finalName = data.name || '';
            const isProFallback = (s !== cleanSlug);
            if (finalName && isProFallback) {
              finalName = deriveProPluginTitle(finalName, cleanSlug, s);
            }

            const meta = {
              name: finalName,
              version: isProFallback ? '' : (data.version || ''),
              lastUpdated: data.last_updated ? `Updated ${data.last_updated.split(' ')[0]}` : '',
              iconUrl: iconUrl ? iconUrl.replace(/^http:\/\//i, 'https://') : null,
              isProFallback,
              baseSlug: isProFallback ? s : null
            };
            wpOrgMetadataCache.set(cleanSlug, meta);
            return meta;
          }
        }
      } catch (e) {}
    }

    wpOrgMetadataCache.set(cleanSlug, null);
    return null;
  }

  // --- Dynamic Theme Name Formatter & Official WordPress.org Resolver ---
  function formatThemeName(slug) {
    if (!slug || slug === 'Unknown') return 'Unknown';
    const clean = slug.toLowerCase().trim();
    const knownThemes = {
      'twentytwentyfive': 'Twenty Twenty-Five',
      'twentytwentyfour': 'Twenty Twenty-Four',
      'twentytwentythree': 'Twenty Twenty-Three',
      'twentytwentytwo': 'Twenty Twenty-Two',
      'twentytwentyone': 'Twenty Twenty-One',
      'twentytwenty': 'Twenty Twenty',
      'twentynineteen': 'Twenty Nineteen',
      'twentyseventeen': 'Twenty Seventeen',
      'twentysixteen': 'Twenty Sixteen',
      'twentyfifteen': 'Twenty Fifteen',
      'twentyfourteen': 'Twenty Fourteen',
      'twentythirteen': 'Twenty Thirteen',
      'twentytwelve': 'Twenty Twelve',
      'twentyeleven': 'Twenty Eleven',
      'twentyten': 'Twenty Ten',
      'astra': 'Astra',
      'generatepress': 'GeneratePress',
      'hello-elementor': 'Hello Elementor',
      'kadence': 'Kadence',
      'oceanwp': 'OceanWP',
      'neve': 'Neve',
      'blocksy': 'Blocksy',
      'flatsome': 'Flatsome',
      'flavor': 'Flavor',
      'divi': 'Divi',
      'droipbase': 'droipbase'
    };
    if (knownThemes[clean]) return knownThemes[clean];
    return clean.split(/[-_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const wpOrgThemeCache = new Map();
  async function fetchWpOrgThemeMetadata(slug) {
    if (!slug || slug === 'Unknown') return null;
    const clean = slug.toLowerCase().trim();
    if (wpOrgThemeCache.has(clean)) return wpOrgThemeCache.get(clean);

    try {
      const res = await fetch(`https://api.wordpress.org/themes/info/1.2/?action=theme_information&request[slug]=${encodeURIComponent(clean)}`, { cache: 'force-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.name) {
          let authorName = '';
          if (data.author) {
            if (typeof data.author === 'object') {
              authorName = data.author.author || data.author.display_name || data.author.user_nicename || '';
            } else if (typeof data.author === 'string') {
              authorName = data.author.replace(/<[^>]+>/g, '').trim();
            }
          }
          const meta = {
            name: data.name,
            version: data.version || '',
            author: authorName
          };
          wpOrgThemeCache.set(clean, meta);
          return meta;
        }
      }
    } catch (e) {}

    wpOrgThemeCache.set(clean, null);
    return null;
  }

  // Multi-layer Direct style.css Resolver from Inspected Site (Theme Standard)
  const siteThemeStyleCache = new Map();
  async function fetchSiteThemeStyleCss(origin, theme) {
    if (!origin || !theme || theme === 'Unknown') return null;
    const cleanTheme = theme.toLowerCase().trim();
    const cacheKey = `${origin}|${cleanTheme}`;
    if (siteThemeStyleCache.has(cacheKey)) return siteThemeStyleCache.get(cacheKey);

    try {
      const url = `${origin.replace(/\/$/, '')}/wp-content/themes/${encodeURIComponent(cleanTheme)}/style.css`;
      const res = await fetch(url, { cache: 'force-cache' });
      if (res.ok) {
        const cssText = await res.text();
        if (cssText) {
          const nameMatch = cssText.match(/Theme Name:\s*([^\r\n*]+)/i);
          const verMatch = cssText.match(/Version:\s*([^\r\n*]+)/i);
          const authorMatch = cssText.match(/Author:\s*([^\r\n*]+)/i);
          const authorUriMatch = cssText.match(/Author URI:\s*([^\r\n*]+)/i);
          const templateMatch = cssText.match(/Template:\s*([^\r\n*]+)/i);
          const descMatch = cssText.match(/Description:\s*([^\r\n*]+)/i);

          if (nameMatch || verMatch || authorMatch) {
            const meta = {
              name: nameMatch ? nameMatch[1].trim() : '',
              version: verMatch ? verMatch[1].trim() : '',
              author: authorMatch ? authorMatch[1].trim().replace(/<[^>]+>/g, '') : '',
              authorUri: authorUriMatch ? authorUriMatch[1].trim() : '',
              parentTheme: templateMatch ? templateMatch[1].trim() : '',
              isChildTheme: !!templateMatch,
              description: descMatch ? descMatch[1].trim() : ''
            };
            siteThemeStyleCache.set(cacheKey, meta);
            return meta;
          }
        }
      }
    } catch (e) {}

    siteThemeStyleCache.set(cacheKey, null);
    return null;
  }

  // Multi-source Theme Screenshot Resolver (Local site + ts.w.org + parent theme)
  function getThemeScreenshotCandidates(data) {
    if (!data || !data.theme || data.theme === 'Unknown') return [];

    const candidates = [];
    const theme = encodeURIComponent(data.theme);

    // 1. Direct local theme directory from inspected page's stylesheets
    if (data.themeStylesheet) {
      try {
        const match = data.themeStylesheet.match(/^(https?:\/\/[^\?#]+\/themes\/[^\/]+\/)/i);
        if (match) {
          const base = match[1];
          candidates.push(`${base}screenshot.png`);
          candidates.push(`${base}screenshot.jpg`);
          candidates.push(`${base}screenshot.jpeg`);
          candidates.push(`${base}screenshot.webp`);
        }
      } catch(e) {}
    }

    // 2. Direct local theme directory from origin
    if (data.origin) {
      const originBase = `${data.origin.replace(/\/$/, '')}/wp-content/themes/${theme}/`;
      candidates.push(`${originBase}screenshot.png`);
      candidates.push(`${originBase}screenshot.jpg`);
      candidates.push(`${originBase}screenshot.jpeg`);
      candidates.push(`${originBase}screenshot.webp`);
    }

    // 3. Official WordPress.org Theme CDN (ts.w.org)
    candidates.push(`https://ts.w.org/wp-content/themes/${theme}/screenshot.png`);
    candidates.push(`https://ts.w.org/wp-content/themes/${theme}/screenshot.jpg`);
    candidates.push(`https://ts.w.org/wp-content/themes/${theme}/screenshot.jpeg`);

    // 4. Parent theme if child theme
    if (data.isChildTheme && data.parentTheme) {
      const parent = encodeURIComponent(data.parentTheme);
      if (data.origin) {
        const parentOrigin = `${data.origin.replace(/\/$/, '')}/wp-content/themes/${parent}/`;
        candidates.push(`${parentOrigin}screenshot.png`);
        candidates.push(`${parentOrigin}screenshot.jpg`);
      }
      candidates.push(`https://ts.w.org/wp-content/themes/${parent}/screenshot.png`);
      candidates.push(`https://ts.w.org/wp-content/themes/${parent}/screenshot.jpg`);
    }

    return [...new Set(candidates)];
  }

  function loadThemeScreenshot(imgEl, placeholderEl, candidates) {
    if (!candidates || candidates.length === 0) {
      imgEl.classList.add('hidden');
      if (placeholderEl) placeholderEl.classList.remove('hidden');
      return;
    }

    let step = 0;

    function tryNext() {
      if (step < candidates.length) {
        imgEl.src = candidates[step++];
      } else {
        // All screenshot URLs exhausted -> fallback to generic image thumb
        imgEl.classList.add('hidden');
        if (placeholderEl) placeholderEl.classList.remove('hidden');
      }
    }

    imgEl.onload = () => {
      if (imgEl.naturalWidth > 1 && imgEl.naturalHeight > 1) {
        imgEl.classList.remove('hidden');
        if (placeholderEl) placeholderEl.classList.add('hidden');
      } else {
        tryNext();
      }
    };

    imgEl.onerror = tryNext;
    tryNext();
  }

  // Multi-format & Base-slug Icon Candidate Generator (100% Dynamic from WordPress.org)
  const WP_ORG_ICON_FORMATS = [
    'icon-256x256.png',
    'icon-128x128.png',
    'icon-256x256.jpg',
    'icon-128x128.jpg',
    'icon-256x256.gif',
    'icon-128x128.gif',
    'icon.svg'
  ];

  function getPluginIconCandidates(slug) {
    if (!slug) return [];
    const cleanSlug = slug.toLowerCase().trim();
    const slugs = [cleanSlug];

    // If slug has -pro, -premium, -addon, -addons, etc., test the base slug as well (e.g. tutor-pro -> tutor, elementor-pro -> elementor)
    const base = cleanSlug.replace(/-(?:pro|premium|addon|addons|extension|plugin|core|config|lite|master)$/i, '');
    if (base && base !== cleanSlug && !slugs.includes(base)) {
      slugs.push(base);
    }

    // Common namespace prefixes (e.g. kirkicomponentlibrary -> kirki, but NOT independent plugins like kirki-ecommerce)
    if (cleanSlug.startsWith('kirki') && !cleanSlug.includes('-') && !slugs.includes('kirki')) {
      slugs.push('kirki');
    }

    const candidates = [];
    slugs.forEach(s => {
      WP_ORG_ICON_FORMATS.forEach(format => {
        candidates.push(`https://ps.w.org/${s}/assets/${format}`);
      });
    });

    return candidates;
  }

  // In-memory cache for resolved WordPress.org plugin icons
  const pluginIconCache = new Map();

  // Multi-Tier Dynamic WordPress.org Icon Resolver
  // By default, the fallback puzzle SVG is visible instantly. If an icon is found on WP.org, it smoothly swaps in without delay.
  function loadPluginIcon(thumbWrap, slug, name, rowEl) {
    if (!thumbWrap) return;
    const fallbackEl = thumbWrap.querySelector('.plugin-thumb-fallback');
    const imgEl = thumbWrap.querySelector('.plugin-thumb-img');
    if (!imgEl) return;

    const cleanSlug = (slug || '').toLowerCase().trim();

    // 0. Instant Cache Check: If icon was already resolved, apply immediately (0ms)
    if (pluginIconCache.has(cleanSlug)) {
      const cachedUrl = pluginIconCache.get(cleanSlug);
      if (cachedUrl) {
        imgEl.src = cachedUrl;
        imgEl.classList.remove('hidden');
        if (fallbackEl) fallbackEl.classList.add('hidden');
      }
      return;
    }

    let resolved = false;

    function applyFoundIcon(src, force = false) {
      if ((resolved && !force) || !src) return;
      resolved = true;
      pluginIconCache.set(cleanSlug, src);
      imgEl.src = src;
      imgEl.classList.remove('hidden');
      if (fallbackEl) fallbackEl.classList.add('hidden');
    }

    // 1. Fast parallel probe of top WordPress.org CDN asset candidates
    const candidates = getPluginIconCandidates(cleanSlug);
    candidates.forEach(url => {
      if (resolved) return;
      const tester = new Image();
      tester.onload = () => {
        if (!resolved && tester.naturalWidth > 1 && tester.naturalHeight > 1) {
          applyFoundIcon(url);
        }
      };
      tester.src = url;
    });

    // 2. In parallel, query official WordPress.org Plugin API to resolve exact icon & official name
    fetchWpOrgPluginMetadata(cleanSlug).then(meta => {
      if (!meta) return;
      if (meta.iconUrl) {
        // Authoritative API icon upgrades any candidate/fallback
        applyFoundIcon(meta.iconUrl, !meta.isProFallback);
      }
      if (rowEl && meta.name) {
        const titleLink = rowEl.querySelector('.plugin-title-link');
        if (titleLink) {
          titleLink.textContent = meta.name.replace(/&#8211;/g, '–').replace(/&amp;/g, '&');
        }
        // If it was a Pro fallback, update the links to point to the base plugin on WP.org to prevent 404
        if (meta.isProFallback && meta.baseSlug) {
          const wpOrgLinks = rowEl.querySelectorAll(`a[href*="wordpress.org/plugins/${cleanSlug}"]`);
          wpOrgLinks.forEach(a => {
            a.href = `https://wordpress.org/plugins/${meta.baseSlug}/`;
            a.title = `Base repository: ${meta.baseSlug}`;
          });
        }
      }
    });
  }

  // Helper to determine if a plugin has a confirmed version number
  function hasConfirmedVersion(p) {
    if (!p || !p.version) return false;
    const v = String(p.version).trim();
    if (!v || v === 'Unknown' || v === 'REST API' || v === 'Version hidden' || v === 'Version unknown' || v === 'Not exposed') return false;
    return /[0-9]/.test(v);
  }

  // --- Plugin Inventory Rendering & Search ---
  function renderFilteredPlugins() {
    if (!reportData) return;
    const container = els.pluginsList;
    container.innerHTML = '';

    const term = (els.pluginSearch.value || '').toLowerCase().trim();

    const filtered = reportData.plugins.filter(p => {
      if (!term) return true;
      return p.slug.toLowerCase().includes(term) ||
             p.name.toLowerCase().includes(term) ||
             p.category.toLowerCase().includes(term);
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="state-container" style="min-height:180px;">
          <p style="font-size:12px;color:var(--text-muted);">No matching plugins found.</p>
        </div>
      `;
      return;
    }

    // Sort confirmed plugins with version numbers first
    filtered.sort((a, b) => {
      const aConf = hasConfirmedVersion(a) ? 1 : 0;
      const bConf = hasConfirmedVersion(b) ? 1 : 0;
      if (aConf !== bConf) {
        return bConf - aConf; // Confirmed plugins with version numbers appear FIRST
      }
      return (a.name || a.slug).localeCompare(b.name || b.slug);
    });

    filtered.forEach(p => {
      const row = document.createElement('div');
      row.className = 'plugin-item';

      const tagClass = p.sourceTag === 'URL' ? 'tag-url' : p.sourceTag === 'API' ? 'tag-api' : p.sourceTag === 'HEADER' ? 'tag-header' : 'tag-dom';
      const isConfirmed = hasConfirmedVersion(p);
      const versionDisplay = isConfirmed ? `v${p.version}` : (p.version === 'REST API' ? 'REST API' : 'Version hidden');
      const versionClass = isConfirmed ? 'ver-confirmed' : 'ver-muted';

      row.innerHTML = `
        <div class="plugin-row-main">
          <div class="plugin-thumb-wrap">
            <div class="plugin-thumb-fallback">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v4h1.5a2.5 2.5 0 0 1 0 5H2v4a2 2 0 0 0 2 2h4v-1.5a2.5 2.5 0 0 1 5 0V21h4a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"></path>
              </svg>
            </div>
            <img class="plugin-thumb-img hidden" alt="${p.slug}" src="">
          </div>
          <div class="plugin-info-block">
            <div class="plugin-title-line">
              <a href="https://wordpress.org/plugins/${p.slug}/" class="plugin-title-link" target="_blank" rel="noopener noreferrer">${p.name}</a>
              <span class="badge-tag ${tagClass}">${p.sourceTag}</span>
            </div>
            <div class="plugin-sub-line">
              <span class="${versionClass}">${versionDisplay}</span>
              ${isConfirmed ? '<span class="confirmed-check" title="Confirmed version number">&#10003;</span>' : ''}
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

      // Multi-tier cascading icon resolution
      const thumbWrap = row.querySelector('.plugin-thumb-wrap');
      loadPluginIcon(thumbWrap, p.slug, p.name, row);

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
    return `# WPScout - Diagnostic Stack Report
Tagline: Scout Any WordPress Website.
Version: v1.4
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
    a.download = `wpscout-${new URL(reportData.url).hostname}.json`;
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

    // Hide all tab content panes and tab bar while diagnosing
    els.panes.forEach(p => {
      p.classList.add('hidden');
      p.classList.remove('active');
    });
    document.querySelector('.nav-tabs')?.classList.add('hidden');

    // Temporary analyzing status
    const pillWp = document.getElementById('pill-wp-status');
    const pillWpText = document.getElementById('pill-wp-text');
    if (pillWp) pillWp.className = 'status-pill pill-neutral';
    if (pillWpText) pillWpText.textContent = 'ANALYZING...';
    document.getElementById('pill-core-version')?.classList.add('hidden');
    document.getElementById('pill-gutenberg')?.classList.add('hidden');
    document.getElementById('pill-rest-api')?.classList.add('hidden');

    let currentTabUrl = '';

    function notifyTabStatus(tabId, isWP) {
      if (!window.chrome || !tabId) return;
      if (chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ type: 'WP_STATUS', isWP, tabId }, () => {
            if (chrome.runtime.lastError) {}
          });
        } catch (e) {}
      }
    }

    try {
      if (!window.chrome || !chrome.tabs || !chrome.tabs.query) {
        // Fallback for standalone preview / browser testing
        if (window.location.search.includes('internal') || window.location.hash === '#internal') {
          els.siteTitle.textContent = 'Internal Browser Page';
          els.siteUrl.textContent = 'chrome://extensions';
          showEmptyState('Internal Browser Page', 'Chrome extensions cannot inspect browser-internal pages.', 'Protected', true);
          return;
        }
        if (window.location.search.includes('nonwp') || window.location.search.includes('empty') || window.location.hash === '#empty') {
          els.siteTitle.textContent = 'Non-WordPress Site';
          els.siteUrl.textContent = 'https://example.com';
          showEmptyState('Non-WordPress Site', 'No WordPress core files, REST API endpoints, or theme stylesheets were detected on this page.', 'No Signatures', false);
          return;
        }
        const sample = getSampleMockData();
        reportData = sample;
        renderDashboard(sample);
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
        if (tab && tab.id) {
          notifyTabStatus(tab.id, false);
        }
        if (tab && tab.url) {
          els.siteTitle.textContent = tab.title || 'Internal Browser Page';
          els.siteUrl.textContent = tab.url;
          els.siteUrl.removeAttribute('href');
        }
        showEmptyState('Internal Browser Page', 'Chrome extensions cannot inspect browser-internal pages.', 'Protected', true);
        return;
      }

      currentTabUrl = tab.url;
      els.siteUrl.textContent = tab.url;
      els.siteUrl.href = tab.url;

      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: detectWordPress
      });

      const data = res && res[0] ? res[0].result : null;

      if (!data || !data.isWP) {
        if (tab && tab.id) {
          notifyTabStatus(tab.id, false);
        }
        try {
          const u = new URL(tab.url);
          els.siteTitle.textContent = tab.title || u.hostname || 'Non-WordPress Site';
        } catch (err) {
          els.siteTitle.textContent = tab.title || 'Non-WordPress Site';
        }
        els.siteUrl.textContent = tab.url;
        els.siteUrl.href = tab.url;
        showEmptyState('Non-WordPress Site', 'No WordPress core files, REST API endpoints, or theme stylesheets were detected on this page.', 'No Signatures', false);
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

      if (tab && tab.id) {
        notifyTabStatus(tab.id, true);
      }

    } catch (e) {
      showEmptyState('Diagnostics Incomplete', e.message || 'Unable to scan page.', 'Error', false);
    } finally {
      els.refreshBtn.classList.remove('spinning');
    }
  }

  els.refreshBtn.addEventListener('click', runDiagnostics);
  els.emptyRescanBtn.addEventListener('click', runDiagnostics);

  // Initial Run
  runDiagnostics();
});
