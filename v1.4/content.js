// ==========================================================================
// WPScout - Fast Content Script Detector
// Performs lightweight, non-blocking page inspection to notify the background
// service worker whether the current tab is running WordPress.
// ==========================================================================

(function() {
  // Prevent duplicate execution in same frame
  if (window.__wpscout_content_injected) return;
  window.__wpscout_content_injected = true;

  function isWordPressSite() {
    // 1. Meta generator tag
    const meta = document.querySelector('meta[name="generator"][content*="WordPress" i]');
    if (meta) return true;

    // 2. REST API / RSD link tags
    const apiLink = document.querySelector('link[rel="https://api.w.org/"], link[rel*="wp-json" i], link[rel="EditURI"][type*="rsd+xml" i]');
    if (apiLink) return true;

    // 3. WordPress asset directory signatures (/wp-content/ or /wp-includes/)
    const asset = document.querySelector(
      'link[href*="/wp-content/"], link[href*="/wp-includes/"], ' +
      'script[src*="/wp-content/"], script[src*="/wp-includes/"], ' +
      'img[src*="/wp-content/"]'
    );
    if (asset) return true;

    // 4. Admin bar (for logged-in sessions)
    if (document.getElementById('wpadminbar')) return true;

    // 5. Global WordPress JavaScript objects
    if (window._wpemojiSettings || window.wpTheme || (window.wp && typeof window.wp === 'object')) {
      return true;
    }

    return false;
  }

  function notifyBackground(isWP) {
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'WP_STATUS', isWP: Boolean(isWP) }, () => {
          if (chrome.runtime.lastError) {
            // Context may be inactive or popup closed, safe to ignore
          }
        });
      }
    } catch (e) {
      // Extension context invalidated / refreshed
    }
  }

  // 1. Immediate scan on document load
  let isWP = isWordPressSite();
  notifyBackground(isWP);

  // 2. If not detected immediately, re-check after brief delay (for late/deferred scripts)
  if (!isWP) {
    setTimeout(() => {
      isWP = isWordPressSite();
      if (isWP) notifyBackground(true);
    }, 1200);

    // 3. Lightweight observer for dynamic script/stylesheet injection (auto-disconnects after 8s)
    let observer = null;
    try {
      observer = new MutationObserver(() => {
        if (isWordPressSite()) {
          notifyBackground(true);
          observer.disconnect();
          observer = null;
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }, 8000);
    } catch (e) {}
  }
})();
