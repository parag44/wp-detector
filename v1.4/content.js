// ==========================================================================
// WPScout - Fast Content Script Detector
// Performs lightweight, non-blocking page inspection to notify the background
// service worker whether the current tab is running WordPress.
// ==========================================================================

(function() {
  function isWordPressSite() {
    // 1. Meta generator tag
    if (document.querySelector('meta[name="generator"][content*="WordPress" i]')) return true;

    // 2. REST API / RSD / WLW / Feed links
    if (document.querySelector(
      'link[rel="https://api.w.org/"], ' +
      'link[rel*="wp-json" i], ' +
      'link[rel="EditURI"][type*="rsd+xml" i], ' +
      'link[rel="wlwmanifest"], ' +
      'link[type*="rss+xml"][href*="/feed"]'
    )) return true;

    // 3. Asset directories: /wp-content/ or /wp-includes/ in links, scripts, images, audio, video, source
    if (document.querySelector(
      'link[href*="/wp-content/"], link[href*="/wp-includes/"], ' +
      'script[src*="/wp-content/"], script[src*="/wp-includes/"], ' +
      'img[src*="/wp-content/"], source[srcset*="/wp-content/"], ' +
      'a[href*="/wp-content/uploads/"]'
    )) return true;

    // 4. Core inline styles & IDs (block library, global styles, classic theme styles, emoji styles)
    if (document.querySelector(
      'style[id*="wp-"], style[id*="global-styles"], ' +
      'style[id*="block-library"], style[id*="classic-theme-styles"], ' +
      'link[id*="wp-block-"], link[id*="wp-emoji"]'
    )) return true;

    // 5. Admin bar (logged in) & common body/block classes
    if (document.getElementById('wpadminbar')) return true;
    if (document.querySelector(
      'body[class*="wp-"], body[class*="page-template"], body[class*="theme-"], ' +
      'body.admin-bar, body.logged-in, ' +
      '[class*="wp-block-"], [class*="wp-container-"]'
    )) return true;

    // 6. Fast scan of inline scripts for WordPress fingerprints
    const inlineScripts = document.querySelectorAll('script:not([src])');
    for (let i = 0; i < inlineScripts.length && i < 25; i++) {
      const text = inlineScripts[i].textContent;
      if (text && (
        text.includes('_wpemojiSettings') ||
        text.includes('/wp-content/') ||
        text.includes('/wp-includes/') ||
        text.includes('wp-json') ||
        text.includes('wp.i18n') ||
        text.includes('wp.apiFetch') ||
        text.includes('wc_add_to_cart_params') ||
        text.includes('elementorFrontendConfig')
      )) {
        return true;
      }
    }

    return false;
  }

  function notifyBackground(isWP, retries = 3) {
    if (!isWP) return;
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'WP_STATUS', isWP: true }, () => {
          if (chrome.runtime.lastError && retries > 0) {
            setTimeout(() => notifyBackground(true, retries - 1), 500);
          }
        });
      }
    } catch (e) {
      if (retries > 0) {
        setTimeout(() => notifyBackground(true, retries - 1), 500);
      }
    }
  }

  // Respond to on-demand verification requests from background worker
  try {
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg && msg.type === 'WP_CHECK') {
          const found = isWordPressSite();
          if (found) notifyBackground(true);
          sendResponse({ isWP: found });
        }
      });
    }
  } catch (e) {}

  // Prevent duplicate background loops in the same frame
  if (window.__wpscout_content_injected) return;
  window.__wpscout_content_injected = true;

  // 1. Immediate scan on document load
  const isWP = isWordPressSite();
  if (isWP) {
    notifyBackground(true);
    return;
  }

  // 2. Multi-stage re-checks for deferred scripts, late stylesheets, and SPA rendering
  const timer1 = setTimeout(() => {
    if (isWordPressSite()) notifyBackground(true);
  }, 500);

  const timer2 = setTimeout(() => {
    if (isWordPressSite()) notifyBackground(true);
  }, 1500);

  const timer3 = setTimeout(() => {
    if (isWordPressSite()) notifyBackground(true);
  }, 3000);

  window.addEventListener('load', () => {
    if (isWordPressSite()) notifyBackground(true);
  }, { once: true });

  // 3. Lightweight observer for dynamic script/stylesheet injection (auto-disconnects after 10s)
  let observer = null;
  try {
    observer = new MutationObserver(() => {
      if (isWordPressSite()) {
        notifyBackground(true);
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 10000);
  } catch (e) {}
})();
