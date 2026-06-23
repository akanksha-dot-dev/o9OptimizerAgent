import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, Layers, Gauge, ShieldCheck, Zap, Database,
  GitBranch, ArrowRight, Sparkles, Target, Layout, BookOpen,
  Activity, Clock, CheckCircle2
} from 'lucide-react';

const features = [
  {
    icon: <BarChart3 size={22} />, color: 'indigo', link: '/analyzer',
    title: 'Report Performance Analyzer',
    desc: 'Deep-dive analysis of report load times, calculation complexity, and rendering bottlenecks with actionable recommendations.'
  },
  {
    icon: <Database size={22} />, color: 'violet', link: '/ekg-health',
    title: 'EKG Health Checker',
    desc: 'Audit your Enterprise Knowledge Graph — nodes, edges, hierarchies, measures, data integration, and Graph Cube performance.'
  },
  {
    icon: <Target size={22} />, color: 'cyan', link: '/snop-advisor',
    title: 'S&OP Maturity Advisor',
    desc: 'Assess your planning maturity across demand, supply, inventory, finance, and technology with a tailored improvement roadmap.'
  },
  {
    icon: <Layout size={22} />, color: 'emerald', link: '/templates',
    title: 'Report Templates Gallery',
    desc: '8 pre-built optimized report configs — demand, supply, inventory, S&OP, control tower, financial, and NPI templates.'
  },
  {
    icon: <BookOpen size={22} />, color: 'amber', link: '/knowledge',
    title: 'Optimization Knowledge Base',
    desc: 'Searchable catalog of 12+ optimization rules covering hierarchy, KPI, calculation engine, layout, data, and governance.'
  },
  {
    icon: <ShieldCheck size={22} />, color: 'rose', link: '/best-practices',
    title: 'Best Practices Guide',
    desc: 'Curated tips across 7 categories from real-world o9 implementations — hierarchy design, KPI strategy, and more.'
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' }
  })
};

// ─── Particle Canvas Hero Background ─────────────────────────────────────────
function ParticleHero() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const PARTICLE_COUNT = 60;
    const MAX_DIST = 120;
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width / window.devicePixelRatio,
        y: Math.random() * canvas.height / window.devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.15,
      });
    }
    particlesRef.current = particles;

    const w = () => canvas.width / window.devicePixelRatio;
    const h = () => canvas.height / window.devicePixelRatio;

    function draw() {
      if (!visibleRef.current) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w(), h());

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w();
        if (p.x > w()) p.x = 0;
        if (p.y < 0) p.y = h();
        if (p.y > h()) p.y = 0;

        // Subtle mouse influence
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          p.x -= dx * 0.002;
          p.y -= dy * 0.002;
        }
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(canvas);

    canvas.addEventListener('mousemove', handleMouse);
    window.addEventListener('resize', resize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 0,
      }}
    />
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) { setStarted(true); }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { count, ref };
}

