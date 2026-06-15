import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCode, CheckCircle, Terminal, Play, AlertCircle, RefreshCw, Search, Code } from 'lucide-react';

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
    ],
    code: `{
  "model": "retail_chain_model_v3",
  "version": "1.2.0",
  "configuration": {
    "tenantSettings": {
      "maxIntersection": 35000,
      "AggregationCache": "ENABLED",
      "SparsityHandling": "ENABLED",
      "MemoryLimitGB": 8
    },
    "hierarchies": {
      "product": {
        "levels": ["Division", "Category", "SubCategory", "SKU"],
        "depth": 4,
        "alternativeHierarchies": ["commercial", "sales_hierarchy"]
      },
      "location": {
        "levels": ["Country", "DC", "Store"],
        "depth": 3
      },
      "time": {
        "horizons": ["weekly", "monthly", "quarterly"]
      }
    },
    "measures": [
      { "name": "Forecast_Volume", "type": "FACT", "stored": true, "erpSource": "SAP_Fact" },
      { "name": "Sourcing_Cost", "type": "FACT", "stored": true, "erpSource": "SAP_Fact" },
      { "name": "Active_Sourcing_Edge", "type": "DERIVED", "formula": "NONEMPTY" },
      { "name": "LeadTime_Offset", "type": "DERIVED", "lag": 7 }
    ],
    "nodes": [
      { "id": "sup-1", "name": "Material Supplier S", "type": "Supplier" },
      { "id": "plant-1", "name": "Manufacturing Plant 1", "type": "Location" },
      { "id": "dc-1", "name": "North DC", "type": "Location" },
      { "id": "sku-1", "name": "Electronics SKU 1", "type": "Product" }
    ],
    "edges": [
      { "from": "sup-1", "to": "plant-1", "type": "SourcingLane" },
      { "from": "plant-1", "to": "dc-1", "type": "PrimaryDistribution" },
      { "from": "sku-1", "to": "dc-1", "type": "Sourcing" }
    ]
  }
}`
  },
  {
    id: 'average',
    name: 'global_dist_config.xml',
    label: 'Global Distribution Network (Average)',
    checkedIds: ['n1', 'h2', 'h3', 'h5', 'm1', 'm2', 'm4', 'i1', 'i2', 'i3', 'i5', 'p1', 'p3', 'p5'],
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
    ],
    code: `<?xml version="1.0" encoding="UTF-8"?>
<EKGModel name="global_dist_config">
  <TenantSettings>
    <MaxIntersection>80000</MaxIntersection>
    <AggregationCache>PARTIAL</AggregationCache>
    <MemoryLimitGB>16</MemoryLimitGB>
  </TenantSettings>
  <Hierarchies>
    <Product depth="6">
      <Levels>Division, Brand, Family, SubFamily, Line, SKU</Levels>
      <AlternativeHierarchies>commercial, sales</AlternativeHierarchies>
    </Product>
    <Location depth="3">
      <Levels>Region, DC, Store</Levels>
    </Location>
    <Time>
      <Horizon>weekly, monthly</Horizon>
    </Time>
  </Hierarchies>
  <Measures>
    <Measure name="Sourcing_Cost" type="Fact" erpSource="StagingTable"/>
    <Measure name="Calculated_Cost" type="Derived" formula="MDX"/>
  </Measures>
  <Nodes>
    <Node id="sup-steel" type="Supplier" name="Steel Supplier"/>
    <Node id="plant-assem" type="Location" name="OEM Assembly Plant"/>
    <Node id="dc-east" type="Location" name="East Coast DC"/>
    <Node id="sku-carA" type="Product" name="SUV Model X"/>
    <Node id="customer-orphan-1" type="Customer" name="Orphan Customer A"/>
  </Nodes>
  <Edges>
    <Edge from="sup-steel" to="plant-assem" type="Sourcing"/>
    <Edge from="plant-assem" to="dc-east" type="Distribution"/>
  </Edges>
</EKGModel>`
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
    ],
    code: `{
  "model": "legacy_complex_model_2025",
  "configuration": {
    "tenantSettings": {
      "maxIntersection": 250000,
      "AggregationCache": "DISABLED",
      "SparsityHandling": "DISABLED"
    },
    "hierarchies": {
      "product": {
        "levels": ["Corp", "Division", "Brand", "SubBrand", "Family", "SubFamily", "Line", "SKU"],
        "depth": 8,
        "note": "1:1 ratio detected between Sub-Family and Sub-Brand"
      }
    },
    "nodes": [
      { "id": "sku-orphan-1", "type": "Product", "name": "Disconnected SKU A" },
      { "id": "sku-orphan-2", "type": "Product", "name": "Disconnected SKU B" }
    ],
    "edges": []
  }
}`
  }
];

