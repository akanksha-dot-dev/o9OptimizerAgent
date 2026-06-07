/**
 * extensionBridge.js
 * Normalizes the raw payload from the browser extension into the
 * exact `form` structure expected by AnalyzerPage.jsx's analyzeReport().
 */

import { POSITIVE_FACTORS, NEGATIVE_FACTORS, REPORT_TYPES, ISSUE_CATEGORIES } from './optimizationRules';

/**
 * Maps extension report config payload → analyzer form fields.
 * @param {Object} payload - Raw ReportConfig from the extension
 * @returns {Object} - Fully populated form object for AnalyzerPage
 */
export function normalizeExtensionPayload(payload) {
  if (!payload || payload.source !== 'o9-optimizer-extension') {
    throw new Error('Invalid extension payload');
  }

  const form = {
    reportName: detectReportName(payload),
    reportType: detectReportType(payload),
    issues: detectIssues(payload),
    rowCount: String(payload.rowCount || ''),
    columnCount: String(payload.columnCount || ''),
    kpiCount: String(payload.kpiCount || ''),
    hierarchyDepth: String(payload.hierarchyDepth || ''),
    dataAge: '',
    userCount: '',
    description: buildAutoDescription(payload),
    graphCubeTime: String(payload.graphCubeTime || ''),
    webApiTime: String(payload.webApiTime || ''),
    maxIntersection: String(payload.maxIntersection || ''),
    positiveFactors: detectPositiveFactors(payload),
    negativeFactors: detectNegativeFactors(payload),
  };

  return form;
}

// ─── Report Name ──────────────────────────────────────────────────────────────
function detectReportName(p) {
  if (p.reportName && p.reportName !== document?.title) return p.reportName;
  if (p.workspace) return `${p.workspace} Report`;
  return `${p.tenantName || 'o9'} Report`;
}

// ─── Report Type ──────────────────────────────────────────────────────────────
function detectReportType(p) {
  const detected = (p.detectedReportType || '').toLowerCase();
  const validTypes = REPORT_TYPES.map(t => t.value);

  // Direct match
  if (validTypes.includes(detected)) return detected;

  // Fuzzy match
  if (detected.includes('demand') || detected.includes('forecast')) return 'demand_planning';
  if (detected.includes('supply') || detected.includes('sourcing')) return 'supply_planning';
  if (detected.includes('inventory')) return 'inventory';
  if (detected.includes('financial') || detected.includes('p&l')) return 'financial';
  if (detected.includes('snop') || detected.includes('s&op')) return 'snop';
  if (detected.includes('exception')) return 'exception';
  if (detected.includes('kpi') || detected.includes('dashboard')) return 'kpi_dashboard';
  if (detected.includes('scenario')) return 'scenario';
  if (detected.includes('control')) return 'control_tower';

  return 'custom';
}

// ─── Issue Detection ──────────────────────────────────────────────────────────
function detectIssues(p) {
  const issues = [];
  const validIssues = ISSUE_CATEGORIES.map(i => i.value);

  // Slow loading signals
  if ((p.graphCubeTime && p.graphCubeTime > 1500) ||
      (p.webApiTime && p.webApiTime > 3000)) {
    if (validIssues.includes('slow_load')) issues.push('slow_load');
  }

  // Too many KPIs
  if (p.kpiCount && p.kpiCount > 15) {
    if (validIssues.includes('too_many_kpis')) issues.push('too_many_kpis');
  }

  // Deep hierarchies
  if (p.hierarchyDepth && p.hierarchyDepth > 5) {
    if (validIssues.includes('hierarchy_deep')) issues.push('hierarchy_deep');
  }

  // High data volume
  if (p.rowCount && p.rowCount > 50000) {
    if (validIssues.includes('data_volume')) issues.push('data_volume');
  }

  // Heavy calculations (many measures + conditional formatting)
  if ((p.kpiCount > 12 && p.conditionalFormattingCount > 0) ||
      (p.reportingMeasuresCount > 3) || (p.transientMeasuresCount > 5)) {
    if (validIssues.includes('calc_heavy')) issues.push('calc_heavy');
  }

  // Layout complexity
  if (p.columnCount && p.columnCount > 20) {
    if (validIssues.includes('layout_complex')) issues.push('layout_complex');
  }

  return issues;
}

