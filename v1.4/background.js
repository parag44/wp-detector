// ==========================================================================
// WPScout - Background Service Worker
// Dynamically toggles action icon between vibrant orange (WordPress)
// and dimmed slate gray (Non-WordPress), matching WPSNIFFER behavior.
// ==========================================================================

const ICONS_ACTIVE = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png'
};

const ICONS_DIMMED = {
  16: 'icons/icon-dim-16.png',
  32: 'icons/icon-dim-32.png',
  48: 'icons/icon-dim-48.png',
  128: 'icons/icon-dim-128.png'
};

// In-memory tab status cache (tabId -> boolean)
const wpTabs = new Map();

// Restore session state when service worker wakes up from idle
if (chrome.storage && chrome.storage.session) {
  chrome.storage.session.get(null).then((items) => {
    if (items) {
      for (const [key, val] of Object.entries(items)) {
        if (key.startsWith('tab_wp_')) {
          const id = parseInt(key.replace('tab_wp_', ''), 10);
          if (id && val) wpTabs.set(id, true);
        }
      }
    }
  }).catch(() => {});
}

// Check if a URL is an internal or non-inspectable browser page
function isInternalUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools://') ||
    url.startsWith('view-source:')
  );
}

// Update toolbar action icon & tooltip for a specific tab
function updateTabIcon(tabId, isWP) {
  if (!tabId || tabId <= 0) return;

  const iconPath = isWP ? ICONS_ACTIVE : ICONS_DIMMED;
  const title = isWP
    ? 'WPScout - WordPress Detected!'
    : 'WPScout - Scout Any WordPress Website (Non-WordPress Site)';

  chrome.action.setIcon({ tabId, path: iconPath }).catch(() => {});
  chrome.action.setTitle({ tabId, title }).catch(() => {});

  if (isWP) {
    wpTabs.set(tabId, true);
    if (chrome.storage && chrome.storage.session) {
      chrome.storage.session.set({ [`tab_wp_${tabId}`]: true }).catch(() => {});
    }
  } else {
    wpTabs.delete(tabId);
    if (chrome.storage && chrome.storage.session) {
      chrome.storage.session.remove(`tab_wp_${tabId}`).catch(() => {});
    }
  }
}

// Proactively verify WordPress status of a tab
function checkTab(tabId, url) {
  if (!tabId || tabId <= 0 || isInternalUrl(url)) return;

  chrome.tabs.sendMessage(tabId, { type: 'WP_CHECK' }, (res) => {
    if (chrome.runtime.lastError) {
      // Content script may not have been injected yet (e.g. existing tab before install/update)
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      }).catch(() => {});
    } else if (res && res.isWP) {
      updateTabIcon(tabId, true);
    }
  });
}

// 1. Listen for detection reports from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'WP_STATUS') {
    const tabId = message.tabId || (sender && sender.tab && sender.tab.id);
    if (tabId) {
      updateTabIcon(tabId, Boolean(message.isWP));
    }
    sendResponse({ ok: true });
  }
});

// 2. Navigation & Update monitoring
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only reset if navigated to a new top-level URL
  if (changeInfo.url) {
    if (isInternalUrl(changeInfo.url)) {
      updateTabIcon(tabId, false);
      return;
    }
    updateTabIcon(tabId, false);
  }

  // When page completes loading, re-assert or verify
  if (changeInfo.status === 'complete' && tab && tab.url && !isInternalUrl(tab.url)) {
    if (wpTabs.get(tabId)) {
      updateTabIcon(tabId, true);
    } else {
      checkTab(tabId, tab.url);
    }
  }
});

// 3. Tab switch activation monitoring
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  if (!tabId) return;

  if (wpTabs.get(tabId)) {
    updateTabIcon(tabId, true);
  } else {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.url && !isInternalUrl(tab.url)) {
        checkTab(tabId, tab.url);
      }
    } catch (e) {}
  }
});

// 4. Tab cleanup
chrome.tabs.onRemoved.addListener((tabId) => {
  wpTabs.delete(tabId);
  if (chrome.storage && chrome.storage.session) {
    chrome.storage.session.remove(`tab_wp_${tabId}`).catch(() => {});
  }
});

// 5. Global initialization on install or extension update
chrome.runtime.onInstalled.addListener(async () => {
  chrome.action.setIcon({ path: ICONS_DIMMED }).catch(() => {});
  chrome.action.setTitle({ title: 'WPScout - Scout Any WordPress Website' }).catch(() => {});

  // Inspect existing open tabs immediately on install/reload
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        checkTab(tab.id, tab.url);
      }
    }
  } catch (e) {}
});
