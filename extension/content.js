/**
 * content.js — o9 Report Optimizer Extension
 * Runs in the ISOLATED WORLD on all *.o9solutions.com pages.
 * Responsibilities:
 *   1. Inject inject.js into the page's MAIN WORLD for deep interception
 *   2. Render and manage the floating sidebar panel
 *   3. Aggregate signals from inject.js into a ReportConfig object
 *   4. On user click: send config to background.js to open the Optimizer app
 */

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────
  let scanMode = 'fast';
  let scanActive = false;
  let sidebarCollapsed = false;
  let reportConfig = createEmptyConfig();
  let signalLog = [];
  let scanStartTime = null;
  let deepScanTimer = null;
  let settings = { optimizerUrl: 'http://localhost:5173', defaultScanMode: 'fast' };

  function createEmptyConfig() {
    return {
      source: 'o9-optimizer-extension',
      version: '1.0.0',
      scanMode: 'fast',
      capturedAt: null,
      tenantHost: window.location.hostname,
      tenantName: window.location.hostname.split('.')[0],
      workspace: null,
      reportName: null,
      detectedReportType: null,
      rowCount: null,
      columnCount: null,
      kpiCount: null,
      hierarchyDepth: null,
      graphCubeTime: null,
      webApiTime: null,
      maxIntersection: null,
      namedSetCount: 0,
      filterCount: 0,
      filterTypes: { measure: 0, member: 0, post: 0, association: 0 },
      hasFavouriteFilters: false,
      conditionalFormattingCount: 0,
      nullRowsVisible: false,
      subtotalsVisible: false,
      reportingMeasuresCount: 0,
      transientMeasuresCount: 0,
      chainLinkedReport: false,
      factorySettings: false,
      namedSetsInView: false,
      filterRefModelOrder: false,
      hasMeasureGroupOrder: false,
      apiResponseCount: 0,
      confidence: 0,
    };
  }

  // ─── Load Settings ─────────────────────────────────────────────────────────
  chrome.storage.local.get(['optimizerUrl', 'defaultScanMode'], (result) => {
    if (result.optimizerUrl) settings.optimizerUrl = result.optimizerUrl;
    if (result.defaultScanMode) {
      settings.defaultScanMode = result.defaultScanMode;
      scanMode = result.defaultScanMode;
    }
    updateScanModeUI();
  });

  // ─── Inject inject.js into main world ─────────────────────────────────────
  function injectMainWorld() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  injectMainWorld();

  // ─── Signal Log ────────────────────────────────────────────────────────────
  function addSignal(status, message, detail = null) {
    const entry = { status, message, detail, time: Date.now() };
    signalLog.unshift(entry); // newest first
    if (signalLog.length > 30) signalLog.pop();
    renderSignals();
    updateConfidence();
  }

  function updateConfidence() {
    let score = 0;
    if (reportConfig.reportName) score += 15;
    if (reportConfig.kpiCount) score += 10;
    if (reportConfig.rowCount) score += 10;
    if (reportConfig.graphCubeTime) score += 15;
    if (reportConfig.webApiTime) score += 10;
    if (reportConfig.namedSetCount !== null) score += 10;
    if (reportConfig.filterCount > 0) score += 10;
    if (reportConfig.conditionalFormattingCount !== null) score += 5;
    if (reportConfig.maxIntersection) score += 15;
    reportConfig.confidence = Math.min(100, score);
    updateConfidenceBar();
  }

  // ─── Message Handler from inject.js ────────────────────────────────────────
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'O9_OPTIMIZER_EXT') return;
    const { type, data } = event.data;

    switch (type) {
      case 'INJECT_READY':
        addSignal('info', `Connected to ${data.title || 'o9 Platform'}`, data.url);
        updateStatusBadge('ready', 'Ready to scan');
        break;

      case 'SCAN_STARTED':
        scanActive = true;
        scanStartTime = Date.now();
        updateStatusBadge('scanning', data.mode === 'deep' ? 'Deep scanning...' : 'Fast scanning...');
        addSignal('info', `${data.mode === 'deep' ? '🔬 Deep' : '⚡ Fast'} scan started`);
        break;

      case 'DOM_SIGNALS':
        applyDomSignals(data);
        break;

      case 'TIMING_UPDATE':
        if (data.graphCubeTime && data.graphCubeTime > 0) {
          reportConfig.graphCubeTime = data.graphCubeTime;
          addSignal('success', `Graph Cube: ${data.graphCubeTime}ms`, getTimingLabel(data.graphCubeTime, 'gc'));
        }
        if (data.webApiTime && data.webApiTime > 0) {
          reportConfig.webApiTime = data.webApiTime;
          addSignal('success', `Web API: ${data.webApiTime}ms`, getTimingLabel(data.webApiTime, 'api'));
        }
        break;

      case 'TENANT_SETTINGS':
        if (data.maxIntersection) {
          reportConfig.maxIntersection = data.maxIntersection;
          addSignal('success', `Max Intersection: ${data.maxIntersection.toLocaleString()}`, 
            data.maxIntersection < 50000 ? '✅ Good range' : '⚠️ Consider reducing');
        }
        break;

      case 'NAMED_SETS':
        reportConfig.namedSetCount = data.count;
        addSignal('success', `Named Sets detected: ${data.count}`);
        break;

      case 'MEASURES_UPDATE':
        reportConfig.kpiCount = data.total;
        reportConfig.reportingMeasuresCount = data.reporting;
        reportConfig.transientMeasuresCount = data.transient;
        if (data.total > 0) {
          addSignal(data.total > 15 ? 'warn' : 'success', 
            `Measures: ${data.total} detected`, 
            data.reporting > 0 ? `${data.reporting} reporting, ${data.transient} transient` : null);
        }
        break;

      case 'FILTER_UPDATE':
        reportConfig.filterCount = data.total;
        reportConfig.filterTypes = { 
          measure: data.measure, member: data.member, 
          post: data.post, association: data.association 
        };
        reportConfig.hasFavouriteFilters = data.hasFavourites;
        reportConfig.filterRefModelOrder = data.refModelOrder;
        if (data.total > 0) {
          addSignal(data.association > 0 ? 'warn' : 'success',
            `Filters: ${data.total} found`,
            `M:${data.measure} MB:${data.member} P:${data.post} Assoc:${data.association}`);
        }
        if (data.association > 0) {
          addSignal('warn', `⚠️ Association filters: ${data.association} (load impact +15%)`);
        }
        break;

      case 'REPORT_CONFIG':
        if (data.reportType && !reportConfig.detectedReportType) {
          reportConfig.detectedReportType = data.reportType;
        }
        if (data.hierarchyDepth) reportConfig.hierarchyDepth = data.hierarchyDepth;
        reportConfig.factorySettings = data.factorySettings || reportConfig.factorySettings;
        reportConfig.chainLinkedReport = data.chainedReports || reportConfig.chainLinkedReport;
        reportConfig.namedSetsInView = data.namedSetsInView || reportConfig.namedSetsInView;
        if (data.conditionalFormattingRules > 0) {
          reportConfig.conditionalFormattingCount = data.conditionalFormattingRules;
          addSignal('warn', `Conditional Formatting: ${data.conditionalFormattingRules} rules`, 'Load overhead +8%');
        }
        addSignal('success', 'Report config captured from API');
        break;

      case 'API_CAPTURED':
        reportConfig.apiResponseCount++;
        break;

      case 'DEEP_SCAN_PROGRESS':
        const pct = Math.round((data.elapsed / data.total) * 100);
        updateDeepScanProgress(pct);
        break;

      case 'SCAN_COMPLETE':
        scanActive = false;
        reportConfig.capturedAt = new Date().toISOString();
        reportConfig.scanMode = data.mode;
        const elapsed = Date.now() - scanStartTime;
        addSignal('success', `✅ Scan complete in ${(elapsed / 1000).toFixed(1)}s`,
          data.apiResponseCount ? `${data.apiResponseCount} API responses captured` : null);
        updateStatusBadge('complete', 'Scan complete');
        enableAnalyzeButton();
        break;
    }
  });

  function applyDomSignals(data) {
    let updated = false;

    if (data.reportName && !reportConfig.reportName) {
      reportConfig.reportName = data.reportName;
      addSignal('success', `Report: "${data.reportName}"`);
      updated = true;
    }
    if (data.workspace && !reportConfig.workspace) {
      reportConfig.workspace = data.workspace;
    }
    if (data.detectedType && !reportConfig.detectedReportType) {
      reportConfig.detectedReportType = data.detectedType;
      addSignal('info', `Type detected: ${data.detectedType.replace(/_/g, ' ')}`);
    }
    if (data.columnCount > 0) {
      reportConfig.columnCount = data.columnCount;
      if (data.kpiCount > 0) {
        reportConfig.kpiCount = Math.max(reportConfig.kpiCount || 0, data.kpiCount);
        if (updated || !reportConfig.kpiCount) 
          addSignal(data.kpiCount > 15 ? 'warn' : 'success', `Measures: ~${data.kpiCount} visible columns`);
      }
    }
    if (data.rowCountEstimate > 0) {
      reportConfig.rowCount = data.rowCountEstimate;
      addSignal('info', `Rows: ~${data.rowCountEstimate.toLocaleString()} (estimated)`);
    }
    if (data.namedSetCount > 0) {
      reportConfig.namedSetCount = Math.max(reportConfig.namedSetCount, data.namedSetCount);
    }
    if (data.hierarchyDepth > 0) {
      reportConfig.hierarchyDepth = data.hierarchyDepth;
      addSignal(data.hierarchyDepth > 5 ? 'warn' : 'info', `Hierarchy depth: ${data.hierarchyDepth} levels`);
    }
    if (data.conditionalFormattingCount > 0 && !reportConfig.conditionalFormattingCount) {
      reportConfig.conditionalFormattingCount = data.conditionalFormattingCount;
      addSignal('warn', `Conditional Formatting detected (+8% load)`);
    }
    reportConfig.nullRowsVisible = data.nullRowsVisible || reportConfig.nullRowsVisible;
    reportConfig.subtotalsVisible = data.subtotalsVisible || reportConfig.subtotalsVisible;
    reportConfig.chainLinkedReport = data.chainLinkedReport || reportConfig.chainLinkedReport;
    reportConfig.factorySettings = data.factorySettings || reportConfig.factorySettings;

    if (data.nullRowsVisible) addSignal('warn', 'Null rows visible (+load time)');
    if (data.subtotalsVisible) addSignal('warn', 'Subtotals visible (+computation)');

    renderSignals();
    updateConfidence();
  }

  function getTimingLabel(ms, type) {
    if (type === 'gc') {
      if (ms <= 500) return '🟢 Excellent';
      if (ms <= 1500) return '🔵 Good';
      if (ms <= 3000) return '🟡 Fair';
      return '🔴 Critical';
    } else {
      if (ms <= 1000) return '🟢 Excellent';
      if (ms <= 3000) return '🔵 Good';
      if (ms <= 5000) return '🟡 Fair';
      return '🔴 Critical';
    }
  }

  // ─── Build Sidebar HTML ─────────────────────────────────────────────────────
  function buildSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'o9-optimizer-sidebar';
    sidebar.innerHTML = `
      <div id="o9-sidebar-header">
        <div id="o9-sidebar-logo">
          <span class="o9-logo-badge">o9</span>
          <div>
            <span id="o9-sidebar-title">Report Optimizer</span>
            <span id="o9-sidebar-version">v1.0.0</span>
          </div>
        </div>
        <div id="o9-sidebar-header-actions">
          <button id="o9-sidebar-collapse" title="Collapse sidebar">◀</button>
          <button id="o9-sidebar-close" title="Close">✕</button>
        </div>
      </div>

      <div id="o9-sidebar-body">
        <!-- Tenant Info -->
        <div class="o9-section o9-tenant-section">
          <div id="o9-tenant-host">🌐 ${window.location.hostname}</div>
          <div id="o9-status-badge" class="o9-status idle">Inactive</div>
        </div>

        <!-- Scan Mode Toggle -->
        <div class="o9-section">
          <div class="o9-section-label">SCAN MODE</div>
          <div class="o9-scan-toggle">
            <button id="o9-btn-fast" class="o9-toggle-btn active">
              ⚡ Fast
              <span class="o9-toggle-hint">DOM only · ~2s</span>
            </button>
            <button id="o9-btn-deep" class="o9-toggle-btn">
              🔬 Deep
              <span class="o9-toggle-hint">API + DOM · ~12s</span>
            </button>
          </div>
        </div>

        <!-- Scan Button -->
        <div class="o9-section">
          <button id="o9-scan-btn" class="o9-btn o9-btn-scan">
            <span id="o9-scan-btn-icon">🔍</span>
            <span id="o9-scan-btn-label">Start Scan</span>
          </button>
          <div id="o9-deep-progress" class="o9-progress-wrap" style="display:none;">
            <div class="o9-progress-bar">
              <div id="o9-deep-progress-fill" class="o9-progress-fill" style="width:0%"></div>
            </div>
            <span id="o9-deep-progress-label">Scanning APIs...</span>
          </div>
        </div>

        <!-- Signals -->
        <div class="o9-section">
          <div class="o9-section-label">DETECTED SIGNALS</div>
          <div id="o9-signals-list">
            <div class="o9-signal-empty">Click "Start Scan" to begin detection</div>
          </div>
        </div>

        <!-- Confidence -->
        <div class="o9-section" id="o9-confidence-section" style="display:none;">
          <div class="o9-section-label">EXTRACTION CONFIDENCE</div>
          <div class="o9-confidence-bar">
            <div id="o9-confidence-fill" class="o9-confidence-fill" style="width:0%"></div>
          </div>
          <div id="o9-confidence-label" class="o9-confidence-label">0% confidence</div>
        </div>

        <!-- Quick Health Preview -->
        <div class="o9-section" id="o9-preview-section" style="display:none;">
          <div class="o9-section-label">QUICK PREVIEW</div>
          <div id="o9-preview-grid" class="o9-preview-grid"></div>
        </div>

        <!-- Analyze CTA -->
        <div class="o9-section o9-cta-section">
          <button id="o9-analyze-btn" class="o9-btn o9-btn-analyze" disabled>
            🚀 Analyze in Optimizer
          </button>
          <div class="o9-analyze-hint">Opens the o9 Optimizer Web App with pre-filled report data</div>
        </div>
      </div>
    `;

    // ── Collapse toggle ─────────────────────────────────────────────────────
    const floatBtn = document.createElement('button');
    floatBtn.id = 'o9-sidebar-float-btn';
    floatBtn.title = 'o9 Optimizer';
    floatBtn.innerHTML = '<span>o9</span>';
    floatBtn.style.display = 'none'; // shown when sidebar is closed

    document.body.appendChild(sidebar);
    document.body.appendChild(floatBtn);

    // ── Wire up events ──────────────────────────────────────────────────────
    document.getElementById('o9-sidebar-close').onclick = () => {
      sidebar.style.display = 'none';
      floatBtn.style.display = 'flex';
    };
    floatBtn.onclick = () => {
      sidebar.style.display = 'flex';
      floatBtn.style.display = 'none';
    };
    document.getElementById('o9-sidebar-collapse').onclick = () => {
      toggleCollapse();
    };
    document.getElementById('o9-btn-fast').onclick = () => setScanMode('fast');
    document.getElementById('o9-btn-deep').onclick = () => setScanMode('deep');
    document.getElementById('o9-scan-btn').onclick = () => startScan();
    document.getElementById('o9-analyze-btn').onclick = () => sendToOptimizer();
  }

  // ─── Sidebar Controls ──────────────────────────────────────────────────────
  function toggleCollapse() {
    sidebarCollapsed = !sidebarCollapsed;
    const body = document.getElementById('o9-sidebar-body');
    const btn = document.getElementById('o9-sidebar-collapse');
    if (body) body.style.display = sidebarCollapsed ? 'none' : 'flex';
    if (btn) btn.textContent = sidebarCollapsed ? '▶' : '◀';
    const sidebar = document.getElementById('o9-optimizer-sidebar');
    if (sidebar) {
      sidebar.style.width = sidebarCollapsed ? '42px' : '320px';
      sidebar.style.minWidth = sidebarCollapsed ? '42px' : '320px';
    }
  }

  function setScanMode(mode) {
    scanMode = mode;
    updateScanModeUI();
  }

  function updateScanModeUI() {
    const fastBtn = document.getElementById('o9-btn-fast');
    const deepBtn = document.getElementById('o9-btn-deep');
    if (!fastBtn || !deepBtn) return;
    fastBtn.classList.toggle('active', scanMode === 'fast');
    deepBtn.classList.toggle('active', scanMode === 'deep');
  }

  function updateStatusBadge(state, label) {
    const badge = document.getElementById('o9-status-badge');
    if (!badge) return;
    badge.textContent = label;
    badge.className = `o9-status ${state}`;
  }

  function updateDeepScanProgress(pct) {
    const wrap = document.getElementById('o9-deep-progress');
    const fill = document.getElementById('o9-deep-progress-fill');
    const label = document.getElementById('o9-deep-progress-label');
    if (wrap) wrap.style.display = 'block';
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `Deep scanning... ${pct}%`;
  }

  function updateConfidenceBar() {
    const conf = reportConfig.confidence;
    const section = document.getElementById('o9-confidence-section');
    const fill = document.getElementById('o9-confidence-fill');
    const label = document.getElementById('o9-confidence-label');
    if (section) section.style.display = 'block';
    if (fill) {
      fill.style.width = `${conf}%`;
      fill.style.background = conf >= 70 ? '#10b981' : conf >= 40 ? '#f59e0b' : '#ef4444';
    }
    if (label) label.textContent = `${conf}% confidence`;
  }

  function enableAnalyzeButton() {
    const btn = document.getElementById('o9-analyze-btn');
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }

    // Show preview grid
    renderPreviewGrid();
    const previewSection = document.getElementById('o9-preview-section');
    if (previewSection) previewSection.style.display = 'block';
  }

  function renderPreviewGrid() {
    const grid = document.getElementById('o9-preview-grid');
    if (!grid) return;
    const items = [
      { label: 'Measures', value: reportConfig.kpiCount || '?', warn: reportConfig.kpiCount > 15 },
      { label: 'Rows', value: reportConfig.rowCount ? `~${(reportConfig.rowCount/1000).toFixed(0)}K` : '?', warn: reportConfig.rowCount > 50000 },
      { label: 'GC Time', value: reportConfig.graphCubeTime ? `${reportConfig.graphCubeTime}ms` : '?', warn: reportConfig.graphCubeTime > 1500 },
      { label: 'Named Sets', value: reportConfig.namedSetCount || 0, warn: false },
      { label: 'CF Rules', value: reportConfig.conditionalFormattingCount || 0, warn: reportConfig.conditionalFormattingCount > 0 },
      { label: 'Confidence', value: `${reportConfig.confidence}%`, warn: reportConfig.confidence < 50 },
    ];
    grid.innerHTML = items.map(item => `
      <div class="o9-preview-item ${item.warn ? 'warn' : ''}">
        <div class="o9-preview-value">${item.value}</div>
        <div class="o9-preview-label">${item.label}</div>
      </div>
    `).join('');
  }

  function renderSignals() {
    const list = document.getElementById('o9-signals-list');
    if (!list) return;
    if (signalLog.length === 0) {
      list.innerHTML = '<div class="o9-signal-empty">No signals captured yet</div>';
      return;
    }
    list.innerHTML = signalLog.slice(0, 12).map(s => `
      <div class="o9-signal-item ${s.status}">
        <span class="o9-signal-icon">${getSignalIcon(s.status)}</span>
        <div class="o9-signal-text">
          <span class="o9-signal-msg">${s.message}</span>
          ${s.detail ? `<span class="o9-signal-detail">${s.detail}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  function getSignalIcon(status) {
    switch (status) {
      case 'success': return '✅';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  }

  // ─── Scan Control ──────────────────────────────────────────────────────────
  function startScan() {
    // Reset
    reportConfig = createEmptyConfig();
    signalLog = [];
    scanStartTime = Date.now();

    const btn = document.getElementById('o9-scan-btn');
    const btnLabel = document.getElementById('o9-scan-btn-label');
    const progress = document.getElementById('o9-deep-progress');
    const analyzeBtn = document.getElementById('o9-analyze-btn');

    if (btn) btn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'Scanning...';
    if (progress) progress.style.display = 'none';
    if (analyzeBtn) { analyzeBtn.disabled = true; analyzeBtn.style.opacity = '0.5'; }

    // Hide preview
    const previewSection = document.getElementById('o9-preview-section');
    if (previewSection) previewSection.style.display = 'none';
    const confSection = document.getElementById('o9-confidence-section');
    if (confSection) confSection.style.display = 'none';

    // Send message to inject.js
    if (scanMode === 'fast') {
      window.postMessage({ source: 'O9_OPTIMIZER_CONTENT', type: 'START_FAST_SCAN' }, '*');
      // Re-enable scan button after fast scan
      setTimeout(() => {
        if (btn) { btn.disabled = false; }
        if (btnLabel) btnLabel.textContent = 'Re-scan';
      }, 3500);
    } else {
      window.postMessage({ source: 'O9_OPTIMIZER_CONTENT', type: 'START_DEEP_SCAN' }, '*');
      if (progress) progress.style.display = 'block';
      // Re-enable after deep scan
      setTimeout(() => {
        if (btn) { btn.disabled = false; }
        if (btnLabel) btnLabel.textContent = 'Re-scan';
      }, 13500);
    }
  }

  // ─── Send to Optimizer ─────────────────────────────────────────────────────
  function sendToOptimizer() {
    reportConfig.capturedAt = new Date().toISOString();

    chrome.runtime.sendMessage({
      type: 'SEND_TO_OPTIMIZER',
      payload: reportConfig,
      optimizerUrl: settings.optimizerUrl,
    }, (response) => {
      if (response?.success) {
        const btn = document.getElementById('o9-analyze-btn');
        if (btn) {
          btn.textContent = '✅ Opened in Optimizer!';
          btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          setTimeout(() => {
            btn.textContent = '🚀 Analyze in Optimizer';
            btn.style.background = '';
          }, 3000);
        }
        addSignal('success', 'Sent to o9 Optimizer App!');
      } else {
        addSignal('error', 'Failed to open Optimizer. Is the app running?');
      }
    });
  }

  // ─── Initialize ────────────────────────────────────────────────────────────
  buildSidebar();
  updateScanModeUI();
  updateStatusBadge('idle', 'Ready');

})();
