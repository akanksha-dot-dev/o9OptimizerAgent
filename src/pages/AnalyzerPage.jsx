import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft,
  Download, RotateCcw, FileText, BarChart3, Layers, Settings2,
  Sliders, ClipboardList, History, Columns, Trash2, CheckCircle2,
  Play, Save, ArrowLeftRight, Gauge, Shield, Activity, TrendingUp, TrendingDown,
  Plug, Wifi, WifiOff
} from 'lucide-react';
import { REPORT_TYPES, ISSUE_CATEGORIES, POSITIVE_FACTORS, NEGATIVE_FACTORS, analyzeReport } from '../data/optimizationRules';
import { normalizeExtensionPayload, isValidExtensionMessage } from '../data/extensionBridge';
import ScoreRing from '../components/ScoreRing';
import RecommendationCard from '../components/RecommendationCard';
import CategoryDonut from '../components/CategoryDonut';
import BenchmarkPanel from '../components/BenchmarkPanel';
import PriorityMatrix from '../components/PriorityMatrix';
import ExecutiveSummary from '../components/ExecutiveSummary';
import QueryProfiler from '../components/QueryProfiler';
import PerformanceMetrics from '../components/PerformanceMetrics';
import UIOptimizationScorecard from '../components/UIOptimizationScorecard';

// ─── Extension Banner Component ───────────────────────────────────────────────
function ExtensionBanner({ source, onDismiss }) {
  if (!source) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.08) 100%)',
        border: '1.5px solid rgba(16,185,129,0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Plug size={16} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wifi size={13} /> o9 Extension Connected
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Report config auto-captured from <strong>{source.tenantHost}</strong>
            {source.workspace ? ` · Workspace: ${source.workspace}` : ''}
            {source.confidence ? ` · ${source.confidence}% confidence` : ''}
            {source.scanMode ? ` · ${source.scanMode} scan` : ''}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {source.apiResponseCount > 0 && (
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px',
            borderRadius: 999, background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)', color: '#10b981',
          }}>
            {source.apiResponseCount} API responses captured
          </span>
        )}
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem',
            color: '#10b981', cursor: 'pointer', fontWeight: 600,
          }}
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

const STEPS = [
  { id: 0, label: 'Report Type', icon: <FileText size={16} /> },
  { id: 1, label: 'UI Parameters', icon: <Gauge size={16} /> },
  { id: 2, label: 'Configuration', icon: <Settings2 size={16} /> },
  { id: 3, label: 'Issues', icon: <AlertTriangle size={16} /> },
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
  // New UI Performance fields
  graphCubeTime: '',
  webApiTime: '',
  maxIntersection: '',
  positiveFactors: [],
  negativeFactors: [],
};

