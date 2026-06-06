import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, TrendingUp, Calendar, ArrowRight, Award } from 'lucide-react';

const MILESTONES_DATA = [
  {
    phase: 1,
    title: 'Phase 1: Foundational Alignment',
    timeline: 'Months 1-3',
    icon: '🚀',
    description: 'Establish baseline planning models, data quality scorecards, and consolidate disjointed Excel spreadsheets into o9.'
  },
  {
    phase: 2,
    title: 'Phase 2: Constrained Integration',
    timeline: 'Months 4-6',
    icon: '⚙️',
    description: 'Model capacity bottlenecks, set up multi-echelon safety stocks, and link operational forecasting directly to P&L views.'
  },
  {
    phase: 3,
    title: 'Phase 3: Cognitive Automation',
    timeline: 'Months 7-12',
    icon: '🔮',
    description: 'Deploy machine learning demand sensing, automate exception resolution, and execute real-time simulation digital twins.'
  }
];

export default function SNOPTimeline({ recommendations = [], baselineScore = 1 }) {
  // Map actions to their corresponding phases based on priority and levels
  const initialTasks = useMemo(() => {
    const tasks = [];
    recommendations.forEach((rec, recIdx) => {
      let phase = 3; // Default to Phase 3
      if (rec.priority === 'critical' || rec.currentLevel === 1) {
        phase = 1;
      } else if (rec.priority === 'high' || rec.currentLevel === 2) {
        phase = 2;
      }

      rec.actions.forEach((act, actIdx) => {
        tasks.push({
          id: `task-${recIdx}-${actIdx}`,
          phase,
          dimension: rec.dimension,
          text: act,
          completed: false,
          weight: rec.priority === 'critical' ? 0.3 : rec.priority === 'high' ? 0.2 : 0.1
        });
      });
    });

    // Fallback if no tasks generated
    if (tasks.length === 0) {
      tasks.push(
        { id: 'fallback-1', phase: 1, dimension: 'Demand', text: 'Cleanse planning database and align calendars', completed: false, weight: 0.2 },
        { id: 'fallback-2', phase: 2, dimension: 'Supply', text: 'Model material sourcing lead times in EKG', completed: false, weight: 0.2 },
        { id: 'fallback-3', phase: 3, dimension: 'Technology', text: 'Enable AI-driven anomalous order detection', completed: false, weight: 0.2 }
      );
    }
    return tasks;
  }, [recommendations]);

  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Group tasks by phase
  const phaseTasks = (p) => tasks.filter(t => t.phase === p);
  const phaseProgress = (p) => {
    const list = phaseTasks(p);
    if (list.length === 0) return 100;
    return Math.round((list.filter(t => t.completed).length / list.length) * 100);
  };

  // Calculate dynamic achieved scores
  const achievedScore = useMemo(() => {
    let extra = 0;
    tasks.forEach(t => {
      if (t.completed) extra += t.weight;
    });
    // Target is a maximum increase of ~2.5 levels
    return Math.min(5.0, Math.round((baselineScore + extra) * 10) / 10);
  }, [tasks, baselineScore]);

  // Compute SVG line chart coordinate coordinates
  // baseline -> phase 1 progress -> phase 2 progress -> phase 3 progress
  const chartPoints = useMemo(() => {
    const points = [
      { x: 10, y: baselineScore },
      { x: 38, y: baselineScore + (phaseProgress(1) / 100) * 1.0 },
      { x: 66, y: baselineScore + (phaseProgress(1) / 100) * 1.0 + (phaseProgress(2) / 100) * 0.8 },
      { x: 94, y: Math.min(5.0, baselineScore + (phaseProgress(1) / 100) * 1.0 + (phaseProgress(2) / 100) * 0.8 + (phaseProgress(3) / 100) * 0.7) }
    ];

    // Map y (1 to 5) to SVG height (90 to 10)
    return points.map(p => ({
      x: p.x,
      y: 90 - ((p.y - 1) / 4) * 80,
      scoreValue: Math.round(p.y * 10) / 10
    }));
  }, [baselineScore, tasks]);

  const pathString = `M ${chartPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 32 }}>
      <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <TrendingUp size={20} color="var(--accent-blue)" /> Interactive o9 Implementation Roadmap
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Check off roadmap actions to simulate your process transition. See your S&OP maturity growth curve evolve as foundational and cognitive capabilities are deployed in your organization.
        </p>

        {/* Timeline Grid */}
        <div className="sop-timeline-grid">
          {MILESTONES_DATA.map((milestone) => {
            const list = phaseTasks(milestone.phase);
            const progress = phaseProgress(milestone.phase);
            const isCompleted = progress === 100;
            const isActive = progress > 0 && progress < 100;

            let cardStatusClass = '';
            if (isCompleted) cardStatusClass = 'completed';
            else if (isActive || milestone.phase === 1) cardStatusClass = 'active';

            return (
              <div key={milestone.phase} className={`sop-milestone-card ${cardStatusClass}`}>
                <div className="sop-milestone-indicator">
                  {isCompleted ? <Check size={18} /> : milestone.phase}
                </div>

                <div className="sop-milestone-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>
                      <span style={{ marginRight: 6 }}>{milestone.icon}</span> {milestone.title}
                    </h4>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> {milestone.timeline}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                    {milestone.description}
                  </p>

                  {/* Actions Checkbox List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {list.map(t => (
                      <div
                        key={t.id}
                        onClick={() => toggleTask(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${t.completed ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                          background: t.completed ? 'var(--accent-emerald-light)' : 'var(--bg-input)',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, border: '1px solid var(--border-subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                          background: t.completed ? 'var(--accent-emerald)' : 'white',
                          borderColor: t.completed ? 'var(--accent-emerald)' : undefined
                        }}>
                          {t.completed && <Check size={12} color="white" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, color: t.completed ? 'var(--accent-emerald-dark)' : 'var(--text-secondary)', marginRight: 6 }}>
                            [{t.dimension}]
                          </span>
                          <span style={{ color: t.completed ? 'var(--accent-emerald-dark)' : 'var(--text-primary)' }}>{t.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Progress Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <div className="progress-bar" style={{ flex: 1, height: 4 }}>
                      <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'var(--accent-emerald)' }} />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {progress}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Maturity Growth Chart Card */}
      <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <Award size={18} color="var(--accent-indigo)" /> Projected S&OP Maturity Growth Curve
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Evolving from Baseline L{baselineScore} to Simulated L{achievedScore} over 12 months.
            </p>
          </div>

          <div style={{ background: 'var(--accent-indigo-light)', border: '1px solid rgba(99,102,241,0.2)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', textAlign: 'right' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>Achieved Maturity</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-indigo)', fontFamily: 'var(--font-mono)' }}>L{achievedScore}</span>
          </div>
        </div>

        {/* SVG Line Graph */}
        <div style={{ position: 'relative', width: '100%', height: 160, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: 12 }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            {/* Grid Lines */}
            {[10, 30, 50, 70, 90].map((yVal, idx) => (
              <line
                key={idx}
                x1="0"
                y1={yVal}
                x2="100"
                y2={yVal}
                stroke="var(--border-subtle)"
                strokeWidth="0.25"
                strokeDasharray="2,2"
              />
            ))}

            {/* Area under the path */}
            <path
              d={`${pathString} L 94,90 L 10,90 Z`}
              fill="url(#growthAreaGrad)"
              opacity="0.1"
            />

            {/* Path line */}
            <path
              d={pathString}
              fill="none"
              stroke="var(--accent-indigo)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots & labels at intervals */}
            {chartPoints.map((pt, idx) => {
              const labels = ['Baseline', 'Phase 1', 'Phase 2', 'Phase 3'];
              return (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="2.2"
                    fill="var(--accent-indigo)"
                    stroke="white"
                    strokeWidth="0.6"
                  />
                  {/* Score Text */}
                  <text
                    x={pt.x}
                    y={pt.y - 5}
                    textAnchor="middle"
                    fill="var(--accent-indigo)"
                    style={{ fontSize: '4.5px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                  >
                    L{pt.scoreValue}
                  </text>
                  {/* Phase Label */}
                  <text
                    x={pt.x}
                    y="96"
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    style={{ fontSize: '3.5px', fontWeight: 600 }}
                  >
                    {labels[idx]}
                  </text>
                </g>
              );
            })}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="growthAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-indigo)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--accent-indigo)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Y-axis score tags overlay on left */}
          <div style={{ position: 'absolute', left: 4, top: 0, bottom: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none' }}>
            <span>L5</span>
            <span>L4</span>
            <span>L3</span>
            <span>L2</span>
            <span>L1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
