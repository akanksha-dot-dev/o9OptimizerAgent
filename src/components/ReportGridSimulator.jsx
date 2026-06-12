import React, { useState, useEffect, useMemo } from 'react';
import { Play, RotateCcw, Activity, ShieldAlert, Cpu, HardDrive, AlertCircle, Info } from 'lucide-react';

export default function ReportGridSimulator({ form }) {
  const [paintCycle, setPaintCycle] = useState(0);
  const [isPainting, setIsPainting] = useState(false);
  const [activeCellIndex, setActiveCellIndex] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(true);

  // Extract form parameters with safe defaults
  const rowCount = parseInt(form.rowCount) || 10000;
  const columnCount = parseInt(form.columnCount) || 12;
  const kpiCount = parseInt(form.kpiCount) || 5;
  const hierarchyDepth = parseInt(form.hierarchyDepth) || 3;
  const maxIntersection = parseInt(form.maxIntersection) || 20000;
  const positiveFactors = form.positiveFactors || [];
  const negativeFactors = form.negativeFactors || [];

  // 1. Calculate Frame Rate (FPS)
  const fps = useMemo(() => {
    let baseFps = 60;
    
    // Penalize large row counts
    const rowPenalty = Math.min(18, (rowCount / 250000) * 18);
    baseFps -= rowPenalty;
    
    // Penalize column counts
    const colPenalty = Math.min(10, (columnCount / 100) * 10);
    baseFps -= colPenalty;
    
    // Penalize KPIs
    const kpiPenalty = Math.min(6, (kpiCount / 40) * 6);
    baseFps -= kpiPenalty;
    
    // Factor penalties
    if (negativeFactors.includes('conditional_formatting')) baseFps -= 12;
    if (negativeFactors.includes('interdependent_filters')) baseFps -= 8;
    if (negativeFactors.includes('nulls_subtotals_defaults')) baseFps -= 6;
    
    // Positive factor buffers
    if (positiveFactors.includes('hide_null_rows')) baseFps += 4;
    if (positiveFactors.includes('low_max_intersection')) baseFps += 5;
    
    // clamp
    return Math.max(12, Math.min(60, Math.round(baseFps)));
  }, [rowCount, columnCount, kpiCount, positiveFactors, negativeFactors]);

  // 2. Calculate CPU Strain
  const cpuStrain = useMemo(() => {
    let baseCpu = 5;
    
    // Rows load
    const rowFactor = Math.min(35, (rowCount / 250000) * 35);
    baseCpu += rowFactor;
    
    // Columns load
    const colFactor = Math.min(15, (columnCount / 100) * 15);
    baseCpu += colFactor;
    
    // Max Intersection
    const intersectionFactor = Math.min(20, (maxIntersection / 150000) * 20);
    baseCpu += intersectionFactor;
    
    // Factors
    if (negativeFactors.includes('conditional_formatting')) baseCpu += 15;
    if (negativeFactors.includes('interdependent_filters')) baseCpu += 12;
    
    // Positive factors relieve CPU
    if (positiveFactors.includes('named_sets_used')) baseCpu -= 8;
    if (positiveFactors.includes('optimized_cube_queries')) baseCpu -= 10;
    
    return Math.max(3, Math.min(99, Math.round(baseCpu)));
  }, [rowCount, columnCount, maxIntersection, positiveFactors, negativeFactors]);

  // 3. Calculate Memory Usage (MB)
  const memoryUsage = useMemo(() => {
    // Basic structural cell weight
    let rawCells = rowCount * columnCount * (hierarchyDepth + 1);
    let cellBytes = rawCells * 8; // 8 bytes per cell element index
    let kpiBytes = kpiCount * 120000; // 120KB per KPI engine definition
    
    let totalMB = (cellBytes + kpiBytes) / (1024 * 1024);
    
    // Factor modifications
    if (positiveFactors.includes('hide_null_rows')) totalMB *= 0.65;
    if (positiveFactors.includes('named_sets_used')) totalMB *= 0.85;
    if (negativeFactors.includes('nulls_subtotals_defaults')) totalMB *= 1.25;

    return Math.max(1.5, parseFloat(totalMB.toFixed(1)));
  }, [rowCount, columnCount, hierarchyDepth, kpiCount, positiveFactors, negativeFactors]);

  // 4. Calculate Paint Latency per row of the visual grid (ms)
  const paintDelay = useMemo(() => {
    // Map FPS and CPU strain to render speed
    // Higher CPU or lower FPS => higher delay
    const baseDelay = (60 / fps) * 20; // 20ms baseline
    const cpuMultiplier = 1 + (cpuStrain / 30);
    return Math.round(baseDelay * cpuMultiplier);
  }, [fps, cpuStrain]);

  // Visual simulation grid parameters
  const gridRows = 6;
  const gridCols = 8;
  const totalCells = gridRows * gridCols;

  // Run cell paint sweep
  useEffect(() => {
    if (!autoPlay && paintCycle === 0) return;
    
    setIsPainting(true);
    let currentCell = 0;
    setActiveCellIndex(0);

    const interval = setInterval(() => {
      currentCell += 1;
      if (currentCell >= totalCells) {
        clearInterval(interval);
        setIsPainting(false);
        setActiveCellIndex(-1);
      } else {
        setActiveCellIndex(currentCell);
      }
    }, paintDelay);

    return () => clearInterval(interval);
  }, [paintCycle, paintDelay, totalCells, autoPlay]);

  // Re-trigger paint cycle when form changes
  useEffect(() => {
    if (autoPlay) {
      setPaintCycle(prev => prev + 1);
    }
  }, [rowCount, columnCount, kpiCount, positiveFactors, negativeFactors, autoPlay]);

  const triggerRepaint = () => {
    setPaintCycle(prev => prev + 1);
  };

  // Status colors based on thresholds
  const fpsColor = fps >= 50 ? '#10b981' : fps >= 30 ? '#f59e0b' : '#ef4444';
  const cpuColor = cpuStrain <= 40 ? '#10b981' : cpuStrain <= 80 ? '#f59e0b' : '#ef4444';
  const memoryColor = memoryUsage <= 100 ? '#10b981' : memoryUsage <= 500 ? '#f59e0b' : '#ef4444';

  const isConditionalFormatting = negativeFactors.includes('conditional_formatting');

  return (
    <div className="card" style={{
      padding: '24px',
      marginBottom: '28px',
      background: 'var(--bg-glass)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Activity size={18} color="var(--accent-blue)" /> Interactive Grid & Performance Simulator
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Simulates client-side render cycles and engine telemetry based on current configurations.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={triggerRepaint}
              disabled={isPainting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.75rem' }}
            >
              <Play size={12} fill={isPainting ? 'none' : 'currentColor'} /> 
              {isPainting ? 'Painting...' : 'Trigger Repaint'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={autoPlay} 
                onChange={(e) => setAutoPlay(e.target.checked)} 
                style={{ accentColor: 'var(--accent-blue)' }} 
              />
              Auto-paint on change
            </label>
          </div>
        </div>

        {/* Telemetry Dashboard */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          {/* FPS Gauge */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              <Activity size={14} color="var(--accent-blue)" /> Frame Rate
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: fpsColor, fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              {fps}
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 2 }}>FPS</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {fps >= 50 ? 'Smooth Interactions' : fps >= 30 ? 'Moderate Lag Observed' : 'Severe Lag & UI Stutter'}
            </div>
            <div style={{ 
              height: '3px', 
              width: '100%', 
              background: '#e2e8f0', 
              position: 'absolute', 
              bottom: 0, left: 0, 
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              overflow: 'hidden'
            }}>
              <div style={{ height: '100%', width: `${(fps / 60) * 100}%`, background: fpsColor, transition: 'all 0.5s ease' }} />
            </div>
          </div>

          {/* CPU Strain Gauge */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              <Cpu size={14} color="var(--accent-indigo)" /> CPU Load
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: cpuColor, fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              {cpuStrain}
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 2 }}>%</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {cpuStrain <= 40 ? 'Low Thread Strain' : cpuStrain <= 80 ? 'Heavy Calculation Load' : 'Thread Lock Risk'}
            </div>
            <div style={{ 
              height: '3px', 
              width: '100%', 
              background: '#e2e8f0', 
              position: 'absolute', 
              bottom: 0, left: 0, 
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              overflow: 'hidden'
            }}>
              <div style={{ height: '100%', width: `${cpuStrain}%`, background: cpuColor, transition: 'all 0.5s ease' }} />
            </div>
          </div>

          {/* Memory Gauge */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              <HardDrive size={14} color="var(--accent-rose)" /> Heap Memory
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: memoryColor, fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              {memoryUsage >= 1000 ? (memoryUsage / 1024).toFixed(2) : memoryUsage}
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 2 }}>
                {memoryUsage >= 1000 ? 'GB' : 'MB'}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {memoryUsage <= 100 ? 'Lightweight Footprint' : memoryUsage <= 500 ? 'Standard Load' : 'High Memory Warning'}
            </div>
            <div style={{ 
              height: '3px', 
              width: '100%', 
              background: '#e2e8f0', 
              position: 'absolute', 
              bottom: 0, left: 0, 
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              overflow: 'hidden'
            }}>
              <div style={{ height: '100%', width: `${Math.min(100, (memoryUsage / 1024) * 100)}%`, background: memoryColor, transition: 'all 0.5s ease' }} />
            </div>
          </div>

          {/* Repaint Speed Info */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 4 }}>
              Grid Render Speed
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {paintDelay} ms <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/ cell</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Info size={11} /> Est. paint: {((paintDelay * totalCells) / 1000).toFixed(2)}s
            </div>
          </div>
        </div>

        {/* Repaint Progress Bar if Painting */}
        {isPainting && (
          <div style={{
            height: '4px',
            background: 'var(--border-subtle)',
            borderRadius: '99px',
            marginBottom: '16px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${((activeCellIndex + 1) / totalCells) * 100}%`,
              background: 'var(--accent-blue)',
              transition: 'width 0.1s linear'
            }} />
          </div>
        )}

        {/* Visual Report Grid */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1.5px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          fontFamily: 'var(--font-mono)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
          overflowX: 'auto'
        }}>
          {/* Header Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(8, 1fr)', gap: '4px', marginBottom: '6px', minWidth: '480px' }}>
            <div style={{ height: '24px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              #
            </div>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((col, idx) => (
              <div key={idx} style={{ height: '24px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                Col {col}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '480px' }}>
            {Array.from({ length: gridRows }).map((_, rIdx) => (
              <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: '40px repeat(8, 1fr)', gap: '4px' }}>
                {/* Row Index */}
                <div style={{ height: '28px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  {rIdx + 1}
                </div>
                {/* Columns */}
                {Array.from({ length: gridCols }).map((_, cIdx) => {
                  const cellIdx = rIdx * gridCols + cIdx;
                  const hasBeenPainted = cellIdx <= activeCellIndex || activeCellIndex === -1;
                  const isCurrentlyPainting = cellIdx === activeCellIndex;
                  
                  // Compute individual cell styling
                  let cellBg = 'var(--bg-card)';
                  let cellTextColor = 'var(--text-secondary)';
                  let cellBorderColor = 'var(--border-subtle)';
                  
                  if (hasBeenPainted) {
                    if (isConditionalFormatting) {
                      // Simulate conditional formatting colors
                      const hash = (rIdx + cIdx * 3) % 4;
                      if (hash === 0) {
                        cellBg = 'var(--accent-rose-light)';
                        cellTextColor = 'var(--accent-rose)';
                        cellBorderColor = 'rgba(244,63,94,0.3)';
                      } else if (hash === 1) {
                        cellBg = 'var(--accent-emerald-light)';
                        cellTextColor = 'var(--accent-emerald)';
                        cellBorderColor = 'rgba(16,185,129,0.3)';
                      } else if (hash === 2) {
                        cellBg = 'var(--accent-amber-light)';
                        cellTextColor = '#d97706';
                        cellBorderColor = 'rgba(245,158,11,0.3)';
                      }
                    } else {
                      // Standard painted cell color (clean teal/blue tint)
                      cellBg = 'rgba(59, 130, 246, 0.03)';
                    }
                  }
                  
                  if (isCurrentlyPainting) {
                    cellBg = 'rgba(59, 130, 246, 0.25)';
                    cellBorderColor = 'var(--accent-blue)';
                  }

                  // Simulated cell value
                  let displayVal = '';
                  if (hasBeenPainted) {
                    const baseVal = (rIdx * 123 + cIdx * 45) % 1000;
                    displayVal = baseVal.toLocaleString();
                  }

                  return (
                    <div 
                      key={cIdx} 
                      style={{ 
                        height: '28px', 
                        background: cellBg, 
                        border: `1px solid ${cellBorderColor}`, 
                        borderRadius: '3px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'flex-end', 
                        padding: '0 8px',
                        fontSize: '0.72rem', 
                        color: cellTextColor,
                        position: 'relative',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease'
                      }}
                    >
                      {isCurrentlyPainting && (
                        <span style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                          animation: 'shimmer 0.6s infinite',
                          borderRadius: '3px'
                        }} />
                      )}
                      
                      {/* Cell formulas fx indicator */}
                      {hasBeenPainted && negativeFactors.includes('heavy_cell_formulas') && (cIdx === 1 || cIdx === 4) && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', position: 'absolute', left: 4, top: 2 }}>
                          fx
                        </span>
                      )}

                      {displayVal}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry warnings based on factors */}
        {negativeFactors.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginTop: '16px',
            padding: '12px 14px',
            background: 'var(--accent-rose-light)',
            border: '1.5px solid rgba(244,63,94,0.15)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <ShieldAlert size={16} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                Active UI Overhead Indicators
              </div>
              <ul style={{ margin: '4px 0 0', paddingLeft: '16px', listStyle: 'disc', fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {negativeFactors.includes('conditional_formatting') && (
                  <li><strong>Conditional Formatting</strong> triggers recalculation of style templates for every visible cell during scrolls/repaints.</li>
                )}
                {negativeFactors.includes('heavy_cell_formulas') && (
                  <li><strong>Heavy Cell Formulas</strong> force client-side JavaScript evaluations, leading to CPU thread spikes.</li>
                )}
                {negativeFactors.includes('flat_hierarchy_expansion') && (
                  <li><strong>Flat Hierarchy Expansion</strong> bypasses incremental node loading, rendering millions of structural lines on load.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
