/**
 * background.js — o9 Report Optimizer Extension Service Worker (FIXED)
 *
 * KEY FIXES:
 * 1. Relay now runs in MAIN world (not ISOLATED) — postMessage reaches React app
 * 2. Payload passed as argument directly — no storage timing race condition
 * 3. Retries 5 times with increasing delays — handles React render timing
 * 4. Injects inject.js via scripting API (bypasses o9 CSP)
 */

// ─── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_TO_OPTIMIZER') {
    handleSendToOptimizer(message, sendResponse);
    return true;
  }
  if (message.type === 'GET_STATUS') {
    chrome.storage.session.get(['o9_last_config'], (result) => {
      sendResponse({ hasConfig: !!result.o9_last_config, config: result.o9_last_config || null });
    });
    return true;
  }
  if (message.type === 'CLEAR_CONFIG') {
    chrome.storage.session.remove(['o9_last_config'], () => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'INJECT_JS_INTO_TAB') {
    // content.js asks background to inject inject.js via scripting API (bypasses CSP)
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['inject.js'],
      world: 'MAIN',
    }).then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ─── Main Handler ─────────────────────────────────────────────────────────────
async function handleSendToOptimizer(message, sendResponse) {
  const { payload, optimizerUrl } = message;
  const baseUrl = (optimizerUrl || 'http://localhost:5173').replace(/\/$/, '');
  const targetUrl = `${baseUrl}/analyzer?source=extension`;

  try {
    // Also store in session as backup
    await chrome.storage.session.set({ o9_last_config: payload });

    // Find or open Optimizer tab
    const tabs = await chrome.tabs.query({});
    const existingTab = tabs.find(t =>
      t.url && (
        t.url.startsWith('http://localhost:5173') ||
        t.url.startsWith('http://localhost:3000') ||
        (baseUrl !== 'http://localhost:5173' && t.url.startsWith(baseUrl))
      )
    );

    if (existingTab) {
      await chrome.tabs.update(existingTab.id, { active: true });
      await chrome.windows.update(existingTab.windowId, { focused: true });
      // If not already on analyzer, navigate there
      if (!existingTab.url.includes('/analyzer')) {
        await chrome.tabs.update(existingTab.id, { url: targetUrl });
        // Wait for navigation to complete
        await waitForTabLoad(existingTab.id);
      }
      bridgeDataToTab(existingTab.id, payload);
      sendResponse({ success: true, action: 'focused' });
    } else {
      const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
      await waitForTabLoad(newTab.id);
      bridgeDataToTab(newTab.id, payload);
      sendResponse({ success: true, action: 'opened' });
    }
  } catch (error) {
    console.error('[o9 Optimizer Extension] Error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ─── Wait for tab to fully load ───────────────────────────────────────────────
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(id, changeInfo) {
      if (id === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    // Safety timeout — resolve after 8s regardless
    setTimeout(resolve, 8000);
  });
}

// ─── Bridge Data to Optimizer Tab ────────────────────────────────────────────
// CRITICAL FIX: Use world:'MAIN' so postMessage reaches the React app's listeners.
// Pass payload as argument — no storage dependency, no timing issues.
function bridgeDataToTab(tabId, payload) {
  const payloadJson = JSON.stringify(payload);

  // Retry multiple times with increasing delays to handle React render timing
  const delays = [300, 800, 1500, 2500, 4000];

  delays.forEach((delay, attemptIndex) => {
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',           // ← FIXED: runs in same context as React app
        func: (json, attempt) => {
          try {
            const config = JSON.parse(json);

            // Store as global so AnalyzerPage can also poll for it
            window.__o9ExtensionConfig = config;

            // Fire a CustomEvent (most reliable for same-window)
            window.dispatchEvent(new CustomEvent('o9ExtensionReady', {
              detail: config,
              bubbles: true,
            }));

            // Also fire postMessage (React useEffect listener)
            window.postMessage({
              type: 'O9_EXTENSION_BRIDGE',
              source: 'o9-optimizer-extension',
              payload: config,
            }, window.location.origin || '*');

            console.log(`[o9 Extension] Bridge attempt ${attempt + 1} fired ✅`);
          } catch (e) {
            console.error('[o9 Extension] Bridge error:', e);
          }
        },
        args: [payloadJson, attemptIndex],
      }).catch(err => {
        // Tab may have navigated or closed — silently skip
        if (attemptIndex === 0) {
          console.warn('[o9 Extension] Bridge attempt failed:', err.message);
        }
      });
    }, delay);
  });
}

// ─── Inject inject.js into o9 pages (CSP bypass via scripting API) ─────────────
// This fires AUTOMATICALLY when an o9 tab loads, bypassing page CSP.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !tab.url.includes('o9solutions.com')) return;

  chrome.scripting.executeScript({
    target: { tabId },
    files: ['inject.js'],
    world: 'MAIN',
  }).catch(() => {
    // May fail if page is restricted — content.js DOM scanning is the fallback
  });

  // Badge indicator
  chrome.action.setBadgeText({ text: '●', tabId }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId }).catch(() => {});
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && tab.url.includes('o9solutions.com')) {
      chrome.action.setBadgeText({ text: '●', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch { /* tab closed */ }
});
