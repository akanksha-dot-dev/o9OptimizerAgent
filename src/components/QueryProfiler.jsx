import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, FileCode, CheckCircle, AlertTriangle, ArrowRight, Gauge, ChevronRight, HelpCircle } from 'lucide-react';

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

export default function QueryProfiler() {
  const [selectedId, setSelectedId] = useState(SAMPLE_QUERIES[0].id);
  const [isProfiling, setIsProfiling] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [profilerStep, setProfilerStep] = useState(0);

  const activeQuery = SAMPLE_QUERIES.find(q => q.id === selectedId);

  const handleProfile = () => {
    setIsProfiling(true);
    setShowResults(false);
    setProfilerStep(0);

    // Simulate logs running in background
    const timer1 = setTimeout(() => setProfilerStep(1), 500);
    const timer2 = setTimeout(() => setProfilerStep(2), 1100);
    const timer3 = setTimeout(() => setProfilerStep(3), 1600);
    const timer4 = setTimeout(() => {
      setIsProfiling(false);
      setShowResults(true);
    }, 2200);
  };

  const getSubTotal = (metrics) => metrics.parsing + metrics.traversal + metrics.aggregation + metrics.serialization;
  const getOptTotal = (metrics) => metrics.parsing + metrics.traversal + metrics.aggregation + metrics.serialization;

  const totalSub = getSubTotal(activeQuery.metrics.subOptimal);
  const totalOpt = getOptTotal(activeQuery.metrics.optimized);
  const speedup = (totalSub / totalOpt).toFixed(1);

  const phases = [
    { key: 'parsing', label: 'Query Parsing' },
    { key: 'traversal', label: 'EKG Graph Traversal' },
    { key: 'aggregation', label: 'Cube Aggregation' },
    { key: 'serialization', label: 'Grid Serialization' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Select Sample & Description */}
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

      {/* Code Editor Panels Side-by-Side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Sub-optimal panel */}
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

        {/* Optimized panel */}
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

      {/* Launch profiling button */}
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

      {/* Profiling Console Animation */}
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

      {/* Execution Results & Diff Comparison */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* Speedup and Score card */}
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

            {/* Metric Bars Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Original Query metrics */}
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

              {/* Optimized Query metrics */}
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

            {/* Recommendations checklist */}
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
    </div>
  );
}
