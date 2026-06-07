// o9 Report Optimization Knowledge Base
// Comprehensive rules engine based on o9 Solutions best practices

export const REPORT_TYPES = [
  { value: 'demand_planning', label: 'Demand Planning Report' },
  { value: 'supply_planning', label: 'Supply Planning Report' },
  { value: 'inventory', label: 'Inventory Optimization Report' },
  { value: 'financial', label: 'Financial Planning Report' },
  { value: 'control_tower', label: 'Control Tower Dashboard' },
  { value: 'scenario', label: 'Scenario Analysis Report' },
  { value: 'exception', label: 'Exception Report' },
  { value: 'kpi_dashboard', label: 'KPI Dashboard' },
  { value: 'snop', label: 'S&OP Report' },
  { value: 'custom', label: 'Custom / Ad-Hoc Report' },
];

export const ISSUE_CATEGORIES = [
  { value: 'slow_load', label: 'Slow Loading' },
  { value: 'data_accuracy', label: 'Data Accuracy' },
  { value: 'layout_complex', label: 'Complex Layout' },
  { value: 'too_many_kpis', label: 'Too Many KPIs' },
  { value: 'hierarchy_deep', label: 'Deep Hierarchies' },
  { value: 'calc_heavy', label: 'Heavy Calculations' },
  { value: 'data_volume', label: 'High Data Volume' },
  { value: 'stale_data', label: 'Stale/Outdated Data' },
  { value: 'poor_ux', label: 'Poor User Experience' },
  { value: 'no_exceptions', label: 'No Exception Handling' },
];

// ==========================================
// UI PERFORMANCE FACTORS
// ==========================================

export const POSITIVE_FACTORS = [
  { value: 'named_sets_used', label: 'Named Sets Used', impact: -15, description: 'Named Sets reduce load time by pre-computing member lists' },
  { value: 'filters_favorites', label: 'Filters as Favourites', impact: -10, description: 'Favourite filters pre-cache filter selections for faster loading' },
  { value: 'reporting_measures_alt', label: 'Reporting Measures (≤3 RMs)', impact: -12, description: 'Reporting Measures as alternative to active rules (max 3 per report)' },
  { value: 'measure_sequence_order', label: 'Measures Follow Group Order', impact: -5, description: 'Ordered measures avoid re-sorting overhead in the Graph Cube' },
  { value: 'namedsets_in_view', label: 'Named Sets in Report View', impact: -8, description: 'Named Sets used directly in report views reduce intersection computation' },
  { value: 'low_max_intersection', label: 'Low Max Intersection (Tenant)', impact: -20, description: 'Lower maximum intersection count dramatically improves load time' },
  { value: 'few_transient_measures', label: 'Few Transient/RM Measures', impact: -7, description: 'Limiting transient and reporting measures reduces on-the-fly calculation load' },
  { value: 'filter_ref_model_order', label: 'Filters Follow Ref Model Order', impact: -6, description: 'Filters ordered per the reference model avoid costly re-ordering in queries' },
  { value: 'factory_settings', label: 'Factory Settings Enabled', impact: -10, description: 'Factory settings apply pre-optimized configurations for the tenant' },
  { value: 'measure_member_post_filter', label: 'Measure/Member/Post Filters', impact: -8, description: 'Presence of these filter types enables efficient data pre-filtering' },
  { value: 'chain_linked_reports', label: 'Chain-Linked Reports', impact: -12, description: 'Chain-linked reports share context and reduce redundant data fetches' },
  { value: 'hide_null_rows', label: 'Hide Null Rows', impact: -10, description: 'Hiding null rows reduces rendered row count and speeds up display' },
];

export const NEGATIVE_FACTORS = [
  { value: 'conditional_formatting', label: 'Conditional Formatting', impact: 8, description: 'Conditional formatting increases load time by 5-10% due to per-cell evaluation' },
  { value: 'interdependent_filters', label: 'Interdependent/Association Filters', impact: 15, description: 'Association measure filters create cascading queries that significantly increase load time' },
  { value: 'nulls_subtotals_defaults', label: 'Nulls/Subtotals/Default Measures', impact: 12, description: 'Nulls, subtotals, and default measures add unnecessary computation and rendering overhead' },
];

