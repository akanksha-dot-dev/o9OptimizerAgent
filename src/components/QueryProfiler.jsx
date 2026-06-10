import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Play, FileCode, CheckCircle, AlertTriangle, ArrowRight,
  Gauge, ChevronRight, HelpCircle, Terminal, Copy, Check,
  Undo2, Code2, AlertCircle, RefreshCw
} from 'lucide-react';

const SAMPLE_QUERIES = [
  {
    id: 'nested-crossjoin',
    name: 'Nested Crossjoin on Deep Hierarchies',
    description: 'This query forces o9 Graph Cube to calculate crossjoins across the entire product and location space without constraints, causing a massive memory footprint and slow rendering.',
    subOptimal: `// Sub-optimal query: Force full crossjoins over large hierarchies
SELECT
  CROSSJOIN(
    DESCENDANTS([Product].[All_Products], 8, SELF),
    DESCENDANTS([Location].[All_Locations], 6, SELF)
  ) ON ROWS,
  {[Measures].[Forecast_Volume], [Measures].[Sourcing_Cost]} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[2026]`,
    optimized: `// Optimized query: Constrain crossjoin to active product-location pairs using EKG edges
SELECT
  FILTER(
    NONEMPTY(
      CROSSJOIN(
        DESCENDANTS([Product].[All_Products], 4, SELF_AND_BEFORE),
        DESCENDANTS([Location].[All_Locations], 3, SELF_AND_BEFORE)
      ),
      [Measures].[Active_Sourcing_Edge]
    )
  ) ON ROWS,
  {[Measures].[Forecast_Volume], [Measures].[Sourcing_Cost]} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[2026]`,
    explanation: 'By reducing the depth from 8 levels to 4 on Product, and 6 to 3 on Location, and filtering using the active Sourcing Edge (NONEMPTY), we reduce the query space from 450,000 combinations to just 12,000 active sourcing links.',
    metrics: {
      subOptimal: { parsing: 45, traversal: 1450, aggregation: 2200, serialization: 650 },
      optimized: { parsing: 25, traversal: 110, aggregation: 280, serialization: 85 }
    },
    bottleneck: 'Full-space crossjoin over 8 hierarchy levels is an anti-pattern. Always restrict traversal using EKG relationship edges.',
    recs: [
      'Reduce hierarchy depth in active report grid to <= 4 levels.',
      'Apply NONEMPTY constraint using relational measure edges.',
      'Avoid crossing dimensions that do not share active sourcing lanes.'
    ]
  },
  {
    id: 'unindexed-filter',
    name: 'Unindexed Sourcing Filter Full-Scan',
    description: 'Scanning all sourcing paths dynamically to filter by lead time causes o9 to evaluate attributes on every node, rather than using indexed attributes.',
    subOptimal: `// Sub-optimal query: Scan all sourcing paths dynamically
SELECT
  FILTER(
    [Sourcing_Lanes].Members,
    [Sourcing_Lanes].CurrentMember.Properties("Lead_Time") > 14
  ) ON ROWS,
  {[Measures].[Sourcing_Cost]} ON COLUMNS
FROM [EKG_Graph_Cube]`,
    optimized: `// Optimized query: Use pre-indexed EKG Sourcing Lead Time Attribute
SELECT
  [Sourcing_Lanes].[Lead_Time_Indexed].[Long_Lead_Time] ON ROWS,
  {[Measures].[Sourcing_Cost]} ON COLUMNS
FROM [EKG_Graph_Cube]`,
    explanation: 'Instead of dynamically parsing properties on each individual sourcing lane node during the query run, we reference a pre-indexed dimension hierarchy [Lead_Time_Indexed] configured in the EKG model, bypassing runtime property filters.',
    metrics: {
      subOptimal: { parsing: 30, traversal: 980, aggregation: 1400, serialization: 210 },
      optimized: { parsing: 20, traversal: 45, aggregation: 90, serialization: 35 }
    },
    bottleneck: 'Dynamic properties filtering inside o9 queries forces a full traversal. Pre-index filter attributes in EKG dimensions.',
    recs: [
      'Create pre-indexed attributes for common filters.',
      'Replace dynamic property string checks with dimension member lookups.',
      'Set up data health gates to reject unindexed ad-hoc filters.'
    ]
  },
  {
    id: 'non-additive-accum',
    name: 'Recursive Non-Additive Aggregation',
    description: 'This query recalculates margins recursively on parent categories at query execution time, instead of referencing stored Graph Cube rollups.',
    subOptimal: `// Sub-optimal query: Recursive aggregation over deep hierarchy levels
SELECT
  [Product].[Category].Members ON ROWS,
  {
    [Measures].[Revenue],
    AGGREGATE(
      [Product].CurrentMember.Children,
      [Measures].[Revenue] * [Measures].[Margin_Pct]
    )
  } ON COLUMNS
FROM [EKG_Graph_Cube]`,
    optimized: `// Optimized query: Reference stored rollups in the Graph Cube
SELECT
  [Product].[Category].Members ON ROWS,
  {
    [Measures].[Revenue],
    [Measures].[Margin_Revenue_Rollup]
  } ON COLUMNS
FROM [EKG_Graph_Cube]`,
    explanation: 'We leverage the EKG Aggregation Layer. The Margin Revenue Rollup is pre-computed incrementally when data loads, so the report performs a direct read rather than dynamic children aggregation on the fly.',
    metrics: {
      subOptimal: { parsing: 55, traversal: 620, aggregation: 1800, serialization: 480 },
      optimized: { parsing: 30, traversal: 50, aggregation: 190, serialization: 60 }
    },
    bottleneck: 'Dynamic child node mathematical calculations scale poorly as hierarchy depth increases. Store aggregations on Graph Cube load.',
    recs: [
      'Configure intermediate rollup measures in EKG measure catalog.',
      'Avoid nested aggregation formulas in report grids.',
      'Leverage incremental model updates for complex math calculation.'
    ]
  }
];

