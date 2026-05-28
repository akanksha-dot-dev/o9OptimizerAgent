import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, Layers, Gauge, Database, ShieldCheck, GitBranch, Wrench } from 'lucide-react';
import { OPTIMIZATION_RULES } from '../data/optimizationRules';
import RecommendationCard from '../components/RecommendationCard';

const categoryIcons = {
  'Hierarchy & Data Model': <Layers size={20} />,
  'KPI & Metrics': <Gauge size={20} />,
  'Calculation Engine': <Wrench size={20} />,
  'Layout & UX': <BookOpen size={20} />,
  'Data Management': <Database size={20} />,
  'Scenario Planning': <GitBranch size={20} />,
  'Governance & Process': <ShieldCheck size={20} />,
};

const severityConfig = {
  critical: { label: 'Critical', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  high: { label: 'High', bg: '#fff1f2', color: '#f43f5e', border: '#fecdd3' },
  medium: { label: 'Medium', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  low: { label: 'Low', bg: '#ecfdf5', color: '#10b981', border: '#a7f3d0' },
};

export default function KnowledgePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState(null);

  const categories = [...new Set(OPTIMIZATION_RULES.map(r => r.category))];
  const categoryCounts = categories.map(cat => ({ category: cat, count: OPTIMIZATION_RULES.filter(r => r.category === cat).length }));

  // Severity counts across all rules
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    OPTIMIZATION_RULES.forEach(r => {
      if (counts[r.severity] !== undefined) counts[r.severity]++;
    });
    return counts;
  }, []);

  const totalRules = OPTIMIZATION_RULES.length;

  const filtered = OPTIMIZATION_RULES.filter(rule => {
    const matchesSearch = search === '' ||
      rule.title.toLowerCase().includes(search.toLowerCase()) ||
      rule.problem.toLowerCase().includes(search.toLowerCase()) ||
      rule.recommendation.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || rule.category === selectedCategory;
    const matchesSev = selectedSeverity === null || rule.severity === selectedSeverity;
    return matchesSearch && matchesCat && matchesSev;
  });

  return (
    <div className="section" style={{ background: 'white', minHeight: '80vh' }}>
      <div className="page-wrapper">
        <div className="section-header">
          <h2>Optimization Knowledge Base</h2>
          <p>Browse all optimization rules and best practices for o9 reports.</p>
        </div>

        {/* Severity Distribution Bar */}
        <div style={{ maxWidth: 800, margin: '0 auto 28px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Severity Distribution
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {totalRules} total rules
            </span>
          </div>
          <div style={{
            display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden',
            border: '1px solid var(--border-subtle)'
          }}>
            {Object.entries(severityCounts).map(([sev, count]) => {
              if (count === 0) return null;
              const pct = (count / totalRules) * 100;
              return (
                <div
                  key={sev}
                  title={`${severityConfig[sev].label}: ${count} (${Math.round(pct)}%)`}
                  style={{
                    width: `${pct}%`,
                    background: severityConfig[sev].color,
                    transition: 'width 0.5s ease',
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, justifyContent: 'center' }}>
            {Object.entries(severityCounts).map(([sev, count]) => (
              <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: severityConfig[sev].color,
                }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {severityConfig[sev].label} ({count})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="knowledge-summary-cards">
          {categoryCounts.map((cat) => (
            <div key={cat.category} className="stat-card" style={{ minWidth: 160 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{cat.category}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cat.count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>rules</div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <Search size={17} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              type="text"
              placeholder="Search rules, problems, recommendations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '11px 16px 11px 42px',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)', fontSize: '0.9rem', outline: 'none'
              }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              padding: '11px 16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)', background: 'var(--bg-input)',
              color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
              outline: 'none'
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Severity Filter Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedSeverity(null)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
              border: `1px solid ${selectedSeverity === null ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              background: selectedSeverity === null ? 'var(--accent-blue-light)' : 'white',
              color: selectedSeverity === null ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
          >
            All Severities
          </button>
          {Object.entries(severityCounts).map(([sev, count]) => {
            const cfg = severityConfig[sev];
            const isActive = selectedSeverity === sev;
            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(isActive ? null : sev)}
                style={{
                  padding: '5px 14px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                  border: `1px solid ${isActive ? cfg.color : cfg.border}`,
                  background: isActive ? cfg.bg : 'white',
                  color: isActive ? cfg.color : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms ease',
                  opacity: isActive ? 1 : 0.8,
                }}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20, fontWeight: 500 }}>
          Showing {filtered.length} of {OPTIMIZATION_RULES.length} optimization rules
        </p>

        <div className="card-grid">
          {filtered.map((rule, i) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <RecommendationCard rule={rule} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.95rem' }}>No rules match your current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