export const OPTIMIZATION_RULES = [
  // ========== HIERARCHY OPTIMIZATION ==========
  {
    id: 'hier-001',
    title: 'Flatten Over-Deep Hierarchies',
    category: 'Hierarchy & Data Model',
    severity: 'critical',
    triggers: ['hierarchy_deep', 'slow_load', 'calc_heavy'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'snop', 'custom'],
    problem: 'Hierarchies with more than 6-7 levels create exponential data volume growth and dramatically slow down aggregation, disaggregation, and allocation calculations in the o9 Graph Cube.',
    recommendation: 'Audit all hierarchies and reduce depth to 4-5 meaningful levels. Merge intermediate levels that do not add decision-making value. Use attributes for filtering instead of additional hierarchy levels.',
    steps: [
      'Export hierarchy structure from the EKG model configuration',
      'Identify levels that have a 1:1 or near-1:1 parent-child ratio — these are candidates for merging',
      'Evaluate which levels are actually used for planning decisions vs. just for display',
      'Consolidate redundant levels and convert to attributes where appropriate',
      'Re-test aggregation and disaggregation performance after restructuring',
    ],
    impact: 'Up to 60% improvement in calculation and rendering speed',
    effortLevel: 'High',
  },
  {
    id: 'hier-002',
    title: 'Align Hierarchies to Planning Granularity',
    category: 'Hierarchy & Data Model',
    severity: 'high',
    triggers: ['data_accuracy', 'hierarchy_deep', 'calc_heavy'],
    reportTypes: ['demand_planning', 'supply_planning', 'snop', 'financial'],
    problem: 'Misaligned hierarchies (e.g., planning at SKU level but reporting at category level) cause expensive aggregation calculations and potential data allocation inaccuracies.',
    recommendation: 'Ensure the planning granularity matches the reporting granularity. Configure the report to pull data at the native planning level and only aggregate where explicitly needed.',
    steps: [
      'Document the planning granularity for each business process (demand, supply, finance)',
      'Map report hierarchy levels to planning hierarchy levels',
      'Identify mismatches and configure direct node mappings',
      'Remove unnecessary cross-hierarchy allocations',
    ],
    impact: '40-50% reduction in allocation errors and calculation time',
    effortLevel: 'Medium',
  },

  // ========== KPI & METRICS OPTIMIZATION ==========
  {
    id: 'kpi-001',
    title: 'Rationalize KPI Overload',
    category: 'KPI & Metrics',
    severity: 'critical',
    triggers: ['too_many_kpis', 'slow_load', 'poor_ux'],
    reportTypes: ['kpi_dashboard', 'control_tower', 'snop', 'exception'],
    problem: 'Dashboards with 15+ KPIs suffer from "analysis paralysis" and severe performance degradation. Each KPI requires separate calculation threads, multiplying load times.',
    recommendation: 'Limit dashboards to 5-8 strategic KPIs per view. Create role-specific views showing only relevant metrics. Archive or move secondary KPIs to drill-down pages.',
    steps: [
      'Inventory all KPIs currently displayed on the report',
      'Categorize each KPI as Critical / Important / Nice-to-Have',
      'Survey end users on which KPIs they actually use for decisions',
      'Remove or relocate KPIs rated as Nice-to-Have',
      'Group remaining KPIs into role-specific dashboard tabs',
      'Implement lazy-loading for secondary KPI panels',
    ],
    impact: '50-70% faster dashboard load times',
    effortLevel: 'Low',
  },
  {
    id: 'kpi-002',
    title: 'Standardize KPI Definitions',
    category: 'KPI & Metrics',
    severity: 'medium',
    triggers: ['data_accuracy', 'too_many_kpis'],
    reportTypes: ['kpi_dashboard', 'control_tower', 'snop', 'financial'],
    problem: 'Different teams using different definitions for the same KPI (e.g., "Forecast Accuracy" measured as MAPE vs. WMAPE vs. Bias) leads to conflicting reports and eroded trust.',
    recommendation: 'Establish a centralized KPI glossary with agreed-upon calculation methods. Implement formulas at the platform level rather than in individual reports.',
    steps: [
      'Create a KPI governance committee with cross-functional representation',
      'Document each KPI: name, formula, data sources, update frequency, owner',
      'Migrate KPI calculations to centralized platform-level formulas',
      'Add tooltips in dashboards showing KPI definition and formula',
    ],
    impact: 'Eliminates data trust issues and reduces duplicate KPI maintenance',
    effortLevel: 'Medium',
  },

  // ========== QUERY & CALCULATION OPTIMIZATION ==========
  {
    id: 'calc-001',
    title: 'Optimize Calculation Engine Configuration',
    category: 'Calculation Engine',
    severity: 'critical',
    triggers: ['calc_heavy', 'slow_load', 'data_volume'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'scenario'],
    problem: 'Default engine configurations may not be optimized for your specific data volume and model complexity. Untuned solvers can run 5-10x slower than properly configured ones.',
    recommendation: 'Profile calculation engine runs, identify bottlenecks, and tune solver parameters. Consider switching engine types (heuristic vs. LP/MIP) based on the problem characteristics.',
    steps: [
      'Enable execution profiling/logging on all calculation engines',
      'Identify the top 5 slowest calculation jobs',
      'Analyze whether the engine type matches the problem type',
      'Tune solver parameters (gap tolerance, time limits, thread count)',
      'Test performance improvements with A/B benchmarks',
      'Schedule heavy calculations during off-peak hours',
    ],
    impact: 'Up to 80% reduction in calculation execution time',
    effortLevel: 'High',
  },
  {
    id: 'calc-002',
    title: 'Implement Incremental Calculations',
    category: 'Calculation Engine',
    severity: 'high',
    triggers: ['slow_load', 'calc_heavy', 'data_volume'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'control_tower'],
    problem: 'Full recalculation on every report refresh wastes compute resources and creates unnecessary delays, especially when only a small subset of data has changed.',
    recommendation: 'Configure incremental calculation policies that only recompute affected nodes when input data changes, rather than running full model recalculations.',
    steps: [
      'Map data dependency chains in the calculation graph',
      'Identify which inputs trigger full vs. partial recalculations',
      'Configure change-detection triggers on input nodes',
      'Implement delta-based calculation propagation',
      'Set up caching for stable intermediate results',
    ],
    impact: '60-75% reduction in routine calculation times',
    effortLevel: 'High',
  },

  // ========== LAYOUT & UX OPTIMIZATION ==========
  {
    id: 'layout-001',
    title: 'Simplify Report Layout Density',
    category: 'Layout & UX',
    severity: 'high',
    triggers: ['layout_complex', 'slow_load', 'poor_ux'],
    reportTypes: ['demand_planning', 'supply_planning', 'financial', 'custom', 'snop'],
    problem: 'Overly dense layouts with 20+ columns and multiple nested pivots force the browser to render thousands of cells simultaneously, causing UI freezes and poor user experience.',
    recommendation: 'Apply progressive disclosure principles. Show summary views by default with drill-down capabilities. Limit visible columns to 8-12 and use horizontal scrolling only for detailed views.',
    steps: [
      'Audit current report layouts for column and row counts',
      'Identify the most-used columns via user analytics or surveys',
      'Create a default "Summary View" with 8-10 key columns',
      'Implement expandable sections for detailed data',
      'Add column show/hide toggles for user customization',
      'Implement virtual scrolling for large data sets',
    ],
    impact: '40-60% improvement in UI responsiveness',
    effortLevel: 'Medium',
  },
  {
    id: 'layout-002',
    title: 'Implement Exception-Based Reporting',
    category: 'Layout & UX',
    severity: 'high',
    triggers: ['no_exceptions', 'poor_ux', 'too_many_kpis'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'control_tower', 'exception'],
    problem: 'Planners reviewing all data points wastes time and leads to critical issues being buried in noise. Without exception highlighting, users must manually scan thousands of rows.',
    recommendation: 'Configure intelligent exception alerts that surface only items requiring attention. Use color-coding, threshold-based filters, and priority ranking to guide planner focus.',
    steps: [
      'Define business exception rules (e.g., forecast error > 30%, stock below safety level)',
      'Configure threshold-based alerts in the o9 platform',
      'Create exception-first views that show flagged items at the top',
      'Implement severity-based color coding (red/amber/green)',
      'Add one-click navigation from exceptions to detailed analysis',
      'Set up automated alert notifications for critical exceptions',
    ],
    impact: '70% reduction in planner review time',
    effortLevel: 'Medium',
  },

  // ========== DATA MANAGEMENT ==========
  {
    id: 'data-001',
    title: 'Implement Data Tiering Strategy',
    category: 'Data Management',
    severity: 'high',
    triggers: ['data_volume', 'slow_load', 'stale_data'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'custom'],
    problem: 'Loading all historical data into reports significantly increases load times. Most planning decisions only require recent data plus summary historical views.',
    recommendation: 'Implement a data tiering strategy: hot data (current + 3 months) loaded by default, warm data (3-12 months) on-demand, cold data (12+ months) archived with summary aggregates only.',
    steps: [
      'Analyze historical data access patterns to determine cut-off points',
      'Configure data partitioning by time horizon',
      'Set up automatic archival policies for cold data',
      'Create summary aggregate tables for historical trend analysis',
      'Implement lazy-loading for warm data access',
      'Monitor storage and query performance metrics',
    ],
    impact: '50-65% reduction in initial load times',
    effortLevel: 'Medium',
  },
  {
    id: 'data-002',
    title: 'Cleanse and Normalize Source Data',
    category: 'Data Management',
    severity: 'medium',
    triggers: ['data_accuracy', 'stale_data', 'calc_heavy'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'snop'],
    problem: 'Dirty data from ERP and transactional systems creates reconciliation overhead, calculation errors, and undermines trust in report outputs.',
    recommendation: 'Implement data quality gates at the ingestion layer. Validate, cleanse, and normalize data before it enters the EKG model. Set up automated data quality dashboards.',
    steps: [
      'Identify top data quality issues from user feedback and error logs',
      'Implement validation rules at data ingestion points',
      'Create automated data cleansing transformations',
      'Set up data quality scorecards with trend tracking',
      'Establish data stewardship roles and processes',
      'Configure alerts for data quality threshold breaches',
    ],
    impact: 'Eliminates 80% of data-related calculation errors',
    effortLevel: 'High',
  },

  // ========== SCENARIO & SIMULATION ==========
  {
    id: 'scenario-001',
    title: 'Optimize Scenario Comparison Views',
    category: 'Scenario Planning',
    severity: 'medium',
    triggers: ['layout_complex', 'calc_heavy', 'slow_load'],
    reportTypes: ['scenario', 'snop', 'financial', 'supply_planning'],
    problem: 'Comparing multiple scenarios side-by-side with full detail overloads both the calculation engine and the UI rendering, leading to very slow interactive analysis.',
    recommendation: 'Limit real-time scenario comparisons to 3-4 scenarios maximum. Show delta/variance views instead of full absolute values. Pre-compute scenario results rather than calculating on-the-fly.',
    steps: [
      'Set maximum concurrent scenario limit to 3-4',
      'Implement delta/variance columns instead of full scenario duplication',
      'Pre-compute and cache scenario results on save',
      'Create scenario summary scorecards with drill-down to details',
      'Add visual scenario comparison charts (spider charts, waterfall)',
    ],
    impact: '55% improvement in scenario analysis performance',
    effortLevel: 'Medium',
  },

  // ========== GOVERNANCE ==========
  {
    id: 'gov-001',
    title: 'Establish Report Governance Framework',
    category: 'Governance & Process',
    severity: 'medium',
    triggers: ['layout_complex', 'too_many_kpis', 'poor_ux'],
    reportTypes: ['kpi_dashboard', 'control_tower', 'custom', 'snop'],
    problem: 'Without governance, reports proliferate uncontrolled. Duplicate, outdated, and poorly designed reports waste system resources and confuse users.',
    recommendation: 'Create a report governance framework with ownership, review cycles, and deprecation policies. Consolidate duplicate reports and establish design standards.',
    steps: [
      'Inventory all existing reports with ownership and usage metrics',
      'Identify duplicate, unused, or outdated reports for consolidation',
      'Define report design standards (naming, layout, KPI selection)',
      'Assign report owners responsible for maintenance and accuracy',
      'Schedule quarterly report review and cleanup cycles',
      'Implement a report request workflow for new reports',
    ],
    impact: '30% reduction in system resource usage from report consolidation',
    effortLevel: 'Low',
  },
  {
    id: 'gov-002',
    title: 'Implement Continuous Performance Monitoring',
    category: 'Governance & Process',
    severity: 'low',
    triggers: ['slow_load', 'data_volume'],
    reportTypes: ['kpi_dashboard', 'control_tower', 'demand_planning', 'supply_planning', 'custom'],
    problem: 'Performance degradation is often gradual and only noticed when it becomes severe. Without proactive monitoring, issues compound over time.',
    recommendation: 'Set up automated performance monitoring for all critical reports. Track load times, calculation durations, and user interaction metrics. Alert on threshold breaches.',
    steps: [
      'Define performance SLAs for each report type (e.g., < 3s load time)',
      'Instrument reports with timing metrics',
      'Set up automated monitoring dashboards',
      'Configure alerts for SLA breaches',
      'Schedule monthly performance review meetings',
      'Maintain a performance optimization backlog',
    ],
    impact: 'Prevents performance regression and enables proactive optimization',
    effortLevel: 'Low',
  },

  // ========== UI PERFORMANCE — POSITIVE FACTOR RULES ==========
  {
    id: 'ui-pos-001',
    title: 'Adopt Named Sets for Member Selection',
    category: 'UI Performance',
    severity: 'critical',
    triggers: ['slow_load', 'data_volume', 'calc_heavy'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'scenario', 'exception', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Reports without Named Sets force the Graph Cube to dynamically compute member lists on every load, creating significant overhead on intersection computation and increasing load times by 15-25%.',
    recommendation: 'Implement Named Sets for all frequently used member selections. Named Sets pre-compute and cache member lists, dramatically reducing the Graph Cube query processing time.',
    steps: [
      'Identify all report views that use dynamic member selection filters',
      'Create Named Sets for the most frequently used member combinations',
      'Replace dynamic member queries with Named Set references in report views',
      'Configure Named Set refresh schedules aligned with data refresh cycles',
      'Validate load time improvement with before/after measurements',
    ],
    impact: 'Up to 25% reduction in report load time',
    effortLevel: 'Medium',
    uiFactorType: 'positive',
    uiFactorKey: 'named_sets_used',
  },
  {
    id: 'ui-pos-002',
    title: 'Enable Filters as Favourites',
    category: 'UI Performance',
    severity: 'high',
    triggers: ['slow_load', 'poor_ux'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'snop', 'custom'],
    problem: 'Users repeatedly applying the same filter combinations wastes time and forces redundant query processing. Each manual filter application triggers a fresh Graph Cube query.',
    recommendation: 'Configure frequently used filter combinations as Favourites. This enables pre-cached query results and one-click filter application, improving both UX and performance.',
    steps: [
      'Survey users to identify the top 5-10 most common filter combinations',
      'Create system-level Favourite filters for common business views',
      'Train users to save personal Favourite filter combinations',
      'Implement default Favourite per role to reduce initial load queries',
      'Monitor Favourite usage analytics to optimize pre-caching',
    ],
    impact: '10-15% faster filter application and load times',
    effortLevel: 'Low',
    uiFactorType: 'positive',
    uiFactorKey: 'filters_favorites',
  },
  {
    id: 'ui-pos-003',
    title: 'Use Reporting Measures Instead of Active Rules',
    category: 'UI Performance',
    severity: 'critical',
    triggers: ['slow_load', 'calc_heavy', 'too_many_kpis'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'scenario', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Active rules execute for every intersection in the report, creating exponential computation cost. Reports with many active rules can be 3-5x slower than those using Reporting Measures.',
    recommendation: 'Replace active rules with Reporting Measures wherever possible. CRITICAL: Keep no more than 3 Reporting Measures per report — exceeding this threshold negates the performance benefit and can cause the report to stall.',
    steps: [
      'Inventory all active rules currently used in the report',
      'Identify which active rules can be converted to Reporting Measures',
      'Create Reporting Measures for the top 3 most impactful calculations',
      'Remove the corresponding active rules after RM conversion',
      'Ensure total Reporting Measures per report stays at ≤3',
      'Validate calculation accuracy after conversion',
    ],
    impact: '30-50% reduction in Graph Cube execution time',
    effortLevel: 'Medium',
    uiFactorType: 'positive',
    uiFactorKey: 'reporting_measures_alt',
  },
  {
    id: 'ui-pos-004',
    title: 'Order Measures per Measure Group Sequence',
    category: 'UI Performance',
    severity: 'medium',
    triggers: ['slow_load', 'layout_complex'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'snop', 'custom'],
    problem: 'Measures displayed out of their Measure Group sequence force the rendering engine to re-sort and re-index data, adding unnecessary processing overhead.',
    recommendation: 'Ensure all measures in the report follow the exact sequence defined in their Measure Group configuration. This allows the Graph Cube to serve data in pre-sorted order.',
    steps: [
      'Export the Measure Group sequence from the EKG model',
      'Compare the report measure order against the Measure Group order',
      'Re-order report measures to match the Measure Group sequence exactly',
      'Test that calculated dependencies still resolve correctly',
    ],
    impact: '5-8% improvement in data retrieval speed',
    effortLevel: 'Low',
    uiFactorType: 'positive',
    uiFactorKey: 'measure_sequence_order',
  },
  {
    id: 'ui-pos-005',
    title: 'Reduce Max Intersection (Tenant Settings)',
    category: 'UI Performance',
    severity: 'high',
    triggers: ['slow_load', 'data_volume', 'calc_heavy'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'scenario', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'A high Maximum Intersection count in tenant settings allows the Graph Cube to process an unnecessarily large number of data intersections, directly increasing query processing time.',
    recommendation: 'Lower the Maximum Intersection value in Tenant Settings to the minimum required for your reports. Typical optimized values range from 10K-50K depending on report complexity.',
    steps: [
      'Review current Maximum Intersection setting in Tenant Settings',
      'Analyze actual intersection counts across all reports',
      'Set Maximum Intersection to 110-120% of the highest observed actual count',
      'Monitor for any reports hitting the new cap and adjust if needed',
      'Document the rationale for the chosen intersection limit',
    ],
    impact: 'Up to 20% improvement in load time with lower intersection caps',
    effortLevel: 'Low',
    uiFactorType: 'positive',
    uiFactorKey: 'low_max_intersection',
  },
  {
    id: 'ui-pos-006',
    title: 'Limit Transient and Reporting Measures',
    category: 'UI Performance',
    severity: 'high',
    triggers: ['slow_load', 'calc_heavy', 'too_many_kpis'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Excessive transient measures and reporting measures in a single report create a computational bottleneck — each one requires on-the-fly calculation during Graph Cube execution.',
    recommendation: 'Audit and minimize the number of transient measures and reporting measures per report. Convert frequently needed transient measures to persistent stored measures where possible.',
    steps: [
      'Inventory all transient and reporting measures in the report',
      'Identify transient measures that are used across multiple reports — convert to stored measures',
      'Remove unused or redundant transient measures',
      'Ensure total RM count stays at ≤3 per report',
      'Benchmark load time before and after cleanup',
    ],
    impact: '10-20% reduction in on-the-fly calculation overhead',
    effortLevel: 'Medium',
    uiFactorType: 'positive',
    uiFactorKey: 'few_transient_measures',
  },
  {
    id: 'ui-pos-007',
    title: 'Align Filters to Reference Model Order',
    category: 'UI Performance',
    severity: 'medium',
    triggers: ['slow_load', 'layout_complex'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'snop', 'custom'],
    problem: 'Filters applied out of the reference model order force the query engine to re-order and re-apply filter predicates, adding unnecessary query planning overhead.',
    recommendation: 'Ensure all filters in the report follow the reference model hierarchy order. This allows the Graph Cube optimizer to apply filters in the most efficient sequence.',
    steps: [
      'Export the reference model dimension order',
      'Audit report filter order against the reference model sequence',
      'Re-arrange filters to match the reference model order exactly',
      'Verify filter functionality is maintained after re-ordering',
    ],
    impact: '5-8% improvement in query execution efficiency',
    effortLevel: 'Low',
    uiFactorType: 'positive',
    uiFactorKey: 'filter_ref_model_order',
  },
  {
    id: 'ui-pos-008',
    title: 'Enable Factory Settings for Optimized Defaults',
    category: 'UI Performance',
    severity: 'medium',
    triggers: ['slow_load', 'poor_ux'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'scenario', 'exception', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Custom-tuned settings per report can drift from optimized defaults over time. Factory settings provide a validated, pre-optimized configuration baseline.',
    recommendation: 'Enable Factory Settings where available. These apply vendor-validated optimizations for render batching, query parallelism, and cache strategies.',
    steps: [
      'Review available Factory Settings for your tenant configuration',
      'Enable Factory Settings on non-critical reports first for validation',
      'Compare performance before and after enabling Factory Settings',
      'Roll out to remaining reports after validation',
      'Document any report-specific overrides needed',
    ],
    impact: '10-15% improvement in overall load performance',
    effortLevel: 'Low',
    uiFactorType: 'positive',
    uiFactorKey: 'factory_settings',
  },
  {
    id: 'ui-pos-009',
    title: 'Implement Measure, Member, and Post Filters',
    category: 'UI Performance',
    severity: 'medium',
    triggers: ['slow_load', 'data_volume', 'layout_complex'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Reports without Measure Filters, Member Filters, or Post Filters load all available data before any filtering occurs, wasting bandwidth and rendering resources.',
    recommendation: 'Add Measure Filters to pre-filter calculations, Member Filters to limit hierarchy members, and Post Filters to refine final output. This three-layer filtering strategy ensures minimal data processing.',
    steps: [
      'Identify which dimensions and measures can be pre-filtered',
      'Add Measure Filters to exclude unnecessary calculated measures',
      'Add Member Filters to limit hierarchy members to relevant subsets',
      'Add Post Filters to refine the displayed result set',
      'Test filter combinations for correctness and performance',
    ],
    impact: '8-15% reduction in data processing and rendering time',
    effortLevel: 'Low',
    uiFactorType: 'positive',
    uiFactorKey: 'measure_member_post_filter',
  },
  {
    id: 'ui-pos-010',
    title: 'Use Chain-Linked Reports Over Independent Reports',
    category: 'UI Performance',
    severity: 'high',
    triggers: ['slow_load', 'poor_ux', 'layout_complex'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'snop', 'custom'],
    problem: 'Independent reports each load their own data context, filters, and calculations from scratch. In multi-report workflows, this creates redundant data fetching and slow navigation.',
    recommendation: 'Chain-link related reports so they share filter context, member selections, and cached data. This enables near-instant transitions between linked reports.',
    steps: [
      'Map the typical user navigation flow across reports',
      'Identify reports frequently accessed in sequence',
      'Configure chain-linking for sequential report pairs',
      'Set shared filter context to propagate across linked reports',
      'Validate that linked reports load correctly with inherited context',
      'Monitor user navigation analytics post-implementation',
    ],
    impact: '40-60% faster report-to-report navigation',
    effortLevel: 'Medium',
    uiFactorType: 'positive',
    uiFactorKey: 'chain_linked_reports',
  },
  {
    id: 'ui-pos-011',
    title: 'Enable Hide Null Rows',
    category: 'UI Performance',
    severity: 'high',
    triggers: ['slow_load', 'data_volume', 'poor_ux'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'exception', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Reports rendering null/empty rows waste rendering cycles and force users to scroll through irrelevant data. In sparse datasets, null rows can be 60-80% of the total rendered rows.',
    recommendation: 'Enable "Hide Null Rows" on all reports. This dramatically reduces the rendered DOM size and improves both load time and scrolling performance.',
    steps: [
      'Enable "Hide Null Rows" setting on each report view',
      'Verify that hiding nulls doesn\'t remove rows users need to see',
      'For planning reports, ensure editable null cells are preserved where needed',
      'Test with various filter combinations to ensure correct behavior',
    ],
    impact: '10-30% reduction in rendering time for sparse datasets',
    effortLevel: 'Low',
    uiFactorType: 'positive',
    uiFactorKey: 'hide_null_rows',
  },

  // ========== UI PERFORMANCE — NEGATIVE FACTOR RULES ==========
  {
    id: 'ui-neg-001',
    title: 'Reduce or Eliminate Conditional Formatting',
    category: 'UI Performance',
    severity: 'high',
    triggers: ['slow_load', 'layout_complex', 'poor_ux'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'exception', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Conditional formatting evaluates formatting rules per-cell on every render cycle. For reports with 10K+ visible cells, this adds 5-10% to load time and degrades scroll performance.',
    recommendation: 'Minimize conditional formatting to only critical visual indicators (e.g., RAG status on exceptions). Remove purely cosmetic conditional formatting. Consider using pre-computed status columns instead.',
    steps: [
      'Audit all conditional formatting rules in the report',
      'Categorize each rule as Essential / Nice-to-Have / Cosmetic',
      'Remove Cosmetic formatting rules entirely',
      'Convert Nice-to-Have rules to pre-computed status measures where possible',
      'Limit remaining conditional formatting to ≤3 rules per report view',
      'Benchmark load time before and after cleanup',
    ],
    impact: 'Removing conditional formatting reduces load time by 5-10%',
    effortLevel: 'Low',
    uiFactorType: 'negative',
    uiFactorKey: 'conditional_formatting',
  },
  {
    id: 'ui-neg-002',
    title: 'Eliminate Interdependent / Association Measure Filters',
    category: 'UI Performance',
    severity: 'critical',
    triggers: ['slow_load', 'calc_heavy', 'data_volume'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'scenario', 'snop', 'custom'],
    problem: 'Interdependent filters (such as association measure filters) create cascading query chains — when one filter changes, all dependent filters must re-evaluate. This creates exponential query complexity and can make reports 2-4x slower.',
    recommendation: 'Replace interdependent filters with independent filter selections and Named Sets. If association measures are required, limit the chain depth to 2 levels maximum.',
    steps: [
      'Map all filter dependencies and identify association measure chains',
      'Identify filters that can be made independent without losing functionality',
      'Replace association measure filters with Named Set-based selections',
      'If interdependency is essential, limit chain depth to ≤2 levels',
      'Add caching for intermediate filter results',
      'Test filter behavior and load time after changes',
    ],
    impact: 'Elimination can reduce load time by 15-40% depending on chain depth',
    effortLevel: 'High',
    uiFactorType: 'negative',
    uiFactorKey: 'interdependent_filters',
  },
  {
    id: 'ui-neg-003',
    title: 'Remove Nulls, Subtotals, and Default Measures',
    category: 'UI Performance',
    severity: 'high',
    triggers: ['slow_load', 'data_volume', 'layout_complex'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Displaying nulls, computing subtotals at every hierarchy level, and including default measures that users don\'t need adds significant rendering and computation overhead to reports.',
    recommendation: 'Remove default measures that aren\'t actively used, disable automatic subtotal computation except where explicitly required, and enable null suppression at both the query and display level.',
    steps: [
      'Identify all default measures included in the report — remove unused ones',
      'Disable automatic subtotal rows except at user-required aggregation levels',
      'Enable null suppression at the Graph Cube query level (not just display hide)',
      'Replace subtotal rows with on-demand expand/collapse aggregation',
      'Validate that removed measures and subtotals don\'t break downstream reports',
    ],
    impact: '10-20% improvement in load and render performance',
    effortLevel: 'Medium',
    uiFactorType: 'negative',
    uiFactorKey: 'nulls_subtotals_defaults',
  },

  // ========== NAMED SETS IN REPORT VIEWS ==========
  {
    id: 'ui-pos-012',
    title: 'Use Named Sets Directly in Report Views',
    category: 'UI Performance',
    severity: 'high',
    triggers: ['slow_load', 'data_volume'],
    reportTypes: ['demand_planning', 'supply_planning', 'inventory', 'financial', 'control_tower', 'kpi_dashboard', 'snop', 'custom'],
    problem: 'Report views that compute member sets dynamically on each load bypass the Named Set caching mechanism, resulting in repeated expensive intersection computations.',
    recommendation: 'Reference Named Sets directly in report view configurations instead of using ad-hoc member selections. This enables the Graph Cube to leverage pre-computed member lists.',
    steps: [
      'Review all report views for dynamic member selection patterns',
      'Create Named Sets for recurring member selection patterns',
      'Update report view configurations to reference Named Sets',
      'Schedule Named Set refresh aligned with data refresh cycles',
      'Monitor Graph Cube cache hit rates post-implementation',
    ],
    impact: '8-15% improvement in report view load time',
    effortLevel: 'Low',
    uiFactorType: 'positive',
    uiFactorKey: 'namedsets_in_view',
  },
];

// ==========================================
// PERFORMANCE TIER CLASSIFICATIONS
// ==========================================

export function getGraphCubeTier(timeMs) {
  if (!timeMs || timeMs <= 0) return { tier: 'unknown', label: 'Not Measured', color: '#94a3b8' };
  if (timeMs <= 500) return { tier: 'excellent', label: 'Excellent', color: '#10b981' };
  if (timeMs <= 1500) return { tier: 'good', label: 'Good', color: '#3b82f6' };
  if (timeMs <= 3000) return { tier: 'fair', label: 'Fair', color: '#f59e0b' };
  return { tier: 'critical', label: 'Critical', color: '#ef4444' };
}

export function getWebApiTier(timeMs) {
  if (!timeMs || timeMs <= 0) return { tier: 'unknown', label: 'Not Measured', color: '#94a3b8' };
  if (timeMs <= 1000) return { tier: 'excellent', label: 'Excellent', color: '#10b981' };
  if (timeMs <= 3000) return { tier: 'good', label: 'Good', color: '#3b82f6' };
  if (timeMs <= 5000) return { tier: 'fair', label: 'Fair', color: '#f59e0b' };
  return { tier: 'critical', label: 'Critical', color: '#ef4444' };
}

export function getConcurrentUsersTier(count, reportType) {
  const BENCHMARKS = {
    demand_planning: 100, supply_planning: 80, inventory: 60, financial: 50,
    control_tower: 200, scenario: 30, exception: 150, kpi_dashboard: 200, snop: 100, custom: 100,
  };
  const max = BENCHMARKS[reportType] || 100;
  if (!count || count <= 0) return { tier: 'unknown', label: 'Not Measured', color: '#94a3b8', max };
  const ratio = count / max;
  if (ratio <= 0.5) return { tier: 'excellent', label: 'Excellent', color: '#10b981', max };
  if (ratio <= 0.8) return { tier: 'good', label: 'Good', color: '#3b82f6', max };
  if (ratio <= 1.0) return { tier: 'fair', label: 'Fair', color: '#f59e0b', max };
  return { tier: 'critical', label: 'Over Capacity', color: '#ef4444', max };
}

// ==========================================
// ANALYSIS ENGINE
// ==========================================

export function analyzeReport(config) {
  const {
    reportType, issues, rowCount, columnCount, kpiCount,
    hierarchyDepth, dataAge, userCount,
    // New UI Performance fields
    graphCubeTime, webApiTime, maxIntersection,
    positiveFactors = [], negativeFactors = [],
  } = config;

  const matchedRules = OPTIMIZATION_RULES.filter(rule => {
    const typeMatch = rule.reportTypes.includes(reportType) || rule.reportTypes.includes('custom');
    const issueMatch = rule.triggers.some(t => issues.includes(t));
    return typeMatch && issueMatch;
  });

  // Score additional context-based rules
  const contextRules = [];

  if (rowCount > 10000) {
    contextRules.push(...OPTIMIZATION_RULES.filter(r =>
      r.triggers.includes('data_volume') && !matchedRules.includes(r)
    ));
  }

  if (columnCount > 15) {
    contextRules.push(...OPTIMIZATION_RULES.filter(r =>
      r.triggers.includes('layout_complex') && !matchedRules.includes(r) && !contextRules.includes(r)
    ));
  }

  if (kpiCount > 12) {
    contextRules.push(...OPTIMIZATION_RULES.filter(r =>
      r.triggers.includes('too_many_kpis') && !matchedRules.includes(r) && !contextRules.includes(r)
    ));
  }

  if (hierarchyDepth > 5) {
    contextRules.push(...OPTIMIZATION_RULES.filter(r =>
      r.triggers.includes('hierarchy_deep') && !matchedRules.includes(r) && !contextRules.includes(r)
    ));
  }

  // UI Factor-based rule matching
  // Missing positive factors → trigger their corresponding rules
  const uiFactorRules = [];
  POSITIVE_FACTORS.forEach(pf => {
    if (!positiveFactors.includes(pf.value)) {
      const matchingRule = OPTIMIZATION_RULES.find(r => r.uiFactorKey === pf.value);
      if (matchingRule && !matchedRules.find(r => r.id === matchingRule.id) && !contextRules.find(r => r.id === matchingRule.id)) {
        const typeMatch = matchingRule.reportTypes.includes(reportType) || matchingRule.reportTypes.includes('custom');
        if (typeMatch) uiFactorRules.push(matchingRule);
      }
    }
  });

  // Present negative factors → trigger their corresponding rules
  NEGATIVE_FACTORS.forEach(nf => {
    if (negativeFactors.includes(nf.value)) {
      const matchingRule = OPTIMIZATION_RULES.find(r => r.uiFactorKey === nf.value);
      if (matchingRule && !matchedRules.find(r => r.id === matchingRule.id) && !contextRules.find(r => r.id === matchingRule.id) && !uiFactorRules.find(r => r.id === matchingRule.id)) {
        const typeMatch = matchingRule.reportTypes.includes(reportType) || matchingRule.reportTypes.includes('custom');
        if (typeMatch) uiFactorRules.push(matchingRule);
      }
    }
  });

  const allRules = [...matchedRules, ...contextRules, ...uiFactorRules];

  // Remove duplicates
  const uniqueRules = allRules.filter((rule, idx, arr) =>
    arr.findIndex(r => r.id === rule.id) === idx
  );

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  uniqueRules.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Calculate base health score
  const maxPossibleIssues = OPTIMIZATION_RULES.length;
  const severityWeight = uniqueRules.reduce((sum, r) => {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return sum + weights[r.severity];
  }, 0);
  const maxWeight = maxPossibleIssues * 4;
  const baseScore = Math.max(10, Math.round(100 - (severityWeight / maxWeight) * 100));

  // Calculate UI Performance Score
  const totalPositive = POSITIVE_FACTORS.length;
  const activePositive = positiveFactors.length;
  const activeNegative = negativeFactors.length;
  const totalNegative = NEGATIVE_FACTORS.length;

  // Positive adoption rate (0-100)
  const positiveAdoption = totalPositive > 0 ? Math.round((activePositive / totalPositive) * 100) : 50;

  // Negative penalty (each negative factor costs points)
  const negativePenalty = activeNegative * 12;

  // Performance metrics bonus/penalty
  let perfBonus = 0;
  const gcTier = getGraphCubeTier(graphCubeTime);
  const waTier = getWebApiTier(webApiTime);
  if (gcTier.tier === 'excellent') perfBonus += 5;
  else if (gcTier.tier === 'critical') perfBonus -= 10;
  else if (gcTier.tier === 'fair') perfBonus -= 5;
  if (waTier.tier === 'excellent') perfBonus += 5;
  else if (waTier.tier === 'critical') perfBonus -= 10;
  else if (waTier.tier === 'fair') perfBonus -= 5;

  const uiPerfScore = Math.max(0, Math.min(100, positiveAdoption - negativePenalty + perfBonus));

  // Blended final score (70% health + 30% UI perf)
  const score = Math.max(5, Math.min(100, Math.round(baseScore * 0.7 + uiPerfScore * 0.3)));

  // Estimated load time impact
  let estLoadImpact = 0;
  POSITIVE_FACTORS.forEach(pf => {
    if (positiveFactors.includes(pf.value)) {
      estLoadImpact += pf.impact; // negative value = reduction
    }
  });
  NEGATIVE_FACTORS.forEach(nf => {
    if (negativeFactors.includes(nf.value)) {
      estLoadImpact += nf.impact; // positive value = increase
    }
  });

  // Categorize
  const categories = {};
  uniqueRules.forEach(rule => {
    if (!categories[rule.category]) categories[rule.category] = [];
    categories[rule.category].push(rule);
  });

  return {
    score,
    baseHealthScore: baseScore,
    uiPerfScore,
    totalRecommendations: uniqueRules.length,
    criticalCount: uniqueRules.filter(r => r.severity === 'critical').length,
    highCount: uniqueRules.filter(r => r.severity === 'high').length,
    mediumCount: uniqueRules.filter(r => r.severity === 'medium').length,
    lowCount: uniqueRules.filter(r => r.severity === 'low').length,
    recommendations: uniqueRules,
    categories,
    // UI Performance data
    uiPerformance: {
      positiveAdoption,
      activePositiveCount: activePositive,
      totalPositiveCount: totalPositive,
      activeNegativeCount: activeNegative,
      totalNegativeCount: totalNegative,
      estLoadImpact,
      graphCubeTier: gcTier,
      webApiTier: waTier,
      concurrentUsersTier: getConcurrentUsersTier(userCount, reportType),
      graphCubeTime: graphCubeTime || 0,
      webApiTime: webApiTime || 0,
      maxIntersection: maxIntersection || 0,
    },
  };
}