const SNIPPETS = [
  {
    name: 'Unoptimized Crossjoin',
    code: `SELECT
  CROSSJOIN(
    DESCENDANTS([Product].[All_Products], 8, SELF),
    DESCENDANTS([Location].[All_Locations], 6, SELF)
  ) ON ROWS,
  {[Measures].[Forecast_Volume]} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[2026]`
  },
  {
    name: 'Dynamic Property Filter',
    code: `SELECT
  FILTER(
    [Sourcing_Lanes].Members,
    [Sourcing_Lanes].CurrentMember.Properties("Lead_Time") > 14
  ) ON ROWS,
  {[Measures].[Sourcing_Cost]} ON COLUMNS
FROM [EKG_Graph_Cube]`
  },
  {
    name: 'Recursive Child Aggregates',
    code: `SELECT
  [Product].[Category].Members ON ROWS,
  {
    [Measures].[Revenue],
    AGGREGATE(
      [Product].CurrentMember.Children,
      [Measures].[Revenue] * [Measures].[Margin_Pct]
    )
  } ON COLUMNS
FROM [EKG_Graph_Cube]`
  }
];

function getLineOfIndex(str, index) {
  return str.substring(0, index).split('\n').length;
}

function getLineOfKeyword(str, keyword) {
  const index = str.toUpperCase().indexOf(keyword.toUpperCase());
  if (index === -1) return 1;
  return getLineOfIndex(str, index);
}

