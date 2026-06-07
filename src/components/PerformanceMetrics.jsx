import React from 'react';
import { Activity, Clock, Users, Gauge, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

function GaugeRing({ value, max, tier, label, unit, icon, color, delay = 0 }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: '24px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle glow background */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 100, height: 100, borderRadius: '50%',
        background: `${color}10`, pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 12 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="8" opacity="0.3" />
          <motion.circle
            cx="60" cy="60" r={radius}
            fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, delay, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {value > 0 ? value.toLocaleString() : '—'}
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
            {unit}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 12px', borderRadius: 999,
        background: `${color}12`, border: `1px solid ${color}30`,
        fontSize: '0.68rem', fontWeight: 700, color,
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {tier.tier === 'excellent' || tier.tier === 'good' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
        {tier.label}
      </div>
    </div>
  );
}

export default function PerformanceMetrics({ results, form }) {
  if (!results?.uiPerformance) return null;

  const { graphCubeTier, webApiTier, concurrentUsersTier, graphCubeTime, webApiTime } = results.uiPerformance;
  const userCount = parseInt(form.userCount) || 0;

  const hasAnyMetric = graphCubeTime > 0 || webApiTime > 0 || userCount > 0;
  if (!hasAnyMetric) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.02) 0%, rgba(59,130,246,0.04) 100%)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: '28px 28px 24px',
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Gauge size={14} color="white" />
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Performance Metrics
        </h3>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20, marginLeft: 36 }}>
        Graph Cube, Web API, and concurrent user capacity measurements
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {graphCubeTime > 0 && (
          <GaugeRing
            value={graphCubeTime}
            max={5000}
            tier={graphCubeTier}
            label="Graph Cube Execution"
            unit="ms"
            icon={<Activity size={14} color={graphCubeTier.color} />}
            color={graphCubeTier.color}
            delay={0}
          />
        )}
        {webApiTime > 0 && (
          <GaugeRing
            value={webApiTime}
            max={8000}
            tier={webApiTier}
            label="Web API Processing"
            unit="ms"
            icon={<Clock size={14} color={webApiTier.color} />}
            color={webApiTier.color}
            delay={0.15}
          />
        )}
        {userCount > 0 && (
          <GaugeRing
            value={userCount}
            max={concurrentUsersTier.max || 100}
            tier={concurrentUsersTier}
            label="Concurrent Users"
            unit={`/ ${concurrentUsersTier.max} max`}
            icon={<Users size={14} color={concurrentUsersTier.color} />}
            color={concurrentUsersTier.color}
            delay={0.3}
          />
        )}
      </div>

      {/* Threshold Legend */}
      <div style={{
        display: 'flex', gap: 16, justifyContent: 'center',
        marginTop: 16, paddingTop: 12,
        borderTop: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Excellent', color: '#10b981' },
          { label: 'Good', color: '#3b82f6' },
          { label: 'Fair', color: '#f59e0b' },
          { label: 'Critical', color: '#ef4444' },
        ].map(t => (
          <span key={t.label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
