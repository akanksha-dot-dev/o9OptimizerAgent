import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, RefreshCw, Copy, Check, Terminal, Play, Cpu,
  HelpCircle, Layers, FileCode, AlertTriangle, ShieldCheck, ArrowRight,
  Undo2, Code2, AlertCircle, Info, Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Preset Prompts ──────────────────────────────────────────────────────────
const CHIPS = [
  { id: 'crossjoin', label: 'Fix a Cartesian crossjoin timeout', icon: '⚡' },
  { id: 'measures', label: 'Transient vs Stored Measures impact', icon: '📊' },
  { id: 'sparsity', label: 'How EKG Sparsity Caching works', icon: '💾' },
  { id: 'capacity', label: 'Best practices for Supply Capacity views', icon: '🏭' }
];

// ─── Chat Responses Dictionary ────────────────────────────────────────────────
const RESPONSES = {
  crossjoin: `### Fixing Cartesian Crossjoin Timeouts in o9

Evaluating a raw \`CROSSJOIN\` computes the full Cartesian cross-product of both dimensions. In large datasets (e.g., 5,000 Products × 200 Locations × 52 Weeks), this generates **52 million intersections**, which will trigger Graph Cube memory overflow and query timeouts.

#### The Anti-Pattern (Slow)
\`\`\`mdx
// Forces full Cartesian traversal over large dimensions
SELECT
  CROSSJOIN(
    DESCENDANTS([Product].[All_Products], 8, SELF),
    DESCENDANTS([Location].[All_Locations], 6, SELF)
  ) ON ROWS,
  {[Measures].[Forecast_Volume]} ON COLUMNS
FROM [EKG_Graph_Cube]
\`\`\`

#### The Optimized Solution (Fast)
\`\`\`mdx
// Constrain crossjoin to active product-location pairs using EKG edges
SELECT
  FILTER(
    NONEMPTY(
      CROSSJOIN(
        DESCENDANTS([Product].[All_Products], 4, SELF_AND_BEFORE),
        DESCENDANTS([Location].[All_Locations], 3, SELF_AND_BEFORE)
      ),
      [Measures].[Active_Sourcing_Edge]
    )
  ) ON ROWS,
  {[Measures].[Forecast_Volume]} ON COLUMNS
FROM [EKG_Graph_Cube]
\`\`\`

#### Key Takeaways:
1. **Reduce Traversal Depth**: Keep active hierarchy descendants level at \`<= 4\` on Product and \`<= 3\` on Location for interactive grids.
2. **Apply NONEMPTY Constraint**: Use an active relational measure edge (e.g., \`[Active_Sourcing_Edge]\`) inside a \`FILTER(NONEMPTY(...))\` wrapper. This reduces the query space from 52 million to just the **15,000 active sourcing links**, achieving a **30x speedup**!`,

  measures: `### Stored vs Transient Measures: Performance Telemetry

In the o9 platform, the choice of measure storage drastically affects query times, CPU thread utilization, and server RAM footprints.

| Feature / Metric | Stored Facts (ERP Inbound) | Derived EKG Rollups (Stored) | Transient Calculated Measures |
| :--- | :--- | :--- | :--- |
| **Execution Locality** | Direct memory scan | Pre-calculated at load time | Compiled dynamically at query run |
| **CPU Strain** | Negligible (sub-10ms) | Low (direct index fetch) | High (dynamic calculation thread lock) |
| **Memory Footprint** | Constant | Low (pre-aggregated) | High (dynamic cache structures) |
| **Scale Behavior** | Linear | Flat | Exponential with hierarchy depth |
| **Best Used For** | Actuals, Sales Orders, Forecasts | Margin rollups, BOM costs | Dynamic what-if scenarios |

#### The Recommendation:
Avoid nesting complex mathematical calculations (like \`[Revenue] * [Margin_Pct]\` evaluated recursively on parent members) dynamically inside report queries. Instead, configure pre-computed **Derived Measure Rollups** inside the EKG measure catalog. This pushes the aggregation load to the nightly ETL/data refresh phase, making report load times **instantaneous** for planners.`,

  sparsity: `### Enterprise Knowledge Graph: Sparsity Caching & Memory Gates

Supply chain data is inherently sparse: most products are not sold at most locations, and most suppliers only ship specific SKUs. If a report displays every possible combination, it wastes gigabytes of RAM rendering empty cells.

#### Sparsity Caching Mechanics:
1. **Zero-Suppression**: When Sparsity Handling is \`ENABLED\` in the EKG tenant settings, the Graph Cube does not allocate memory addresses for null/empty intersections.
2. **Aggregation Cache**: Enabling the Aggregation Cache stores intermediate rollups at sub-parent levels. Sub-sequent queries retrieve these pre-calculated values rather than traversing down to SKU levels.
3. **Query Optimization**: Placing \`NON EMPTY\` on your \`ROWS\` axis instructs the result serializer to skip empty blocks entirely, reducing the network payload by up to **85%**.

#### Best Practice Configuration:
Ensure your EKG Model XML/JSON configuration includes the following tenant settings:
\`\`\`json
"tenantSettings": {
  "maxIntersection": 50000,
  "AggregationCache": "ENABLED",
  "SparsityHandling": "ENABLED"
}
\`\`\``,

  capacity: `### Best Practices for Supply Capacity & Resource Reporting

Supply planning views require aggregating resource constraints (Production capacity, machine uptime, labor shifts) across plant locations. Below are the design rules for optimal responsiveness:

1. **Avoid Dynamic Property Filters**: Do not filter resources on-the-fly using strings, such as \`.Properties("Lead_Time") > 14\`. This forces a sequential, single-threaded text scan across every node in the Graph.
2. **Leverage Pre-Indexed Attributes**: Create a pre-indexed dimension hierarchy (e.g., \`[Lead_Time_Indexed]\`) in the EKG model, and query the member directly:
   \`\`\`mdx
   SELECT
     [Sourcing_Lanes].[Lead_Time_Indexed].[Long_Lead_Time] ON ROWS,
     {[Measures].[Capacity_Uptime]} ON COLUMNS
   FROM [EKG_Graph_Cube]
   \`\`\`
3. **Hide Null Rows**: Always toggle \`nullRowsVisible: false\` in the grid view parameters. This prevents the grid simulator from rendering idle production lines that have no capacity allocated in the current planning horizon.`
};