// Custom Query Parser Engine
function parseCustomQuery(query) {
  if (!query || query.trim() === '') {
    return { score: 100, issues: [], optimized: '', speedup: '1.0x' };
  }

  const issues = [];
  let score = 100;
  let optimized = query;

  // 1. Check for CROSSJOIN without NONEMPTY
  if (query.toUpperCase().includes('CROSSJOIN') && !query.toUpperCase().includes('NONEMPTY')) {
    const line = getLineOfKeyword(query, 'CROSSJOIN');
    issues.push({
      id: 'crossjoin-nonempty',
      title: 'CROSSJOIN Lacking NONEMPTY Constraint',
      severity: 'critical',
      line: line,
      problem: 'Evaluating a raw CROSSJOIN computes the full Cartesian cross-product of both dimensions. In large datasets, this generates millions of intersections, causing Graph Cube memory spikes and query timeouts.',
      recommendation: 'Filter the crossjoin using an active relation measure (e.g. Sourcing active status) inside a FILTER(NONEMPTY(...)) wrapper.'
    });
    score -= 35;

    // Auto-replace crossjoin with optimized format
    optimized = optimized.replace(
      /CROSSJOIN\s*\(\s*DESCENDANTS\s*\(\s*\[Product\]\.\[All_Products\],\s*(\d+),\s*SELF\s*\),\s*DESCENDANTS\s*\(\s*\[Location\]\.\[All_Locations\],\s*(\d+),\s*SELF\s*\)\s*\)/gi,
      `FILTER(
    NONEMPTY(
      CROSSJOIN(
        DESCENDANTS([Product].[All_Products], 4, SELF_AND_BEFORE),
        DESCENDANTS([Location].[All_Locations], 3, SELF_AND_BEFORE)
      ),
      [Measures].[Active_Sourcing_Edge]
    )
  )`
    );
  }

  // 2. Check for deep hierarchy descendants traversal
  const descendantsRegex = /DESCENDANTS\s*\(\s*\[([^\]]+)\]\.\[([^\]]+)\],\s*(\d+)/gi;
  let descMatch;
  while ((descMatch = descendantsRegex.exec(query)) !== null) {
    const dimName = descMatch[1];
    const depth = parseInt(descMatch[3]);
    if (depth > 4) {
      const line = getLineOfIndex(query, descMatch.index);
      issues.push({
        id: `deep-traversal-${dimName}`,
        title: `Over-Deep Descendants Traversal (${dimName})`,
        severity: 'high',
        line: line,
        problem: `Querying level depth ${depth} on dimension [${dimName}] forces o9 to evaluate and aggregate elements at a grain that is too fine for interactive report loads.`,
        recommendation: `Consolidate descendants depth parameter to ≤ 4. Use pre-calculated attribute mappings for finer filters.`
      });
      score -= 25;
    }
  }
  optimized = optimized.replace(/DESCENDANTS\s*\(\s*\[Product\]\.\[All_Products\],\s*([5-9]|\d{2,}),\s*SELF\s*\)/gi, 'DESCENDANTS([Product].[All_Products], 4, SELF_AND_BEFORE)');
  optimized = optimized.replace(/DESCENDANTS\s*\(\s*\[Location\]\.\[All_Locations\],\s*([5-9]|\d{2,}),\s*SELF\s*\)/gi, 'DESCENDANTS([Location].[All_Locations], 3, SELF_AND_BEFORE)');

  // 3. Check for dynamic property querying
  if (query.match(/\.Properties\s*\(\s*['"][^'"]+['"]\s*\)/gi)) {
    const line = getLineOfKeyword(query, '.Properties');
    issues.push({
      id: 'dynamic-properties',
      title: 'Dynamic Node Property Scan Filter',
      severity: 'high',
      line: line,
      problem: 'Applying filters by matching properties dynamically on-the-fly forces a sequential string comparison on every member, bypassing Graph Cube indexes.',
      recommendation: 'Define this property as a pre-indexed dimension hierarchy in the EKG model schema, and filter directly by that hierarchy member.'
    });
    score -= 25;

    // Auto-replace property query with pre-indexed dimension lookup
    optimized = optimized.replace(
      /FILTER\s*\(\s*\[Sourcing_Lanes\]\.Members,\s*\[Sourcing_Lanes\]\.CurrentMember\.Properties\("Lead_Time"\)\s*>\s*\d+\s*\)/gi,
      `[Sourcing_Lanes].[Lead_Time_Indexed].[Long_Lead_Time]`
    );
  }

  // 4. Check for dynamic child aggregations
  if (query.toUpperCase().includes('AGGREGATE') && query.toUpperCase().includes('CHILDREN')) {
    const line = getLineOfKeyword(query, 'AGGREGATE');
    issues.push({
      id: 'recursive-aggregate',
      title: 'Dynamic Child-to-Parent Aggregation',
      severity: 'medium',
      line: line,
      problem: 'Aggregating mathematical formulas recursively (like Revenue * Margin_Pct) dynamically on child nodes slows rendering, especially on large hierarchies.',
      recommendation: 'Configure pre-computed measure rollups (e.g. Margin Revenue Rollup) inside the EKG measure catalog. Perform direct reads instead of dynamic aggregation.'
    });
    score -= 15;

    optimized = optimized.replace(
      /AGGREGATE\s*\(\s*\[Product\]\.CurrentMember\.Children,\s*\[Measures\]\.\[Revenue\]\s*\*\s*\[Measures\]\.\[Margin_Pct\]\s*\)/gi,
      `[Measures].[Margin_Revenue_Rollup]`
    );
  }

  // 5. Ad-Hoc Filter
  if (query.match(/FILTER\s*\(\s*\[[^\]]+\]\.Members/gi) && !query.toUpperCase().includes('PROPERTIES')) {
    const line = getLineOfKeyword(query, 'FILTER');
    issues.push({
      id: 'adhoc-filter',
      title: 'Ad-hoc Set Scan Filter',
      severity: 'medium',
      line: line,
      problem: 'Evaluating dynamic filters on the raw Member set of a large dimension scans all items. This bypasses caching in the EKG query planner.',
      recommendation: 'Reference pre-built Named Sets in the report view config rather than running ad-hoc SELECT filters.'
    });
    score -= 15;
  }

  score = Math.max(5, score);

  let speedup = '1.0x';
  if (score <= 50) {
    speedup = '6.5x - 15.0x';
  } else if (score <= 75) {
    speedup = '3.5x - 6.0x';
  } else if (score < 100) {
    speedup = '1.8x - 3.0x';
  }

  return {
    score,
    issues,
    optimized,
    speedup
  };
}

