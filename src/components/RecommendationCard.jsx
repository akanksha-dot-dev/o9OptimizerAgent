import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f43f5e',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function RecommendationCard({ rule, status = 'todo', onStatusChange }) {
  const [expanded, setExpanded] = useState(false);

  const borderColor = SEVERITY_COLORS[rule.severity] || '#94a3b8';

  return (
    <div
      className="result-card"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="result-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="result-card-header-left">
          <span className={`result-severity severity-${rule.severity}`}>
            {rule.severity}
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {rule.title}
              </h3>
              {status !== 'todo' && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: status === 'in_progress' ? 'var(--accent-blue-light)' : 'var(--accent-emerald-light)',
                  color: status === 'in_progress' ? 'var(--accent-blue)' : 'var(--accent-emerald)',
                  border: `1px solid ${status === 'in_progress' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'}`
                }}>
                  {status === 'in_progress' ? 'In Progress' : 'Completed'}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {rule.category}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="impact-tag">
            <TrendingUp size={11} /> {rule.impact}
          </span>
          {expanded
            ? <ChevronUp size={18} color="var(--text-muted)" />
            : <ChevronDown size={18} color="var(--text-muted)" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="result-card-body">
              <h4>🔍 Problem</h4>
              <p>{rule.problem}</p>

              <h4>💡 Recommendation</h4>
              <p>{rule.recommendation}</p>

              <h4>📋 Implementation Steps</h4>
              <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {rule.steps.map((step, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        minWidth: 24,
                        borderRadius: '50%',
                        background: 'var(--accent-blue-light, #eff6ff)',
                        border: '1.5px solid var(--accent-blue, #3b82f6)',
                        color: 'var(--accent-blue, #3b82f6)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, paddingTop: 2 }}>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 14px', borderRadius: 999,
                    background: '#eef2ff', border: '1px solid #c7d2fe',
                    fontSize: '0.73rem', fontWeight: 600, color: 'var(--accent-indigo)'
                  }}>
                    <Wrench size={12} /> Effort: {rule.effortLevel}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 14px', borderRadius: 999,
                    background: 'var(--accent-emerald-light)', border: '1px solid #a7f3d0',
                    fontSize: '0.73rem', fontWeight: 600, color: 'var(--accent-emerald)'
                  }}>
                    <TrendingUp size={12} /> {rule.impact}
                  </div>
                </div>

                {onStatusChange && (
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Roadmap Status
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['todo', 'in_progress', 'completed'].map(s => {
                        const active = status === s;
                        const label = s === 'todo' ? 'Todo' : s === 'in_progress' ? 'In Progress' : 'Completed';
                        let activeStyle = {
                          background: 'var(--bg-input)',
                          color: 'var(--text-secondary)',
                          borderColor: 'var(--border-subtle)'
                        };
                        if (active) {
                          if (s === 'todo') activeStyle = { background: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' };
                          if (s === 'in_progress') activeStyle = { background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' };
                          if (s === 'completed') activeStyle = { background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' };
                        }
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(rule.id, s);
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              border: '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                              ...activeStyle
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
