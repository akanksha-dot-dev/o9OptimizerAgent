import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft,
  Download, RotateCcw, FileText, BarChart3, Layers, Settings2, ArrowRight
} from 'lucide-react';
import { REPORT_TYPES, ISSUE_CATEGORIES, analyzeReport } from '../data/optimizationRules';
import ScoreRing from '../components/ScoreRing';
import RecommendationCard from '../components/RecommendationCard';
import CategoryDonut from '../components/CategoryDonut';
import BenchmarkPanel from '../components/BenchmarkPanel';
import PriorityMatrix from '../components/PriorityMatrix';
import ExecutiveSummary from '../components/ExecutiveSummary';

const STEPS = [
  { id: 0, label: 'Report Type', icon: <FileText size={16} /> },
  { id: 1, label: 'Configuration', icon: <Settings2 size={16} /> },
  { id: 2, label: 'Issues', icon: <AlertTriangle size={16} /> },
];

const defaultForm = {
  reportType: '',
  reportName: '',
  issues: [],
  rowCount: '',
  columnCount: '',
  kpiCount: '',
  hierarchyDepth: '',
  dataAge: '',
  userCount: '',
  description: '',
};

export default function AnalyzerPage() {
  const [form, setForm] = useState(defaultForm);
  const [results, setResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [step, setStep] = useState(0);
  const [resultsView, setResultsView] = useState('list');
  const [savedAnalysis, setSavedAnalysis] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('o9LastAnalysis');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.form && parsed?.results) {
          setSavedAnalysis(parsed);
        }
      }
    } catch (error) {
      console.warn('Unable to load saved analysis', error);
    }
  }, []);

  const toggleIssue = (val) => {
    setForm(prev => ({
      ...prev,
      issues: prev.issues.includes(val)
        ? prev.issues.filter(v => v !== val)
        : [...prev.issues, val]
    }));
  };

  const saveAnalysisSnapshot = (savedForm, savedResults) => {
    try {
      const payload = { form: savedForm, results: savedResults, timestamp: new Date().toISOString() };
      window.localStorage.setItem('o9LastAnalysis', JSON.stringify(payload));
      setSavedAnalysis(payload);
    } catch (error) {
      console.warn('Unable to save analysis snapshot', error);
    }
  };

  const handleSubmit = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const result = analyzeReport({
        reportType: form.reportType,
        issues: form.issues,
        rowCount: parseInt(form.rowCount) || 0,
        columnCount: parseInt(form.columnCount) || 0,
        kpiCount: parseInt(form.kpiCount) || 0,
        hierarchyDepth: parseInt(form.hierarchyDepth) || 0,
        dataAge: form.dataAge,
        userCount: parseInt(form.userCount) || 0,
      });
      setResults(result);
      saveAnalysisSnapshot(form, result);
      setAnalyzing(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }, 2200);
  };

  const handleReset = () => {
    setForm(defaultForm);
    setResults(null);
    setActiveTab('all');
    setStep(0);
    setResultsView('list');
  };

  const canAdvance = () => {
    if (step === 0) return !!form.reportType;
    if (step === 1) return true;
    if (step === 2) return form.issues.length > 0;
    return true;
  };

  const handleExport = () => {
    if (!results) return;
    const lines = [
      `o9 Report Optimization Analysis`,
      `${'='.repeat(50)}`,
      `Report: ${form.reportName || 'Unnamed'} (${form.reportType.replace(/_/g, ' ')})`,
      `Health Score: ${results.score}/100`,
      `Total Findings: ${results.totalRecommendations}`,
      `Critical: ${results.criticalCount} | High: ${results.highCount} | Medium: ${results.mediumCount} | Low: ${results.lowCount}`,
      ``,
      `RECOMMENDATIONS`,
      `${'─'.repeat(50)}`,
    ];
    results.recommendations.forEach((r, i) => {
      lines.push(`\n${i + 1}. [${r.severity.toUpperCase()}] ${r.title}`);
      lines.push(`   Category: ${r.category}`);
      lines.push(`   Problem: ${r.problem}`);
      lines.push(`   Recommendation: ${r.recommendation}`);
      lines.push(`   Impact: ${r.impact}`);
      lines.push(`   Effort: ${r.effortLevel}`);
      lines.push(`   Steps:`);
      r.steps.forEach((s, j) => lines.push(`     ${j + 1}. ${s}`));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `o9-report-analysis-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = async () => {
    if (!results) return;
    const summary = [
      `o9 Report Optimization Summary`,
      `Report: ${form.reportName || 'Unnamed'} (${form.reportType.replace(/_/g, ' ')})`,
      `Health Score: ${results.score}/100`,
      `Total Findings: ${results.totalRecommendations}`,
      `Critical: ${results.criticalCount} | High: ${results.highCount} | Medium: ${results.mediumCount} | Low: ${results.lowCount}`,
      ``,
      `Top recommendations to start with:`,
      ...results.recommendations.slice(0, 3).map((r, i) => `  ${i + 1}. ${r.title} (${r.severity})`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard');
    } catch (error) {
      console.warn('Clipboard copy failed', error);
      alert('Unable to copy summary to clipboard.');
    }
  };

  const handleRestoreSaved = () => {
    if (!savedAnalysis) return;
    setForm(savedAnalysis.form);
    setResults(savedAnalysis.results);
    setStep(2);
    setActiveTab('all');
    setResultsView('list');
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  };

  const filteredRecs = results?.recommendations?.filter(r => {
    if (activeTab === 'all') return true;
    return r.severity === activeTab;
  }) || [];

  const selectedType = REPORT_TYPES.find(t => t.value === form.reportType);
  const topRecommendations = results?.recommendations?.slice(0, 3) || [];

  return (
    <div className="section">
      <div className="analyzer-container">
        {/* Header */}
        <div className="section-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 999, background: 'var(--accent-blue-light)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Zap size={13} /> AI-Powered Analysis Engine
          </div>
          <h2>o9 Report Optimizer</h2>
          <p>Analyze your report configuration against 12+ optimization rules based on real-world o9 implementations.</p>
        </div>

        {savedAnalysis && !results && (
          <div className="card" style={{ marginBottom: 32, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Resume last saved analysis
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {savedAnalysis.form.reportName || 'Unnamed report'} — {savedAnalysis.form.reportType.replace(/_/g, ' ')}
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                Score: {savedAnalysis.results.score}/100 · {savedAnalysis.results.totalRecommendations} recommendations
              </div>
            </div>
            <button className="btn btn-secondary" onClick={handleRestoreSaved}>
              Restore Saved Analysis
            </button>
          </div>
        )}

        {/* Stepper */}
        {!results && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div
                  onClick={() => { if (s.id < step) setStep(s.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                    borderRadius: 999, cursor: s.id <= step ? 'pointer' : 'default',
                    background: step === s.id ? 'var(--gradient-primary)' : step > s.id ? 'var(--accent-emerald-light)' : 'var(--bg-input)',
                    color: step === s.id ? 'white' : step > s.id ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    fontWeight: 600, fontSize: '0.82rem',
                    border: step === s.id ? 'none' : '1px solid var(--border-subtle)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {step > s.id ? <CheckCircle size={15} /> : s.icon}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 40, height: 2, background: step > i ? 'var(--accent-emerald)' : 'var(--border-subtle)', transition: 'background 0.3s ease' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Wizard Steps */}
        {!results && !analyzing && (
          <div className="analyzer-form" style={{ position: 'relative' }}>
            <AnimatePresence mode="wait">
              {/* Step 0: Report Type */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>Select Your Report Type</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>Choose the o9 report type to get tailored optimization recommendations.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {REPORT_TYPES.map(t => (
                      <div
                        key={t.value}
                        onClick={() => setForm({ ...form, reportType: t.value })}
                        style={{
                          padding: '16px 18px', borderRadius: 'var(--radius-md)',
                          border: form.reportType === t.value ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                          background: form.reportType === t.value ? 'var(--accent-blue-light)' : 'white',
                          cursor: 'pointer', transition: 'all 0.2s ease',
                          fontWeight: form.reportType === t.value ? 600 : 500,
                          color: form.reportType === t.value ? 'var(--accent-blue-dark)' : 'var(--text-secondary)',
                          fontSize: '0.88rem'
                        }}
                      >
                        {t.label}
                      </div>
                    ))}
                  </div>
                  <div className="form-group" style={{ marginTop: 20 }}>
                    <label>Report Name (Optional)</label>
                    <input type="text" placeholder="e.g., Weekly Demand Dashboard" value={form.reportName}
                      onChange={e => setForm({ ...form, reportName: e.target.value })} />
                  </div>
                </motion.div>
              )}

              {/* Step 1: Configuration */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>Report Configuration</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                    Provide metrics for deeper analysis. All fields are optional but improve accuracy.
                  </p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Approximate Row Count</label>
                      <input type="number" placeholder="e.g., 50000" value={form.rowCount}
                        onChange={e => setForm({ ...form, rowCount: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Column Count</label>
                      <input type="number" placeholder="e.g., 25" value={form.columnCount}
                        onChange={e => setForm({ ...form, columnCount: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Number of KPIs</label>
                      <input type="number" placeholder="e.g., 18" value={form.kpiCount}
                        onChange={e => setForm({ ...form, kpiCount: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Hierarchy Depth (Levels)</label>
                      <input type="number" placeholder="e.g., 7" value={form.hierarchyDepth}
                        onChange={e => setForm({ ...form, hierarchyDepth: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Data History (Months)</label>
                      <input type="number" placeholder="e.g., 36" value={form.dataAge}
                        onChange={e => setForm({ ...form, dataAge: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Concurrent Users</label>
                      <input type="number" placeholder="e.g., 50" value={form.userCount}
                        onChange={e => setForm({ ...form, userCount: e.target.value })} />
                    </div>
                    <div className="form-group full-width">
                      <label>Additional Context</label>
                      <textarea placeholder="Describe specific problems, user complaints, or performance issues…"
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Issues */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>Known Issues</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                    Select all issues you've observed. This drives the analysis engine's rule matching.
                  </p>
                  <div className="checkbox-group" style={{ gap: 12 }}>
                    {ISSUE_CATEGORIES.map(cat => (
                      <div
                        key={cat.value}
                        className={`checkbox-item ${form.issues.includes(cat.value) ? 'checked' : ''}`}
                        onClick={() => toggleIssue(cat.value)}
                        style={{ padding: '12px 18px', fontSize: '0.88rem' }}
                      >
                        <input type="checkbox" checked={form.issues.includes(cat.value)} readOnly />
                        {cat.label}
                      </div>
                    ))}
                  </div>
                  {form.issues.length > 0 && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', marginTop: 16, fontWeight: 500 }}>
                      ✓ {form.issues.length} issue{form.issues.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                {step > 0 && (
                  <button className="btn btn-secondary" onClick={() => setStep(step - 1)} style={{ padding: '10px 22px' }}>
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={handleReset} style={{ padding: '10px 22px', fontSize: '0.82rem' }}>
                  <RotateCcw size={14} /> Reset
                </button>
                {step < 2 ? (
                  <button className="btn btn-primary" disabled={!canAdvance()} onClick={() => setStep(step + 1)} style={{ padding: '10px 28px' }}>
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button className="btn btn-primary" disabled={!canAdvance()} onClick={handleSubmit} style={{ padding: '10px 28px' }}>
                    <Zap size={16} /> Run Analysis
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading Animation */}
        {analyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="loading-spinner" style={{ padding: 80 }}>
            <div className="spinner" style={{ width: 52, height: 52 }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                Analyzing Report Configuration…
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Matching against 12+ optimization rules & o9 best practices
              </p>
            </div>
            <div className="progress-bar" style={{ maxWidth: 320, margin: '8px auto 0' }}>
              <motion.div className="progress-bar-fill" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2, ease: 'easeInOut' }} />
            </div>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results && !analyzing && (
            <motion.div ref={resultsRef} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>

              {/* Executive Summary */}
              <ExecutiveSummary results={results} form={form} />

              {/* Stats Row */}
              <div className="stats-bar" style={{ gridTemplateColumns: 'auto repeat(3, 1fr)' }}>
                <div className="stat-card">
                  <ScoreRing score={results.score} size={140} />
                </div>
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--accent-indigo)' }}>{results.totalRecommendations}</div>
                  <div className="stat-label">Total Recommendations</div>
                </div>
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="stat-value" style={{ color: '#ef4444' }}>{results.criticalCount}</div>
                  <div className="stat-label">Critical Issues</div>
                </div>
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>{results.highCount}</div>
                  <div className="stat-label">High Priority</div>
                </div>
              </div>

              {/* Insights Grid: Benchmark + Donut + Priority Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                <BenchmarkPanel form={form} />
                <PriorityMatrix recommendations={results.recommendations} />
              </div>

              {/* Category Breakdown */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)', padding: 28, marginBottom: 28,
                boxShadow: 'var(--shadow-sm)'
              }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                  📊 Category Breakdown
                </h4>
                <CategoryDonut categories={results.categories} />
              </div>

              {/* Action Bar: Tabs + View Toggle + Export */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div className="tabs" style={{ marginBottom: 0, flex: 1, minWidth: 280 }}>
                  {['all', 'critical', 'high', 'medium', 'low'].map(tab => (
                    <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}>
                      {tab === 'all' ? `All (${results.totalRecommendations})` :
                        `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${results[tab + 'Count']})`}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setResultsView(resultsView === 'list' ? 'compact' : 'list')}>
                    {resultsView === 'list' ? <Layers size={14} /> : <BarChart3 size={14} />}
                    {resultsView === 'list' ? 'Compact' : 'Detailed'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleCopySummary}>
                    <FileText size={14} /> Copy Summary
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                    <Download size={14} /> Export
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleReset}>
                    <RotateCcw size={14} /> New Analysis
                  </button>
                </div>
              </div>

              {/* Recommendations */}
              <div className="results-section">
                {filteredRecs.length > 0 ? (
                  resultsView === 'list' ? (
                    filteredRecs.map((rule, i) => (
                      <motion.div key={rule.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.06 }}>
                        <RecommendationCard rule={rule} />
                      </motion.div>
                    ))
                  ) : (
                    /* Compact view */
                    <div style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)', overflow: 'hidden'
                    }}>
                      {filteredRecs.map((rule, i) => (
                        <div key={rule.id} style={{
                          display: 'grid', gridTemplateColumns: '90px 1fr 180px 80px',
                          alignItems: 'center', padding: '14px 20px', gap: 16,
                          borderBottom: i < filteredRecs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          fontSize: '0.84rem'
                        }}>
                          <span className={`result-severity severity-${rule.severity}`} style={{ textAlign: 'center' }}>
                            {rule.severity}
                          </span>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rule.title}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 10 }}>{rule.category}</span>
                          </div>
                          <span className="impact-tag" style={{ fontSize: '0.68rem' }}>{rule.impact}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{rule.effortLevel}</span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <CheckCircle size={40} style={{ marginBottom: 12, color: 'var(--accent-emerald)' }} />
                    <p>No issues found in this category. Looking good!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
