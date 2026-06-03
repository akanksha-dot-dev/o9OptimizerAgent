import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft,
  Download, RotateCcw, FileText, BarChart3, Layers, Settings2,
  Sliders, ClipboardList, History, Columns, Trash2, CheckCircle2,
  Play, Save, ArrowLeftRight
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
  // Wizard & Form States
  const [form, setForm] = useState(defaultForm);
  const [results, setResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [step, setStep] = useState(0);
  const [resultsView, setResultsView] = useState('list');
  const resultsRef = useRef(null);

  // Saved Reports & Comparisons
  const [savedReports, setSavedReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [compareReportId, setCompareReportId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Sandbox Mode States
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxForm, setSandboxForm] = useState(null);
  const [sandboxResults, setSandboxResults] = useState(null);

  // Roadmap State (keyed by reportId/timestamp -> { ruleId: status })
  const [roadmap, setRoadmap] = useState({});

  // Initialize and load saved reports from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('o9_saved_reports');
      if (stored) {
        setSavedReports(JSON.parse(stored));
      } else {
        // Migration from old single-report storage
        const oldSingle = window.localStorage.getItem('o9LastAnalysis');
        if (oldSingle) {
          const parsed = JSON.parse(oldSingle);
          const legacyReport = {
            id: 'legacy_' + Date.now(),
            name: parsed.form.reportName || 'Migrated Analysis',
            form: parsed.form,
            results: parsed.results,
            roadmap: {},
            timestamp: parsed.timestamp || new Date().toISOString()
          };
          const reports = [legacyReport];
          setSavedReports(reports);
          window.localStorage.setItem('o9_saved_reports', JSON.stringify(reports));
        }
      }
    } catch (error) {
      console.warn('Unable to load saved reports', error);
    }
  }, []);

  // Sync saved reports to local storage on changes
  const saveReportsList = (updatedList) => {
    try {
      window.localStorage.setItem('o9_saved_reports', JSON.stringify(updatedList));
      setSavedReports(updatedList);
    } catch (e) {
      console.error('Failed saving reports list', e);
    }
  };

  const toggleIssue = (val) => {
    setForm(prev => ({
      ...prev,
      issues: prev.issues.includes(val)
        ? prev.issues.filter(v => v !== val)
        : [...prev.issues, val]
    }));
  };

  const toggleSandboxIssue = (val) => {
    setSandboxForm(prev => {
      const updatedIssues = prev.issues.includes(val)
        ? prev.issues.filter(v => v !== val)
        : [...prev.issues, val];
      const newForm = { ...prev, issues: updatedIssues };
      const newResults = analyzeReport({
        ...newForm,
        rowCount: parseInt(newForm.rowCount) || 0,
        columnCount: parseInt(newForm.columnCount) || 0,
        kpiCount: parseInt(newForm.kpiCount) || 0,
        hierarchyDepth: parseInt(newForm.hierarchyDepth) || 0,
        userCount: parseInt(newForm.userCount) || 0,
      });
      setSandboxResults(newResults);
      return newForm;
    });
  };

  const handleSandboxChange = (key, value) => {
    setSandboxForm(prev => {
      const newForm = { ...prev, [key]: value };
      const newResults = analyzeReport({
        ...newForm,
        rowCount: parseInt(newForm.rowCount) || 0,
        columnCount: parseInt(newForm.columnCount) || 0,
        kpiCount: parseInt(newForm.kpiCount) || 0,
        hierarchyDepth: parseInt(newForm.hierarchyDepth) || 0,
        userCount: parseInt(newForm.userCount) || 0,
      });
      setSandboxResults(newResults);
      return newForm;
    });
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

      const reportId = 'report_' + Date.now();
      const newReport = {
        id: reportId,
        name: form.reportName || `Analysis (${form.reportType.replace(/_/g, ' ')})`,
        form: { ...form },
        results: result,
        roadmap: {},
        timestamp: new Date().toISOString()
      };

      const updatedList = [newReport, ...savedReports];
      saveReportsList(updatedList);
      setActiveReportId(reportId);
      setResults(result);
      setRoadmap({});
      setSandboxMode(false);
      setAnalyzing(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }, 2200);
  };

  const handleReset = () => {
    setForm(defaultForm);
    setResults(null);
    setActiveReportId(null);
    setCompareReportId(null);
    setRoadmap({});
    setSandboxMode(false);
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

  const handleStatusChange = (ruleId, nextStatus) => {
    if (!activeReportId) return;
    const updated = savedReports.map(r => {
      if (r.id === activeReportId) {
        const nextRoadmap = { ...r.roadmap, [ruleId]: nextStatus };
        setRoadmap(nextRoadmap);
        return { ...r, roadmap: nextRoadmap };
      }
      return r;
    });
    saveReportsList(updated);
  };

  const handleExport = () => {
    const activeResults = sandboxMode ? sandboxResults : results;
    const activeForm = sandboxMode ? sandboxForm : form;
    if (!activeResults) return;

    const lines = [
      `o9 Report Optimization Analysis (Status: ${sandboxMode ? 'SIMULATED' : 'BASELINE'})`,
      `${'='.repeat(50)}`,
      `Report: ${activeForm.reportName || 'Unnamed'} (${activeForm.reportType.replace(/_/g, ' ')})`,
      `Health Score: ${activeResults.score}/100`,
      `Total Findings: ${activeResults.totalRecommendations}`,
      `Critical: ${activeResults.criticalCount} | High: ${activeResults.highCount} | Medium: ${activeResults.mediumCount} | Low: ${activeResults.lowCount}`,
      ``,
      `ROADMAP STATUSES:`,
      ...activeResults.recommendations.map(r => `  - ${r.title}: ${roadmap[r.id] || 'todo'}`),
      ``,
      `RECOMMENDATIONS`,
      `${'─'.repeat(50)}`,
    ];
    activeResults.recommendations.forEach((r, i) => {
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
    const activeResults = sandboxMode ? sandboxResults : results;
    const activeForm = sandboxMode ? sandboxForm : form;
    if (!activeResults) return;

    const summary = [
      `o9 Report Optimization Summary (${sandboxMode ? 'Simulated Sandbox' : 'Baseline Analysis'})`,
      `Report: ${activeForm.reportName || 'Unnamed'} (${activeForm.reportType.replace(/_/g, ' ')})`,
      `Health Score: ${activeResults.score}/100`,
      `Total Findings: ${activeResults.totalRecommendations}`,
      `Critical: ${activeResults.criticalCount} | High: ${activeResults.highCount} | Medium: ${activeResults.mediumCount} | Low: ${activeResults.lowCount}`,
      ``,
      `Roadmap Progress: ${completedCount}/${activeResults.totalRecommendations} Action Items Completed`,
      ``,
      `Top recommendations to start with:`,
      ...activeResults.recommendations.slice(0, 3).map((r, i) => `  ${i + 1}. ${r.title} (${r.severity})`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard');
    } catch (error) {
      console.warn('Clipboard copy failed', error);
      alert('Unable to copy summary to clipboard.');
    }
  };

  const handleLoadReport = (report) => {
    setForm(report.form);
    setResults(report.results);
    setActiveReportId(report.id);
    setRoadmap(report.roadmap || {});
    setSandboxMode(false);
    setCompareReportId(null);
    setShowHistory(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  };

  const handleDeleteReport = (reportId, event) => {
    event.stopPropagation();
    const filtered = savedReports.filter(r => r.id !== reportId);
    saveReportsList(filtered);
    if (activeReportId === reportId) {
      handleReset();
    }
  };

  const handleApplySandboxConfig = () => {
    if (!activeReportId) return;
    const updated = savedReports.map(r => {
      if (r.id === activeReportId) {
        return {
          ...r,
          form: { ...sandboxForm },
          results: { ...sandboxResults }
        };
      }
      return r;
    });
    setForm(sandboxForm);
    setResults(sandboxResults);
    saveReportsList(updated);
    setSandboxMode(false);
    alert('Simulated configuration locked-in as baseline.');
  };

  const startSandbox = () => {
    setSandboxForm({ ...form });
    setSandboxResults({ ...results });
    setSandboxMode(true);
  };

  // Computed Values
  const activeResults = sandboxMode ? sandboxResults : results;
  const filteredRecs = activeResults?.recommendations?.filter(r => {
    if (activeTab === 'all') return true;
    return r.severity === activeTab;
  }) || [];

  const completedCount = useMemo(() => {
    if (!activeResults) return 0;
    return activeResults.recommendations.filter(r => roadmap[r.id] === 'completed').length;
  }, [activeResults, roadmap]);

  const progressPercent = useMemo(() => {
    if (!activeResults || activeResults.totalRecommendations === 0) return 0;
    return Math.round((completedCount / activeResults.totalRecommendations) * 100);
  }, [activeResults, completedCount]);

  const compareReport = useMemo(() => {
    return savedReports.find(r => r.id === compareReportId);
  }, [compareReportId, savedReports]);

  return (
    <div className="section">
      <div className="analyzer-container" style={{ position: 'relative' }}>
        
        {/* Toggle Saved Reports History Panel Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowHistory(!showHistory)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <History size={15} />
            {showHistory ? 'Hide Saved History' : `History & Benchmarks (${savedReports.length})`}
          </button>
        </div>

        {/* History & Benchmarks Drawer */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card"
              style={{ marginBottom: 28, padding: 24, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <History size={18} color="var(--accent-blue)" /> Analysis History & Benchmark Comparison
              </h3>
              {savedReports.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>
                  No saved reports found. Complete an analysis to start building history.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
                  <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 8 }}>
                    {savedReports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => handleLoadReport(report)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: activeReportId === report.id ? 'var(--accent-blue-light)' : 'var(--bg-card)',
                          border: `1px solid ${activeReportId === report.id ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 200ms ease'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {report.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Score: {report.results.score}/100 · {new Date(report.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {activeReportId !== report.id && (
                            <button
                              title="Compare with Active"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompareReportId(compareReportId === report.id ? null : report.id);
                              }}
                              style={{
                                background: compareReportId === report.id ? 'var(--accent-indigo)' : 'var(--bg-input)',
                                color: compareReportId === report.id ? 'white' : 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 4, padding: '4px 6px', fontSize: '0.68rem', cursor: 'pointer'
                              }}
                            >
                              <ArrowLeftRight size={12} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteReport(report.id, e)}
                            style={{
                              background: 'transparent', border: 'none', color: 'var(--text-muted)',
                              cursor: 'pointer', hover: { color: '#ef4444' }
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Benchmark / Comparison Preview */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {compareReportId && compareReport && activeReportId ? (
                      <div>
                        <h4 style={{ fontSize: '0.82rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ArrowLeftRight size={13} /> Side-by-Side Comparison
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.8rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 8, fontWeight: 700 }}>
                          <span>Metric</span>
                          <span>Active (Current)</span>
                          <span>Compared ({compareReport.name.slice(0, 10)}...)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <span style={{ fontWeight: 600 }}>Health Score</span>
                            <span style={{ color: results.score >= 70 ? 'var(--accent-emerald)' : '#f59e0b', fontWeight: 700 }}>{results.score}/100</span>
                            <span style={{ color: compareReport.results.score >= 70 ? 'var(--accent-emerald)' : '#f59e0b' }}>{compareReport.results.score}/100</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <span style={{ fontWeight: 600 }}>Total Findings</span>
                            <span>{results.totalRecommendations}</span>
                            <span>{compareReport.results.totalRecommendations}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <span style={{ fontWeight: 600 }}>Row Count</span>
                            <span>{form.rowCount || 'N/A'}</span>
                            <span>{compareReport.form.rowCount || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <span style={{ fontWeight: 600 }}>KPI Count</span>
                            <span>{form.kpiCount || 'N/A'}</span>
                            <span>{compareReport.form.kpiCount || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <span style={{ fontWeight: 600 }}>Hierarchy Depth</span>
                            <span>{form.hierarchyDepth || 'N/A'}</span>
                            <span>{compareReport.form.hierarchyDepth || 'N/A'}</span>
                          </div>
                        </div>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => setCompareReportId(null)}
                          style={{ width: '100%', marginTop: 14, padding: '5px 0', fontSize: '0.75rem' }}
                        >
                          Clear Comparison
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 12 }}>
                        <ArrowLeftRight size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                        <p style={{ fontSize: '0.8rem' }}>
                          Select the <ArrowLeftRight size={10} /> icon next to a report in your history to display a benchmark comparison.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="section-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 999, background: 'var(--accent-blue-light)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Zap size={13} /> AI-Powered Analysis Engine
          </div>
          <h2>o9 Report Optimizer</h2>
          <p>Analyze your report configuration against 12+ optimization rules based on real-world o9 implementations.</p>
        </div>

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

        {/* Results Section */}
        <AnimatePresence>
          {results && !analyzing && (
            <motion.div ref={resultsRef} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
              
              {/* Sandbox Banner Mode */}
              {sandboxMode && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.1) 100%)',
                  border: '1.5px dashed #d97706', borderRadius: 'var(--radius-lg)',
                  padding: '16px 24px', marginBottom: 28, display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
                }}>
                  <div>
                    <h3 style={{ fontSize: '0.92rem', color: '#d97706', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sliders size={16} /> Sandbox Simulator Active
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4, maxWidth: 550 }}>
                      You are tweaking active report parameters in real-time. The results and health metrics below reflect your changes. Use the action items to secure performance gains.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSandboxMode(false)}>
                      Exit Sandbox
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ background: '#d97706', borderColor: '#b45309' }} onClick={handleApplySandboxConfig}>
                      <Save size={14} /> Lock-in Baseline
                    </button>
                  </div>
                </div>
              )}

              {/* Roadmap Tracker & Action Progress */}
              <div className="card" style={{ padding: 24, marginBottom: 28, border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={16} color="var(--accent-blue)" /> Optimization Roadmap Progress
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      <span>Progress Percentage</span>
                      <span>{progressPercent}% ({completedCount}/{activeResults.totalRecommendations} tasks)</span>
                    </div>
                    <div style={{ height: 10, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-emerald) 0%, #10b981 100%)' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ textAlign: 'center', padding: '6px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activeResults.totalRecommendations - completedCount}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {completedCount}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Done</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <ExecutiveSummary results={activeResults} form={sandboxMode ? sandboxForm : form} />

              {/* Stats Row */}
              <div className="stats-bar" style={{ gridTemplateColumns: 'auto repeat(3, 1fr)' }}>
                <div className="stat-card">
                  <ScoreRing score={activeResults.score} size={140} />
                </div>
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--accent-indigo)' }}>{activeResults.totalRecommendations}</div>
                  <div className="stat-label">Total Recommendations</div>
                </div>
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="stat-value" style={{ color: '#ef4444' }}>{activeResults.criticalCount}</div>
                  <div className="stat-label">Critical Issues</div>
                </div>
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>{activeResults.highCount}</div>
                  <div className="stat-label">High Priority</div>
                </div>
              </div>

              {/* Sandbox Tweak Panel: Sliders & Checkboxes */}
              <div className="card" style={{ padding: 24, marginBottom: 28, background: sandboxMode ? 'var(--bg-glass)' : 'var(--bg-secondary)', border: sandboxMode ? '1.5px solid #d97706' : '1px solid var(--border-subtle)', transition: 'all 300ms ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <Sliders size={16} color={sandboxMode ? '#d97706' : 'var(--accent-blue)'} /> Live Optimizer Sandbox & Parameter Simulator
                  </h4>
                  {!sandboxMode && (
                    <button className="btn btn-secondary btn-sm" onClick={startSandbox} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Play size={12} /> Launch Sandbox Mode
                    </button>
                  )}
                </div>

                {sandboxMode && sandboxForm ? (
                  <div>
                    {/* Sandbox Input Sliders */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <span>Row Count</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{(parseInt(sandboxForm.rowCount) || 0).toLocaleString()}</span>
                        </label>
                        <input 
                          type="range" min="100" max="250000" step="500" 
                          value={sandboxForm.rowCount || 0}
                          onChange={(e) => handleSandboxChange('rowCount', e.target.value)}
                          style={{ width: '100%', accentColor: '#d97706' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <span>KPI Count</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{sandboxForm.kpiCount || 0}</span>
                        </label>
                        <input 
                          type="range" min="1" max="40" step="1" 
                          value={sandboxForm.kpiCount || 0}
                          onChange={(e) => handleSandboxChange('kpiCount', e.target.value)}
                          style={{ width: '100%', accentColor: '#d97706' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <span>Column Count</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{sandboxForm.columnCount || 0}</span>
                        </label>
                        <input 
                          type="range" min="1" max="100" step="1" 
                          value={sandboxForm.columnCount || 0}
                          onChange={(e) => handleSandboxChange('columnCount', e.target.value)}
                          style={{ width: '100%', accentColor: '#d97706' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <span>Hierarchy Depth</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{sandboxForm.hierarchyDepth || 0}</span>
                        </label>
                        <input 
                          type="range" min="1" max="12" step="1" 
                          value={sandboxForm.hierarchyDepth || 0}
                          onChange={(e) => handleSandboxChange('hierarchyDepth', e.target.value)}
                          style={{ width: '100%', accentColor: '#d97706' }}
                        />
                      </div>
                    </div>

                    {/* Sandbox Checkboxes */}
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Observed Issues:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {ISSUE_CATEGORIES.map(cat => {
                          const active = sandboxForm.issues.includes(cat.value);
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => toggleSandboxIssue(cat.value)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 999,
                                fontSize: '0.73rem',
                                border: '1px solid var(--border-subtle)',
                                background: active ? 'var(--accent-blue-light)' : 'var(--bg-input)',
                                color: active ? 'var(--accent-blue-dark)' : 'var(--text-secondary)',
                                fontWeight: active ? 600 : 500,
                                cursor: 'pointer',
                                transition: 'all 150ms ease'
                              }}
                            >
                              {active ? '✓ ' : ''}{cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    Click "Launch Sandbox Mode" to open interactive metric sliders, customize configuration limits, and simulate the exact score benefits of resolving data volumes, hierarchies, and metrics.
                  </p>
                )}
              </div>

              {/* Insights Grid: Benchmark + Donut + Priority Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                <BenchmarkPanel form={sandboxMode ? sandboxForm : form} />
                <PriorityMatrix recommendations={activeResults.recommendations} />
              </div>

              {/* Category Breakdown Donut */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)', padding: 28, marginBottom: 28,
                boxShadow: 'var(--shadow-sm)'
              }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                  📊 Category Breakdown
                </h4>
                <CategoryDonut categories={activeResults.categories} />
              </div>

              {/* Action Bar: Tabs + View Toggle + Export */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div className="tabs" style={{ marginBottom: 0, flex: 1, minWidth: 280 }}>
                  {['all', 'critical', 'high', 'medium', 'low'].map(tab => (
                    <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}>
                      {tab === 'all' ? `All (${activeResults.totalRecommendations})` :
                        `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${activeResults[tab + 'Count']})`}
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

              {/* Recommendations List */}
              <div className="results-section">
                {filteredRecs.length > 0 ? (
                  resultsView === 'list' ? (
                    filteredRecs.map((rule, i) => (
                      <motion.div key={rule.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.06 }}>
                        <RecommendationCard 
                          rule={rule} 
                          status={roadmap[rule.id] || 'todo'}
                          onStatusChange={handleStatusChange}
                        />
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
