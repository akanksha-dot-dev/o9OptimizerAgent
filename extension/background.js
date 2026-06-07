/**
 * background.js — o9 Report Optimizer Extension Service Worker
 * Handles:
 *   - Receiving report config from content.js
 *   - Storing it in chrome.storage.session
 *   - Opening/focusing the Optimizer Web App tab
 *   - Injecting relay script to bridge data to the web app page
 */

// ─── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_TO_OPTIMIZER') {
    handleSendToOptimizer(message, sendResponse);
    return true; // keep channel open for async response
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.session.get(['o9_last_config'], (result) => {
      sendResponse({
        hasConfig: !!result.o9_last_config,
        config: result.o9_last_config || null,
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_CONFIG') {
    chrome.storage.session.remove(['o9_last_config'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// ─── Main Handler ─────────────────────────────────────────────────────────────
async function handleSendToOptimizer(message, sendResponse) {
  const { payload, optimizerUrl } = message;
  const targetUrl = (optimizerUrl || 'http://localhost:5173') + '/analyzer?source=extension';
  const baseUrl = (optimizerUrl || 'http://localhost:5173');

  try {
    // 1. Store config in session storage
    await chrome.storage.session.set({ o9_last_config: payload });

    // 2. Find or open Optimizer tab
    const tabs = await chrome.tabs.query({});
    const existingTab = tabs.find(t =>
      t.url && (t.url.includes('localhost:5173') || t.url.includes('localhost:3000') || t.url.includes(baseUrl))
    );

    if (existingTab) {
      // Bring existing tab to front and navigate to analyzer
      await chrome.tabs.update(existingTab.id, {
        active: true,
        url: existingTab.url.includes('/analyzer') ? undefined : targetUrl
      });
      await chrome.windows.update(existingTab.windowId, { focused: true });

      // Wait for page to be ready then inject relay
      setTimeout(() => injectRelayScript(existingTab.id), 800);
      sendResponse({ success: true, action: 'focused' });
    } else {
      // Open new tab
      const newTab = await chrome.tabs.create({ url: targetUrl, active: true });

      // Wait for page to fully load
      const loadListener = (tabId, changeInfo) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(loadListener);
          setTimeout(() => injectRelayScript(newTab.id), 600);
        }
      };
      chrome.tabs.onUpdated.addListener(loadListener);
      sendResponse({ success: true, action: 'opened' });
    }
  } catch (error) {
    console.error('[o9 Optimizer Extension] Error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ─── Relay Script Injection ──────────────────────────────────────────────────
// Injects into the Optimizer Web App tab to bridge the stored config.
// The injected function runs in ISOLATED world → has chrome.storage access.
function injectRelayScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      // This function runs as a content script in the Optimizer tab.
      // It reads from chrome.storage.session and posts to the page.
      chrome.storage.session.get(['o9_last_config'], (result) => {
        if (result.o9_last_config) {
          // Post message to the web app page (React app listens for this)
          window.postMessage({
            type: 'O9_EXTENSION_BRIDGE',
            source: 'o9-optimizer-extension',
            payload: result.o9_last_config,
          }, '*');

          console.log('[o9 Optimizer Extension] Config bridged to web app ✅');
        } else {
          console.warn('[o9 Optimizer Extension] No config found in session storage');
        }
      });
    },
    world: 'ISOLATED',
  }).catch(err => {
    console.error('[o9 Optimizer Extension] Relay injection failed:', err);
  });
}

// ─── Extension Icon Update based on tab ──────────────────────────────────────
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    const isO9Page = tab.url && tab.url.includes('o9solutions.com');
    // Could update badge here if needed
    if (isO9Page) {
      chrome.action.setBadgeText({ text: '●', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch {
    // Tab may have been closed
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const isO9Page = tab.url && tab.url.includes('o9solutions.com');
  if (isO9Page) {
    chrome.action.setBadgeText({ text: '●', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId });
  }
});