// ─── Positive Factor Detection ────────────────────────────────────────────────
function detectPositiveFactors(p) {
  const detected = [];

  // Named Sets used (in any context)
  if (p.namedSetCount > 0) {
    detected.push('named_sets_used');
  }

  // Named Sets in view
  if (p.namedSetsInView || p.namedSetCount > 0) {
    detected.push('namedsets_in_view');
  }

  // Filters as Favourites
  if (p.hasFavouriteFilters) {
    detected.push('filters_favorites');
  }

  // Reporting Measures ≤ 3 (good if detected count is reasonable)
  if (p.reportingMeasuresCount > 0 && p.reportingMeasuresCount <= 3) {
    detected.push('reporting_measures_alt');
  }

  // Measure Group Order (detected from API)
  if (p.hasMeasureGroupOrder) {
    detected.push('measure_sequence_order');
  }

  // Low Max Intersection (below 50k is generally good)
  if (p.maxIntersection && p.maxIntersection < 50000) {
    detected.push('low_max_intersection');
  }

  // Few transient measures (≤ 3 is considered good)
  if (p.transientMeasuresCount !== undefined && p.transientMeasuresCount <= 3) {
    detected.push('few_transient_measures');
  }

  // Filter ref model order
  if (p.filterRefModelOrder) {
    detected.push('filter_ref_model_order');
  }

  // Factory settings
  if (p.factorySettings) {
    detected.push('factory_settings');
  }

  // Measure/Member/Post Filters present
  if (p.filterTypes && (p.filterTypes.measure > 0 || p.filterTypes.member > 0 || p.filterTypes.post > 0)) {
    detected.push('measure_member_post_filter');
  }

  // Chain-linked reports
  if (p.chainLinkedReport) {
    detected.push('chain_linked_reports');
  }

  // Hide null rows
  if (p.nullRowsVisible === false) {
    detected.push('hide_null_rows');
  }

  // Only return factors that exist in the POSITIVE_FACTORS list
  const validValues = POSITIVE_FACTORS.map(f => f.value);
  return detected.filter(d => validValues.includes(d));
}

// ─── Negative Factor Detection ────────────────────────────────────────────────
function detectNegativeFactors(p) {
  const detected = [];

  // Conditional Formatting present
  if (p.conditionalFormattingCount > 0) {
    detected.push('conditional_formatting');
  }

  // Interdependent/Association Filters
  if (p.filterTypes && p.filterTypes.association > 0) {
    detected.push('interdependent_filters');
  }

  // Nulls/Subtotals/Default Measures visible
  if (p.nullRowsVisible || p.subtotalsVisible) {
    detected.push('nulls_subtotals_defaults');
  }

  // Only return factors that exist in NEGATIVE_FACTORS list
  const validValues = NEGATIVE_FACTORS.map(f => f.value);
  return detected.filter(d => validValues.includes(d));
}

// ─── Auto Description ─────────────────────────────────────────────────────────
function buildAutoDescription(p) {
  const parts = [];

  parts.push(`Auto-captured from o9 Platform (${p.tenantHost || 'unknown tenant'}).`);
  parts.push(`Scan mode: ${p.scanMode || 'fast'}.`);
  parts.push(`Confidence: ${p.confidence || 0}%.`);

  if (p.apiResponseCount > 0) {
    parts.push(`${p.apiResponseCount} API responses captured in deep scan.`);
  }

  if (p.workspace) {
    parts.push(`Workspace: ${p.workspace}.`);
  }

  const flags = [];
  if (p.namedSetCount > 0) flags.push(`${p.namedSetCount} named sets`);
  if (p.filterCount > 0) flags.push(`${p.filterCount} filters`);
  if (p.conditionalFormattingCount > 0) flags.push(`${p.conditionalFormattingCount} CF rules`);
  if (p.filterTypes?.association > 0) flags.push(`${p.filterTypes.association} association filter(s)`);

  if (flags.length > 0) {
    parts.push(`Detected: ${flags.join(', ')}.`);
  }

  return parts.join(' ');
}

/**
 * Validates an incoming postMessage event as a legitimate extension bridge message.
 */
export function isValidExtensionMessage(event) {
  return (
    event.data &&
    event.data.type === 'O9_EXTENSION_BRIDGE' &&
    event.data.source === 'o9-optimizer-extension' &&
    event.data.payload &&
    typeof event.data.payload === 'object'
  );
}
