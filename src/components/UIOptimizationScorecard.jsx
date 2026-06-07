import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, TrendingDown, TrendingUp, CheckCircle2, XCircle,
  ArrowDown, ArrowUp, Minus, Sparkles
} from 'lucide-react';
import { POSITIVE_FACTORS, NEGATIVE_FACTORS } from '../data/optimizationRules';

function FactorChip({ label, active, type, impact }) {
  const isPositive = type === 'positive';
  const colors = {
    activeBg: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
    activeBorder: isPositive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
    activeColor: isPositive ? '#059669' : '#dc2626',
    inactiveBg: 'var(--bg-input)',
    inactiveBorder: 'var(--border-subtle)',
    inactiveColor: 'var(--text-muted)',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 'var(--radius-sm)',
      background: active ? colors.activeBg : colors.inactiveBg,
      border: `1px solid ${active ? colors.activeBorder : colors.inactiveBorder}`,
      fontSize: '0.73rem', fontWeight: active ? 600 : 500,
      color: active ? colors.activeColor : colors.inactiveColor,
      transition: 'all 200ms ease',
    }}>
      {active ? (
        isPositive ? <CheckCircle2 size={12} /> : <XCircle size={12} />
      ) : (
        <Minus size={12} style={{ opacity: 0.4 }} />
      )}
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{
        fontSize: '0.62rem', fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: active ? colors.activeColor : 'var(--text-muted)',
        opacity: active ? 1 : 0.5,
      }}>
        {impact > 0 ? `+${impact}%` : `${impact}%`}
      </span>
    </div>
  );
}