export default function AnalyzerPage() {
  const [activeToolTab, setActiveToolTab] = useState('analyzer');
  // Wizard & Form States
  const [form, setForm] = useState(defaultForm);
  const [results, setResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [step, setStep] = useState(0);
  const [resultsView, setResultsView] = useState('list');
  const resultsRef = useRef(null);
  // Extension bridge state
  const [extensionSource, setExtensionSource] = useState(null);
  const [extensionToastVisible, setExtensionToastVisible] = useState(false);

  // ── Extension Bridge: 3-channel receiver ──────────────────────────────────
  // Channel 1: window.postMessage (from background relay in MAIN world)
  // Channel 2: window CustomEvent 'o9ExtensionReady' (fired directly in MAIN world)
  // Channel 3: Poll window.__o9ExtensionConfig (set by background relay as fallback)
  useEffect(() => {
    let processed = false; // prevent double processing

    function processExtensionPayload(payload) {
      if (processed) return;
      if (!payload || payload.source !== 'o9-optimizer-extension') return;
      processed = true;

      try {
        const normalizedForm = normalizeExtensionPayload(payload);
        setForm(prev => ({ ...prev, ...normalizedForm }));
        setExtensionSource({
          tenantHost: payload.tenantHost,
          workspace: payload.workspace,
          confidence: payload.confidence,
          scanMode: payload.scanMode,
          apiResponseCount: payload.apiResponseCount || 0,
          capturedAt: payload.capturedAt,
        });
        setExtensionToastVisible(true);
        setTimeout(() => setExtensionToastVisible(false), 5000);
        setResults(null);
        setStep(0);
        setAnalyzing(false);
        // Clear global so it doesn't re-fire
        if (window.__o9ExtensionConfig) window.__o9ExtensionConfig = null;
        console.log('[o9 Optimizer] ✅ Extension data applied:', payload.reportName || payload.tenantHost);
      } catch (err) {
        console.error('[o9 Optimizer] Failed to process extension data:', err);
      }
    }

    // Channel 1: postMessage
    function handlePostMessage(event) {
      if (
        event.data &&
        event.data.type === 'O9_EXTENSION_BRIDGE' &&
        event.data.source === 'o9-optimizer-extension' &&
        event.data.payload
      ) {
        processExtensionPayload(event.data.payload);
      }
    }
    window.addEventListener('message', handlePostMessage);

    // Channel 2: CustomEvent (fired by background relay in MAIN world)
    function handleCustomEvent(e) {
      if (e.detail) processExtensionPayload(e.detail);
    }
    window.addEventListener('o9ExtensionReady', handleCustomEvent);

    // Channel 3: Poll window.__o9ExtensionConfig (set by background relay)
    // Only poll if URL has ?source=extension
    let pollInterval = null;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('source') === 'extension') {
      let pollCount = 0;
      pollInterval = setInterval(() => {
        pollCount++;
        if (window.__o9ExtensionConfig) {
          processExtensionPayload(window.__o9ExtensionConfig);
          clearInterval(pollInterval);
        } else if (pollCount > 40) { // stop after 8 seconds
          clearInterval(pollInterval);
        }
      }, 200);
    }

    return () => {
      window.removeEventListener('message', handlePostMessage);
      window.removeEventListener('o9ExtensionReady', handleCustomEvent);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);


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

  const togglePositiveFactor = (val) => {
    setForm(prev => ({
      ...prev,
      positiveFactors: prev.positiveFactors.includes(val)
        ? prev.positiveFactors.filter(v => v !== val)
        : [...prev.positiveFactors, val]
    }));
  };

  const toggleNegativeFactor = (val) => {
    setForm(prev => ({
      ...prev,
      negativeFactors: prev.negativeFactors.includes(val)
        ? prev.negativeFactors.filter(v => v !== val)
        : [...prev.negativeFactors, val]
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
        graphCubeTime: parseInt(newForm.graphCubeTime) || 0,
        webApiTime: parseInt(newForm.webApiTime) || 0,
        maxIntersection: parseInt(newForm.maxIntersection) || 0,
      });
      setSandboxResults(newResults);
      return newForm;
    });
  };

  const toggleSandboxPositive = (val) => {
    setSandboxForm(prev => {
      const updated = prev.positiveFactors.includes(val)
        ? prev.positiveFactors.filter(v => v !== val)
        : [...prev.positiveFactors, val];
      const newForm = { ...prev, positiveFactors: updated };
      const newResults = analyzeReport({
        ...newForm,
        rowCount: parseInt(newForm.rowCount) || 0,
        columnCount: parseInt(newForm.columnCount) || 0,
        kpiCount: parseInt(newForm.kpiCount) || 0,
        hierarchyDepth: parseInt(newForm.hierarchyDepth) || 0,
        userCount: parseInt(newForm.userCount) || 0,
        graphCubeTime: parseInt(newForm.graphCubeTime) || 0,
        webApiTime: parseInt(newForm.webApiTime) || 0,
        maxIntersection: parseInt(newForm.maxIntersection) || 0,
      });
      setSandboxResults(newResults);
      return newForm;
    });
  };

  const toggleSandboxNegative = (val) => {
    setSandboxForm(prev => {
      const updated = prev.negativeFactors.includes(val)
        ? prev.negativeFactors.filter(v => v !== val)
        : [...prev.negativeFactors, val];
      const newForm = { ...prev, negativeFactors: updated };
      const newResults = analyzeReport({
        ...newForm,
        rowCount: parseInt(newForm.rowCount) || 0,
        columnCount: parseInt(newForm.columnCount) || 0,
        kpiCount: parseInt(newForm.kpiCount) || 0,
        hierarchyDepth: parseInt(newForm.hierarchyDepth) || 0,
        userCount: parseInt(newForm.userCount) || 0,
        graphCubeTime: parseInt(newForm.graphCubeTime) || 0,
        webApiTime: parseInt(newForm.webApiTime) || 0,
        maxIntersection: parseInt(newForm.maxIntersection) || 0,
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
        graphCubeTime: parseInt(newForm.graphCubeTime) || 0,
        webApiTime: parseInt(newForm.webApiTime) || 0,
        maxIntersection: parseInt(newForm.maxIntersection) || 0,
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
        graphCubeTime: parseInt(form.graphCubeTime) || 0,
        webApiTime: parseInt(form.webApiTime) || 0,
        maxIntersection: parseInt(form.maxIntersection) || 0,
        positiveFactors: form.positiveFactors,
        negativeFactors: form.negativeFactors,
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
    if (step === 1) return true; // UI params are optional
    if (step === 2) return true;
    if (step === 3) return form.issues.length > 0;
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
      `${'='.repeat(60)}`,
      `Report: ${activeForm.reportName || 'Unnamed'} (${activeForm.reportType.replace(/_/g, ' ')})`,
      `Health Score: ${activeResults.score}/100 (Base: ${activeResults.baseHealthScore}, UI Perf: ${activeResults.uiPerfScore})`,
      `Total Findings: ${activeResults.totalRecommendations}`,
      `Critical: ${activeResults.criticalCount} | High: ${activeResults.highCount} | Medium: ${activeResults.mediumCount} | Low: ${activeResults.lowCount}`,
      ``,
      `PERFORMANCE METRICS`,
      `${'─'.repeat(40)}`,
      `Graph Cube Execution Time: ${activeForm.graphCubeTime || 'N/A'} ms (${activeResults.uiPerformance?.graphCubeTier?.label || 'N/A'})`,
      `Web API Request Processing Time: ${activeForm.webApiTime || 'N/A'} ms (${activeResults.uiPerformance?.webApiTier?.label || 'N/A'})`,
      `Concurrent Users: ${activeForm.userCount || 'N/A'} (${activeResults.uiPerformance?.concurrentUsersTier?.label || 'N/A'})`,
      `Max Intersection (Tenant): ${activeForm.maxIntersection || 'N/A'}`,
      ``,
      `UI OPTIMIZATION FACTORS`,
      `${'─'.repeat(40)}`,
      `Positive Factors Active: ${activeResults.uiPerformance?.activePositiveCount || 0}/${activeResults.uiPerformance?.totalPositiveCount || 0} (${activeResults.uiPerformance?.positiveAdoption || 0}% adoption)`,
      `Negative Factors Present: ${activeResults.uiPerformance?.activeNegativeCount || 0}/${activeResults.uiPerformance?.totalNegativeCount || 0}`,
      `Estimated Net Load Impact: ${activeResults.uiPerformance?.estLoadImpact || 0}%`,
      ``,
      `  Positive Factors:`,
      ...POSITIVE_FACTORS.map(pf => `    ${(activeForm.positiveFactors || []).includes(pf.value) ? '✅' : '❌'} ${pf.label} (${pf.impact}%)`),
      ``,
      `  Negative Factors:`,
      ...NEGATIVE_FACTORS.map(nf => `    ${(activeForm.negativeFactors || []).includes(nf.value) ? '⚠️' : '✅'} ${nf.label} (+${nf.impact}%)`),
      ``,
      `ROADMAP STATUSES:`,
      ...activeResults.recommendations.map(r => `  - ${r.title}: ${roadmap[r.id] || 'todo'}`),
      ``,
      `RECOMMENDATIONS`,
      `${'─'.repeat(60)}`,
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
      `Health Score: ${activeResults.score}/100 | UI Perf Score: ${activeResults.uiPerfScore}/100`,
      `Total Findings: ${activeResults.totalRecommendations}`,
      `Critical: ${activeResults.criticalCount} | High: ${activeResults.highCount} | Medium: ${activeResults.mediumCount} | Low: ${activeResults.lowCount}`,
      ``,
      `Performance: Graph Cube ${activeForm.graphCubeTime || 'N/A'}ms | Web API ${activeForm.webApiTime || 'N/A'}ms`,
      `UI Optimization: ${activeResults.uiPerformance?.activePositiveCount || 0}/${activeResults.uiPerformance?.totalPositiveCount || 0} positive factors | Net load impact: ${activeResults.uiPerformance?.estLoadImpact || 0}%`,
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
        
        {/* Header */}
        <div className="section-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 999, background: 'var(--accent-blue-light)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Zap size={13} /> AI-Powered Analysis Engine
          </div>
          <h2>o9 Report Optimizer</h2>
          <p>Analyze your report configuration against 25+ optimization rules including UI load-time factors, performance metrics, and o9 best practices.</p>
        </div>

        {/* Tool Selector Tabs */}
        <div className="tabs" style={{ maxWidth: 500, margin: '0 auto 32px', display: 'flex', justifyContent: 'center' }}>
          <button
            className={`tab-btn ${activeToolTab === 'analyzer' ? 'active' : ''}`}
            onClick={() => setActiveToolTab('analyzer')}
            style={{ flex: 1, padding: '12px 0', fontSize: '0.88rem' }}
          >
            Report Configuration Analyzer
          </button>
          <button
            className={`tab-btn ${activeToolTab === 'profiler' ? 'active' : ''}`}
            onClick={() => setActiveToolTab('profiler')}
            style={{ flex: 1, padding: '12px 0', fontSize: '0.88rem' }}
          >
            o9 Script Query Profiler
          </button>
        </div>

        {activeToolTab === 'analyzer' ? (
          <>
            {/* Extension Connected Banner */}
            <AnimatePresence>
              {extensionSource && (
                <ExtensionBanner
                  source={extensionSource}
                  onDismiss={() => setExtensionSource(null)}
                />
              )}
            </AnimatePresence>

            {/* Extension Data Toast */}
            <AnimatePresence>
              {extensionToastVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 40, scale: 0.9 }}
                  style={{
                    position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white', padding: '12px 24px', borderRadius: 999,
                    fontWeight: 700, fontSize: '0.88rem', zIndex: 9999,
                    boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
                    display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap',
                  }}
                >
                  <Plug size={16} /> o9 Extension data received — form auto-populated!
                </motion.div>
              )}
            </AnimatePresence>

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
                                <span style={{ fontWeight: 600 }}>UI Perf Score</span>
                                <span style={{ fontWeight: 700 }}>{results.uiPerfScore || 'N/A'}</span>
                                <span>{compareReport.results.uiPerfScore || 'N/A'}</span>
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
                                <span style={{ fontWeight: 600 }}>Graph Cube Time</span>
                                <span>{form.graphCubeTime ? `${form.graphCubeTime}ms` : 'N/A'}</span>
                                <span>{compareReport.form.graphCubeTime ? `${compareReport.form.graphCubeTime}ms` : 'N/A'}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <span style={{ fontWeight: 600 }}>Positive Factors</span>
                                <span>{(form.positiveFactors || []).length}/{POSITIVE_FACTORS.length}</span>
                                <span>{(compareReport.form.positiveFactors || []).length}/{POSITIVE_FACTORS.length}</span>
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

        {/* Stepper */}
        {!results && activeToolTab === 'analyzer' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36, flexWrap: 'wrap' }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div
                  onClick={() => { if (s.id < step) setStep(s.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                    borderRadius: 999, cursor: s.id <= step ? 'pointer' : 'default',
                    background: step === s.id ? 'var(--gradient-primary)' : step > s.id ? 'var(--accent-emerald-light)' : 'var(--bg-input)',
                    color: step === s.id ? 'white' : step > s.id ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    fontWeight: 600, fontSize: '0.78rem',
                    border: step === s.id ? 'none' : '1px solid var(--border-subtle)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {step > s.id ? <CheckCircle size={15} /> : s.icon}
                  <span className="step-label-text">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 28, height: 2, background: step > i ? 'var(--accent-emerald)' : 'var(--border-subtle)', transition: 'background 0.3s ease' }} />
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

              {/* Step 1: UI Performance Parameters (NEW) */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Gauge size={18} color="var(--accent-blue)" /> UI Performance Parameters
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                    Configure performance metrics and UI load-time factors. These directly impact the optimization analysis and UI Performance Score.
                  </p>

                  {/* Performance Metrics */}
                  <div style={{
                    padding: '20px', borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(59,130,246,0.04))',
                    border: '1px solid rgba(99,102,241,0.12)',
                    marginBottom: 24,
                  }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1' }}>
                      <Activity size={15} /> Performance Metrics
                    </h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Graph Cube Execution Time (ms)</label>
                        <input type="number" placeholder="e.g., 1200" value={form.graphCubeTime}
                          onChange={e => setForm({ ...form, graphCubeTime: e.target.value })} />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                          Thresholds: ≤500ms Excellent · ≤1500ms Good · ≤3000ms Fair · &gt;3000ms Critical
                        </span>
                      </div>
                      <div className="form-group">
                        <label>Web API Request Processing Time (ms)</label>
                        <input type="number" placeholder="e.g., 2500" value={form.webApiTime}
                          onChange={e => setForm({ ...form, webApiTime: e.target.value })} />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                          Thresholds: ≤1000ms Excellent · ≤3000ms Good · ≤5000ms Fair · &gt;5000ms Critical
                        </span>
                      </div>
                      <div className="form-group">
                        <label>Max Intersection (Tenant Setting)</label>
                        <input type="number" placeholder="e.g., 50000" value={form.maxIntersection}
                          onChange={e => setForm({ ...form, maxIntersection: e.target.value })} />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                          Lower values improve load time. Target: 10K-50K for optimal performance.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Positive Factors */}
                  <div style={{
                    padding: '20px', borderRadius: 'var(--radius-lg)',
                    background: 'rgba(16,185,129,0.03)',
                    border: '1px solid rgba(16,185,129,0.12)',
                    marginBottom: 16,
                  }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, color: '#059669' }}>
                      <TrendingDown size={15} /> Positive Factors — Reduce Load Time
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                      Select all factors that are currently enabled in your report. Missing factors will generate optimization recommendations.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                      {POSITIVE_FACTORS.map(pf => {
                        const active = form.positiveFactors.includes(pf.value);
                        return (
                          <div
                            key={pf.value}
                            onClick={() => togglePositiveFactor(pf.value)}
                            style={{
                              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                              border: active ? '1.5px solid rgba(16,185,129,0.4)' : '1px solid var(--border-subtle)',
                              background: active ? 'rgba(16,185,129,0.08)' : 'white',
                              cursor: 'pointer', transition: 'all 0.2s ease',
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            <input type="checkbox" checked={active} readOnly
                              style={{ accentColor: '#10b981', pointerEvents: 'none' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.8rem', fontWeight: active ? 600 : 500,
                                color: active ? '#059669' : 'var(--text-secondary)',
                              }}>
                                {pf.label}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                {pf.description}
                              </div>
                            </div>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                              color: active ? '#059669' : 'var(--text-muted)',
                            }}>
                              {pf.impact}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {form.positiveFactors.length > 0 && (
                      <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 10, fontWeight: 600 }}>
                        ✓ {form.positiveFactors.length} of {POSITIVE_FACTORS.length} positive factors active
                      </p>
                    )}
                  </div>

                  {/* Negative Factors */}
                  <div style={{
                    padding: '20px', borderRadius: 'var(--radius-lg)',
                    background: 'rgba(239,68,68,0.03)',
                    border: '1px solid rgba(239,68,68,0.12)',
                  }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626' }}>
                      <TrendingUp size={15} /> Negative Factors — Increase Load Time
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                      Select factors that are currently present in your report. Each one adds overhead and will generate optimization warnings.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                      {NEGATIVE_FACTORS.map(nf => {
                        const active = form.negativeFactors.includes(nf.value);
                        return (
                          <div
                            key={nf.value}
                            onClick={() => toggleNegativeFactor(nf.value)}
                            style={{
                              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                              border: active ? '1.5px solid rgba(239,68,68,0.4)' : '1px solid var(--border-subtle)',
                              background: active ? 'rgba(239,68,68,0.06)' : 'white',
                              cursor: 'pointer', transition: 'all 0.2s ease',
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}
                          >
                            <input type="checkbox" checked={active} readOnly
                              style={{ accentColor: '#ef4444', pointerEvents: 'none' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.8rem', fontWeight: active ? 600 : 500,
                                color: active ? '#dc2626' : 'var(--text-secondary)',
                              }}>
                                {nf.label}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                {nf.description}
                              </div>
                            </div>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                              color: active ? '#dc2626' : 'var(--text-muted)',
                            }}>
                              +{nf.impact}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {form.negativeFactors.length > 0 && (
                      <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 10, fontWeight: 600 }}>
                        ⚠ {form.negativeFactors.length} negative factor{form.negativeFactors.length > 1 ? 's' : ''} present
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Configuration */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
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

              {/* Step 3: Issues */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
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
                {step < 3 ? (
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
                Matching against 25+ optimization rules, UI factors & o9 best practices
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

              {/* Performance Metrics (NEW) */}
              <PerformanceMetrics results={activeResults} form={sandboxMode ? sandboxForm : form} />

              {/* UI Optimization Scorecard (NEW) */}
              <UIOptimizationScorecard results={activeResults} form={sandboxMode ? sandboxForm : form} />

              {/* Stats Row */}
              <div className="stats-bar" style={{ gridTemplateColumns: 'auto auto repeat(3, 1fr)' }}>
                <div className="stat-card">
                  <ScoreRing score={activeResults.score} size={130} />
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center', marginTop: 4 }}>Health Score</div>
                </div>
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="stat-value" style={{ color: activeResults.uiPerfScore >= 60 ? '#10b981' : activeResults.uiPerfScore >= 40 ? '#f59e0b' : '#ef4444', fontSize: '2rem' }}>{activeResults.uiPerfScore}</div>
                  <div className="stat-label">UI Perf Score</div>
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
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <span>Graph Cube Time (ms)</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{(parseInt(sandboxForm.graphCubeTime) || 0).toLocaleString()}</span>
                        </label>
                        <input 
                          type="range" min="0" max="10000" step="100" 
                          value={sandboxForm.graphCubeTime || 0}
                          onChange={(e) => handleSandboxChange('graphCubeTime', e.target.value)}
                          style={{ width: '100%', accentColor: '#d97706' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <span>Web API Time (ms)</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{(parseInt(sandboxForm.webApiTime) || 0).toLocaleString()}</span>
                        </label>
                        <input 
                          type="range" min="0" max="15000" step="100" 
                          value={sandboxForm.webApiTime || 0}
                          onChange={(e) => handleSandboxChange('webApiTime', e.target.value)}
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

                    {/* Sandbox Positive Factors */}
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#059669', marginBottom: 8 }}>
                        <TrendingDown size={12} style={{ verticalAlign: -1 }} /> Positive Factors:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {POSITIVE_FACTORS.map(pf => {
                          const active = sandboxForm.positiveFactors.includes(pf.value);
                          return (
                            <button
                              key={pf.value}
                              type="button"
                              onClick={() => toggleSandboxPositive(pf.value)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: '0.68rem',
                                border: `1px solid ${active ? 'rgba(16,185,129,0.4)' : 'var(--border-subtle)'}`,
                                background: active ? 'rgba(16,185,129,0.1)' : 'var(--bg-input)',
                                color: active ? '#059669' : 'var(--text-secondary)',
                                fontWeight: active ? 600 : 500,
                                cursor: 'pointer',
                                transition: 'all 150ms ease'
                              }}
                            >
                              {active ? '✓ ' : ''}{pf.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sandbox Negative Factors */}
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
                        <TrendingUp size={12} style={{ verticalAlign: -1 }} /> Negative Factors:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {NEGATIVE_FACTORS.map(nf => {
                          const active = sandboxForm.negativeFactors.includes(nf.value);
                          return (
                            <button
                              key={nf.value}
                              type="button"
                              onClick={() => toggleSandboxNegative(nf.value)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: '0.68rem',
                                border: `1px solid ${active ? 'rgba(239,68,68,0.4)' : 'var(--border-subtle)'}`,
                                background: active ? 'rgba(239,68,68,0.08)' : 'var(--bg-input)',
                                color: active ? '#dc2626' : 'var(--text-secondary)',
                                fontWeight: active ? 600 : 500,
                                cursor: 'pointer',
                                transition: 'all 150ms ease'
                              }}
                            >
                              {active ? '⚠ ' : ''}{nf.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    Click "Launch Sandbox Mode" to open interactive metric sliders, customize UI factors, and simulate the exact score benefits of resolving data volumes, hierarchies, positive/negative factors, and performance metrics.
                  </p>
                )}
              </div>

              {/* Insights Grid: Benchmark + Priority Matrix */}
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
      </>
    ) : (
      <QueryProfiler />
    )}
  </div>

</div>
  );
}
