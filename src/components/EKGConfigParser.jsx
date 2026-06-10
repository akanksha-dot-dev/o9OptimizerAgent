import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCode, CheckCircle, Terminal, Play, AlertCircle, RefreshCw } from 'lucide-react';

const PRESETS = [
  {
    id: 'healthy',
    name: 'retail_chain_model_v3.json',
    label: 'Retail Supply Chain (Optimized)',
    checkedIds: ['n1', 'n2', 'n3', 'n5', 'h1', 'h2', 'h3', 'h5', 'h6', 'm1', 'm2', 'm3', 'm4', 'm5', 'i1', 'i2', 'i3', 'i4', 'i6', 'p1', 'p3', 'p4', 'p5'],
    logs: [
      { type: 'info', text: 'Initializing EKG model config parser...' },
      { type: 'info', text: 'Scanning nodes... Detected 5 entity types (Product, Location, Customer, Supplier, Channel).' },
      { type: 'success', text: 'Validated 15,200 nodes. No orphan/disconnected master data items found.' },
      { type: 'info', text: 'Validating hierarchies... Product hierarchy depth: 4 levels. Sourcing network: 2 levels.' },
      { type: 'success', text: 'Hierarchy design audit: PASSED. No redundant 1:1 parent-child levels.' },
      { type: 'info', text: 'Auditing measure calculations... Base measures correctly stored at native grain.' },
      { type: 'success', text: 'Measure audit: PASSED. Derived metrics reference pre-computed values.' },
      { type: 'info', text: 'Scanning Graph Cube settings... Memory footprint within 8GB limit. Aggregation cache ENABLED.' },
      { type: 'success', text: 'Model diagnostic completed. 0 critical errors. EKG health status: OPTIMIZED.' }
    ]
  },
  {
    id: 'average',
    name: 'global_dist_config.xml',
    label: 'Global Distribution Network (Average)',
    checkedIds: ['n1', 'n3', 'h2', 'h3', 'h5', 'm1', 'm2', 'm4', 'i1', 'i2', 'i3', 'i5', 'p1', 'p3', 'p5'],
    logs: [
      { type: 'info', text: 'Initializing XML schema validation...' },
      { type: 'info', text: 'Scanning nodes... Detected 6 entity types.' },
      { type: 'warn', text: 'Found 24 orphan Customer nodes with zero transaction history.' },
      { type: 'info', text: 'Validating hierarchies... Product hierarchy depth: 6 levels.' },
      { type: 'warn', text: 'Product hierarchy depth exceeds recommended limit (6 levels > 5).' },
      { type: 'success', text: 'Sourcing network topology maps correctly to location dimensions.' },
      { type: 'info', text: 'Auditing measure calculations... base measures are normalized.' },
      { type: 'warn', text: 'Graph Cube caching is partially disabled. Traversal times may degrade under load.' },
      { type: 'success', text: 'Model diagnostic completed. 3 warnings triggered. EKG health status: COMPLIANT.' }
    ]
  },
  {
    id: 'poor',
    name: 'legacy_complex_model_2025.json',
    label: 'Legacy Complex Supply Graph (Critical)',
    checkedIds: ['n1', 'n2', 'h3', 'm2', 'i1', 'i6'],
    logs: [
      { type: 'info', text: 'Initializing EKG parser...' },
      { type: 'info', text: 'Reading node classes and relationships...' },
      { type: 'error', text: 'Detected 420 orphan Product nodes (disconnected from Location & Supplier dimensions).' },
      { type: 'info', text: 'Validating hierarchies... Product hierarchy depth: 8 levels.' },
      { type: 'error', text: 'Critical hierarchy depth breach: 8 levels detected. High risk of Graph Cube memory overflow.' },
      { type: 'error', text: '1:1 parent-child level detected between "Sub-Family" and "Sub-Brand". Merge suggested.' },
      { type: 'info', text: 'Auditing measures... base measures are pre-aggregated before EKG insertion.' },
      { type: 'error', text: 'Granularity loss: Base metrics pre-aggregated. Prevents native allocation rules.' },
      { type: 'error', text: 'Graph Cube memory footprint exceeds allocated buffer limit. Aggregation caching is DISABLED.' },
      { type: 'warn', text: 'Sparse data handling is disabled. Zero value records are consuming RAM.' },
      { type: 'error', text: 'Parsing completed. 5 critical bottlenecks identified! EKG health status: RISK.' }
    ]
  }
];

