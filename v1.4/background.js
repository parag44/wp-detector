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

// Update toolbar action icon & tooltip for a specific tab
function updateTabIcon(tabId, isWP) {
  if (!tabId || tabId <= 0) return;

  const iconPath = isWP ? ICONS_ACTIVE : ICONS_DIMMED;
  const title = isWP
    ? 'WPScout - WordPress Detected!'
    : 'WPScout - Scout Any WordPress Website (Non-WordPress Site)';

  chrome.action.setIcon({ tabId, path: iconPath }).catch(() => {});
  chrome.action.setTitle({ tabId, title }).catch(() => {});
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

// 2. When a tab starts navigating or reloading, reset its icon to dimmed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // If navigating to internal browser pages, keep dimmed
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
      updateTabIcon(tabId, false);
    } else {
      updateTabIcon(tabId, false);
    }
  }
});

// 3. Set default global dimmed icon on install or update
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setIcon({ path: ICONS_DIMMED }).catch(() => {});
  chrome.action.setTitle({ title: 'WPScout - Scout Any WordPress Website' }).catch(() => {});
});