function LoadImpactBar({ factors, activePositive, activeNegative }) {
  // Calculate impact segments
  const segments = [];
  let totalReduction = 0;
  let totalIncrease = 0;

  POSITIVE_FACTORS.forEach(pf => {
    if (activePositive.includes(pf.value)) {
      totalReduction += Math.abs(pf.impact);
    }
  });

  NEGATIVE_FACTORS.forEach(nf => {
    if (activeNegative.includes(nf.value)) {
      totalIncrease += nf.impact;
    }
  });

  const net = totalIncrease - totalReduction; // negative = good
  const maxBar = 100;
  const reductionPct = Math.min((totalReduction / maxBar) * 100, 80);
  const increasePct = Math.min((totalIncrease / maxBar) * 100, 80);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Estimated Load Time Impact
        </span>
        <span style={{
          fontSize: '0.78rem', fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: net <= 0 ? '#10b981' : '#ef4444',
        }}>
          Net: {net <= 0 ? '' : '+'}{net}%
        </span>
      </div>

      {/* Reduction bar (green) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600, minWidth: 80 }}>
          <ArrowDown size={10} style={{ verticalAlign: -1 }} /> Reduction
        </span>
        <div style={{
          flex: 1, height: 12, background: 'var(--bg-input)',
          borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-subtle)'
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${reductionPct}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              borderRadius: 999,
            }}
          />
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)', minWidth: 40 }}>
          −{totalReduction}%
        </span>
      </div>

      {/* Increase bar (red) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600, minWidth: 80 }}>
          <ArrowUp size={10} style={{ verticalAlign: -1 }} /> Overhead
        </span>
        <div style={{
          flex: 1, height: 12, background: 'var(--bg-input)',
          borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-subtle)'
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${increasePct}%` }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #f87171, #ef4444)',
              borderRadius: 999,
            }}
          />
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)', minWidth: 40 }}>
          +{totalIncrease}%
        </span>
      </div>
    </div>
  );
}

export default function UIOptimizationScorecard({ results, form }) {
  if (!results?.uiPerformance) return null;

  const {
    positiveAdoption, activePositiveCount, totalPositiveCount,
    activeNegativeCount, totalNegativeCount, estLoadImpact,
  } = results.uiPerformance;

  const activePositive = form.positiveFactors || [];
  const activeNegative = form.negativeFactors || [];

  // Compute performance tier
  const uiScore = results.uiPerfScore;
  let tierLabel, tierColor, tierIcon;
  if (uiScore >= 80) {
    tierLabel = 'Excellent'; tierColor = '#10b981'; tierIcon = <Sparkles size={14} />;
  } else if (uiScore >= 60) {
    tierLabel = 'Good'; tierColor = '#3b82f6'; tierIcon = <CheckCircle2 size={14} />;
  } else if (uiScore >= 40) {
    tierLabel = 'Fair'; tierColor = '#f59e0b'; tierIcon = <Minus size={14} />;
  } else {
    tierLabel = 'Critical'; tierColor = '#ef4444'; tierIcon = <XCircle size={14} />;
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: '28px',
      marginBottom: 28,
      boxShadow: 'var(--shadow-sm)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative gradient */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 200, height: 200,
        background: `radial-gradient(circle at top right, ${tierColor}08, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={14} color="white" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              UI Optimization Scorecard
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginLeft: 36 }}>
            Analysis of o9 report view configuration factors affecting UI load & runtime
          </p>
        </div>

        {/* Performance Tier Badge */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '12px 20px', borderRadius: 'var(--radius-lg)',
          background: `${tierColor}08`,
          border: `1.5px solid ${tierColor}25`,
        }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: tierColor, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {uiScore}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            marginTop: 4, fontSize: '0.65rem', fontWeight: 700,
            color: tierColor, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {tierIcon} {tierLabel}
          </div>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>UI PERF SCORE</span>
        </div>
      </div>

      {/* Stats summary row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
        marginBottom: 20, padding: '12px 0',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{activePositiveCount}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Positive Active</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-muted)' }}>{totalPositiveCount - activePositiveCount}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Positive Missing</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{activeNegativeCount}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Negative Present</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.1rem', fontWeight: 800,
            color: estLoadImpact <= 0 ? '#10b981' : '#ef4444',
          }}>
            {estLoadImpact <= 0 ? '' : '+'}{estLoadImpact}%
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Net Load Impact</div>
        </div>
      </div>

      {/* Positive/Negative Adoption Gauge */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Positive Factor Adoption
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
            {positiveAdoption}%
          </span>
        </div>
        <div style={{
          height: 10, background: 'var(--bg-input)',
          borderRadius: 999, overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${positiveAdoption}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              borderRadius: 999,
            }}
          />
        </div>
      </div>

      {/* Load Impact Bar */}
      <LoadImpactBar
        factors={null}
        activePositive={activePositive}
        activeNegative={activeNegative}
      />

      {/* Factor Checklist Matrix */}
      <div style={{ marginTop: 24 }}>
        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingDown size={14} color="#10b981" />
          Positive Factors (Reduce Load Time)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
          {POSITIVE_FACTORS.map(pf => (
            <FactorChip
              key={pf.value}
              label={pf.label}
              active={activePositive.includes(pf.value)}
              type="positive"
              impact={pf.impact}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} color="#ef4444" />
          Negative Factors (Increase Load Time)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
          {NEGATIVE_FACTORS.map(nf => (
            <FactorChip
              key={nf.value}
              label={nf.label}
              active={activeNegative.includes(nf.value)}
              type="negative"
              impact={nf.impact}
            />
          ))}
        </div>
      </div>

      {/* Auto-generated suggestion */}
      {(activePositiveCount < totalPositiveCount || activeNegativeCount > 0) && (
        <div style={{
          marginTop: 20, padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(59,130,246,0.06))',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6366f1', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} /> Quick Optimization Suggestions
          </h5>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {!activePositive.includes('named_sets_used') && (
              <li>Enable <strong>Named Sets</strong> — this is the single biggest load-time reducer (up to −15%)</li>
            )}
            {!activePositive.includes('hide_null_rows') && (
              <li>Enable <strong>Hide Null Rows</strong> — quick win for sparse datasets (−10%)</li>
            )}
            {!activePositive.includes('low_max_intersection') && (
              <li>Reduce <strong>Max Intersection</strong> in tenant settings for faster Graph Cube queries (−20%)</li>
            )}
            {activeNegative.includes('conditional_formatting') && (
              <li>Reduce <strong>Conditional Formatting</strong> rules to ≤3 — current config adds +5-10% load overhead</li>
            )}
            {activeNegative.includes('interdependent_filters') && (
              <li><strong style={{ color: '#ef4444' }}>Critical:</strong> Replace <strong>interdependent filters</strong> with Named Sets — currently adding +15-40% load time</li>
            )}
            {activeNegative.includes('nulls_subtotals_defaults') && (
              <li>Remove unnecessary <strong>nulls, subtotals, and default measures</strong> — adding +12% overhead</li>
            )}
            {!activePositive.includes('chain_linked_reports') && (
              <li>Implement <strong>Chain-Linked Reports</strong> for multi-report workflows (−12%)</li>
            )}
            {!activePositive.includes('reporting_measures_alt') && (
              <li>Replace active rules with <strong>Reporting Measures</strong> (max 3) for −12% load improvement</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
