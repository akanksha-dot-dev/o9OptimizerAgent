import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f43f5e',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function RecommendationCard({ rule }) {
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {rule.title}
            </h3>
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

              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