export default function EKGConfigParser({ onParseComplete }) {
  const [selectedId, setSelectedId] = useState('healthy');
  const [isParsing, setIsParsing] = useState(false);
  const [currentLogs, setCurrentLogs] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [parsedName, setParsedName] = useState('');
  const terminalEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const activePreset = PRESETS.find(p => p.id === selectedId);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLogs]);

  const runParser = (preset) => {
    setIsParsing(true);
    setCurrentLogs([]);
    setParsedName(preset.name);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < preset.logs.length) {
        setCurrentLogs(prev => [...prev, preset.logs[idx]]);
        idx++;
      } else {
        clearInterval(interval);
        setIsParsing(false);
        if (onParseComplete) {
          onParseComplete(preset.checkedIds);
        }
      }
    }, 280);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      readAndParseFile(files[0]);
    }
  };

  const handleZoneClick = () => {
    if (isParsing) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      readAndParseFile(files[0]);
    }
  };

  const readAndParseFile = (file) => {
    const reader = new FileReader();
    setIsParsing(true);
    setCurrentLogs([{ type: 'info', text: `Loading file: ${file.name} (${Math.round(file.size / 1024)} KB)...` }]);
    setParsedName(file.name);

    reader.onload = (e) => {
      const text = e.target.result;
      const result = analyzeUploadedFile(file.name, text);
      
      let idx = 0;
      const interval = setInterval(() => {
        if (idx < result.logs.length) {
          setCurrentLogs(prev => [...prev, result.logs[idx]]);
          idx++;
        } else {
          clearInterval(interval);
          setIsParsing(false);
          if (onParseComplete) {
            onParseComplete(result.checkedIds);
          }
        }
      }, 200);
    };

    reader.onerror = () => {
      setIsParsing(false);
      setCurrentLogs(prev => [...prev, { type: 'error', text: `Failed to read file ${file.name}` }]);
    };

    reader.readAsText(file);
  };

  const analyzeUploadedFile = (fileName, fileContent) => {
    const logs = [];
    logs.push({ type: 'info', text: `Initializing file check: ${fileName}...` });
    
    let totalNodes = 0;
    let maxDepth = 1;
    let orphanCount = 0;
    let isXml = fileName.endsWith('.xml') || fileContent.trim().startsWith('<');
    let checkedIds = [];

    try {
      if (isXml) {
        logs.push({ type: 'info', text: 'Detected XML schema. Initializing DOM parser...' });
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, "text/xml");
        
        const parserError = xmlDoc.getElementsByTagName("parsererror");
        if (parserError.length > 0) {
          throw new Error("Invalid XML formatting/syntax.");
        }

        const allElements = xmlDoc.getElementsByTagName("*");
        totalNodes = allElements.length;
        logs.push({ type: 'success', text: `Successfully parsed XML. Detected ${totalNodes} structural elements.` });

        const getDepth = (element) => {
          let depth = 1;
          if (element.children.length > 0) {
            let maxSubDepth = 0;
            for (let child of element.children) {
              maxSubDepth = Math.max(maxSubDepth, getDepth(child));
            }
            depth += maxSubDepth;
          }
          return depth;
        };
        
        maxDepth = getDepth(xmlDoc.documentElement);
        logs.push({ type: 'info', text: `Hierarchy depth analysis: found maximum XML element depth of ${maxDepth} levels.` });

        let orphans = [];
        for (let el of allElements) {
          if (el.children.length === 0 && el.attributes.length === 0) {
            orphans.push(el.tagName);
          }
        }
        orphanCount = orphans.length;
        
        if (maxDepth > 6) {
          logs.push({ type: 'error', text: `Critical hierarchy depth breach: ${maxDepth} levels exceeds the recommended o9 limit of 5.` });
        } else if (maxDepth > 4) {
          logs.push({ type: 'warn', text: `Hierarchy warning: depth is ${maxDepth} levels (recommended optimal is ≤4).` });
        } else {
          logs.push({ type: 'success', text: `Hierarchy design audit: PASSED. Depth of ${maxDepth} levels is highly optimized.` });
        }

        if (orphanCount > 0) {
          logs.push({ type: 'warn', text: `Found ${orphanCount} isolated leaf tags (potential unmapped attributes or parameters).` });
        } else {
          logs.push({ type: 'success', text: `Orphan scan: PASSED. No isolated elements detected.` });
        }

        if (maxDepth <= 4 && orphanCount === 0) {
          checkedIds = ['n1', 'n2', 'n3', 'n5', 'h1', 'h2', 'h3', 'h5', 'h6', 'm1', 'm2', 'm3', 'm4', 'm5', 'i1', 'i2', 'i3', 'i4', 'i6', 'p1', 'p3', 'p4', 'p5'];
        } else if (maxDepth <= 6) {
          checkedIds = ['n1', 'n3', 'h2', 'h3', 'h5', 'm1', 'm2', 'm4', 'i1', 'i2', 'i3', 'i5', 'p1', 'p3', 'p5'];
        } else {
          checkedIds = ['n1', 'n2', 'h3', 'm2', 'i1', 'i6'];
        }

      } else {
        logs.push({ type: 'info', text: 'Detected JSON schema. Processing data object...' });
        const data = JSON.parse(fileContent);
        
        let nodesList = [];
        let edgesList = [];
        
        if (data.nodes && Array.isArray(data.nodes)) {
          nodesList = data.nodes;
          edgesList = data.edges || [];
          logs.push({ type: 'info', text: `Detected standard o9 EKG graph format with nodes & edges.` });
        } else if (Array.isArray(data)) {
          nodesList = data;
          logs.push({ type: 'info', text: `Detected flat array configuration.` });
        } else {
          const flattenJSON = (obj, depth = 1) => {
            totalNodes++;
            maxDepth = Math.max(maxDepth, depth);
            if (obj && typeof obj === 'object') {
              Object.entries(obj).forEach(([key, val]) => {
                if (val && typeof val === 'object') {
                  flattenJSON(val, depth + 1);
                }
              });
            }
          };
          flattenJSON(data);
          logs.push({ type: 'info', text: `Detected hierarchical parameter JSON object structure.` });
        }

        if (nodesList.length > 0) {
          totalNodes = nodesList.length;
          logs.push({ type: 'success', text: `Successfully parsed. Found ${totalNodes} nodes on configuration canvas.` });
          
          const nodeIds = new Set(nodesList.map(n => n.id || n.name));
          const connectedIds = new Set();
          edgesList.forEach(e => {
            connectedIds.add(e.from);
            connectedIds.add(e.to);
          });
          
          const orphans = nodesList.filter(n => !connectedIds.has(n.id || n.name));
          orphanCount = orphans.length;
          
          let computedDepth = 1;
          const parentMap = {};
          nodesList.forEach(n => {
            if (n.parentId || n.parent) {
              parentMap[n.id] = n.parentId || n.parent;
            }
          });
          
          if (Object.keys(parentMap).length > 0) {
            nodesList.forEach(n => {
              let d = 1;
              let current = n.id;
              while (parentMap[current]) {
                d++;
                current = parentMap[current];
                if (d > 20) break;
              }
              computedDepth = Math.max(computedDepth, d);
            });
            maxDepth = computedDepth;
          } else {
            maxDepth = Math.min(6, Math.max(2, Math.round(edgesList.length / (totalNodes || 1)) + 2));
          }
        }

        logs.push({ type: 'info', text: `Hierarchy audit: EKG model hierarchy depth is ${maxDepth} levels.` });
        if (maxDepth > 6) {
          logs.push({ type: 'error', text: `Critical hierarchy depth breach: ${maxDepth} levels exceeds o9 threshold of 5.` });
        } else if (maxDepth > 4) {
          logs.push({ type: 'warn', text: `Hierarchy depth: ${maxDepth} levels exceeds the recommended 4 levels.` });
        } else {
          logs.push({ type: 'success', text: `Hierarchy design: PASSED. Hierarchy is flat and performant.` });
        }

        if (orphanCount > 0) {
          logs.push({ type: 'error', text: `Detected ${orphanCount} orphan Product/Customer master data elements.` });
        } else {
          logs.push({ type: 'success', text: `Orphan scan: PASSED. 0 disconnected elements found.` });
        }

        if (maxDepth <= 4 && orphanCount === 0) {
          checkedIds = ['n1', 'n2', 'n3', 'n5', 'h1', 'h2', 'h3', 'h5', 'h6', 'm1', 'm2', 'm3', 'm4', 'm5', 'i1', 'i2', 'i3', 'i4', 'i6', 'p1', 'p3', 'p4', 'p5'];
        } else if (maxDepth <= 6 && orphanCount < 10) {
          checkedIds = ['n1', 'n3', 'h2', 'h3', 'h5', 'm1', 'm2', 'm4', 'i1', 'i2', 'i3', 'i5', 'p1', 'p3', 'p5'];
        } else {
          checkedIds = ['n1', 'n2', 'h3', 'm2', 'i1', 'i6'];
        }
      }

      logs.push({ type: 'success', text: `Parsing completed. Found ${totalNodes} total nodes, hierarchy depth ${maxDepth}, and ${orphanCount} orphans.` });
      
    } catch (err) {
      logs.push({ type: 'error', text: `Parsing failed: ${err.message}` });
      logs.push({ type: 'warn', text: 'Rolling back to simulated schema verification...' });
      return {
        success: false,
        checkedIds: PRESETS[2].checkedIds,
        logs: [
          ...logs,
          { type: 'info', text: 'Running simulation fallback...' },
          ...PRESETS[2].logs
        ]
      };
    }

    return {
      success: true,
      checkedIds,
      logs
    };
  };

  return (
    <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)', marginBottom: 28 }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Terminal size={20} color="var(--accent-blue)" /> o9 Model Config Parser Simulator
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
        Upload or select an o9 EKG Model XML/JSON configuration file. The diagnostic engine will scan entity classes, sourcing paths, hierarchy depths, and Graph Cube caching parameter structures.
      </p>

      {/* Select Preset Model */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
          Select EKG Configuration Preset
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedId(p.id);
                setCurrentLogs([]);
                setParsedName('');
              }}
              disabled={isParsing}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: `1px solid ${selectedId === p.id ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                background: selectedId === p.id ? 'var(--accent-blue-light)' : 'var(--bg-card)',
                color: selectedId === p.id ? 'var(--accent-blue-dark)' : 'var(--text-secondary)',
                transition: 'all 200ms ease',
                cursor: isParsing ? 'not-allowed' : 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop File Zone */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept=".json,.xml" 
        style={{ display: 'none' }} 
      />
      <div 
        onClick={handleZoneClick}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '28px 20px',
          textAlign: 'center',
          background: dragActive ? 'var(--accent-blue-light)' : 'var(--bg-input)',
          transition: 'all 200ms ease',
          marginBottom: 20,
          cursor: isParsing ? 'not-allowed' : 'pointer'
        }}
      >
        <Upload size={32} style={{ color: dragActive ? 'var(--accent-blue)' : 'var(--text-muted)', marginBottom: 10 }} />
        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          Drag and drop your EKG config file here (or click to browse)
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Supports .json or .xml schema file exports (or click to simulate parsing preset below)
        </span>
      </div>

      {/* Play/Execute Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <button
          className="btn btn-primary"
          onClick={() => runParser(activePreset)}
          disabled={isParsing}
          style={{ padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {isParsing ? <RefreshCw className="spinner" size={15} /> : <Play size={15} fill="white" />}
          {isParsing ? `Parsing ${parsedName}...` : 'Start Diagnostic Scan'}
        </button>
      </div>

      {/* Terminal Logging Panel */}
      <AnimatePresence>
        {(currentLogs.length > 0 || isParsing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="terminal-window"
          >
            <div className="terminal-header">
              <div className="terminal-dot red" />
              <div className="terminal-dot yellow" />
              <div className="terminal-dot green" />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                o9 model checker console - {parsedName || activePreset.name}
              </span>
            </div>
            <div className="terminal-body">
              {currentLogs.map((log, index) => (
                <div key={index} className={`terminal-line ${log.type}`}>
                  {log.type === 'error' && <span style={{ marginRight: 6 }}>✖</span>}
                  {log.type === 'warn' && <span style={{ marginRight: 6 }}>⚠</span>}
                  {log.type === 'success' && <span style={{ marginRight: 6 }}>✔</span>}
                  {log.type === 'info' && <span style={{ marginRight: 6 }}>➔</span>}
                  {log.text}
                </div>
              ))}
              {isParsing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem', paddingLeft: 18 }}>
                  <RefreshCw size={12} className="spinner" /> Analyzing structural nodes...
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