const DEFAULT_BOT_REPLY = `I am your o9 Solutions AI Copilot. I can help you write, refactor, and analyze optimized o9 MDX scripts and EKG schema configurations.

Try asking about:
- **"How to fix Cartesian crossjoins"**
- **"Performance of Transient vs Stored measures"**
- **"How to configure EKG Sparsity Caching"**
- **"Best practices for Supply Capacity grids"**

Feel free to click one of the quick prompt chips or paste your query in the **MDX Refactoring** tab to begin!`;

// ─── Preset Refactoring Queries ──────────────────────────────────────────────
const REFACTOR_PRESETS = [
  {
    name: 'Cartesian Crossjoin Timeout',
    subOptimal: `SELECT
  CROSSJOIN(
    DESCENDANTS([Product].[All_Products], 8, SELF),
    DESCENDANTS([Location].[All_Locations], 6, SELF)
  ) ON ROWS,
  {[Measures].[Forecast_Volume]} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[2026]`,
    optimized: `SELECT
  FILTER(
    NONEMPTY(
      CROSSJOIN(
        DESCENDANTS([Product].[All_Products], 4, SELF_AND_BEFORE),
        DESCENDANTS([Location].[All_Locations], 3, SELF_AND_BEFORE)
      ),
      [Measures].[Active_Sourcing_Edge]
    )
  ) ON ROWS,
  {[Measures].[Forecast_Volume]} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[2026]`,
    rules: [
      'Replaced raw Cartesian crossjoin with a FILTER(NONEMPTY(...)) wrapper.',
      'Reduced Product hierarchy traversal depth from 8 levels (SKU grain) to 4 levels.',
      'Reduced Location hierarchy traversal depth from 6 levels to 3 levels.',
      'Constrained query space using the active [Active_Sourcing_Edge] relation, reducing intersections from 450k to 12k.'
    ]
  },
  {
    name: 'Dynamic Property Full-Scan',
    subOptimal: `SELECT
  FILTER(
    [Sourcing_Lanes].Members,
    [Sourcing_Lanes].CurrentMember.Properties("Lead_Time") > 14
  ) ON ROWS,
  {[Measures].[Sourcing_Cost]} ON COLUMNS
FROM [EKG_Graph_Cube]`,
    optimized: `SELECT
  [Sourcing_Lanes].[Lead_Time_Indexed].[Long_Lead_Time] ON ROWS,
  {[Measures].[Sourcing_Cost]} ON COLUMNS
FROM [EKG_Graph_Cube]`,
    rules: [
      'Eliminated dynamic .Properties() string evaluation at runtime.',
      'Replaced sequential node-by-node scanning with a direct index read.',
      'Referenced the pre-indexed EKG dimension member [Lead_Time_Indexed].[Long_Lead_Time] for sub-5ms lookup.'
    ]
  },
  {
    name: 'Recursive Margin Aggregations',
    subOptimal: `SELECT
  [Product].[Category].Members ON ROWS,
  {
    [Measures].[Revenue],
    AGGREGATE(
      [Product].CurrentMember.Children,
      [Measures].[Revenue] * [Measures].[Margin_Pct]
    )
  } ON COLUMNS
FROM [EKG_Graph_Cube]`,
    optimized: `SELECT
  [Product].[Category].Members ON ROWS,
  {
    [Measures].[Revenue],
    [Measures].[Margin_Revenue_Rollup]
  } ON COLUMNS
FROM [EKG_Graph_Cube]`,
    rules: [
      'Removed dynamic children multiplication loop (Revenue * Margin_Pct) evaluated recursively.',
      'Replaced dynamic math aggregations with a direct read of the pre-computed EKG measure [Margin_Revenue_Rollup].',
      'Leveraged EKG nightly incremental rollups to bypass planner thread lock.'
    ]
  }
];

