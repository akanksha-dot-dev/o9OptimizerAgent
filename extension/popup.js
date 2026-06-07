/**
 * popup.js — o9 Report Optimizer Extension Popup Logic
 */
(function () {
  'use strict';

  const DEFAULT_URL = 'http://localhost:5173';
  let scanMode = 'fast';

  // ─── Utilities ─────────────────────────────────────────────────────────────
  function showToast(msg = '✅ Saved!') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function formatTimeAgo(isoString) {
    if (!isoString) return 'Unknown';
    const diff = Date.now() - new Date(isoString).getTime();
    if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    return `${Math.round(diff / 3600000)}h ago`;
  }

  // ─── Load Persisted Settings ───────────────────────────────────────────────
  chrome.storage.local.get(['optimizerUrl', 'defaultScanMode'], (result) => {
    const urlInput = document.getElementById('optimizer-url');
    if (urlInput) urlInput.value = result.optimizerUrl || DEFAULT_URL;

    if (result.defaultScanMode) {
      scanMode = result.defaultScanMode;
      updateModeUI();
    }
  });

  // ─── Load Last Captured Config ─────────────────────────────────────────────
  chrome.storage.session.get(['o9_last_config'], (result) => {
    const config = result.o9_last_config;
    const captureEl = document.getElementById('last-capture');
    const noCaptureEl = document.getElementById('no-capture');
    const nameEl = document.getElementById('capture-name');
    const detailsEl = document.getElementById('capture-details');

    if (config) {
      if (captureEl) captureEl.style.display = 'block';
      if (noCaptureEl) noCaptureEl.style.display = 'none';
      if (nameEl) nameEl.textContent = config.reportName || 'Unnamed Report';
      if (detailsEl) {
        const lines = [];
        if (config.tenantHost) lines.push(`🌐 ${config.tenantHost}`);
        if (config.kpiCount) lines.push(`📊 ${config.kpiCount} measures`);
        if (config.graphCubeTime) lines.push(`⏱️ GC: ${config.graphCubeTime}ms`);
        if (config.confidence) lines.push(`🎯 ${config.confidence}% confidence`);
        if (config.capturedAt) lines.push(`🕐 ${formatTimeAgo(config.capturedAt)}`);
        detailsEl.innerHTML = lines.join('<br>');
      }
    }
  });

  // ─── Check Current Tab ─────────────────────────────────────────────────────
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('page-status-text');

    if (!tab || !tab.url) return;

    if (tab.url.includes('o9solutions.com')) {
      if (dot) { dot.className = 'page-status-dot active'; }
      if (text) {
        const host = new URL(tab.url).hostname;
        text.innerHTML = `<strong style="color:#10b981">Active</strong> on ${host}. Use the sidebar on the page.`;
      }
    } else {
      if (dot) dot.className = 'page-status-dot inactive';
      if (text) text.textContent = 'Not on an o9 Platform page. Navigate to your o9 report first.';
    }
  });

  // ─── Save URL Button ───────────────────────────────────────────────────────
  document.getElementById('save-url-btn')?.addEventListener('click', () => {
    const urlInput = document.getElementById('optimizer-url');
    const url = (urlInput?.value || '').trim();
    if (!url) return;

    // Normalize URL
    const normalized = url.endsWith('/') ? url.slice(0, -1) : url;
    chrome.storage.local.set({ optimizerUrl: normalized }, () => {
      showToast('✅ URL saved!');

      // Notify any open content scripts of the URL change
      chrome.tabs.query({ url: 'https://*.o9solutions.com/*' }, (tabs) => {
        tabs.forEach(t => {
          chrome.tabs.sendMessage(t.id, {
            type: 'SETTINGS_UPDATED',
            settings: { optimizerUrl: normalized }
          }).catch(() => {});
        });
      });
    });
  });

  // Also save on Enter key
  document.getElementById('optimizer-url')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-url-btn')?.click();
  });

  // ─── Scan Mode Toggle ─────────────────────────────────────────────────────
  document.getElementById('mode-fast')?.addEventListener('click', () => {
    scanMode = 'fast';
    updateModeUI();
    chrome.storage.local.set({ defaultScanMode: 'fast' });
  });

  document.getElementById('mode-deep')?.addEventListener('click', () => {
    scanMode = 'deep';
    updateModeUI();
    chrome.storage.local.set({ defaultScanMode: 'deep' });
    showToast('Deep scan mode saved');
  });

  function updateModeUI() {
    document.getElementById('mode-fast')?.classList.toggle('active', scanMode === 'fast');
    document.getElementById('mode-deep')?.classList.toggle('active', scanMode === 'deep');
  }

  // ─── Open Optimizer Button ────────────────────────────────────────────────
  document.getElementById('open-optimizer-btn')?.addEventListener('click', () => {
    chrome.storage.local.get(['optimizerUrl'], (result) => {
      const url = (result.optimizerUrl || DEFAULT_URL) + '/analyzer';
      chrome.tabs.create({ url, active: true });
      window.close();
    });
  });

  // ─── Clear Config Button ──────────────────────────────────────────────────
  document.getElementById('clear-config-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_CONFIG' }, () => {
      const captureEl = document.getElementById('last-capture');
      const noCaptureEl = document.getElementById('no-capture');
      if (captureEl) captureEl.style.display = 'none';
      if (noCaptureEl) noCaptureEl.style.display = 'block';
      showToast('🗑️ Cleared!');
    });
  });

})();