export default function EKGConfigParser({ onParseComplete }) {
  const [selectedId, setSelectedId] = useState('healthy');
  const [isParsing, setIsParsing] = useState(false);
  const [currentLogs, setCurrentLogs] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [parsedName, setParsedName] = useState('');
  const [uploadedContent, setUploadedContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [parserTab, setParserTab] = useState('console'); // 'console' or 'viewer'

  const terminalEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const activePreset = PRESETS.find(p => p.id === selectedId);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLogs]);

  // Set default preset code on component load
  useEffect(() => {
    if (activePreset) {
      setUploadedContent(activePreset.code);
    }
  }, [selectedId]);

  const runParser = (preset) => {
    setIsParsing(true);
    setCurrentLogs([]);
    setParserTab('console');
    setParsedName(preset.name);
    setUploadedContent(preset.code);

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
    setParserTab('console');

    reader.onload = (e) => {
      const text = e.target.result;
      setUploadedContent(text);
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

  // ─── Content Heuristic Parser ──────────────────────────────────────────────
  const analyzeUploadedFile = (fileName, fileContent) => {
    const logs = [];
    logs.push({ type: 'info', text: `Initializing dynamic EKG content check: ${fileName}...` });
    
    let totalNodes = 0;
    let maxDepth = 1;
    let orphanCount = 0;
    let isXml = fileName.endsWith('.xml') || fileContent.trim().startsWith('<');
    
    try {
      if (isXml) {
        logs.push({ type: 'info', text: 'Detected XML schema. Parsing elements...' });
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, "text/xml");
        
        const parserError = xmlDoc.getElementsByTagName("parsererror");
        if (parserError.length > 0) {
          throw new Error("Invalid XML formatting.");
        }

        const allElements = xmlDoc.getElementsByTagName("*");
        totalNodes = allElements.length;

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
        let orphans = [];
        for (let el of allElements) {
          if (el.children.length === 0 && el.attributes.length === 0) {
            orphans.push(el.tagName);
          }
        }
        orphanCount = orphans.length;
      } else {
        logs.push({ type: 'info', text: 'Detected JSON schema. Evaluating configurations...' });
        const data = JSON.parse(fileContent);
        
        let nodesList = [];
        let edgesList = [];
        
        if (data.nodes && Array.isArray(data.nodes)) {
          nodesList = data.nodes;
          edgesList = data.edges || [];
        } else if (Array.isArray(data)) {
          nodesList = data;
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
        }

        if (nodesList.length > 0) {
          totalNodes = nodesList.length;
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
      }
    } catch (err) {
      logs.push({ type: 'error', text: `Structural parse error: ${err.message}` });
      logs.push({ type: 'warn', text: 'Falling back to raw text heuristic scanner...' });
    }

    const textLower = fileContent.toLowerCase();
    const matches = (kws) => kws.some(kw => textLower.includes(kw.toLowerCase()));
    const checkedIds = [];

    // --- Dynamic Heuristic Mapping ---
    
    // Node check n1 (Master Data Node Types)
    let nodeTypesFound = 0;
    if (matches(['product', 'sku', 'item'])) nodeTypesFound++;
    if (matches(['location', 'dc', 'warehouse', 'plant'])) nodeTypesFound++;
    if (matches(['customer', 'account'])) nodeTypesFound++;
    if (matches(['supplier', 'vendor'])) nodeTypesFound++;
    if (matches(['channel', 'resource', 'brand'])) nodeTypesFound++;
    if (nodeTypesFound >= 3) {
      checkedIds.push('n1');
      logs.push({ type: 'success', text: `Heuristics audit: Identified distinct master data node types.` });
    } else {
      logs.push({ type: 'warn', text: `Heuristics audit: Master data node types seem combined or insufficient (found ${nodeTypesFound}).` });
    }

    // Node check n2 (Naming Conventions)
    if (matches(['naming', 'convention', 'prefix', 'pattern', 'format', 'regex']) || /^[a-zA-Z0-9_\-]+$/m.test(fileContent)) {
      checkedIds.push('n2');
    }

    // Node check n3 (Business edges)
    if (matches(['bom', 'billofmaterial', 'sourcing', 'sourcing_lanes', 'sourcinglane', 'lane', 'route', 'shipment', 'distribution', 'replenish'])) {
      checkedIds.push('n3');
      logs.push({ type: 'success', text: `Heuristics audit: Business logic edges resolved.` });
    } else {
      logs.push({ type: 'warn', text: `Heuristics audit: Missing explicit Sourcing or BOM edges in graph configuration.` });
    }

    // Node check n4 (Orphans Check)
    if (orphanCount === 0) {
      checkedIds.push('n4');
    } else {
      logs.push({ type: 'error', text: `Heuristics audit: Detected ${orphanCount} orphan elements.` });
    }

    // Node check n5 (Cross-dimension validation rules)
    if (matches(['productlocation', 'sku_location', 'mapping_rule', 'validation']) || nodeTypesFound >= 3) {
      checkedIds.push('n5');
    }

    // Hierarchies
    if (maxDepth <= 5) {
      checkedIds.push('h1');
      logs.push({ type: 'success', text: `Heuristics audit: Product hierarchy depth (${maxDepth} levels) is optimal.` });
    } else {
      logs.push({ type: 'error', text: `Hierarchy depth of ${maxDepth} levels exceeds the recommended o9 limit of 5.` });
    }

    if (matches(['location', 'dc', 'warehouse', 'geography', 'region'])) {
      checkedIds.push('h2');
    }

    if (matches(['time', 'calendar', 'weekly', 'monthly', 'quarterly', 'horizon', 'bucket'])) {
      checkedIds.push('h3');
      logs.push({ type: 'success', text: `Heuristics audit: Time planning horizons resolved.` });
    }

    if (!matches(['redundant level', 'duplicate level', '1:1 ratio'])) {
      checkedIds.push('h4');
    } else {
      logs.push({ type: 'warn', text: `Heuristics audit: Redundant 1:1 level hierarchies detected.` });
    }

    if (matches(['alternative', 'commercial', 'sales_hierarchy', 'financial_hierarchy'])) {
      checkedIds.push('h5');
    }

    if (matches(['attribute', 'property', 'properties', 'tag', 'field'])) {
      checkedIds.push('h6');
    }

    // Measures
    if (matches(['fact', 'basemeasure', 'native', 'stored', 'rawdata', 'transaction', 'actuals'])) {
      checkedIds.push('m1');
    }
    if (matches(['derived', 'formula', 'calculated', 'mdx', 'expression', 'sum', 'avg', 'rollup'])) {
      checkedIds.push('m2');
      logs.push({ type: 'success', text: `Heuristics audit: Derived calculation formulas detected.` });
    }
    if (!matches(['duplicate measure', 'redundant measure'])) {
      checkedIds.push('m3');
    }
    if (matches(['dependency', 'dependson', 'precedent', 'calculatedmeasures', 'reference'])) {
      checkedIds.push('m4');
    }
    if (matches(['lag', 'lead', 'offset', 'previousperiod', 'nextperiod'])) {
      checkedIds.push('m5');
    }

    // Integration
    if (matches(['erp', 'sap', 'oracle', 'source', 'ingestion', 'mapping', 'staging', 'etl', 'erpsource'])) {
      checkedIds.push('i1');
    }
    if (matches(['refresh', 'frequency', 'daily', 'hourly', 'schedule', 'cron', 'nightly'])) {
      checkedIds.push('i2');
    }
    if (matches(['validation', 'constraint', 'rule', 'quality', 'mandatory', 'required'])) {
      checkedIds.push('i3');
    }
    if (matches(['retry', 'error', 'fallback', 'onfailure', 'maxattempts', 'failure'])) {
      checkedIds.push('i4');
    }
    if (matches(['retention', 'purge', 'archive', 'historylimit', 'cleanup'])) {
      checkedIds.push('i5');
    }
    if (matches(['batch', 'realtime', 'stream', 'kafka', 'api_load', 'message'])) {
      checkedIds.push('i6');
    }

    // Performance
    if (matches(['memory', 'memorylimit', 'ram', 'maxmemory', 'cachesize', 'heap'])) {
      checkedIds.push('p1');
    }
    if (matches(['traversal', 'index', 'indexed', 'graphscan', 'lookup'])) {
      checkedIds.push('p2');
    }
    if (matches(['sparse', 'sparsity', 'sparsityhandling', 'zerovalue', 'suppressnulls', 'hidenulls'])) {
      checkedIds.push('p3');
      logs.push({ type: 'success', text: `Heuristics audit: Sparse data null suppression enabled.` });
    }
    if (matches(['cache', 'caching', 'aggregationcache', 'precompute', 'cache_hit'])) {
      checkedIds.push('p4');
      logs.push({ type: 'success', text: `Heuristics audit: Aggregation caching enabled.` });
    } else {
      logs.push({ type: 'warn', text: `Heuristics audit: Aggregation pre-caching not explicitly declared.` });
    }
    if (matches(['parallel', 'threads', 'threadcount', 'multithreaded', 'concurrency', 'cores'])) {
      checkedIds.push('p5');
    }

    logs.push({ type: 'success', text: `Parsing completed. Matched ${checkedIds.length} of 27 EKG best-practice checkpoints.` });
    
    return {
      checkedIds,
      logs
    };
  };

  // Custom text highlight formatter
  const renderHighlightedContent = (text, query) => {
    if (!query || query.trim() === '') return text;
    
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="code-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)', marginBottom: 28 }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Terminal size={20} color="var(--accent-blue)" /> o9 Model Config Parser Studio
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
                setParserTab('console');
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

      {/* Parser Tab Selection Panel */}
      {(currentLogs.length > 0 || isParsing || uploadedContent) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
          <button
            onClick={() => setParserTab('console')}
            style={{
              padding: '6px 14px',
              fontSize: '0.75rem',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 700,
              background: parserTab === 'console' ? 'var(--accent-blue-light)' : 'transparent',
              border: parserTab === 'console' ? '1px solid var(--accent-blue)' : '1px solid transparent',
              color: parserTab === 'console' ? 'var(--accent-blue-dark)' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Terminal size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Diagnostic Output
          </button>
          <button
            onClick={() => setParserTab('viewer')}
            disabled={!uploadedContent}
            style={{
              padding: '6px 14px',
              fontSize: '0.75rem',
              borderRadius: 4,
              cursor: !uploadedContent ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              background: parserTab === 'viewer' ? 'var(--accent-blue-light)' : 'transparent',
              border: parserTab === 'viewer' ? '1px solid var(--accent-blue)' : '1px solid transparent',
              color: parserTab === 'viewer' ? 'var(--accent-blue-dark)' : 'var(--text-muted)',
              opacity: !uploadedContent ? 0.5 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            <Code size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Source Code Viewer {uploadedContent && `(${uploadedContent.split('\n').length} lines)`}
          </button>
        </div>
      )}

      {/* Terminal Logging Panel */}
      <AnimatePresence mode="wait">
        {parserTab === 'console' ? (
          (currentLogs.length > 0 || isParsing) && (
            <motion.div
              key="console-view"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
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
          )
        ) : (
          uploadedContent && (
            <motion.div
              key="viewer-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {/* Search Gutter */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Search Schema:</span>
                <input
                  type="text"
                  placeholder="Type to search and highlight keywords (e.g. Product, cache, stored)..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'white',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: '0.76rem',
                    outline: 'none',
                    color: 'var(--text-primary)'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Code Panel Display */}
              <div className="source-code-viewer-container">
                <div className="source-code-gutter">
                  {uploadedContent.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className="source-code-pre">
                  {renderHighlightedContent(uploadedContent, searchTerm)}
                </pre>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
