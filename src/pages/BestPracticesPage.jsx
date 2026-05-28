import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Gauge, Wrench, Layout, Database, GitBranch,
  ShieldCheck, CheckCircle, ChevronDown, ChevronUp, Search
} from 'lucide-react';

const practices = [
  {
    icon: <Layers size={24} />, color: 'indigo',
    title: 'Hierarchy Design',
    tips: [
      'Keep hierarchy depth to 4-5 meaningful levels maximum',
      'Use attributes for filtering instead of adding hierarchy levels',
      'Align hierarchies to actual planning granularity',
      'Avoid 1:1 parent-child ratios — merge those levels',
      'Test aggregation/disaggregation performance after hierarchy changes',
    ]
  },
  {
    icon: <Gauge size={24} />, color: 'violet',
    title: 'KPI Strategy',
    tips: [
      'Limit dashboards to 5-8 strategic KPIs per view',
      'Create role-specific views (Demand Planner, Supply Planner, Finance)',
      'Standardize KPI definitions across the organization',
      'Use WMAPE over MAPE for forecast accuracy to handle low-volume items',
      'Add tooltips showing KPI formula and data source on each metric',
    ]
  },
  {
    icon: <Wrench size={24} />, color: 'cyan',
    title: 'Calculation Engine',
    tips: [
      'Profile and benchmark all calculation engine runs monthly',
      'Match engine type to problem type (heuristic vs LP/MIP vs ML)',
      'Implement incremental calculations instead of full recalculations',
      'Schedule heavy computations during off-peak hours',
      'Tune solver parameters: gap tolerance, time limits, thread count',
    ]
  },
  {
    icon: <Layout size={24} />, color: 'emerald',
    title: 'Report Layout',
    tips: [
      'Default to summary views with drill-down capability',
      'Limit visible columns to 8-12 in default view',
      'Implement exception-based reporting with color-coded severity',
      'Use virtual scrolling for reports exceeding 1,000 rows',
      'Add column show/hide toggles for user customization',
    ]
  },
  {
    icon: <Database size={24} />, color: 'amber',
    title: 'Data Management',
    tips: [
      'Implement hot/warm/cold data tiering by time horizon',
      'Cleanse and validate data at the ingestion layer before EKG',
      'Create summary aggregate tables for historical trend analysis',
      'Only process truly necessary data points in real-time',
      'Set up automated data quality scorecards with trend tracking',
    ]
  },
  {
    icon: <GitBranch size={24} />, color: 'rose',
    title: 'Scenario Planning',
    tips: [
      'Limit real-time scenario comparisons to 3-4 scenarios',
      'Show delta/variance views instead of full absolute values',
      'Pre-compute and cache scenario results on save',
      'Use spider charts and waterfalls for visual scenario comparison',
      'Archive old scenarios to prevent performance creep',
    ]
  },
  {
    icon: <ShieldCheck size={24} />, color: 'indigo',
    title: 'Governance & Operations',
    tips: [
      'Assign clear ownership and maintenance responsibility for every report',
      'Run quarterly report audits to identify unused or duplicate reports',
      'Define and monitor performance SLAs (e.g., < 3s load time)',
      'Maintain a performance optimization backlog',
      'Implement a formal report request workflow for new reports',
    ]
  },
];

export default function BestPracticesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(
    practices.map((_, i) => i)
  );

  const toggleCategory = (index) => {
    setExpandedCategories(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const filteredPractices = useMemo(() => {
    if (searchQuery === '') return practices;
    const q = searchQuery.toLowerCase();
    return practices.map(practice => {
      const matchedTips = practice.tips.filter(tip =>
        tip.toLowerCase().includes(q)
      );
      const titleMatches = practice.title.toLowerCase().includes(q);
      if (titleMatches) return practice;
      if (matchedTips.length > 0) return { ...practice, tips: matchedTips };
      return null;
    }).filter(Boolean);
  }, [searchQuery]);

  const totalTips = filteredPractices.reduce((s, p) => s + p.tips.length, 0);

  return (
    <div className="section" style={{ background: 'white' }}>
      <div className="page-wrapper">
        <div className="section-header">
          <h2>o9 Report Best Practices</h2>
          <p>
            Curated best practices from real-world o9 implementations to keep your
            reports fast, accurate, and actionable.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ maxWidth: 600, margin: '0 auto 28px', position: 'relative' }}>
          <Search size={17} style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            type="text"
            placeholder="Search tips across all categories…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '11px 16px 11px 42px',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)', fontSize: '0.9rem', outline: 'none'
            }}
          />
        </div>

        {searchQuery && (
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20, fontWeight: 500 }}>
            Found {totalTips} tips across {filteredPractices.length} categories
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredPractices.map((practice, i) => {
            const originalIndex = practices.findIndex(p => p.title === practice.title);
            const isExpanded = expandedCategories.includes(originalIndex);

            return (
              <motion.div
                key={practice.title}
                className="card"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleCategory(originalIndex)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '24px 32px', cursor: 'pointer',
                    userSelect: 'none', transition: 'background 150ms ease',
                    background: isExpanded ? 'transparent' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className={`card-icon ${practice.color}`} style={{ width: 50, height: 50, marginBottom: 0 }}>
                      {practice.icon}
                    </div>
                    <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{practice.title}</h3>
                    <span style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                      background: 'var(--accent-blue-light)', color: 'var(--accent-blue)',
                      border: '1px solid rgba(59,130,246,0.2)',
                    }}>
                      {practice.tips.length} tips
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Accordion Body */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <ul style={{
                        display: 'flex', flexDirection: 'column', gap: 10,
                        paddingLeft: 0, listStyle: 'none',
                        padding: '0 32px 28px 32px',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: 20,
                      }}>
                        {practice.tips.map((tip, j) => (
                          <li key={j} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65
                          }}>
                            <CheckCircle size={16} style={{
                              color: 'var(--accent-emerald)', flexShrink: 0, marginTop: 3
                            }} />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {filteredPractices.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.95rem' }}>No tips match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