function AnimatedStat({ target, suffix, label }) {
  const { count, ref } = useCountUp(target);
  return (
    <motion.div
      ref={ref}
      className="stat-card"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
        {count}{suffix}
      </div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}

// ─── Marquee / Trust Ticker ──────────────────────────────────────────────────
const TRUST_ITEMS = [
  '🏭 Manufacturing', '🛒 Retail & CPG', '🧪 Pharma & Life Sciences',
  '🚗 Automotive', '⚡ Energy & Utilities', '🌾 Agriculture & Food',
  '📦 Supply Chain Leaders', '🏢 Fortune 500 Enterprises',
  '🌍 Global S&OP Teams', '📊 Demand Planning Orgs',
  '🔧 Industrial Equipment', '💊 Healthcare Supply Chains',
];

function TrustMarquee() {
  // Double items for seamless loop
  const items = [...TRUST_ITEMS, ...TRUST_ITEMS];
  return (
    <div className="marquee-container">
      <div className="marquee-track">
        {items.map((item, i) => (
          <span key={i} className="marquee-item">{item}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Activity Pulse ──────────────────────────────────────────────────────────
const ACTIVITY_EVENTS = [
  { icon: <BarChart3 size={14} />, text: 'Report analyzed — Demand Planning view', time: '2m ago', color: 'var(--accent-blue)' },
  { icon: <Database size={14} />, text: 'EKG health audit completed — 92% score', time: '8m ago', color: 'var(--accent-violet)' },
  { icon: <Target size={14} />, text: 'S&OP maturity assessed — Level 3', time: '15m ago', color: 'var(--accent-cyan)' },
  { icon: <CheckCircle2 size={14} />, text: 'Optimization roadmap exported', time: '22m ago', color: 'var(--accent-emerald)' },
  { icon: <Layout size={14} />, text: 'Control Tower template applied', time: '34m ago', color: 'var(--accent-amber)' },
];

function ActivityPulse() {
  return (
    <div className="activity-pulse-container">
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      }}>
        <div className="activity-dot-pulse" />
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.8px', color: 'var(--text-muted)',
        }}>
          Recent Platform Activity
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ACTIVITY_EVENTS.map((evt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ color: evt.color, flexShrink: 0, display: 'flex' }}>
              {evt.icon}
            </div>
            <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{evt.text}</span>
            <span style={{
              fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Clock size={10} /> {evt.time}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main HomePage ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [recentAnalysis, setRecentAnalysis] = useState(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('o9LastAnalysis');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.form && parsed?.results) {
          setRecentAnalysis(parsed);
        }
      }
    } catch (error) {
      console.warn('Unable to load recent analysis', error);
    }
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="hero" style={{ position: 'relative' }}>
        <ParticleHero />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className="hero-badge">
            <Sparkles size={13} /> AI-Powered o9 Optimization Suite
          </div>
          <h1>
            The Complete Toolkit for<br />
            <span>o9 Report Optimization</span>
          </h1>
          <p>
            Analyze reports, audit your EKG model, assess S&OP maturity, browse
            optimized templates, and follow best practices — all powered by deep
            o9 Solutions domain expertise.
          </p>
          <div className="hero-actions">
            <Link to="/analyzer" className="btn btn-primary">
              <Zap size={18} /> Start Analysis
            </Link>
            <Link to="/ekg-health" className="btn btn-secondary">
              <Database size={18} /> Check EKG Health
            </Link>
          </div>
        </motion.div>
      </section>

      {recentAnalysis && (
        <section className="section" style={{ paddingTop: 20, paddingBottom: 40, background: '#f8fbff' }}>
          <div className="page-wrapper" style={{ maxWidth: 1040 }}>
            <div className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  <Sparkles size={14} /> Most recent o9 analysis
                </div>
                <h3 style={{ marginBottom: 10, fontSize: '1.25rem', fontWeight: 700 }}>Last Report Assessment</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 18 }}>
                  Resume your last review anytime, or use the insights below to identify the next optimization opportunity.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'white', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Report Type</div>
                    <div style={{ fontWeight: 700 }}>{recentAnalysis.form.reportType.replace(/_/g, ' ')}</div>
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'white', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Health Score</div>
                    <div style={{ fontWeight: 700 }}>{recentAnalysis.results.score}/100</div>
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'white', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Recommendations</div>
                    <div style={{ fontWeight: 700 }}>{recentAnalysis.results.totalRecommendations}</div>
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'white', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Critical Findings</div>
                    <div style={{ fontWeight: 700 }}>{recentAnalysis.results.criticalCount}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '18px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--accent-blue)', color: 'white' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Action</div>
                  <p style={{ marginBottom: 16, lineHeight: 1.7 }}>Take the last analysis into the report analyzer and convert findings into an execution plan.</p>
                  <Link to="/analyzer" className="btn btn-primary">
                    Review and Improve
                  </Link>
                </div>
                <div style={{ padding: '18px 20px', borderRadius: 'var(--radius-lg)', background: 'white', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 10 }}>Consultant Insight</div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>The highest-severity findings in your last review are the best place to start for immediate operational improvement and system stability.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="section" style={{ background: 'white' }}>
        <div className="page-wrapper">
          <div className="section-header">
            <h2>6 Powerful Tools, One Platform</h2>
            <p>
              Every aspect of your o9 implementation analyzed with deep
              consultant-level domain expertise.
            </p>
          </div>
          <div className="card-grid">
            {features.map((f, i) => (
              <Link to={f.link} key={i} style={{ textDecoration: 'none', color: 'inherit' }}>
                <motion.div
                  className="card card-gradient-border"
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  style={{ height: '100%' }}
                >
                  <div className={`card-icon ${f.color}`}>{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <div style={{ marginTop: 14, fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Explore <ArrowRight size={14} />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Marquee */}
      <section className="section" style={{ paddingTop: 24, paddingBottom: 24, overflow: 'hidden' }}>
        <p style={{
          fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'center', marginBottom: 16,
        }}>
          Trusted by teams optimizing o9 implementations worldwide
        </p>
        <TrustMarquee />
      </section>

      {/* Stats + Activity */}
      <section className="section" style={{ background: 'var(--bg-primary)' }}>
        <div className="page-wrapper">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>
            <div className="stats-bar" style={{ maxWidth: 'none', margin: 0 }}>
              <AnimatedStat target={12} suffix="+" label="Optimization Rules" />
              <AnimatedStat target={8} suffix="" label="Report Templates" />
              <AnimatedStat target={27} suffix="" label="EKG Checklist Items" />
              <AnimatedStat target={5} suffix="" label="Maturity Dimensions" />
            </div>
            <ActivityPulse />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ textAlign: 'center', background: 'white' }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            borderTop: '3px solid transparent',
            borderImage: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6) 1',
            paddingTop: 48,
            maxWidth: 640,
            margin: '0 auto'
          }}
        >
          <h2 style={{ marginBottom: 14, fontSize: '1.5rem', fontWeight: 700 }}>Ready to Optimize?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 28px', fontSize: '0.95rem' }}>
            Start with the Report Analyzer for quick wins, or run a full EKG health audit
            for deep architectural insights.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/analyzer" className="btn btn-primary">
              <Zap size={18} /> Launch Analyzer
            </Link>
            <Link to="/snop-advisor" className="btn btn-secondary">
              <Target size={18} /> Assess S&OP Maturity
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