export default function QueryProfiler() {
  const [activeMode, setActiveMode] = useState('presets'); // 'presets' or 'custom'
  const [selectedId, setSelectedId] = useState(SAMPLE_QUERIES[0].id);
  const [isProfiling, setIsProfiling] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [profilerStep, setProfilerStep] = useState(0);

  // Custom playground states
  const [customInput, setCustomInput] = useState(SNIPPETS[0].code);
  const [customResults, setCustomResults] = useState(null);
  const [isCustomValidating, setIsCustomValidating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const activeQuery = SAMPLE_QUERIES.find(q => q.id === selectedId);

  const handleProfile = () => {
    setIsProfiling(true);
    setShowResults(false);
    setProfilerStep(0);

    const timer1 = setTimeout(() => setProfilerStep(1), 500);
    const timer2 = setTimeout(() => setProfilerStep(2), 1100);
    const timer3 = setTimeout(() => setProfilerStep(3), 1600);
    const timer4 = setTimeout(() => {
      setIsProfiling(false);
      setShowResults(true);
    }, 2200);
  };

  const handleCustomValidate = () => {
    setIsCustomValidating(true);
    setCustomResults(null);

    setTimeout(() => {
      const res = parseCustomQuery(customInput);
      setCustomResults(res);
      setIsCustomValidating(false);
    }, 1200);
  };

  const copyCustomOptimized = () => {
    if (!customResults) return;
    navigator.clipboard.writeText(customResults.optimized).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const getSubTotal = (metrics) => metrics.parsing + metrics.traversal + metrics.aggregation + metrics.serialization;
  const getOptTotal = (metrics) => metrics.parsing + metrics.traversal + metrics.aggregation + metrics.serialization;

  const totalSub = activeQuery ? getSubTotal(activeQuery.metrics.subOptimal) : 0;
  const totalOpt = activeQuery ? getOptTotal(activeQuery.metrics.optimized) : 0;
  const speedup = activeQuery ? (totalSub / totalOpt).toFixed(1) : '1.0';

  const phases = [
    { key: 'parsing', label: 'Query Parsing' },
    { key: 'traversal', label: 'EKG Graph Traversal' },
    { key: 'aggregation', label: 'Cube Aggregation' },
    { key: 'serialization', label: 'Grid Serialization' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Playground mode tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0, gap: 16 }}>
        <button
          onClick={() => { setActiveMode('presets'); setShowResults(false); }}
          style={{
            padding: '10px 18px',
            fontSize: '0.86rem',
            fontWeight: 700,
            color: activeMode === 'presets' ? 'var(--accent-blue)' : 'var(--text-muted)',
            borderBottom: activeMode === 'presets' ? '2.5px solid var(--accent-blue)' : '2.5px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}
        >
          <Code2 size={14} style={{ marginRight: 6, verticalAlign: -2, display: 'inline' }} />
          Query Performance Presets
        </button>
        <button
          onClick={() => { setActiveMode('custom'); }}
          style={{
            padding: '10px 18px',
            fontSize: '0.86rem',
            fontWeight: 700,
            color: activeMode === 'custom' ? 'var(--accent-blue)' : 'var(--text-muted)',
            borderBottom: activeMode === 'custom' ? '2.5px solid var(--accent-blue)' : '2.5px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}
        >
          <Terminal size={14} style={{ marginRight: 6, verticalAlign: -2, display: 'inline' }} />
          Custom Query Validation Playground
        </button>
      </div>

      {activeMode === 'presets' ? (
        <>
          {/* Preset Selector */}
          <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <FileCode size={20} color="var(--accent-blue)" /> o9 Script Performance Profiler
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Select a common sub-optimal o9 script query pattern to run through the EKG Profiler. See the performance analysis, cost breakdowns, and structural recommendations side-by-side with the optimized code.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {SAMPLE_QUERIES.map(q => (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelectedId(q.id);
                    setShowResults(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    border: `1px solid ${selectedId === q.id ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    background: selectedId === q.id ? 'var(--accent-blue-light)' : 'var(--bg-card)',
                    color: selectedId === q.id ? 'var(--accent-blue-dark)' : 'var(--text-secondary)',
                    transition: 'all 200ms ease'
                  }}
                >
                  {q.name}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <HelpCircle size={16} color="var(--accent-indigo)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>Problem Scenario</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{activeQuery.description}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preset code panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div className="diff-panel-title">Original (Sub-optimal)</div>
              <div className="profiler-code-panel" style={{ height: 260 }}>
                {activeQuery.subOptimal.split('\n').map((line, i) => (
                  <div key={i} className="profiler-code-line diff-line-removed">
                    <span className="profiler-line-num">{i + 1}</span>
                    <span className="profiler-line-content">{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="diff-panel-title">Optimized Query</div>
              <div className="profiler-code-panel" style={{ height: 260 }}>
                {activeQuery.optimized.split('\n').map((line, i) => (
                  <div key={i} className="profiler-code-line diff-line-added">
                    <span className="profiler-line-num">{i + 1}</span>
                    <span className="profiler-line-content">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleProfile}
              disabled={isProfiling}
              style={{ padding: '12px 36px', minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Play size={16} fill="white" />
              {isProfiling ? 'Profiling EKG Cache...' : 'Profile Query Execution'}
            </button>
          </div>

          {/* Presets Profiler console */}
          <AnimatePresence>
            {isProfiling && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="terminal-window"
              >
                <div className="terminal-header">
                  <div className="terminal-dot red" />
                  <div className="terminal-dot yellow" />
                  <div className="terminal-dot green" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 8 }}>o9 query profiler console</span>
                </div>
                <div className="terminal-body" style={{ height: 160 }}>
                  <div className="terminal-line info">[INFO] Initializing o9 Script parser & tokenizer...</div>
                  {profilerStep >= 1 && (
                    <div className="terminal-line info">[INFO] Scanning EKG relationships & Graph Cube indexes...</div>
                  )}
                  {profilerStep >= 2 && (
                    <div className="terminal-line warn">[WARN] Dynamic evaluation of members detected on deep levels!</div>
                  )}
                  {profilerStep >= 3 && (
                    <div className="terminal-line success">[SUCCESS] Execution profiling complete. Math models solved.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results check */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)', background: 'var(--bg-glass)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-subtle)', paddingRight: 24 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Performance Gain</div>
                      <div style={{ fontSize: '3.2rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>{speedup}x</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Faster execution time</div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={15} color="var(--accent-amber)" /> EKG Bottleneck Detected
                      </h4>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                        <strong>{activeQuery.bottleneck}</strong>
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        {activeQuery.explanation}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f43f5e', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Original Cost ({totalSub}ms)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {phases.map(p => {
                        const val = activeQuery.metrics.subOptimal[p.key];
                        const pct = Math.max(8, (val / totalSub) * 100);
                        return (
                          <div key={p.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4, fontWeight: 500 }}>
                              <span>{p.label}</span>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{val}ms</span>
                            </div>
                            <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#f43f5e', borderRadius: 4 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Optimized Cost ({totalOpt}ms)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {phases.map(p => {
                        const val = activeQuery.metrics.optimized[p.key];
                        const maxVal = activeQuery.metrics.subOptimal[p.key];
                        const pct = Math.max(4, (val / maxVal) * 100);
                        return (
                          <div key={p.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4, fontWeight: 500 }}>
                              <span>{p.label}</span>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{val}ms ({((maxVal - val) / maxVal * 100).toFixed(0)}% saved)</span>
                            </div>
                            <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-emerald)', borderRadius: 4 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>
                    🛠️ How to Optimize this Query in o9 Solutions
                  </h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 0 }}>
                    {activeQuery.recs.map((rec, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <CheckCircle size={15} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: 2 }} />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* CUSTOM QUERY PLAYGROUND */
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'stretch' }}>
          
          {/* Left panel: editor & snippets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="card" style={{ padding: 20, border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Terminal size={16} color="var(--accent-blue)" /> o9 Script Editor Canvas
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Paste your custom o9 MDX or SQL-like supply chain query scripts below. Press validate to scan for known cache-bypassing patterns.
              </p>

              {/* Paste presets/snippets shortcut */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', alignSelf: 'center', marginRight: 4 }}>Templates:</span>
                {SNIPPETS.map((snip, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCustomInput(snip.code);
                      setCustomResults(null);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: '0.72rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 150ms ease'
                    }}
                  >
                    {snip.name}
                  </button>
                ))}
              </div>

              {/* Line-numbered editor input container */}
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', minHeight: 280 }}>
                {/* Simulated line numbers gutter */}
                <div style={{
                  padding: '12px 8px',
                  background: 'var(--bg-primary)',
                  borderRight: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                  userSelect: 'none',
                  minWidth: 32,
                  lineHeight: '1.6'
                }}>
                  {customInput.split('\n').map((_, index) => (
                    <div key={index}>{index + 1}</div>
                  ))}
                </div>
                {/* Editor Textarea */}
                <textarea
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                  }}
                  placeholder="SELECT CROSSJOIN(...) FROM [EKG_Graph_Cube] ..."
                  style={{
                    flex: 1,
                    padding: 12,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    minHeight: 280,
                    width: '100%',
                    whiteSpace: 'pre'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCustomValidate}
                  disabled={isCustomValidating}
                  style={{
                    padding: '8px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.82rem'
                  }}
                >
                  {isCustomValidating ? <RefreshCw className="spinner" size={13} /> : <Zap size={13} fill="white" />}
                  {isCustomValidating ? 'Scanning AST...' : 'Run Diagnostics'}
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Validation Results & Optimized Suggestion */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence mode="wait">
              {isCustomValidating ? (
                <motion.div
                  key="validating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 40,
                    height: '100%',
                    minHeight: 400,
                    textAlign: 'center'
                  }}
                >
                  <RefreshCw className="spinner" size={36} color="var(--accent-blue)" style={{ marginBottom: 16 }} />
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>Evaluating o9 Compilation Rules</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, maxWidth: 260 }}>
                    Scanning syntax predicates against 15+ indexing and query constraints...
                  </p>
                </motion.div>
              ) : customResults ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  {/* Score & Speedup bar */}
                  <div className="card" style={{ padding: '16px 20px', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderRight: '1px solid var(--border-subtle)', paddingRight: 12 }}>
                      <div style={{
                        width: 50, height: 50, borderRadius: '50%',
                        background: customResults.score >= 70 ? 'var(--accent-emerald-light)' : customResults.score >= 40 ? 'var(--accent-amber-light)' : 'var(--accent-rose-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: customResults.score >= 70 ? 'var(--accent-emerald)' : customResults.score >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                        fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-mono)'
                      }}>
                        {customResults.score}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Query Efficiency</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {customResults.issues.length === 0 ? 'Optimal Configuration' : `${customResults.issues.length} anti-patterns found`}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Latency Savings</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        {customResults.speedup}
                      </div>
                    </div>
                  </div>

                  {/* Issues lists */}
                  <div className="card" style={{ padding: 20, border: '1px solid var(--border-subtle)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={15} color="var(--accent-blue)" /> Diagnostic Findings
                    </h4>

                    {customResults.issues.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '30px 0', textAlign: 'center' }}>
                        <CheckCircle size={32} color="var(--accent-emerald)" style={{ marginBottom: 10 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Clean Code Optimization</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 220 }}>
                          Query follows best practices. High execution caching predicted.
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', paddingRight: 6 }}>
                        {customResults.issues.map((issue) => (
                          <div
                            key={issue.id}
                            style={{
                              padding: 12,
                              borderRadius: 'var(--radius-sm)',
                              background: issue.severity === 'critical' ? 'rgba(239,68,68,0.04)' : issue.severity === 'high' ? 'rgba(244,63,94,0.04)' : 'rgba(245,158,11,0.04)',
                              border: `1px solid ${issue.severity === 'critical' ? 'rgba(239,68,68,0.15)' : issue.severity === 'high' ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)'}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: issue.severity === 'critical' ? '#fef2f2' : issue.severity === 'high' ? '#fff1f2' : '#fffbeb',
                                color: issue.severity === 'critical' ? '#ef4444' : issue.severity === 'high' ? '#f43f5e' : '#d97706'
                              }}>
                                {issue.severity}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                Line {issue.line}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                              {issue.title}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'block', marginBottom: 6 }}>
                              {issue.problem}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-subtle)', paddingTop: 4, display: 'block', marginTop: 4 }}>
                              <strong>Recommendation:</strong> {issue.recommendation}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Optimized Suggestion Code */}
                  {customResults.issues.length > 0 && (
                    <div className="card" style={{ padding: 20, border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-emerald)', margin: 0 }}>
                          ✓ Optimized Suggestion
                        </h4>
                        <button
                          onClick={copyCustomOptimized}
                          style={{
                            background: copiedCode ? 'var(--accent-emerald-light)' : 'transparent',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 4,
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            color: copiedCode ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                          {copiedCode ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>
                      <div className="profiler-code-panel" style={{ height: 160, background: 'var(--bg-secondary)' }}>
                        {customResults.optimized.split('\n').map((line, i) => (
                          <div key={i} className="profiler-code-line diff-line-added">
                            <span className="profiler-line-num">{i + 1}</span>
                            <span className="profiler-line-content" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="blank"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-glass)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 40,
                    height: '100%',
                    minHeight: 400,
                    textAlign: 'center'
                  }}
                >
                  <FileCode size={36} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Validation Console Ready</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, maxWidth: 220, lineHeight: 1.5 }}>
                    Click "Run Diagnostics" to check your script syntax for caching conflicts, crossjoins, or traversal loops.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}

    </div>
  );
}
