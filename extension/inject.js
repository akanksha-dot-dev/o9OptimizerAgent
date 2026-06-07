/**
 * inject.js — o9 Report Optimizer Extension
 * Runs in the PAGE's MAIN WORLD (same JavaScript context as the o9 app).
 * This lets us:
 *   1. Monkey-patch window.fetch and XMLHttpRequest to intercept API responses
 *   2. Read the page DOM for report configuration signals
 *   3. Access window.performance for timing data
 * 
 * Communicates back to content.js via window.postMessage (bridged world boundary).
 */

(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────────────────
  const EXTENSION_MSG_PREFIX = 'O9_OPTIMIZER_EXT';
  
  // o9 API URL patterns to watch for (lowercase matching)
  const O9_API_PATTERNS = [
    'report', 'config', 'cube', 'graphcube', 'measure', 'filter',
    'namedset', 'named-set', 'tenant', 'workspace', 'view', 'kpi',
    'settings', 'plan', 'forecast', 'column', 'pivot'
  ];

  // Known o9 response JSON keys that indicate report configuration
  const CONFIG_KEYS = [
    'measures', 'filters', 'namedSets', 'namedSet', 'reportType', 'viewConfig',
    'reportConfig', 'columnDefs', 'measureGroups', 'filterConfig', 'pivotConfig',
    'maxIntersection', 'tenantSettings', 'conditionalFormatting', 'subtotalConfig',
    'hierarchyConfig', 'dimensionConfig', 'reportingMeasures', 'transientMeasures',
    'factorySettings', 'chainedReports', 'postFilter', 'memberFilter', 'measureFilter'
  ];

  // Accumulated data across all intercepted API calls
  const capturedData = {
    apiResponses: [],
    timings: {},
    reportConfig: null,
    measureCount: 0,
    filterConfig: null,
    tenantSettings: null,
    namedSets: [],
    startTime: Date.now(),
  };

  let scanMode = 'fast'; // 'fast' | 'deep'
  let scanActive = false;

  // ─── Utility ──────────────────────────────────────────────────────────────
  function isO9ApiUrl(url) {
    const lower = url.toLowerCase();
    return O9_API_PATTERNS.some(p => lower.includes(p));
  }

  function hasConfigKeys(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 3) return false;
    const keys = Object.keys(obj);
    return CONFIG_KEYS.some(ck => keys.includes(ck)) ||
      keys.some(k => hasConfigKeys(obj[k], depth + 1));
  }

  function safeParseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function postToContent(type, data) {
    window.postMessage({ source: EXTENSION_MSG_PREFIX, type, data }, '*');
  }

  // ─── Timing via PerformanceAPI ─────────────────────────────────────────────
  function collectPerformanceTiming() {
    const entries = performance.getEntriesByType('resource');
    let maxCubeDuration = 0;
    let maxApiDuration = 0;

    entries.forEach(entry => {
      const url = entry.name.toLowerCase();
      const duration = Math.round(entry.duration);

      if (url.includes('graphcube') || url.includes('cube') || url.includes('execute')) {
        if (duration > maxCubeDuration) maxCubeDuration = duration;
      }
      if (isO9ApiUrl(url) && duration > maxApiDuration) {
        maxApiDuration = duration;
      }
    });

    capturedData.timings.graphCubeTime = maxCubeDuration || null;
    capturedData.timings.webApiTime = maxApiDuration || null;

    if (maxCubeDuration || maxApiDuration) {
      postToContent('TIMING_UPDATE', capturedData.timings);
    }
  }

  // ─── API Response Processor ────────────────────────────────────────────────
  function processApiResponse(url, responseText, duration) {
    const parsed = safeParseJson(responseText);
    if (!parsed) return;

    const lower = url.toLowerCase();

    // Skip tiny responses (likely not config data)
    if (responseText.length < 100) return;

    // Check if this response contains report configuration
    if (!hasConfigKeys(parsed)) return;

    // Capture API response (deep scan only)
    if (scanMode === 'deep') {
      capturedData.apiResponses.push({
        url: url.replace(/https?:\/\/[^/]+/, ''), // strip host for privacy
        duration,
        keys: Object.keys(parsed).slice(0, 20),
      });
    }

    // ── Extract: Tenant Settings ────────────────────────────────────────────
    if (lower.includes('tenant') || lower.includes('settings')) {
      const maxInt = parsed.maxIntersection || parsed.maxIntersections ||
        parsed.tenantSettings?.maxIntersection || parsed.settings?.maxIntersection;
      if (maxInt) {
        capturedData.tenantSettings = { maxIntersection: maxInt };
        postToContent('TENANT_SETTINGS', capturedData.tenantSettings);
      }
    }

    // ── Extract: Named Sets ─────────────────────────────────────────────────
    const namedSets = parsed.namedSets || parsed.namedSet || parsed.data?.namedSets;
    if (Array.isArray(namedSets) && namedSets.length > 0) {
      capturedData.namedSets = namedSets;
      postToContent('NAMED_SETS', { count: namedSets.length });
    }

    // ── Extract: Measures ───────────────────────────────────────────────────
    const measures = parsed.measures || parsed.measureGroups?.flatMap(g => g.measures) ||
      parsed.reportConfig?.measures || parsed.columnDefs?.filter(c => c.isMeasure);
    if (Array.isArray(measures) && measures.length > 0) {
      capturedData.measureCount = Math.max(capturedData.measureCount, measures.length);

      // Detect reporting measures vs transient
      const reportingMeasures = measures.filter(m =>
        m.type === 'reporting' || m.measureType === 'REPORTING' || m.isReporting
      );
      const transientMeasures = measures.filter(m =>
        m.type === 'transient' || m.measureType === 'TRANSIENT' || m.isTransient
      );

      postToContent('MEASURES_UPDATE', {
        total: capturedData.measureCount,
        reporting: reportingMeasures.length,
        transient: transientMeasures.length,
        hasSequenceOrder: measures.every((m, i) => m.order === i || m.sortOrder === i),
      });
    }

    // ── Extract: Filter Configuration ───────────────────────────────────────
    const filterConfig = parsed.filters || parsed.filterConfig || parsed.reportConfig?.filters;
    if (filterConfig) {
      capturedData.filterConfig = filterConfig;
      const filters = Array.isArray(filterConfig) ? filterConfig : Object.values(filterConfig);
      const measureFilters = filters.filter(f => f.type === 'measure' || f.filterType === 'MEASURE');
      const memberFilters = filters.filter(f => f.type === 'member' || f.filterType === 'MEMBER');
      const postFilters = filters.filter(f => f.type === 'post' || f.filterType === 'POST');
      const assocFilters = filters.filter(f =>
        f.type === 'association' || f.filterType === 'ASSOCIATION' ||
        f.isAssociation || f.associationMeasure
      );
      const isFavourite = filters.some(f => f.isFavourite || f.favourite || f.saved);

      postToContent('FILTER_UPDATE', {
        total: filters.length,
        measure: measureFilters.length,
        member: memberFilters.length,
        post: postFilters.length,
        association: assocFilters.length,
        hasFavourites: isFavourite,
        refModelOrder: parsed.filterRefModelOrder || parsed.orderedByRefModel || false,
      });
    }

    // ── Extract: Report Config (comprehensive) ──────────────────────────────
    const rc = parsed.reportConfig || parsed.config || parsed;
    if (rc.reportType || rc.viewType || rc.pivotConfig) {
      capturedData.reportConfig = rc;
      postToContent('REPORT_CONFIG', {
        reportType: rc.reportType || rc.viewType || null,
        hierarchyDepth: rc.hierarchyDepth || rc.maxHierarchyLevel ||
          rc.hierarchyConfig?.maxDepth || null,
        hideNullRows: rc.hideNullRows || rc.nullRowsHidden || rc.filterNulls || false,
        showSubtotals: rc.showSubtotals || rc.subtotalsEnabled || false,
        conditionalFormattingRules: (rc.conditionalFormatting || []).length,
        factorySettings: rc.factorySettings || rc.useFactorySettings || false,
        chainedReports: rc.chainedReports || rc.chainLinked || rc.parentReport || false,
        namedSetsInView: rc.namedSetsInView || rc.viewNamedSets || false,
      });
    }

    // ── Extract: Timing from this call ─────────────────────────────────────
    if (duration > 0) {
      if (lower.includes('graphcube') || lower.includes('cube') || lower.includes('execute')) {
        capturedData.timings.graphCubeTime = Math.max(
          capturedData.timings.graphCubeTime || 0, duration
        );
      }
      capturedData.timings.webApiTime = Math.max(
        capturedData.timings.webApiTime || 0, duration
      );
      postToContent('TIMING_UPDATE', capturedData.timings);
    }

    // Broadcast general API capture event (deep scan mode)
    postToContent('API_CAPTURED', {
      url: url.replace(/https?:\/\/[^/]+/, ''),
      topKeys: Object.keys(parsed).slice(0, 8),
    });
  }

  // ─── Monkey-patch: fetch ──────────────────────────────────────────────────
  const _originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const t0 = performance.now();

    const response = await _originalFetch.apply(this, args);

    if (scanActive && isO9ApiUrl(url)) {
      const duration = Math.round(performance.now() - t0);
      // Clone response so we can read the body without consuming it
      const clone = response.clone();
      clone.text().then(text => {
        processApiResponse(url, text, duration);
      }).catch(() => {});
    }

    return response;
  };

  // ─── Monkey-patch: XMLHttpRequest ─────────────────────────────────────────
  const _XHR_open = XMLHttpRequest.prototype.open;
  const _XHR_send = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._o9_url = url;
    this._o9_t0 = 0;
    return _XHR_open.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this._o9_t0 = performance.now();
    this.addEventListener('load', function () {
      if (scanActive && this._o9_url && isO9ApiUrl(this._o9_url)) {
        const duration = Math.round(performance.now() - this._o9_t0);
        processApiResponse(this._o9_url, this.responseText, duration);
      }
    });
    return _XHR_send.apply(this, args);
  };

  // ─── DOM Scanner ──────────────────────────────────────────────────────────
  function scanDOM() {
    const signals = {};

    // ── Report Name ─────────────────────────────────────────────────────────
    const titleCandidates = [
      document.querySelector('[class*="report-title"]'),
      document.querySelector('[class*="reportTitle"]'),
      document.querySelector('[class*="view-name"]'),
      document.querySelector('[class*="page-title"]'),
      document.querySelector('h1'),
      document.querySelector('[class*="breadcrumb"] > *:last-child'),
      document.querySelector('[class*="workspace-name"]'),
      document.querySelector('[class*="tab-title"]'),
    ].filter(Boolean);

    signals.reportName = titleCandidates.length > 0
      ? titleCandidates[0].textContent.trim()
      : document.title.replace(' - o9 Solutions', '').trim();

    // ── URL Parsing ─────────────────────────────────────────────────────────
    const hash = window.location.hash || '';
    const hashParts = hash.replace('#/', '').split('/').filter(Boolean);
    signals.workspace = hashParts[0] || null;
    signals.reportUrlHint = hash.toLowerCase();

    // ── Report Type Detection from URL + title ──────────────────────────────
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
    const columnHeaderSelectors = [
      '.ag-header-cell', '[class*="col-header"]', '[class*="measure-header"]',
      '[class*="column-header"]', '[class*="header-cell"]', 'th',
      '[class*="grid-header"]', '[role="columnheader"]',
    ];
    let maxCols = 0;
    columnHeaderSelectors.forEach(sel => {
      const count = document.querySelectorAll(sel).length;
      if (count > maxCols) maxCols = count;
    });
    signals.columnCount = maxCols > 0 ? maxCols : null;
    signals.kpiCount = maxCols > 2 ? maxCols - 2 : null; // subtract row/name columns

    // ── Row Count Estimation ────────────────────────────────────────────────
    const rowSelectors = [
      '.ag-row', '[class*="grid-row"]', '[class*="data-row"]',
      'tbody > tr', '[role="row"]'
    ];
    let maxRows = 0;
    rowSelectors.forEach(sel => {
      const count = document.querySelectorAll(sel).length;
      if (count > maxRows) maxRows = count;
    });
    // Grid virtualization means we only see rendered rows, estimate total
    signals.visibleRows = maxRows;
    signals.rowCountEstimate = maxRows > 0 ? maxRows * 3 : null; // rough virtualization factor

    // ── Named Sets Detection ────────────────────────────────────────────────
    const namedSetSelectors = [
      '[class*="named-set"]', '[class*="namedSet"]', '[class*="named_set"]',
      '[class*="filter-chip"][class*="set"]', '[data-type="named-set"]',
    ];
    let namedSetCount = 0;
    namedSetSelectors.forEach(sel => {
      namedSetCount = Math.max(namedSetCount, document.querySelectorAll(sel).length);
    });
    signals.namedSetCount = namedSetCount;

    // ── Filter Panel ────────────────────────────────────────────────────────
    const filterSelectors = [
      '[class*="filter-panel"] [class*="filter-item"]',
      '[class*="filterPanel"] [class*="filter"]',
      '[class*="sidebar-filter"]',
      '[class*="filter-chip"]',
      '[data-type="filter"]',
    ];
    let filterCount = 0;
    filterSelectors.forEach(sel => {
      const count = document.querySelectorAll(sel).length;
      if (count > filterCount) filterCount = count;
    });
    signals.filterCount = filterCount;

    // ── Conditional Formatting Detection ────────────────────────────────────
    const cfSelectors = [
      '[class*="conditional-format"]', '[class*="conditionalFormat"]',
      '[class*="cf-rule"]', '[class*="format-rule"]',
      '[style*="background-color"]:not([class*="header"])',
    ];
    let cfCount = 0;
    cfSelectors.forEach(sel => {
      const count = document.querySelectorAll(sel).length;
      if (count > cfCount) cfCount = count;
    });
    signals.conditionalFormattingCount = Math.min(cfCount, 100); // cap at 100 to avoid false positives

    // ── Null Rows ───────────────────────────────────────────────────────────
    const emptyRows = document.querySelectorAll('[class*="null-row"], [class*="empty-row"], [class*="ag-row-blank"]');
    signals.nullRowsVisible = emptyRows.length > 0;

    // ── Subtotals ───────────────────────────────────────────────────────────
    const subtotalRows = document.querySelectorAll('[class*="subtotal"], [class*="sub-total"], [class*="total-row"]');
    signals.subtotalsVisible = subtotalRows.length > 0;

    // ── Hierarchy Depth ─────────────────────────────────────────────────────
    const hierarchySelectors = [
      '[class*="tree-node"]', '[class*="hierarchy-node"]', '[class*="tree-item"]',
      '[class*="ag-group-cell"]',
    ];
    let maxDepth = 0;
    hierarchySelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const level = parseInt(el.getAttribute('data-level') ||
          el.getAttribute('aria-level') || '0') || 0;
        if (level > maxDepth) maxDepth = level;
        // Also check indentation via padding-left style
        const style = el.style.paddingLeft || '';
        const px = parseInt(style);
        if (!isNaN(px)) {
          const estimatedLevel = Math.round(px / 18);
          if (estimatedLevel > maxDepth) maxDepth = estimatedLevel;
        }
      });
    });
    signals.hierarchyDepth = maxDepth > 0 ? maxDepth : null;

    // ── Chain-linked report detection ────────────────────────────────────────
    const chainSelectors = [
      '[class*="chained-report"]', '[class*="chain-link"]',
      '[class*="linked-report"]', '[class*="drill-through"]',
    ];
    signals.chainLinkedReport = chainSelectors.some(s => document.querySelector(s));

    // ── Factory settings indicator ───────────────────────────────────────────
    const factorySelectors = [
      '[class*="factory-setting"]', '[class*="factorySetting"]',
      '[class*="factory-config"]', '[data-factory="true"]',
    ];
    signals.factorySettings = factorySelectors.some(s => document.querySelector(s));

    return signals;
  }

  // ─── Full Performance Snapshot ────────────────────────────────────────────
  function capturePerformanceSnapshot() {
    collectPerformanceTiming();
    // Also check navigation timing
    const navEntry = performance.getEntriesByType('navigation')[0];
    if (navEntry) {
      capturedData.timings.pageLoadTime = Math.round(navEntry.loadEventEnd);
    }
  }

  // ─── Message Listener from content.js ────────────────────────────────────
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'O9_OPTIMIZER_CONTENT') return;

    if (event.data.type === 'START_FAST_SCAN') {
      scanMode = 'fast';
      scanActive = false; // Fast scan = DOM only, no API interception
      executeFastScan();
    } else if (event.data.type === 'START_DEEP_SCAN') {
      scanMode = 'deep';
      scanActive = true; // Enable API interception
      executeDeepScan();
    } else if (event.data.type === 'STOP_SCAN') {
      scanActive = false;
      postToContent('SCAN_STOPPED', {});
    }
  });

  // ─── Fast Scan: DOM only ──────────────────────────────────────────────────
  function executeFastScan() {
    postToContent('SCAN_STARTED', { mode: 'fast' });

    // Run immediately
    const domSignals = scanDOM();
    postToContent('DOM_SIGNALS', domSignals);

    // Collect any already-loaded network timing
    capturePerformanceSnapshot();

    // Wait for late DOM rendering, then finalize
    setTimeout(() => {
      const domSignals2 = scanDOM(); // re-scan for late-rendering
      postToContent('DOM_SIGNALS', domSignals2);
      postToContent('SCAN_COMPLETE', {
        mode: 'fast',
        duration: Date.now() - capturedData.startTime,
      });
    }, 2500);
  }

  // ─── Deep Scan: DOM + API interception ────────────────────────────────────
  function executeDeepScan() {
    postToContent('SCAN_STARTED', { mode: 'deep' });

    // DOM first pass
    const domSignals = scanDOM();
    postToContent('DOM_SIGNALS', domSignals);

    // Collect already-loaded performance data
    capturePerformanceSnapshot();

    // Listen for new API calls for 12 seconds
    scanActive = true;

    // Trigger page interactions to force API calls (reload visible data)
    // Simulate a scroll to trigger virtual rendering
    const grid = document.querySelector('[class*="grid"], [class*="ag-body-viewport"], [role="grid"]');
    if (grid) {
      const originalScroll = grid.scrollTop;
      grid.scrollTop = originalScroll + 100;
      setTimeout(() => { grid.scrollTop = originalScroll; }, 300);
    }

    // Progressive updates every 3s
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 3000;
      const domSignals2 = scanDOM();
      postToContent('DOM_SIGNALS', domSignals2);
      capturePerformanceSnapshot();
      postToContent('DEEP_SCAN_PROGRESS', { elapsed, total: 12000 });

      if (elapsed >= 12000) {
        clearInterval(interval);
        scanActive = false;
        postToContent('SCAN_COMPLETE', {
          mode: 'deep',
          duration: elapsed,
          apiResponseCount: capturedData.apiResponses.length,
        });
      }
    }, 3000);
  }

  // ─── Ready Signal ─────────────────────────────────────────────────────────
  postToContent('INJECT_READY', {
    url: window.location.href,
    hash: window.location.hash,
    title: document.title,
  });

})();
