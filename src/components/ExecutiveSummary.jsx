import React from 'react';
import { Lightbulb, AlertTriangle, TrendingUp, Clock, Shield, Gauge, Activity } from 'lucide-react';

function generateSummary(results, form) {
  const { score, criticalCount, highCount, totalRecommendations, categories, uiPerfScore, uiPerformance } = results;
  const topCategory = Object.entries(categories).sort((a, b) => b[1].length - a[1].length)[0];

  let grade, gradeColor, headline;
  if (score >= 80) {
    grade = 'A'; gradeColor = '#10b981';
    headline = 'Your report configuration is well-optimized with minor tuning opportunities.';
  } else if (score >= 60) {
    grade = 'B'; gradeColor = '#3b82f6';
    headline = 'Good foundation — targeted improvements can unlock significant performance gains.';
  } else if (score >= 40) {
    grade = 'C'; gradeColor = '#f59e0b';
    headline = 'Several optimization opportunities identified. Prioritize critical items first.';
  } else {
    grade = 'D'; gradeColor = '#ef4444';
    headline = 'Significant optimization needed. Address critical issues immediately to improve user experience.';
  }

  const quickWins = results.recommendations.filter(r => r.effortLevel === 'Low').length;
  const estTimeSaved = criticalCount * 15 + highCount * 8 + (totalRecommendations - criticalCount - highCount) * 3;

  // UI Performance insights
  const uiTierLabel = uiPerfScore >= 80 ? 'Excellent' :
    uiPerfScore >= 60 ? 'Good' :
    uiPerfScore >= 40 ? 'Fair' : 'Critical';
  const uiTierColor = uiPerfScore >= 80 ? '#10b981' :
    uiPerfScore >= 60 ? '#3b82f6' :
    uiPerfScore >= 40 ? '#f59e0b' : '#ef4444';
  const positiveAdoption = uiPerformance?.positiveAdoption || 0;

  return { grade, gradeColor, headline, topCategory, quickWins, estTimeSaved, uiTierLabel, uiTierColor, uiPerfScore, positiveAdoption };
}

export default function ExecutiveSummary({ results, form }) {
  if (!results) return null;
  const { grade, gradeColor, headline, topCategory, quickWins, estTimeSaved, uiTierLabel, uiTierColor, uiPerfScore, positiveAdoption } = generateSummary(results, form);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f8f9fc 0%, #eef2ff 100%)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)', padding: '28px 32px',
      marginBottom: 28, position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: `${gradeColor}08`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${gradeColor}15`, border: `2px solid ${gradeColor}30`, flexShrink: 0
        }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: gradeColor, fontFamily: 'var(--font-mono)' }}>{grade}</span>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
            Executive Summary
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            {headline}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color="#ef4444" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#ef4444' }}>{results.criticalCount}</strong> critical issues
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={14} color="#f59e0b" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#f59e0b' }}>{quickWins}</strong> quick wins available
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={14} color="#10b981" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Top area: <strong>{topCategory ? topCategory[0] : 'N/A'}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} color="#6366f1" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                ~<strong style={{ color: '#6366f1' }}>{estTimeSaved}%</strong> perf. gain potential
              </span>
            </div>
            {/* New: UI Performance Tier */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color={uiTierColor} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                UI Perf: <strong style={{ color: uiTierColor }}>{uiTierLabel}</strong> ({uiPerfScore}/100)
              </span>
            </div>
            {/* New: Positive Factor Coverage */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gauge size={14} color="#8b5cf6" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Optimization: <strong style={{ color: '#8b5cf6' }}>{positiveAdoption}%</strong> adoption
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