export default function CopilotPage() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'generator', 'refactor'
  const navigate = useNavigate();

  // ─── Chat Tab States ───────────────────────────────────────────────────────
  const [messages, setMessages] = useState([
    { id: '1', sender: 'agent', text: DEFAULT_BOT_REPLY, isBot: true, timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    const userMsg = { id: 'user_' + Date.now(), sender: 'user', text, isBot: false, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let replyText = '';
      const textLower = text.toLowerCase();

      // Keyword matching
      if (textLower.includes('crossjoin') || textLower.includes('cartesian') || textLower.includes('timeout')) {
        replyText = RESPONSES.crossjoin;
      } else if (textLower.includes('measure') || textLower.includes('transient') || textLower.includes('stored') || textLower.includes('derived')) {
        replyText = RESPONSES.measures;
      } else if (textLower.includes('sparsity') || textLower.includes('caching') || textLower.includes('null') || textLower.includes('cache')) {
        replyText = RESPONSES.sparsity;
      } else if (textLower.includes('capacity') || textLower.includes('supply') || textLower.includes('resource') || textLower.includes('plant')) {
        replyText = RESPONSES.capacity;
      } else {
        // Dynamic generic response
        replyText = `### o9 Optimization Insights: General Query Architecture

Thanks for reaching out! Based on your query regarding **"${text}"**, here are some core o9 Solutions optimization principles to consider:

1. **Avoid Cartesian Space Traversals**: Always use \`NONEMPTY\` crossjoins coupled with relational business edges in the EKG model to limit active grid sizes.
2. **Dimension Caching**: Pre-calculate derived mathematical values as stored facts or pre-aggregated rollups in the EKG measure catalog, preventing dynamic math operations at runtime.
3. **Limit Hierarchy Traversal Depths**: PLanners rarely need to view all 8+ levels of master data at once. Limit initial report loads to level \`<= 4\` and implement drill-downs.

Would you like me to write an optimized MDX script for a specific report structure? You can configure it using the **MDX Code Generator** tab above!`;
      }

      const botMsg = { id: 'bot_' + Date.now(), sender: 'agent', text: replyText, isBot: true, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  // ─── Code Generator States ─────────────────────────────────────────────────
  const [templateType, setTemplateType] = useState('demand');
  const [hierarchyDepth, setHierarchyDepth] = useState('4');
  const [measuresMode, setMeasuresMode] = useState('stored');
  const [useSparsity, setUseSparsity] = useState(true);
  const [useNamedSets, setUseNamedSets] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copiedGenerator, setCopiedGenerator] = useState(false);

  const handleGenerateScript = () => {
    setIsCompiling(true);
    setGeneratedCode('');

    setTimeout(() => {
      const rowPrefix = useSparsity ? 'NON EMPTY ' : '';
      const productSet = useNamedSets 
        ? `[Product].[NamedSets].[Active_SKUs_Set]` 
        : `DESCENDANTS([Product].[All_Products], ${hierarchyDepth}, SELF_AND_BEFORE)`;
      
      const locationSet = `DESCENDANTS([Location].[All_Locations], 3, SELF_AND_BEFORE)`;

      let queryMeasures = '';
      if (measuresMode === 'stored') {
        queryMeasures = `{[Measures].[Forecast_Volume], [Measures].[Sourcing_Cost]}`;
      } else if (measuresMode === 'derived') {
        queryMeasures = `{[Measures].[Forecast_Volume], [Measures].[Sourcing_Cost], [Measures].[Margin_Revenue_Rollup]}`;
      } else {
        queryMeasures = `{[Measures].[Forecast_Volume], [Measures].[Sourcing_Cost], [Measures].[Margin_Pct], [Measures].[Transient_Calculated_Cost]}`;
      }

      let mdx = '';
      if (templateType === 'demand') {
        mdx = `// Optimized Demand Planning Grid Query
// Compiled on: ${new Date().toLocaleDateString()} by o9 AI Copilot
SELECT
  ${rowPrefix}FILTER(
    NONEMPTY(
      CROSSJOIN(
        ${productSet},
        ${locationSet}
      ),
      [Measures].[Forecast_Volume]
    ),
    [Measures].[Forecast_Volume] > 0
  ) ON ROWS,
  ${queryMeasures} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[Current_Year_Horizon]`;
      } else if (templateType === 'supply') {
        mdx = `// Optimized S&OP Supply Sourcing Constraints
// Compiled on: ${new Date().toLocaleDateString()} by o9 AI Copilot
SELECT
  ${rowPrefix}FILTER(
    NONEMPTY(
      CROSSJOIN(
        [Supplier].[Suppliers].Members,
        ${productSet}
      ),
      [Measures].[Active_Sourcing_Edge]
    ),
    [Measures].[Sourcing_Cost] > 0
  ) ON ROWS,
  {[Measures].[Sourcing_Cost], [Measures].[Supplier_LeadTime_Indexed]} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[Current_Month_Bucket]`;
      } else if (templateType === 'inventory') {
        mdx = `// Optimized Safety Stock Rollup Grid
// Compiled on: ${new Date().toLocaleDateString()} by o9 AI Copilot
SELECT
  ${rowPrefix}NONEMPTY(
    CROSSJOIN(
      ${productSet},
      [Location].[DCs].Members
    ),
    [Measures].[Safety_Stock_Rollup]
  ) ON ROWS,
  {[Measures].[Safety_Stock_Rollup], [Measures].[Inventory_Turns_Stored]} ON COLUMNS
FROM [EKG_Graph_Cube]`;
      } else {
        mdx = `// Optimized KPI Dashboard Rollup View
// Compiled on: ${new Date().toLocaleDateString()} by o9 AI Copilot
SELECT
  ${rowPrefix}{[Product].[All_Products], [Location].[All_Locations]} ON ROWS,
  {[Measures].[Forecast_Volume], [Measures].[Sourcing_Cost], [Measures].[Margin_Revenue_Rollup]} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[Last_Closed_Period]`;
      }

      setGeneratedCode(mdx);
      setIsCompiling(false);
    }, 1200);
  };

  const handleCopyGeneratorCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopiedGenerator(true);
      setTimeout(() => setCopiedGenerator(false), 2000);
    });
  };

  const handleSendToProfiler = (codeToSend) => {
    const code = codeToSend || generatedCode;
    if (!code) return;

    // Deep integration: set overriding query in localStorage and navigate
    try {
      window.localStorage.setItem('o9_profiler_override_query', code);
      // Toast message will be shown on the destination
      navigate('/analyzer?tab=profiler');
    } catch (e) {
      console.error('Failed to set override query', e);
    }
  };

  // ─── Refactoring Tab States ───────────────────────────────────────────────
  const [rawText, setRawText] = useState(REFACTOR_PRESETS[0].subOptimal);
  const [refactoredCode, setRefactoredCode] = useState('');
  const [refactoredRules, setRefactoredRules] = useState([]);
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [copiedRefactor, setCopiedRefactor] = useState(false);

  const loadRefactorPreset = (preset) => {
    setRawText(preset.subOptimal);
    setRefactoredCode('');
    setRefactoredRules([]);
  };

  const handleRefactor = () => {
    setIsRefactoring(true);
    setRefactoredCode('');
    setRefactoredRules([]);

    setTimeout(() => {
      // Find matching preset or generate dynamic refactoring
      const match = REFACTOR_PRESETS.find(p => p.subOptimal.trim() === rawText.trim());
      
      if (match) {
        setRefactoredCode(match.optimized);
        setRefactoredRules(match.rules);
      } else {
        // Simple heuristic refactor
        let opt = rawText;
        const rules = [];

        if (opt.toUpperCase().includes('CROSSJOIN') && !opt.toUpperCase().includes('NONEMPTY')) {
          opt = opt.replace(
            /CROSSJOIN\s*\(\s*DESCENDANTS\s*\(\s*\[Product\]\.\[All_Products\],\s*(\d+),\s*SELF\s*\),\s*DESCENDANTS\s*\(\s*\[Location\]\.\[All_Locations\],\s*(\d+),\s*SELF\s*\)\s*\)/gi,
            `FILTER(
    NONEMPTY(
      CROSSJOIN(
        DESCENDANTS([Product].[All_Products], 4, SELF_AND_BEFORE),
        DESCENDANTS([Location].[All_Locations], 3, SELF_AND_BEFORE)
      ),
      [Measures].[Active_Sourcing_Edge]
    )
  )`
          );
          rules.push('Detected unconstrained CROSSJOIN. Wrapped in a FILTER(NONEMPTY(...)) using active sourcing edge.');
          rules.push('Pushed hierarchy depth down to optimal parameters (Product depth 4, Location depth 3).');
        }

        if (opt.match(/\.Properties\s*\(\s*['"][^'"]+['"]\s*\)/gi)) {
          opt = opt.replace(
            /FILTER\s*\(\s*\[Sourcing_Lanes\]\.Members,\s*\[Sourcing_Lanes\]\.CurrentMember\.Properties\("Lead_Time"\)\s*>\s*\d+\s*\)/gi,
            `[Sourcing_Lanes].[Lead_Time_Indexed].[Long_Lead_Time]`
          );
          rules.push('Replaced runtime dynamic .Properties() check with a pre-indexed dimension lookup ([Lead_Time_Indexed]).');
        }

        if (opt.toUpperCase().includes('AGGREGATE') && opt.toUpperCase().includes('CHILDREN')) {
          opt = opt.replace(
            /AGGREGATE\s*\(\s*\[Product\]\.CurrentMember\.Children,\s*\[Measures\]\.\[Revenue\]\s*\*\s*\[Measures\]\.\[Margin_Pct\]\s*\)/gi,
            `[Measures].[Margin_Revenue_Rollup]`
          );
          rules.push('Substituted recursive child math aggregates with direct pre-computed Derived Measure [Margin_Revenue_Rollup].');
        }

        if (rules.length === 0) {
          // General improvement fallback
          opt = `// Optimized Query
${rawText.replace(/SELECT/gi, 'SELECT NON EMPTY')}`;
          rules.push('Applied default NON EMPTY row suppression to prune sparse grid sizes.');
        }

        setRefactoredCode(opt);
        setRefactoredRules(rules);
      }
      setIsRefactoring(false);
    }, 1500);
  };

  const handleCopyRefactorCode = () => {
    if (!refactoredCode) return;
    navigator.clipboard.writeText(refactoredCode).then(() => {
      setCopiedRefactor(true);
      setTimeout(() => setCopiedRefactor(false), 2000);
    });
  };

  // Helper: check if text block is code
  const renderMessageText = (text) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const lines = part.replace(/```(mdx|json|javascript)?\n?/g, '').replace(/```$/g, '').trim().split('\n');
        const codeString = lines.join('\n');
        
        return (
          <div key={index} className="copilot-code-block">
            <div className="copilot-code-header">
              <span>o9 Script (MDX)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => {
                  navigator.clipboard.writeText(codeString);
                  alert('Code copied to clipboard');
                }}>
                  <Copy size={11} /> Copy
                </button>
                <button type="button" onClick={() => handleSendToProfiler(codeString)} style={{ color: 'var(--accent-blue)' }}>
                  <Play size={11} /> Profile Query
                </button>
              </div>
            </div>
            <pre className="copilot-code-pre">
              <code>{codeString}</code>
            </pre>
          </div>
        );
      } else {
        // Basic markdown formatting helper
        const formatted = part.split('\n').map((line, lIdx) => {
          if (line.startsWith('### ')) {
            return <h4 key={lIdx} style={{ fontSize: '0.95rem', fontWeight: 700, margin: '14px 0 6px', color: 'var(--text-primary)' }}>{line.replace('### ', '')}</h4>;
          }
          if (line.startsWith('#### ')) {
            return <h5 key={lIdx} style={{ fontSize: '0.86rem', fontWeight: 700, margin: '10px 0 4px', color: 'var(--accent-blue-dark)' }}>{line.replace('#### ', '')}</h5>;
          }
          if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
            return <li key={lIdx} style={{ marginLeft: 16, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{line.substring(3)}</li>;
          }
          if (line.startsWith('- ')) {
            return <li key={lIdx} style={{ marginLeft: 16, fontSize: '0.86rem', color: 'var(--text-secondary)', listStyleType: 'disc' }}>{line.replace('- ', '')}</li>;
          }
          if (line.startsWith('|')) {
            // Render table lines nicely if they contain values
            if (line.includes('---')) return null;
            const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
            return (
              <div key={lIdx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 8, padding: '4px 8px', fontSize: '0.76rem', borderBottom: '1px solid var(--border-subtle)', background: lIdx % 2 === 0 ? 'var(--bg-input)' : 'transparent', fontWeight: line.includes('Feature') ? 700 : 500 }}>
                {cells.map((cell, cIdx) => <span key={cIdx}>{cell}</span>)}
              </div>
            );
          }
          return <p key={lIdx} style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.6 }}>{line}</p>;
        });
        return <div key={index}>{formatted}</div>;
      }
    });
  };

  return (
    <div className="section" style={{ background: 'white', minHeight: '80vh' }}>
      <div className="page-wrapper" style={{ maxWidth: 1120 }}>
        {/* Header */}
        <div className="section-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 99, background: 'var(--accent-blue-light)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: 12 }}>
            <Sparkles size={14} color="var(--accent-blue)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Optimization suite</span>
          </div>
          <h2>o9 Solutions AI Copilot & MDX Consultant</h2>
          <p>
            Co-pilot your o9 Solutions configuration. Generate commented, high-performance MDX query scripts, refactor bottlenecks, and consult EKG best practices.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="tabs" style={{ maxWidth: 640, margin: '0 auto 32px', display: 'flex', justifyContent: 'center' }}>
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            style={{ flex: 1, padding: '12px 0', fontSize: '0.88rem' }}
          >
            AI Consultant Chat
          </button>
          <button
            className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('generator')}
            style={{ flex: 1, padding: '12px 0', fontSize: '0.88rem' }}
          >
            MDX Script Generator
          </button>
          <button
            className={`tab-btn ${activeTab === 'refactor' ? 'active' : ''}`}
            onClick={() => setActiveTab('refactor')}
            style={{ flex: 1, padding: '12px 0', fontSize: '0.88rem' }}
          >
            Side-by-Side Refactoring
          </button>
        </div>

        {/* Page Grid Wrapper */}
        <div className="copilot-grid">
          
          {/* Left Gutter: context & prompt chips */}
          <div className="copilot-sidebar">
            <h4 style={{ fontSize: '0.84rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
              Optimization Rules Quick-Chips
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Click a chip to immediately instruct the AI consultant to explain or refactor specific EKG configuration bottlenecks.
            </p>
            
            <div className="prompt-chips-container">
              {CHIPS.map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setActiveTab('chat');
                    handleSendMessage(chip.label);
                  }}
                  className="prompt-chip"
                >
                  <span style={{ marginRight: 6 }}>{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '10px 0' }} />

            <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <h5 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Info size={12} color="var(--accent-blue)" /> Core EKG Guideline
              </h5>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Always resolve derived calculations in stored rollups before pushing scripts to production. Transient math calculated dynamically on parent levels scales exponentially, resulting in user grid lag.
              </p>
            </div>
          </div>

          {/* Right Column: Active Tab Content */}
          <div className="copilot-main">
            
            {/* Tab 1: AI Consultant Chat */}
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="chat-messages">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
                      <div className={`chat-avatar ${msg.sender} ${msg.isBot ? 'pulse-avatar-glow' : ''}`}>
                        {msg.isBot ? 'o9' : 'U'}
                      </div>
                      <div className="chat-bubble">
                        {renderMessageText(msg.text)}
                        <span style={{ display: 'block', fontSize: '0.64rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 6 }}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="chat-bubble-wrapper agent">
                      <div className="chat-avatar agent pulse-avatar-glow">o9</div>
                      <div className="chat-bubble" style={{ padding: '10px 14px' }}>
                        <div className="typing-indicator">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="chat-input-area">
                  <input
                    type="text"
                    placeholder="Ask AI Copilot about o9 scripts, EKG bottlenecks, or sparsity..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="chat-input-field"
                    disabled={isTyping}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    className="btn btn-primary"
                    disabled={isTyping || !inputText.trim()}
                    style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: MDX Script Generator */}
            {activeTab === 'generator' && (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Parameter-Driven o9 MDX Compiler
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Specify your grid parameters below. The optimization compiler will construct a fully commented, high-performance query script tailored for your EKG schema structure.
                  </p>
                </div>

                {/* Parameters Form */}
                <div className="parameter-grid">
                  <div className="form-group">
                    <label>Report View Template</label>
                    <select
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value)}
                    >
                      <option value="demand">Demand Forecast Grid</option>
                      <option value="supply">S&OP Supply capacity</option>
                      <option value="inventory">Inventory Safety Stock Rollup</option>
                      <option value="dashboard">Dashboard KPI Rollups</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Hierarchy Depth Constraint</label>
                    <select
                      value={hierarchyDepth}
                      onChange={(e) => setHierarchyDepth(e.target.value)}
                    >
                      <option value="2">2 Levels (Division / Region)</option>
                      <option value="3">3 Levels (Brand / DC)</option>
                      <option value="4">4 Levels (SubCategory - Recommended)</option>
                      <option value="5">5 Levels (Product Line)</option>
                      <option value="6">6 Levels (SKU Grain - Warning)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Measures Aggregation Mode</label>
                    <select
                      value={measuresMode}
                      onChange={(e) => setMeasuresMode(e.target.value)}
                    >
                      <option value="stored">Stored Facts Only (Highly Optimized)</option>
                      <option value="derived">Derived EKG Rollups (Stored)</option>
                      <option value="transient">Transient Calculated Measures (Heavy)</option>
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', background: 'var(--bg-primary)', padding: '14px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useSparsity}
                      onChange={(e) => setUseSparsity(e.target.checked)}
                      style={{ accentColor: 'var(--accent-blue)' }}
                    />
                    Sparsity Null Suppression (NON EMPTY)
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useNamedSets}
                      onChange={(e) => setUseNamedSets(e.target.checked)}
                      style={{ accentColor: 'var(--accent-blue)' }}
                    />
                    Pre-Indexed Named Sets ([Product].[NamedSets])
                  </label>
                </div>

                {/* Warnings based on configurations */}
                {parseInt(hierarchyDepth) >= 5 && (
                  <div style={{ display: 'flex', gap: 10, background: 'var(--accent-rose-light)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244,63,94,0.15)' }}>
                    <AlertTriangle size={16} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 500 }}>
                      <strong>Performance Warning:</strong> Querying descendants at depth {hierarchyDepth} on large dimensions can result in long Graph Cube traverse times. We recommend pre-indexing active nodes or restricting the query using Named Sets.
                    </span>
                  </div>
                )}

                {measuresMode === 'transient' && (
                  <div style={{ display: 'flex', gap: 10, background: 'var(--accent-amber-light)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <AlertCircle size={16} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 500 }}>
                      <strong>Aggregation Overhead:</strong> Transient Calculated Measures force dynamic single-threaded math aggregation at query time. For production views, consider pushing these metrics into stored derived measures in the EKG catalog.
                    </span>
                  </div>
                )}

                {/* Compile Button */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={handleGenerateScript}
                    disabled={isCompiling}
                    className="btn btn-primary"
                    style={{ padding: '12px 32px', minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {isCompiling ? <RefreshCw className="spinner" size={16} /> : <Cpu size={16} />}
                    {isCompiling ? 'Compiling Script...' : 'Generate o9 Script'}
                  </button>
                </div>

                {/* Code display panel */}
                <AnimatePresence>
                  {generatedCode && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div className="copilot-code-block" style={{ margin: 0 }}>
                        <div className="copilot-code-header">
                          <span>o9 Script Compiler Output</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleCopyGeneratorCode}>
                              {copiedGenerator ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
                              {copiedGenerator ? 'Copied!' : 'Copy Query'}
                            </button>
                            <button onClick={() => handleSendToProfiler(generatedCode)} style={{ color: 'var(--accent-blue)' }}>
                              <Play size={12} /> Send to Query Profiler
                            </button>
                          </div>
                        </div>
                        <pre className="copilot-code-pre" style={{ height: 260 }}>
                          <code>{generatedCode}</code>
                        </pre>
                      </div>

                      {/* Compiler Insights */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', padding: 14, borderRadius: 'var(--radius-sm)', display: 'flex', gap: 10 }}>
                          <ShieldCheck size={16} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>Optimization Features Baked In:</span>
                            <ul style={{ paddingLeft: 14, listStyle: 'disc', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {useSparsity && <li>Zero-suppressed ROWS axis reduces serialization weight.</li>}
                              {useNamedSets && <li>Pre-indexed Named Sets bypass dynamic crossjoins.</li>}
                              {measuresMode !== 'transient' && <li>Direct index read measures ensure sub-10ms query times.</li>}
                              <li>Bounded descendants depth prevents Graph Cube traverse spikes.</li>
                            </ul>
                          </div>
                        </div>

                        <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', padding: 14, borderRadius: 'var(--radius-sm)', display: 'flex', gap: 10 }}>
                          <Cpu size={16} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue-dark)' }}>Planner Telemetry Predictions:</span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px 16px', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                              <span>Est. Query Duration:</span>
                              <strong style={{ fontFamily: 'var(--font-mono)' }}>12 - 28 ms</strong>
                              <span>Est. RAM overhead:</span>
                              <strong style={{ fontFamily: 'var(--font-mono)' }}>~14.5 MB</strong>
                              <span>Sparsity Ratio:</span>
                              <strong style={{ fontFamily: 'var(--font-mono)' }}>99.2% (Suppressed)</strong>
                              <span>Execution Path:</span>
                              <strong style={{ color: 'var(--accent-emerald)' }}>HIGH-SPEED INDEX HIT</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Tab 3: MDX Script Refactoring */}
            {activeTab === 'refactor' && (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    MDX Refactoring & Bottleneck Rectifier
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Paste a slow, Cartesian, or unoptimized o9 MDX script query below. The refactor engine will identify bottlenecks and rewrite it into a pre-indexed EKG compliant query.
                  </p>
                </div>

                {/* Presets load bar */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Load Preset Demo:</span>
                  {REFACTOR_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadRefactorPreset(p)}
                      disabled={isRefactoring}
                      style={{
                        padding: '5px 12px', fontSize: '0.74rem', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
                        background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                        transition: 'all 150ms ease'
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {/* Input / Output Panels */}
                <div className="refactor-container">
                  {/* Left panel: Input */}
                  <div className="refactor-panel">
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Unoptimized o9 Script
                    </label>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      className="refactor-textarea"
                      placeholder="Paste your o9 MDX query here..."
                      disabled={isRefactoring}
                    />
                  </div>

                  {/* Right panel: Output */}
                  <div className="refactor-panel">
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Optimized Refactored Output
                    </label>
                    <div className="refactor-code-display">
                      {isRefactoring ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <RefreshCw className="spinner" size={20} />
                          Analyzing AST & EKG indexes...
                        </div>
                      ) : refactoredCode ? (
                        refactoredCode.split('\n').map((line, i) => {
                          let type = 'unchanged';
                          if (line.includes('FILTER(') || line.includes('NONEMPTY(') || line.includes('Active_Sourcing_Edge') || line.includes('Lead_Time_Indexed') || line.includes('Margin_Revenue_Rollup')) {
                            type = 'added';
                          } else if (line.includes('CROSSJOIN(') && !line.includes('NONEMPTY')) {
                            type = 'removed';
                          }
                          return (
                            <div key={i} className={`diff-line ${type}`}>
                              <span className="diff-line-num">{i + 1}</span>
                              <span className="diff-line-content">{line}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Click "Refactor and Optimize" to view results
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRefactor}
                    disabled={isRefactoring || !rawText.trim()}
                    className="btn btn-primary"
                    style={{ padding: '12px 32px', minWidth: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {isRefactoring ? <RefreshCw className="spinner" size={16} /> : <Code2 size={16} />}
                    {isRefactoring ? 'Analyzing Query...' : 'Refactor and Optimize'}
                  </button>
                  {refactoredCode && (
                    <>
                      <button
                        onClick={handleCopyRefactorCode}
                        className="btn btn-secondary"
                        style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {copiedRefactor ? <Check size={14} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={14} />}
                        {copiedRefactor ? 'Copied!' : 'Copy Code'}
                      </button>
                      <button
                        onClick={() => handleSendToProfiler(refactoredCode)}
                        className="btn btn-secondary"
                        style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Play size={14} /> Send to Profiler
                      </button>
                    </>
                  )}
                </div>

                {/* Rules Explanatory List */}
                <AnimatePresence>
                  {refactoredRules.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 20 }}
                    >
                      <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Refactoring Rules Applied
                      </h4>
                      <ul style={{ paddingLeft: 14, listStyle: 'decimal', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {refactoredRules.map((rule, idx) => (
                          <li key={idx} style={{ lineHeight: 1.5 }}>{rule}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
