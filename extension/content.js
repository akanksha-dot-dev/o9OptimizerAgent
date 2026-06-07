/**
 * content.js — o9 Report Optimizer Extension (FIXED)
 * Runs in ISOLATED WORLD on *.o9solutions.com pages.
 *
 * KEY FIXES:
 * 1. Fast Scan now runs DOM scanning DIRECTLY in content.js (no inject.js needed)
 *    — content.js has full document access even in isolated world
 * 2. inject.js is injected via background (scripting API, not script tag) to bypass CSP
 * 3. Analyze button enabled after scan completes — no longer blocked by inject.js
 * 4. Fallback: basic signals extracted from URL alone (workspace, tenant, report type)
 */

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────
  let scanMode = 'fast';
  let sidebarCollapsed = false;
  let reportConfig = createEmptyConfig();
  let signalLog = [];
  let scanStartTime = null;
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
      scanMode = result.defaultScanMode;
    }
    updateScanModeUI();
  });

  // ─── DIRECT DOM SCANNER (runs in isolated world — no inject.js needed) ──────
  // content.js has full document access even in isolated world.
  function scanDOMDirect() {
    const signals = {};

    // ── URL / Route Parsing ─────────────────────────────────────────────────
    const hash = window.location.hash || '';
    const hashParts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    signals.workspace = hashParts[0] || null;
    signals.reportUrlHint = hash.toLowerCase();

    // ── Report Name ─────────────────────────────────────────────────────────
    const titleCandidates = [
      document.querySelector('[class*="report-title"]'),
      document.querySelector('[class*="reportTitle"]'),
      document.querySelector('[class*="view-name"]'),
      document.querySelector('[class*="viewName"]'),
      document.querySelector('[class*="page-title"]'),
      document.querySelector('[class*="pageTitle"]'),
      document.querySelector('[class*="breadcrumb"] > *:last-child'),
      document.querySelector('[class*="breadcrumb-item"]:last-child'),
      document.querySelector('h1'),
      document.querySelector('h2'),
      document.querySelector('[class*="workspace-name"]'),
      document.querySelector('[class*="tab-title"]'),
      document.querySelector('[class*="panel-header"] span'),
      document.querySelector('title'),
    ].filter(el => el && el.textContent.trim().length > 0);

    let rawTitle = titleCandidates.length > 0
      ? titleCandidates[0].textContent.trim()
      : document.title.replace(/ [-|] .*$/, '').trim();

    // Clean up the title
    rawTitle = rawTitle.replace(/o9 Solutions?/gi, '').replace(/\s+/g, ' ').trim();
    signals.reportName = rawTitle || `${signals.workspace || 'o9'} Report`;

    // ── Report Type from URL + title ────────────────────────────────────────
    const combined = (signals.reportUrlHint + ' ' + signals.reportName + ' ' + document.title).toLowerCase();
    if (combined.includes('demand') || combined.includes('forecast')) signals.detectedType = 'demand_planning';
    else if (combined.includes('supply') || combined.includes('sourcing')) signals.detectedType = 'supply_planning';
    else if (combined.includes('inventory')) signals.detectedType = 'inventory';
    else if (combined.includes('financial') || combined.includes('p&l') || combined.includes('revenue')) signals.detectedType = 'financial';
    else if (combined.includes('snop') || combined.includes('s&op')) signals.detectedType = 'snop';
    else if (combined.includes('exception')) signals.detectedType = 'exception';
    else if (combined.includes('kpi') || combined.includes('dashboard')) signals.detectedType = 'kpi_dashboard';
    else if (combined.includes('scenario')) signals.detectedType = 'scenario';
    else if (combined.includes('control tower') || combined.includes('controltower')) signals.detectedType = 'control_tower';
    else signals.detectedType = 'custom';

    // ── Measure / Column Count ──────────────────────────────────────────────
    const colSelectors = [
      '.ag-header-cell[col-id]',
      '[class*="ag-header-cell"]',
      '[class*="col-header"]',
      '[class*="measure-header"]',
      '[class*="column-header"]',
      '[class*="header-cell"]',
      '[role="columnheader"]',
      'th[scope="col"]',
      '[class*="grid-header"] [class*="cell"]',
    ];
    let maxCols = 0;
    colSelectors.forEach(sel => {
      try {
        const count = document.querySelectorAll(sel).length;
        if (count > maxCols && count < 500) maxCols = count; // cap to avoid false positives
      } catch (e) {}
    });
    signals.columnCount = maxCols > 0 ? maxCols : null;
    signals.kpiCount = maxCols > 2 ? maxCols - 2 : (maxCols > 0 ? maxCols : null);

    // ── Row Count ───────────────────────────────────────────────────────────
    const rowSelectors = [
      '.ag-row[row-index]',
      '[class*="ag-row"]',
      '[class*="grid-row"]:not([class*="header"])',
      'tbody tr',
      '[role="row"]:not([class*="header"])',
    ];
    let maxRows = 0;
    rowSelectors.forEach(sel => {
      try {
        const count = document.querySelectorAll(sel).length;
        if (count > maxRows && count < 10000) maxRows = count;
      } catch (e) {}
    });
    signals.visibleRows = maxRows;
    // Grid virtualization only renders ~20-100 rows at a time
    signals.rowCountEstimate = maxRows > 0 ? maxRows * 8 : null;

    // ── Named Sets ──────────────────────────────────────────────────────────
    const nsSelectors = [
      '[class*="named-set"]', '[class*="namedSet"]', '[class*="named_set"]',
      '[data-type="named-set"]', '[class*="nameSet"]', '[class*="ns-chip"]',
      '[class*="filter"][class*="set"]',
    ];
    let nsCount = 0;
    nsSelectors.forEach(sel => {
      try { nsCount = Math.max(nsCount, document.querySelectorAll(sel).length); } catch (e) {}
    });
    signals.namedSetCount = nsCount;

    // ── Filters ─────────────────────────────────────────────────────────────
    const filterSelectors = [
      '[class*="filter-panel"] [class*="item"]',
      '[class*="filterPanel"] > *',
      '[class*="filter-chip"]',
      '[class*="filterChip"]',
      '[data-type="filter"]',
      '[class*="filter-item"]',
      '[class*="applied-filter"]',
    ];
    let filterCount = 0;
    filterSelectors.forEach(sel => {
      try {
        const count = document.querySelectorAll(sel).length;
        if (count > filterCount && count < 200) filterCount = count;
      } catch (e) {}
    });
    signals.filterCount = filterCount;

    // ── Conditional Formatting ───────────────────────────────────────────────
    const cfSelectors = [
      '[class*="conditional-format"]', '[class*="conditionalFormat"]',
      '[class*="cf-rule"]', '[class*="format-rule"]', '[class*="cf-badge"]',
    ];
    let cfCount = 0;
    cfSelectors.forEach(sel => {
      try { cfCount = Math.max(cfCount, document.querySelectorAll(sel).length); } catch (e) {}
    });
    // Also count colored cells (rough heuristic)
    if (cfCount === 0) {
      try {
        const coloredCells = document.querySelectorAll(
          '[class*="ag-cell"][style*="background"], [class*="grid-cell"][style*="background-color"]'
        );
        if (coloredCells.length > 5) cfCount = Math.ceil(coloredCells.length / 10);
      } catch (e) {}
    }
    signals.conditionalFormattingCount = Math.min(cfCount, 50);

    // ── Null Rows ────────────────────────────────────────────────────────────
    try {
      const emptyRows = document.querySelectorAll(
        '[class*="null-row"], [class*="empty-row"], [class*="ag-row-blank"], [class*="blank-row"]'
      );
      signals.nullRowsVisible = emptyRows.length > 0;
    } catch (e) { signals.nullRowsVisible = false; }

    // ── Subtotals ────────────────────────────────────────────────────────────
    try {
      const subRows = document.querySelectorAll(
        '[class*="subtotal"], [class*="sub-total"], [class*="total-row"], [class*="grand-total"]'
      );
      signals.subtotalsVisible = subRows.length > 0;
    } catch (e) { signals.subtotalsVisible = false; }

    // ── Hierarchy Depth ──────────────────────────────────────────────────────
    let maxDepth = 0;
    try {
      const hierarchyNodes = document.querySelectorAll(
        '[class*="tree-node"], [class*="ag-group-cell"], [class*="hierarchy"], [class*="tree-item"]'
      );
      hierarchyNodes.forEach(el => {
        const level = parseInt(el.getAttribute('aria-level') || el.getAttribute('data-level') || '0');
        if (!isNaN(level) && level > maxDepth) maxDepth = level;
        // Check padding-left for indentation level
        const paddingLeft = parseInt(window.getComputedStyle(el).paddingLeft);
        if (!isNaN(paddingLeft) && paddingLeft > 0) {
          const estLevel = Math.round(paddingLeft / 18);
          if (estLevel > maxDepth && estLevel < 15) maxDepth = estLevel;
        }
      });
    } catch (e) {}
    signals.hierarchyDepth = maxDepth > 0 ? maxDepth : null;

    // ── Performance Timing (from PerformanceAPI — accessible in isolated world) ─
    try {
      if (window.performance) {
        const entries = performance.getEntriesByType('resource');
        let gcTime = 0, apiTime = 0;
        entries.forEach(e => {
          const url = e.name.toLowerCase();
          const dur = Math.round(e.duration);
          if (url.includes('graphcube') || url.includes('cube') || url.includes('execute')) {
            if (dur > gcTime) gcTime = dur;
          }
          if ((url.includes('/api/') || url.includes('/report') || url.includes('/measure')) && dur > apiTime) {
            apiTime = dur;
          }
        });
        if (gcTime > 0) signals.graphCubeTime = gcTime;
        if (apiTime > 0) signals.webApiTime = apiTime;
      }
    } catch (e) {}

    // ── Chain-linked & Factory Settings ─────────────────────────────────────
    try {
      signals.chainLinkedReport = !![
        '[class*="chained-report"]', '[class*="chain-link"]', '[class*="linked-report"]',
      ].some(s => document.querySelector(s));

      signals.factorySettings = !![
        '[class*="factory-setting"]', '[class*="factorySetting"]', '[data-factory="true"]',
      ].some(s => document.querySelector(s));
    } catch (e) {}

    return signals;
  }

  // ─── Apply DOM Signals to reportConfig ─────────────────────────────────────
  function applyDomSignals(data) {
    if (data.reportName && !reportConfig.reportName) {
      reportConfig.reportName = data.reportName;
      addSignal('success', `📄 Report: "${data.reportName}"`);
    }
    if (data.workspace && !reportConfig.workspace) {
      reportConfig.workspace = data.workspace;
      addSignal('info', `📁 Workspace: ${data.workspace}`);
    }
    if (data.detectedType && !reportConfig.detectedReportType) {
      reportConfig.detectedReportType = data.detectedType;
      addSignal('info', `🏷️ Type: ${data.detectedType.replace(/_/g, ' ')}`);
    }
    if (data.columnCount > 0) {
      reportConfig.columnCount = data.columnCount;
    }
    if (data.kpiCount > 0) {
      reportConfig.kpiCount = Math.max(reportConfig.kpiCount || 0, data.kpiCount);
      addSignal(data.kpiCount > 15 ? 'warn' : 'success',
        `📊 Measures: ~${data.kpiCount} detected`,
        data.kpiCount > 15 ? 'Consider reducing — high count impacts load time' : null);
    }
    if (data.rowCountEstimate > 0 && !reportConfig.rowCount) {
      reportConfig.rowCount = data.rowCountEstimate;
      addSignal('info', `📋 Rows: ~${data.rowCountEstimate.toLocaleString()} (estimated)`);
    }
    if (data.namedSetCount > 0) {
      reportConfig.namedSetCount = Math.max(reportConfig.namedSetCount, data.namedSetCount);
      addSignal('success', `✅ Named Sets: ${data.namedSetCount} found`);
    }
    if (data.filterCount > 0) {
      reportConfig.filterCount = Math.max(reportConfig.filterCount, data.filterCount);
      addSignal('info', `🔽 Filters: ${data.filterCount} detected`);
    }
    if (data.hierarchyDepth > 0) {
      reportConfig.hierarchyDepth = data.hierarchyDepth;
      addSignal(data.hierarchyDepth > 5 ? 'warn' : 'info',
        `🌳 Hierarchy depth: ${data.hierarchyDepth} levels`);
    }
    if (data.conditionalFormattingCount > 0) {
      reportConfig.conditionalFormattingCount = data.conditionalFormattingCount;
      addSignal('warn', `⚠️ Conditional Formatting detected`);
    }
    if (data.graphCubeTime > 0) {
      reportConfig.graphCubeTime = data.graphCubeTime;
      addSignal('success', `⏱️ Graph Cube: ${data.graphCubeTime}ms`);
    }
    if (data.webApiTime > 0) {
      reportConfig.webApiTime = data.webApiTime;
      addSignal('info', `⏱️ Web API: ${data.webApiTime}ms`);
    }
    reportConfig.nullRowsVisible = data.nullRowsVisible || reportConfig.nullRowsVisible;
    reportConfig.subtotalsVisible = data.subtotalsVisible || reportConfig.subtotalsVisible;
    reportConfig.chainLinkedReport = data.chainLinkedReport || reportConfig.chainLinkedReport;
    reportConfig.factorySettings = data.factorySettings || reportConfig.factorySettings;

    if (data.nullRowsVisible) addSignal('warn', '⚠️ Null rows visible (+load time)');
    if (data.subtotalsVisible) addSignal('warn', '⚠️ Subtotals visible (+computation)');

    renderSignals();
    updateConfidence();
  }

  // ─── Message Handler from inject.js (deep scan API data) ──────────────────
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'O9_OPTIMIZER_EXT') return;
    const { type, data } = event.data;

    switch (type) {
      case 'INJECT_READY':
        addSignal('success', '🔌 Deep scan engine loaded');
        updateStatusBadge('ready', 'Ready — API intercept active');
        break;
      case 'TIMING_UPDATE':
        if (data.graphCubeTime > 0) {
          reportConfig.graphCubeTime = data.graphCubeTime;
          addSignal('success', `⏱️ Graph Cube: ${data.graphCubeTime}ms`);
        }
        if (data.webApiTime > 0) reportConfig.webApiTime = data.webApiTime;
        break;
      case 'TENANT_SETTINGS':
        if (data.maxIntersection) {
          reportConfig.maxIntersection = data.maxIntersection;
          addSignal('success', `🔢 Max Intersection: ${data.maxIntersection.toLocaleString()}`);
        }
        break;
      case 'NAMED_SETS':
        reportConfig.namedSetCount = Math.max(reportConfig.namedSetCount, data.count);
        addSignal('success', `✅ Named Sets (API): ${data.count}`);
        break;
      case 'MEASURES_UPDATE':
        reportConfig.kpiCount = Math.max(reportConfig.kpiCount || 0, data.total);
        reportConfig.reportingMeasuresCount = data.reporting;
        reportConfig.transientMeasuresCount = data.transient;
        if (data.total > 0) {
          addSignal(data.total > 15 ? 'warn' : 'success',
            `📊 Measures (API): ${data.total}`,
            data.reporting > 0 ? `${data.reporting} reporting, ${data.transient} transient` : null);
        }
        break;
      case 'FILTER_UPDATE':
        reportConfig.filterTypes = { measure: data.measure, member: data.member, post: data.post, association: data.association };
        reportConfig.hasFavouriteFilters = data.hasFavourites;
        if (data.association > 0) addSignal('warn', `⚠️ Association filters: ${data.association} (+15% load)`);
        break;
      case 'REPORT_CONFIG':
        if (data.reportType && !reportConfig.detectedReportType) reportConfig.detectedReportType = data.reportType;
        if (data.hierarchyDepth) reportConfig.hierarchyDepth = data.hierarchyDepth;
        if (data.conditionalFormattingRules > 0) {
          reportConfig.conditionalFormattingCount = data.conditionalFormattingRules;
          addSignal('warn', `⚠️ Conditional Formatting: ${data.conditionalFormattingRules} rules (API)`);
        }
        reportConfig.factorySettings = data.factorySettings || reportConfig.factorySettings;
        break;
      case 'API_CAPTURED':
        reportConfig.apiResponseCount++;
        break;
      case 'DEEP_SCAN_PROGRESS':
        updateDeepScanProgress(Math.round((data.elapsed / data.total) * 100));
        break;
      case 'SCAN_COMPLETE':
        addSignal('success', `✅ API scan complete — ${reportConfig.apiResponseCount} responses captured`);
        finalizeScan('deep');
        break;
    }
  });

  // ─── Signal Log ─────────────────────────────────────────────────────────────
  function addSignal(status, message, detail = null) {
    const entry = { status, message, detail, time: Date.now() };
    signalLog.unshift(entry);
    if (signalLog.length > 30) signalLog.pop();
    renderSignals();
    updateConfidence();
  }

  function updateConfidence() {
    let score = 0;
    if (reportConfig.reportName) score += 15;
    if (reportConfig.kpiCount > 0) score += 15;
    if (reportConfig.rowCount > 0) score += 10;
    if (reportConfig.graphCubeTime > 0) score += 15;
    if (reportConfig.webApiTime > 0) score += 10;
    if (reportConfig.namedSetCount > 0) score += 10;
    if (reportConfig.filterCount > 0) score += 10;
    if (reportConfig.conditionalFormattingCount > 0) score += 5;
    if (reportConfig.maxIntersection > 0) score += 10;
    reportConfig.confidence = Math.min(100, score);
    updateConfidenceBar();
  }

  // ─── Scan Execution ─────────────────────────────────────────────────────────
  function startScan() {
    reportConfig = createEmptyConfig();
    signalLog = [];
    scanStartTime = Date.now();

    const scanBtn = document.getElementById('o9-scan-btn');
    const scanLabel = document.getElementById('o9-scan-btn-label');
    const analyzeBtn = document.getElementById('o9-analyze-btn');
    const previewSection = document.getElementById('o9-preview-section');
    const confSection = document.getElementById('o9-confidence-section');
    const deepProgress = document.getElementById('o9-deep-progress');

    if (scanBtn) scanBtn.disabled = true;
    if (scanLabel) scanLabel.textContent = 'Scanning...';
    if (analyzeBtn) { analyzeBtn.disabled = true; analyzeBtn.style.opacity = '0.5'; }
    if (previewSection) previewSection.style.display = 'none';
    if (confSection) confSection.style.display = 'none';
    if (deepProgress) deepProgress.style.display = 'none';

    updateStatusBadge('scanning', scanMode === 'deep' ? '🔬 Deep scanning...' : '⚡ Fast scanning...');
    addSignal('info', `${scanMode === 'deep' ? '🔬 Deep' : '⚡ Fast'} scan started`);

    if (scanMode === 'fast') {
      runFastScan();
    } else {
      runDeepScan();
    }
  }

  // Fast Scan: DOM only, runs entirely in content.js (no inject.js needed)
  function runFastScan() {
    // First pass immediately
    const signals1 = scanDOMDirect();
    applyDomSignals(signals1);

    // Second pass after 1.5s (for late-rendering Angular components)
    setTimeout(() => {
      const signals2 = scanDOMDirect();
      applyDomSignals(signals2);
    }, 1500);

    // Finalize after 2.5s
    setTimeout(() => {
      finalizeScan('fast');
    }, 2500);
  }

  // Deep Scan: DOM first, then request API interception via inject.js
  function runDeepScan() {
    const deepProgress = document.getElementById('o9-deep-progress');
    if (deepProgress) deepProgress.style.display = 'block';

    // DOM pass first
    const signals = scanDOMDirect();
    applyDomSignals(signals);

    // Ask background.js to inject inject.js via scripting API (bypasses CSP)
    chrome.runtime.sendMessage({ type: 'INJECT_JS_INTO_TAB' }, (response) => {
      if (response?.success) {
        addSignal('success', '🔌 API interceptor loaded — listening for requests...');
        // Tell inject.js to start deep scan
        setTimeout(() => {
          window.postMessage({ source: 'O9_OPTIMIZER_CONTENT', type: 'START_DEEP_SCAN' }, '*');
        }, 200);
      } else {
        addSignal('warn', '⚠️ API interceptor unavailable — using DOM data only');
        // Still finalize with DOM data
        setTimeout(() => finalizeScan('fast'), 2000);
      }
    });

    // Periodic DOM re-scan during deep scan
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 3000;
      const signals = scanDOMDirect();
      applyDomSignals(signals);
      updateDeepScanProgress(Math.round((elapsed / 12000) * 100));
      if (elapsed >= 12000) {
        clearInterval(interval);
        // inject.js should call SCAN_COMPLETE, but add a safety timeout
        setTimeout(() => finalizeScan('deep'), 1000);
      }
    }, 3000);
  }

  function finalizeScan(mode) {
    reportConfig.capturedAt = new Date().toISOString();
    reportConfig.scanMode = mode;
    const elapsed = ((Date.now() - scanStartTime) / 1000).toFixed(1);

    addSignal('success',
      `✅ Scan complete in ${elapsed}s`,
      `${reportConfig.confidence}% confidence · ${reportConfig.apiResponseCount} API responses`
    );

    updateStatusBadge('complete', '✅ Scan complete');
    enableAnalyzeButton();

    const scanBtn = document.getElementById('o9-scan-btn');
    const scanLabel = document.getElementById('o9-scan-btn-label');
    if (scanBtn) { scanBtn.disabled = false; }
    if (scanLabel) scanLabel.textContent = '🔄 Re-scan';
  }

  // ─── Send to Optimizer ─────────────────────────────────────────────────────
  function sendToOptimizer() {
    if (!reportConfig.capturedAt) {
      reportConfig.capturedAt = new Date().toISOString();
    }
    // Ensure at least the URL-derived data is set
    if (!reportConfig.reportName) {
      const urlSignals = scanDOMDirect();
      applyDomSignals(urlSignals);
    }

    addSignal('info', '🚀 Opening o9 Optimizer...');

    chrome.runtime.sendMessage({
      type: 'SEND_TO_OPTIMIZER',
      payload: reportConfig,
      optimizerUrl: settings.optimizerUrl,
    }, (response) => {
      const btn = document.getElementById('o9-analyze-btn');
      if (response?.success) {
        if (btn) {
          btn.textContent = '✅ Opened in Optimizer!';
          btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          setTimeout(() => {
            btn.textContent = '🚀 Analyze in Optimizer';
            btn.style.background = '';
          }, 3000);
        }
        addSignal('success', '✅ Report sent to o9 Optimizer!');
      } else {
        addSignal('error', '❌ Failed — is the Optimizer app running?');
        // Open app anyway so user can see it
        chrome.runtime.sendMessage({
          type: 'OPEN_OPTIMIZER_ONLY',
          optimizerUrl: settings.optimizerUrl,
        });
      }
    });
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────
  function updateStatusBadge(state, label) {
    const badge = document.getElementById('o9-status-badge');
    if (badge) { badge.textContent = label; badge.className = `o9-status ${state}`; }
  }

  function updateDeepScanProgress(pct) {
    const wrap = document.getElementById('o9-deep-progress');
    const fill = document.getElementById('o9-deep-progress-fill');
    const label = document.getElementById('o9-deep-progress-label');
    if (wrap) wrap.style.display = 'block';
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `Deep scanning APIs... ${pct}%`;
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
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    renderPreviewGrid();
    const previewSection = document.getElementById('o9-preview-section');
    if (previewSection) previewSection.style.display = 'block';
  }

  function renderPreviewGrid() {
    const grid = document.getElementById('o9-preview-grid');
    if (!grid) return;
    const items = [
      { label: 'Measures', value: reportConfig.kpiCount || '?', warn: (reportConfig.kpiCount || 0) > 15 },
      { label: 'Rows', value: reportConfig.rowCount ? `~${Math.round(reportConfig.rowCount / 1000)}K` : '?', warn: (reportConfig.rowCount || 0) > 50000 },
      { label: 'GC Time', value: reportConfig.graphCubeTime ? `${reportConfig.graphCubeTime}ms` : '?', warn: (reportConfig.graphCubeTime || 0) > 1500 },
      { label: 'Named Sets', value: reportConfig.namedSetCount, warn: false },
      { label: 'CF Rules', value: reportConfig.conditionalFormattingCount || 0, warn: reportConfig.conditionalFormattingCount > 0 },
      { label: 'Confidence', value: `${reportConfig.confidence}%`, warn: reportConfig.confidence < 40 },
    ];
    grid.innerHTML = items.map(i => `
      <div class="o9-preview-item ${i.warn ? 'warn' : ''}">
        <div class="o9-preview-value">${i.value}</div>
        <div class="o9-preview-label">${i.label}</div>
      </div>`).join('');
  }

  function renderSignals() {
    const list = document.getElementById('o9-signals-list');
    if (!list) return;
    if (signalLog.length === 0) {
      list.innerHTML = '<div class="o9-signal-empty">Click "Start Scan" to begin</div>';
      return;
    }
    list.innerHTML = signalLog.slice(0, 14).map(s => `
      <div class="o9-signal-item ${s.status}">
        <div class="o9-signal-text">
          <span class="o9-signal-msg">${s.message}</span>
          ${s.detail ? `<span class="o9-signal-detail">${s.detail}</span>` : ''}
        </div>
      </div>`).join('');
  }

  function setScanMode(mode) {
    scanMode = mode;
    updateScanModeUI();
  }

  function updateScanModeUI() {
    const fast = document.getElementById('o9-btn-fast');
    const deep = document.getElementById('o9-btn-deep');
    if (fast) fast.classList.toggle('active', scanMode === 'fast');
    if (deep) deep.classList.toggle('active', scanMode === 'deep');
  }

  function toggleCollapse() {
    sidebarCollapsed = !sidebarCollapsed;
    const body = document.getElementById('o9-sidebar-body');
    const btn = document.getElementById('o9-sidebar-collapse');
    const sidebar = document.getElementById('o9-optimizer-sidebar');
    if (body) body.style.display = sidebarCollapsed ? 'none' : 'flex';
    if (btn) btn.textContent = sidebarCollapsed ? '▶' : '◀';
    if (sidebar) {
      sidebar.style.width = sidebarCollapsed ? '42px' : '320px';
      sidebar.style.minWidth = sidebarCollapsed ? '42px' : '320px';
    }
  }

  // ─── Build Sidebar ─────────────────────────────────────────────────────────
  function buildSidebar() {
    if (document.getElementById('o9-optimizer-sidebar')) return; // already exists

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
          <button id="o9-sidebar-collapse" title="Collapse">◀</button>
          <button id="o9-sidebar-close" title="Close">✕</button>
        </div>
      </div>
      <div id="o9-sidebar-body">
        <div class="o9-section o9-tenant-section">
          <div id="o9-tenant-host">🌐 ${window.location.hostname}</div>
          <div id="o9-status-badge" class="o9-status idle">Ready</div>
        </div>
        <div class="o9-section">
          <div class="o9-section-label">SCAN MODE</div>
          <div class="o9-scan-toggle">
            <button id="o9-btn-fast" class="o9-toggle-btn active">
              ⚡ Fast<span class="o9-toggle-hint">DOM · ~2s</span>
            </button>
            <button id="o9-btn-deep" class="o9-toggle-btn">
              🔬 Deep<span class="o9-toggle-hint">API+DOM · ~12s</span>
            </button>
          </div>
        </div>
        <div class="o9-section">
          <button id="o9-scan-btn" class="o9-btn o9-btn-scan">
            <span id="o9-scan-btn-label">🔍 Start Scan</span>
          </button>
          <div id="o9-deep-progress" class="o9-progress-wrap" style="display:none;">
            <div class="o9-progress-bar">
              <div id="o9-deep-progress-fill" class="o9-progress-fill" style="width:0%"></div>
            </div>
            <span id="o9-deep-progress-label">Scanning APIs...</span>
          </div>
        </div>
        <div class="o9-section">
          <div class="o9-section-label">DETECTED SIGNALS</div>
          <div id="o9-signals-list">
            <div class="o9-signal-empty">Click "Start Scan" to begin detection</div>
          </div>
        </div>
        <div class="o9-section" id="o9-confidence-section" style="display:none;">
          <div class="o9-section-label">EXTRACTION CONFIDENCE</div>
          <div class="o9-confidence-bar">
            <div id="o9-confidence-fill" class="o9-confidence-fill" style="width:0%"></div>
          </div>
          <div id="o9-confidence-label" class="o9-confidence-label">0% confidence</div>
        </div>
        <div class="o9-section" id="o9-preview-section" style="display:none;">
          <div class="o9-section-label">QUICK PREVIEW</div>
          <div id="o9-preview-grid" class="o9-preview-grid"></div>
        </div>
        <div class="o9-section o9-cta-section">
          <button id="o9-analyze-btn" class="o9-btn o9-btn-analyze" disabled>
            🚀 Analyze in Optimizer
          </button>
          <div class="o9-analyze-hint">Auto-fills form & opens Optimizer Web App</div>
        </div>
      </div>
    `;

    const floatBtn = document.createElement('button');
    floatBtn.id = 'o9-sidebar-float-btn';
    floatBtn.title = 'o9 Report Optimizer';
    floatBtn.innerHTML = '<span>o9</span>';
    floatBtn.style.display = 'none';

    document.body.appendChild(sidebar);
    document.body.appendChild(floatBtn);

    document.getElementById('o9-sidebar-close').onclick = () => {
      sidebar.style.display = 'none';
      floatBtn.style.display = 'flex';
    };
    floatBtn.onclick = () => {
      sidebar.style.display = 'flex';
      floatBtn.style.display = 'none';
    };
    document.getElementById('o9-sidebar-collapse').onclick = toggleCollapse;
    document.getElementById('o9-btn-fast').onclick = () => setScanMode('fast');
    document.getElementById('o9-btn-deep').onclick = () => setScanMode('deep');
    document.getElementById('o9-scan-btn').onclick = startScan;
    document.getElementById('o9-analyze-btn').onclick = sendToOptimizer;
  }

  // ─── Initialize ─────────────────────────────────────────────────────────────
  // Wait for DOM to be ready before building sidebar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSidebar);
  } else {
    buildSidebar();
  }
  updateScanModeUI();

  // Run an immediate passive scan so basic signals populate right away
  setTimeout(() => {
    const passiveSignals = scanDOMDirect();
    applyDomSignals(passiveSignals);
    updateStatusBadge('ready', 'Ready to scan');
  }, 1500);

})();
