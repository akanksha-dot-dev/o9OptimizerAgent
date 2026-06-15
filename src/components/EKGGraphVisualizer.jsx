import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, AlertTriangle, Info, Eye, CheckCircle2, Plus, Trash2,
  RefreshCw, FileCode, Check, Copy, Sliders, PlayCircle, Settings, Download,
  Play, Pause, Activity
} from 'lucide-react';

// Archetypes Preset Data
const ARCHETYPES = {
  default: {
    name: 'Standard EKG Layout',
    nodes: [
      { id: 'sup-1', name: 'Material Supplier S', type: 'Supplier', x: 25, y: 15, color: '#f59e0b', details: { leadTime: '14 days', reliability: '98%', status: 'Active' } },
      { id: 'res-1', name: 'Production Line A', type: 'Resource', x: 75, y: 15, color: '#8b5cf6', details: { capacity: '500 units/day', utilization: '94%', shiftType: 'Double Shift' } },
      { id: 'plant-1', name: 'Manufacturing Plant 1', type: 'Location', x: 50, y: 35, color: '#3b82f6', details: { region: 'North America', type: 'Factory', storageCapacity: '50,000 units' } },
      { id: 'dc-1', name: 'North DC (Bottleneck)', type: 'Location', x: 30, y: 65, color: '#ef4444', details: { region: 'North', type: 'Distribution Center', backlog: '25%' } },
      { id: 'dc-2', name: 'South DC', type: 'Location', x: 70, y: 65, color: '#3b82f6', details: { region: 'South', type: 'Distribution Center', backlog: '2%' } },
      { id: 'sku-1', name: 'Electronics SKU 1', type: 'Product', x: 20, y: 90, color: '#10b981', details: { unitCost: '$120', margin: '35%', abcSegment: 'A' } },
      { id: 'sku-2', name: 'Apparel SKU 2', type: 'Product', x: 50, y: 90, color: '#10b981', details: { unitCost: '$45', margin: '50%', abcSegment: 'B' } },
      { id: 'sku-orphan', name: 'Orphan Legacy SKU', type: 'Product', x: 88, y: 90, color: '#ef4444', details: { unitCost: '$15', margin: '10%', abcSegment: 'C' } }
    ],
    edges: [
      { from: 'sup-1', to: 'plant-1', label: 'Raw Material Delivery' },
      { from: 'res-1', to: 'plant-1', label: 'Capacity allocation' },
      { from: 'plant-1', to: 'dc-1', label: 'Primary Distribution' },
      { from: 'plant-1', to: 'dc-2', label: 'Primary Distribution' },
      { from: 'sku-1', to: 'dc-1', label: 'Sourcing mapping' },
      { from: 'sku-2', to: 'dc-2', label: 'Sourcing mapping' }
    ]
  },
  automotive: {
    name: 'Automotive Tier-1 Supply Chain',
    nodes: [
      { id: 'sup-steel', name: 'Steel Supplier', type: 'Supplier', x: 20, y: 15, color: '#f59e0b', details: { leadTime: '10 days', reliability: '99%', status: 'Primary' } },
      { id: 'sup-elec', name: 'Electronics Supplier', type: 'Supplier', x: 50, y: 15, color: '#f59e0b', details: { leadTime: '35 days', reliability: '91%', status: 'Secondary' } },
      { id: 'sup-rubber', name: 'Rubber Supplier', type: 'Supplier', x: 80, y: 15, color: '#f59e0b', details: { leadTime: '15 days', reliability: '95%', status: 'Primary' } },
      { id: 'plant-assem', name: 'OEM Assembly Plant', type: 'Resource', x: 50, y: 45, color: '#8b5cf6', details: { utilization: '88%', shiftType: '3 Shifts', uptime: '97%' } },
      { id: 'dc-east', name: 'East Coast DC', type: 'Location', x: 25, y: 70, color: '#3b82f6', details: { capacity: '10,000 units', backlog: '1%' } },
      { id: 'dc-west', name: 'West Coast DC', type: 'Location', x: 75, y: 70, color: '#3b82f6', details: { capacity: '15,000 units', backlog: '2%' } },
      { id: 'sku-carA', name: 'SUV Model X', type: 'Product', x: 25, y: 95, color: '#10b981', details: { margin: '22%', unitCost: '$32,000', forecastError: '12%' } },
      { id: 'sku-carB', name: 'Sedan Model Y', type: 'Product', x: 50, y: 95, color: '#10b981', details: { margin: '14%', unitCost: '$21,500', forecastError: '18%' } },
      { id: 'sku-orphan-part', name: 'Orphan Legacy Engine', type: 'Product', x: 85, y: 95, color: '#ef4444', details: { margin: '40%', unitCost: '$1,200', inventoryTurns: '0.2' } }
    ],
    edges: [
      { from: 'sup-steel', to: 'plant-assem', label: 'Steel Sheet Delivery' },
      { from: 'sup-elec', to: 'plant-assem', label: 'ECU Supply' },
      { from: 'sup-rubber', to: 'plant-assem', label: 'Tire Sourcing' },
      { from: 'plant-assem', to: 'dc-east', label: 'East Distribution' },
      { from: 'plant-assem', to: 'dc-west', label: 'West Distribution' },
      { from: 'sku-carA', to: 'dc-east', label: 'Sourcing Lane' },
      { from: 'sku-carB', to: 'dc-west', label: 'Sourcing Lane' }
    ]
  },
  semiconductor: {
    name: 'High-Tech Semiconductor Fab',
    nodes: [
      { id: 'fab-wafer', name: 'Wafer Fab (Hsinchu)', type: 'Resource', x: 30, y: 20, color: '#8b5cf6', details: { yield: '96.2%', capacity: '20,000 wafers/mo', cleanroomLevel: 'Class 1' } },
      { id: 'plant-test', name: 'Assembly & Test (ASE)', type: 'Resource', x: 70, y: 20, color: '#8b5cf6', details: { yield: '99.1%', capacity: '1.2M chips/mo', testMethods: 'Parametric' } },
      { id: 'dc-global', name: 'Global Hub (Singapore)', type: 'Location', x: 50, y: 48, color: '#3b82f6', details: { backlog: '14%', processingTime: '2.8 days', safetyStock: '4M chips' } },
      { id: 'dist-asia', name: 'APAC Distributor', type: 'Location', x: 20, y: 72, color: '#3b82f6', details: { region: 'APAC', onTimeDelivery: '94%' } },
      { id: 'dist-amer', name: 'AMER Distributor', type: 'Location', x: 50, y: 72, color: '#3b82f6', details: { region: 'AMER', onTimeDelivery: '96%' } },
      { id: 'dist-emea', name: 'EMEA Distributor', type: 'Location', x: 80, y: 72, color: '#3b82f6', details: { region: 'EMEA', onTimeDelivery: '91%' } },
      { id: 'sku-gpu', name: 'AI Tensor Core GPU', type: 'Product', x: 35, y: 95, color: '#10b981', details: { margin: '68%', unitCost: '$1,450', abcSegment: 'A' } },
      { id: 'sku-mcu', name: 'Automotive MCU 8-bit', type: 'Product', x: 65, y: 95, color: '#10b981', details: { margin: '38%', unitCost: '$3.20', abcSegment: 'A' } }
    ],
    edges: [
      { from: 'fab-wafer', to: 'plant-test', label: 'Wafer Transporter' },
      { from: 'plant-test', to: 'dc-global', label: 'Inbound Sorting' },
      { from: 'dc-global', to: 'dist-asia', label: 'Air Logistics' },
      { from: 'dc-global', to: 'dist-amer', label: 'Air Logistics' },
      { from: 'dc-global', to: 'dist-emea', label: 'Air Logistics' },
      { from: 'sku-gpu', to: 'dc-global', label: 'Sourcing Lane' },
      { from: 'sku-mcu', to: 'dc-global', label: 'Sourcing Lane' },
      { from: 'dc-global', to: 'fab-wafer', label: 'WIP Allocation Feedback Loop' } // Cyclic Loop!
    ]
  },
  retail: {
    name: 'Retail Fashion Apparel',
    nodes: [
      { id: 'fact-viet', name: 'Vietnam Supplier', type: 'Supplier', x: 20, y: 15, color: '#f59e0b', details: { leadTime: '45 days', complianceScore: '98%' } },
      { id: 'fact-india', name: 'India Fabric Mill', type: 'Supplier', x: 50, y: 15, color: '#f59e0b', details: { leadTime: '30 days', complianceScore: '92%' } },
      { id: 'transit-sea', name: 'Ocean Logistics Hub', type: 'Resource', x: 35, y: 45, color: '#8b5cf6', details: { speed: '24 days', costIndex: 'Low' } },
      { id: 'transit-air', name: 'Air Freight Express', type: 'Resource', x: 65, y: 45, color: '#8b5cf6', details: { speed: '3 days', costIndex: 'High' } },
      { id: 'dc-central', name: 'Central Sorting DC', type: 'Location', x: 50, y: 70, color: '#3b82f6', details: { backlog: '1%', capacity: '120k cartons' } },
      { id: 'sku-jacket', name: 'Winter Parka Coat', type: 'Product', x: 15, y: 95, color: '#10b981', details: { margin: '62%', abcSegment: 'B' } },
      { id: 'sku-shirt', name: 'Linen Casual Shirt', type: 'Product', x: 35, y: 95, color: '#10b981', details: { margin: '55%', abcSegment: 'A' } },
      { id: 'sku-orphan1', name: 'Obsolete Denim (2024)', type: 'Product', x: 65, y: 95, color: '#ef4444', details: { margin: '15%', abcSegment: 'C' } },
      { id: 'sku-orphan2', name: 'Swimwear Clearance', type: 'Product', x: 88, y: 95, color: '#ef4444', details: { margin: '8%', abcSegment: 'C' } }
    ],
    edges: [
      { from: 'fact-viet', to: 'transit-sea', label: 'Ocean Freight' },
      { from: 'fact-india', to: 'transit-air', label: 'Air Inbound' },
      { from: 'transit-sea', to: 'dc-central', label: 'DC Inbound' },
      { from: 'transit-air', to: 'dc-central', label: 'DC Inbound' },
      { from: 'sku-jacket', to: 'dc-central', label: 'Replenish Lane' },
      { from: 'sku-shirt', to: 'dc-central', label: 'Replenish Lane' }
    ]
  }
};

// Cycles Finder using DFS
function findGraphCycles(nodesList, edgesList) {
  const adj = {};
  nodesList.forEach(n => adj[n.id] = []);
  edgesList.forEach(e => {
    if (adj[e.from]) adj[e.from].push(e.to);
  });

  const visited = {};
  const recStack = {};
  const cycles = [];

  function dfs(u, path) {
    visited[u] = true;
    recStack[u] = true;
    path.push(u);

    const neighbors = adj[u] || [];
    for (const v of neighbors) {
      if (!visited[v]) {
        if (dfs(v, path)) return true;
      } else if (recStack[v]) {
        const cycleIndex = path.indexOf(v);
        if (cycleIndex !== -1) {
          cycles.push(path.slice(cycleIndex));
        }
      }
    }

    recStack[u] = false;
    path.pop();
    return false;
  }

  nodesList.forEach(n => {
    if (!visited[n.id]) {
      dfs(n.id, []);
    }
  });

  return cycles;
}

export default function EKGGraphVisualizer() {
  const [activeArchetype, setActiveArchetype] = useState('default');
  const [nodes, setNodes] = useState(ARCHETYPES.default.nodes);
  const [edges, setEdges] = useState(ARCHETYPES.default.edges);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeIdx, setSelectedEdgeIdx] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('diagnostics'); // 'diagnostics', 'details', 'editor', 'flow'
  const [hoveredCycleIdx, setHoveredCycleIdx] = useState(null);
  const [showLoopOverlay, setShowLoopOverlay] = useState(true);

  // Flow Simulation States
  const [simulationActive, setSimulationActive] = useState(false);
  const [supplyPressure, setSupplyPressure] = useState(100); // 50 to 150
  const [allocationMode, setAllocationMode] = useState('default'); // 'default' or 'balanced'

  // Simulated Flow and Utilization
  const simulatedFlows = useMemo(() => {
    if (!simulationActive) return null;

    const pressureMultiplier = supplyPressure / 100;
    let nodeUtils = {};
    let edgeFlows = {};
    
    if (activeArchetype === 'default') {
      const nDcSplit = allocationMode === 'balanced' ? 0.5 : 0.75;
      const sDcSplit = 1 - nDcSplit;
      
      nodeUtils['sup-1'] = Math.round(Math.min(99, 65 * pressureMultiplier));
      nodeUtils['res-1'] = Math.round(Math.min(99, 85 * pressureMultiplier));
      nodeUtils['plant-1'] = Math.round(Math.min(99, 70 * pressureMultiplier));
      
      const nDcUtil = 96 * pressureMultiplier * (nDcSplit / 0.75);
      nodeUtils['dc-1'] = Math.round(Math.min(99, nDcUtil));
      
      const sDcUtil = 38 * pressureMultiplier * (sDcSplit / 0.25);
      nodeUtils['dc-2'] = Math.round(Math.min(99, sDcUtil));
      
      nodeUtils['sku-1'] = Math.round(Math.min(99, 60 * pressureMultiplier));
      nodeUtils['sku-2'] = Math.round(Math.min(99, 45 * pressureMultiplier));
      nodeUtils['sku-orphan'] = 0;
      
      edgeFlows['sup-1->plant-1'] = 75;
      edgeFlows['res-1->plant-1'] = 80;
      edgeFlows['plant-1->dc-1'] = 75 * (nDcSplit / 0.75);
      edgeFlows['plant-1->dc-2'] = 25 * (sDcSplit / 0.25);
      edgeFlows['sku-1->dc-1'] = 50;
      edgeFlows['sku-2->dc-2'] = 50;
    } else if (activeArchetype === 'automotive') {
      nodeUtils['sup-steel'] = Math.round(Math.min(99, 70 * pressureMultiplier));
      nodeUtils['sup-elec'] = Math.round(Math.min(99, 88 * pressureMultiplier));
      nodeUtils['sup-rubber'] = Math.round(Math.min(99, 60 * pressureMultiplier));
      
      nodeUtils['plant-assem'] = Math.round(Math.min(99, 88 * pressureMultiplier));
      
      const eastSplit = allocationMode === 'balanced' ? 0.5 : 0.4;
      const westSplit = 1 - eastSplit;
      
      nodeUtils['dc-east'] = Math.round(Math.min(99, 78 * pressureMultiplier * (eastSplit / 0.4)));
      nodeUtils['dc-west'] = Math.round(Math.min(99, 58 * pressureMultiplier * (westSplit / 0.6)));
      
      nodeUtils['sku-carA'] = Math.round(Math.min(99, 80 * pressureMultiplier));
      nodeUtils['sku-carB'] = Math.round(Math.min(99, 65 * pressureMultiplier));
      nodeUtils['sku-orphan-part'] = 0;
      
      edgeFlows['sup-steel->plant-assem'] = 60;
      edgeFlows['sup-elec->plant-assem'] = 85;
      edgeFlows['sup-rubber->plant-assem'] = 50;
      edgeFlows['plant-assem->dc-east'] = 70 * (eastSplit / 0.4);
      edgeFlows['plant-assem->dc-west'] = 55 * (westSplit / 0.6);
      edgeFlows['sku-carA->dc-east'] = 65;
      edgeFlows['sku-carB->dc-west'] = 65;
    } else if (activeArchetype === 'semiconductor') {
      nodeUtils['fab-wafer'] = Math.round(Math.min(99, 90 * pressureMultiplier));
      nodeUtils['plant-test'] = Math.round(Math.min(99, 85 * pressureMultiplier));
      
      const singSplit = allocationMode === 'balanced' ? 0.6 : 0.85;
      nodeUtils['dc-global'] = Math.round(Math.min(99, 94 * pressureMultiplier * (singSplit / 0.85)));
      
      nodeUtils['dist-asia'] = Math.round(Math.min(99, 72 * pressureMultiplier));
      nodeUtils['dist-amer'] = Math.round(Math.min(99, 68 * pressureMultiplier));
      nodeUtils['dist-emea'] = Math.round(Math.min(99, 82 * pressureMultiplier));
      
      nodeUtils['sku-gpu'] = Math.round(Math.min(99, 95 * pressureMultiplier));
      nodeUtils['sku-mcu'] = Math.round(Math.min(99, 55 * pressureMultiplier));
      
      edgeFlows['fab-wafer->plant-test'] = 80;
      edgeFlows['plant-test->dc-global'] = 85;
      edgeFlows['dc-global->dist-asia'] = 75;
      edgeFlows['dc-global->dist-amer'] = 70;
      edgeFlows['dc-global->dist-emea'] = 80;
      edgeFlows['sku-gpu->dc-global'] = 90;
      edgeFlows['sku-mcu->dc-global'] = 60;
      edgeFlows['dc-global->fab-wafer'] = 40;
    } else { // retail
      nodeUtils['fact-viet'] = Math.round(Math.min(99, 75 * pressureMultiplier));
      nodeUtils['fact-india'] = Math.round(Math.min(99, 60 * pressureMultiplier));
      
      const seaSplit = allocationMode === 'balanced' ? 0.5 : 0.7;
      const airSplit = 1 - seaSplit;
      
      nodeUtils['transit-sea'] = Math.round(Math.min(99, 85 * pressureMultiplier * (seaSplit / 0.7)));
      nodeUtils['transit-air'] = Math.round(Math.min(99, 45 * pressureMultiplier * (airSplit / 0.3)));
      
      nodeUtils['dc-central'] = Math.round(Math.min(99, 80 * pressureMultiplier));
      nodeUtils['sku-jacket'] = Math.round(Math.min(99, 70 * pressureMultiplier));
      nodeUtils['sku-shirt'] = Math.round(Math.min(99, 65 * pressureMultiplier));
      nodeUtils['sku-orphan1'] = 0;
      nodeUtils['sku-orphan2'] = 0;
      
      edgeFlows['fact-viet->transit-sea'] = 70 * (seaSplit / 0.7);
      edgeFlows['fact-india->transit-air'] = 50 * (airSplit / 0.3);
      edgeFlows['transit-sea->dc-central'] = 65;
      edgeFlows['transit-air->dc-central'] = 45;
      edgeFlows['sku-jacket->dc-central'] = 60;
      edgeFlows['sku-shirt->dc-central'] = 55;
    }
    
    return { nodeUtils, edgeFlows };
  }, [simulationActive, supplyPressure, allocationMode, activeArchetype]);

  // Node CRUD states
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState('Product');
  const [newNodeX, setNewNodeX] = useState(50);
  const [newNodeY, setNewNodeY] = useState(50);

  // Link CRUD states
  const [newLinkFrom, setNewLinkFrom] = useState('');
  const [newLinkTo, setNewLinkTo] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  const [copiedQuery, setCopiedQuery] = useState(false);

  // Dragging and custom query state
  const svgRef = useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const [useNamedSets, setUseNamedSets] = useState(true);
  const [hideNulls, setHideNulls] = useState(true);
  const [limitReportingMeasures, setLimitReportingMeasures] = useState(true);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = selectedEdgeIdx !== null ? edges[selectedEdgeIdx] : null;

  // SVG coordinate converter
  const getSVGCoords = (e) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;
    const x = Math.max(2, Math.min(98, relativeX * 100));
    const y = Math.max(2, Math.min(108, relativeY * 110));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const handleMouseDown = (nodeId, e) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    setSelectedNodeId(nodeId);
    setSelectedEdgeIdx(null);
    setSidebarTab('details');
  };

  const handleTouchStart = (nodeId, e) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    hasMovedRef.current = false;
    setSelectedNodeId(nodeId);
    setSelectedEdgeIdx(null);
    setSidebarTab('details');
  };

  const handleMouseMove = (e) => {
    if (!draggingNodeId) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    const coords = getSVGCoords(e);
    if (!coords) return;
    setNodes(prev => prev.map(node => node.id === draggingNodeId ? { ...node, x: coords.x, y: coords.y } : node));
  };

  const handleTouchMove = (e) => {
    if (!draggingNodeId) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    const coords = getSVGCoords(e);
    if (!coords) return;
    setNodes(prev => prev.map(node => node.id === draggingNodeId ? { ...node, x: coords.x, y: coords.y } : node));
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  const handleUpdateNodeName = (newName) => {
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, name: newName } : n));
  };

  const handleUpdateNodeDetails = (key, val) => {
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? {
      ...n,
      details: { ...n.details, [key]: val }
    } : n));
  };

  const downloadQuery = () => {
    if (!selectedNode || !generatedQuery) return;
    const blob = new Blob([generatedQuery], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `o9-query-${selectedNode.name.replace(/\s+/g, '_').toLowerCase()}.mdx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Graph Diagnostic Calculations
  const { orphans, bottlenecks, cycles, healthScore } = useMemo(() => {
    // 1. Detect Orphans (in degree + out degree = 0)
    const connectedNodeIds = new Set();
    edges.forEach(e => {
      connectedNodeIds.add(e.from);
      connectedNodeIds.add(e.to);
    });
    const orphansList = nodes.filter(n => !connectedNodeIds.has(n.id));

    // 2. Detect Bottlenecks (in degree + out degree >= 3)
    const degreeCounts = {};
    nodes.forEach(n => degreeCounts[n.id] = 0);
    edges.forEach(e => {
      if (degreeCounts[e.from] !== undefined) degreeCounts[e.from]++;
      if (degreeCounts[e.to] !== undefined) degreeCounts[e.to]++;
    });
    const bottlenecksList = nodes.filter(n => degreeCounts[n.id] >= 3);

    // 3. Detect Cycles
    const cyclesList = findGraphCycles(nodes, edges);

    // 4. Compute Health Score
    let score = 100;
    score -= orphansList.length * 10;
    score -= bottlenecksList.length * 5;
    score -= cyclesList.length * 35;
    score = Math.max(10, score);

    return {
      orphans: orphansList,
      bottlenecks: bottlenecksList,
      cycles: cyclesList,
      healthScore: score
    };
  }, [nodes, edges]);

  const loadArchetype = (key) => {
    setActiveArchetype(key);
    setNodes(ARCHETYPES[key].nodes);
    setEdges(ARCHETYPES[key].edges);
    setSelectedNodeId(null);
    setSelectedEdgeIdx(null);
    setSidebarTab('diagnostics');
  };

  const handleNodeClick = (id) => {
    setSelectedNodeId(id === selectedNodeId ? null : id);
    setSelectedEdgeIdx(null);
    if (id !== selectedNodeId) {
      setSidebarTab('details');
    }
  };

  const handleEdgeClick = (idx, e) => {
    e.stopPropagation();
    setSelectedEdgeIdx(idx === selectedEdgeIdx ? null : idx);
    setSelectedNodeId(null);
    if (idx !== selectedEdgeIdx) {
      setSidebarTab('details');
    }
  };

  const getCoordinates = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 50, y: 50 };
  };

  // Add Dynamic Node
  const handleAddNode = (e) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    const id = 'custom-' + Date.now();
    const colors = { Product: '#10b981', Location: '#3b82f6', Resource: '#8b5cf6', Supplier: '#f59e0b', Customer: '#ec4899' };
    const newNode = {
      id,
      name: newNodeName.trim(),
      type: newNodeType,
      x: Number(newNodeX),
      y: Number(newNodeY),
      color: colors[newNodeType] || '#94a3b8',
      details: { status: 'Draft Creation', created: 'Live Canvas' }
    };

    setNodes(prev => [...prev, newNode]);
    setNewNodeName('');
    setSelectedNodeId(id);
    setSidebarTab('details');
  };

  // Add Dynamic Edge
  const handleAddEdge = (e) => {
    e.preventDefault();
    if (!newLinkFrom || !newLinkTo) return;
    if (newLinkFrom === newLinkTo) {
      alert('Source and target node cannot be the same!');
      return;
    }

    const newEdge = {
      from: newLinkFrom,
      to: newLinkTo,
      label: newLinkLabel.trim() || 'Custom Lane'
    };

    setEdges(prev => [...prev, newEdge]);
    setNewLinkLabel('');
    setNewLinkFrom('');
    setNewLinkTo('');
    setSidebarTab('diagnostics');
  };

  // Delete Selected Node/Edge
  const handleDeleteSelected = () => {
    if (selectedNodeId) {
      // Remove node
      setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
      // Remove linked edges
      setEdges(prev => prev.filter(e => e.from !== selectedNodeId && e.to !== selectedNodeId));
      setSelectedNodeId(null);
      setSidebarTab('diagnostics');
    } else if (selectedEdgeIdx !== null) {
      setEdges(prev => prev.filter((_, idx) => idx !== selectedEdgeIdx));
      setSelectedEdgeIdx(null);
      setSidebarTab('diagnostics');
    }
  };

  // Check if edge is in a detected cycle
  const isEdgeInCycle = (edge) => {
    return cycles.some(cycle => {
      const fromIdx = cycle.indexOf(edge.from);
      const toIdx = cycle.indexOf(edge.to);
      if (fromIdx !== -1 && toIdx !== -1) {
        return (toIdx === fromIdx + 1) || (fromIdx === cycle.length - 1 && toIdx === 0);
      }
      return false;
    });
  };

  // o9 Script Query Generator for Node
  const generatedQuery = useMemo(() => {
    if (!selectedNode) return '';
    const nodeName = selectedNode.name.replace(/\s+/g, '_');
    
    // Check if attributes exist and are set
    const details = selectedNode.details || {};
    const abcSegment = details.abcSegment || '';
    const backlog = details.backlog || '';
    const utilization = details.utilization || '';
    const leadTime = details.leadTime || '';

    // Null suppression modifier
    const rowPrefix = hideNulls ? 'NON EMPTY ' : '';
    
    // Product Dimension / Named Set modifier
    const productDim = useNamedSets ? `[Product].[NamedSets].[${nodeName}_Set]` : `{[Product].[${nodeName}]}`;

    // Measures list based on limitReportingMeasures
    const measures = limitReportingMeasures 
      ? `{[Measures].[Forecast_Volume], [Measures].[Sourcing_Cost]}`
      : `{[Measures].[Forecast_Volume], [Measures].[Sourcing_Cost], [Measures].[Active_Sourcing_Edge], [Measures].[Safety_Stock_Rollup], [Measures].[Transient_Calculated_Cost]}`;

    switch (selectedNode.type) {
      case 'Product':
        const abcFilter = abcSegment ? `\n  FILTER(${productDim}, [Product].[ABC_Segment].CurrentMember.Name = "${abcSegment}")` : productDim;
        return `// Optimized query for Product: ${selectedNode.name}
SELECT
  ${rowPrefix}FILTER(
    NONEMPTY(
      CROSSJOIN(
        ${abcFilter},
        DESCENDANTS([Location].[All_Locations], 4, SELF_AND_BEFORE)
      ),
      [Measures].[Active_Sourcing_Edge]
    )
  ) ON ROWS,
  ${measures} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[2026]`;

      case 'Location':
        const backlogFilter = backlog ? `\n  FILTER([Location].[${nodeName}].Members, [Measures].[Observed_Backlog_Index] > ${parseFloat(backlog) || 0})` : `[Location].[${nodeName}].Members`;
        return `// Optimized query for Location: ${selectedNode.name}
SELECT
  ${rowPrefix}${backlogFilter} ON ROWS,
  {[Measures].[Safety_Stock_Rollup], [Measures].[Observed_Backlog_Index]} ON COLUMNS
FROM [EKG_Graph_Cube]
WHERE [Time].[Current_Horizon]`;

      case 'Resource':
        const utilizationVal = utilization ? parseFloat(utilization) || 0 : 0;
        const resourceMeasures = limitReportingMeasures
          ? `{[Measures].[Allocated_Capacity], [Measures].[Capacity_Threshold_Limit]}`
          : `{[Measures].[Allocated_Capacity], [Measures].[Capacity_Threshold_Limit], [Measures].[Utilization_Percent]}`;
        return `// Optimized query for Resource: ${selectedNode.name}
SELECT
  ${rowPrefix}FILTER(
    {[Resource].[${nodeName}]},
    [Measures].[Utilization_Percent] <= ${utilizationVal}
  ) ON ROWS,
  ${resourceMeasures} ON COLUMNS
FROM [EKG_Graph_Cube]`;

      case 'Supplier':
        const parsedLeadTime = leadTime ? parseInt(leadTime) || 14 : 14;
        const supplierMeasures = limitReportingMeasures
          ? `{[Measures].[Supplier_LeadTime_Indexed], [Measures].[Supplier_OTIF_Score]}`
          : `{[Measures].[Supplier_LeadTime_Indexed], [Measures].[Supplier_OTIF_Score], [Measures].[Supplier_Reliability]}`;
        return `// Optimized query for Supplier: ${selectedNode.name}
SELECT
  ${rowPrefix}FILTER(
    {[Supplier].[${nodeName}]},
    [Measures].[Supplier_LeadTime_Indexed] <= ${parsedLeadTime}
  ) ON ROWS,
  ${supplierMeasures} ON COLUMNS
FROM [EKG_Graph_Cube]`;

      default:
        return `// Standard node member lookup
SELECT
  ${rowPrefix}{[${selectedNode.type}].[${nodeName}]} ON ROWS,
  {[Measures].[Base_Measure]} ON COLUMNS
FROM [EKG_Graph_Cube]`;
    }
  }, [selectedNode, useNamedSets, hideNulls, limitReportingMeasures]);

  const copyGeneratedQuery = () => {
    if (!generatedQuery) return;
    navigator.clipboard.writeText(generatedQuery).then(() => {
      setCopiedQuery(true);
      setTimeout(() => setCopiedQuery(false), 2000);
    });
  };

  return (
    <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)', marginBottom: 28 }}>
      
      {/* Header & Archetypes selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Layers size={20} color="var(--accent-indigo)" /> Interactive EKG Graph Studio
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Click nodes to inspect attributes and view optimized o9 queries. Build your network or load industry archetypes.
          </p>
          {cycles.length > 0 && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, marginTop: 6, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showLoopOverlay}
                onChange={e => {
                  setShowLoopOverlay(e.target.checked);
                  if (!e.target.checked) setHoveredCycleIdx(null);
                }}
                style={{ accentColor: '#ef4444' }}
              />
              Highlight critical calculation loops
            </label>
          )}
        </div>

        {/* Archetype buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => loadArchetype('default')}
            style={{
              padding: '6px 12px', fontSize: '0.75rem', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
              background: activeArchetype === 'default' ? 'var(--accent-blue-light)' : 'var(--bg-input)',
              border: `1px solid ${activeArchetype === 'default' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              color: activeArchetype === 'default' ? 'var(--accent-blue-dark)' : 'var(--text-secondary)'
            }}
          >
            Default Mock
          </button>
          <button
            onClick={() => loadArchetype('automotive')}
            style={{
              padding: '6px 12px', fontSize: '0.75rem', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
              background: activeArchetype === 'automotive' ? 'var(--accent-blue-light)' : 'var(--bg-input)',
              border: `1px solid ${activeArchetype === 'automotive' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              color: activeArchetype === 'automotive' ? 'var(--accent-blue-dark)' : 'var(--text-secondary)'
            }}
          >
            🚗 Automotive
          </button>
          <button
            onClick={() => loadArchetype('semiconductor')}
            style={{
              padding: '6px 12px', fontSize: '0.75rem', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
              background: activeArchetype === 'semiconductor' ? 'var(--accent-blue-light)' : 'var(--bg-input)',
              border: `1px solid ${activeArchetype === 'semiconductor' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              color: activeArchetype === 'semiconductor' ? 'var(--accent-blue-dark)' : 'var(--text-secondary)'
            }}
          >
            ⚡ Semiconductor
          </button>
          <button
            onClick={() => loadArchetype('retail')}
            style={{
              padding: '6px 12px', fontSize: '0.75rem', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
              background: activeArchetype === 'retail' ? 'var(--accent-blue-light)' : 'var(--bg-input)',
              border: `1px solid ${activeArchetype === 'retail' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
              color: activeArchetype === 'retail' ? 'var(--accent-blue-dark)' : 'var(--text-secondary)'
            }}
          >
            👗 Retail Apparel
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.3fr', gap: 20, alignItems: 'stretch' }}>
        
        {/* Canvas SVG Grid */}
        <div style={{ position: 'relative', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 10, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', minHeight: 450 }}>
          
          {/* Active Archetype Banner label */}
          <div style={{ position: 'absolute', top: 12, left: 12, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', padding: '4px 8px', borderRadius: 4, fontWeight: 700, color: 'var(--text-muted)' }}>
            Model: {ARCHETYPES[activeArchetype].name}
          </div>

          <svg
            ref={svgRef}
            viewBox="0 0 100 110"
            className="ekg-graph-svg"
            style={{ width: '100%', height: 'auto', flex: 1, minHeight: 380, maxHeight: 420, userSelect: 'none' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Draw Relationship Lines */}
            {edges.map((edge, idx) => {
              const fromPt = getCoordinates(edge.from);
              const toPt = getCoordinates(edge.to);
              const isSelected = selectedEdgeIdx === idx;
              
              // Find edge cycle mapping
              const getEdgeCycleIdx = (ed) => {
                return cycles.findIndex(cycle => {
                  const fromIdx = cycle.indexOf(ed.from);
                  const toIdx = cycle.indexOf(ed.to);
                  if (fromIdx !== -1 && toIdx !== -1) {
                    return (toIdx === fromIdx + 1) || (fromIdx === cycle.length - 1 && toIdx === 0);
                  }
                  return false;
                });
              };
              const cycleIdx = getEdgeCycleIdx(edge);
              const isCycle = cycleIdx !== -1;
              const isHoveredCycle = hoveredCycleIdx !== null && hoveredCycleIdx === cycleIdx;

              let edgeColor = 'var(--border-subtle, #cbd5e1)';
              if (isSelected) edgeColor = 'var(--accent-blue, #3b82f6)';
              else if (isCycle && showLoopOverlay) edgeColor = isHoveredCycle ? '#f43f5e' : '#ef4444';

              return (
                <g key={idx} onClick={(e) => handleEdgeClick(idx, e)} style={{ cursor: 'pointer' }}>
                  {/* Outer glowing path for visual highlights */}
                  <line
                    x1={fromPt.x}
                    y1={fromPt.y}
                    x2={toPt.x}
                    y2={toPt.y}
                    stroke={isSelected ? 'rgba(59,130,246,0.15)' : (isCycle && showLoopOverlay) ? (isHoveredCycle ? 'rgba(244,63,94,0.35)' : 'rgba(239,68,68,0.18)') : 'transparent'}
                    strokeWidth={isSelected || (isCycle && showLoopOverlay) ? "4.0" : "1.0"}
                  />
                  <line
                    x1={fromPt.x}
                    y1={fromPt.y}
                    x2={toPt.x}
                    y2={toPt.y}
                    className={isCycle && showLoopOverlay ? 'graph-edge-cycle' : 'graph-edge'}
                    stroke={edgeColor}
                    strokeWidth={isSelected ? "1.5" : (isCycle && showLoopOverlay) ? (isHoveredCycle ? "1.4" : "1.0") : "0.8"}
                    strokeDasharray={isCycle && showLoopOverlay ? "2.5,1.5" : undefined}
                    style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
                  />
                  
                  {/* Flow conveyor particles animation overlay */}
                  {simulationActive && (
                    <line
                      x1={fromPt.x}
                      y1={fromPt.y}
                      x2={toPt.x}
                      y2={toPt.y}
                      className="graph-edge-flow"
                      stroke={isCycle ? '#f87171' : 'var(--accent-blue)'}
                      strokeWidth={isSelected ? "1.4" : "1.0"}
                      style={{ opacity: 0.8 }}
                    />
                  )}
                  
                  {/* Arrow marker replacement */}
                  <circle
                    cx={toPt.x - (toPt.x - fromPt.x) * 0.15}
                    cy={toPt.y - (toPt.y - fromPt.y) * 0.15}
                    r="0.8"
                    fill={edgeColor}
                  />
                </g>
              );
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isOrphan = orphans.some(o => o.id === node.id);
              const isBottleneck = bottlenecks.some(b => b.id === node.id);

              let nodeColor = node.color;
              let isNodeBottleneck = false;
              let util = 0;
              
              const isNodeInCycle = cycles.some(c => c.includes(node.id));
              const isHoveredCycleNode = hoveredCycleIdx !== null && cycles[hoveredCycleIdx]?.includes(node.id);

              if (simulationActive && simulatedFlows) {
                util = simulatedFlows.nodeUtils[node.id] || 0;
                if (util >= 85) {
                  nodeColor = '#ef4444';
                  isNodeBottleneck = true;
                } else if (util >= 65) {
                  nodeColor = '#f59e0b';
                } else {
                  nodeColor = '#10b981';
                }
              } else {
                if (isOrphan) nodeColor = '#ef4444';
                else if (isNodeInCycle && showLoopOverlay) nodeColor = isHoveredCycleNode ? '#f43f5e' : '#ef4444';
                else if (isBottleneck) nodeColor = '#fbbf24';
              }

              return (
                <g
                  key={node.id}
                  className={`graph-node ${draggingNodeId === node.id ? 'dragging' : ''}`}
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  onTouchStart={(e) => handleTouchStart(node.id, e)}
                  onClick={(e) => {
                    if (hasMovedRef.current) {
                      e.stopPropagation();
                      return;
                    }
                    handleNodeClick(node.id);
                  }}
                  style={{ 
                    transformOrigin: `${node.x}px ${node.y}px`, 
                    cursor: draggingNodeId === node.id ? 'grabbing' : 'grab' 
                  }}
                >
                  {/* Outer pulse ripples for warnings */}
                  {(((isOrphan || isBottleneck || (isNodeInCycle && showLoopOverlay)) && !simulationActive) || (simulationActive && isNodeBottleneck)) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isHoveredCycleNode ? "9" : "7.5"}
                      fill="none"
                      stroke={isOrphan || (simulationActive && isNodeBottleneck) || (isNodeInCycle && showLoopOverlay) ? '#f87171' : '#fbbf24'}
                      strokeWidth={isHoveredCycleNode ? "0.9" : "0.6"}
                      opacity="0.8"
                      style={{
                        animation: 'pulse-glow 2s ease infinite',
                        transformOrigin: `${node.x}px ${node.y}px`
                      }}
                    />
                  )}

                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 5.5 : 4.5}
                    className={`graph-node-circle ${isNodeBottleneck ? 'node-bottleneck-pulse' : ''}`}
                    fill={nodeColor}
                    stroke={isSelected ? 'white' : 'transparent'}
                    strokeWidth="0.8"
                    style={{
                      filter: isSelected ? 'drop-shadow(0px 0px 4px rgba(255,255,255,0.8))' : 'none',
                      transition: 'fill 200ms, r 200ms, stroke 200ms, filter 200ms'
                    }}
                  />

                  {/* Node Initials */}
                  <text
                    x={node.x}
                    y={node.y}
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill="white"
                    style={{ fontSize: '4.5px', fontWeight: 800, pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.type.charAt(0)}
                  </text>

                  {/* Node Name */}
                  <text
                    x={node.x}
                    y={node.y + 8}
                    className="graph-node-text"
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    style={{ fontSize: '3.8px', fontWeight: isSelected ? 800 : 600, userSelect: 'none' }}
                  >
                    {node.name.length > 15 ? node.name.slice(0, 13) + '...' : node.name}
                  </text>

                  {/* Warning triangular flag */}
                  {(((isOrphan || isBottleneck) && !simulationActive) || (simulationActive && isNodeBottleneck)) && (
                    <polygon
                      points={`${node.x + 3.5},${node.y - 3.5} ${node.x + 6},${node.y - 1} ${node.x + 1},${node.y - 1}`}
                      fill={isOrphan || (simulationActive && isNodeBottleneck) ? '#ef4444' : '#fbbf24'}
                      stroke="white"
                      strokeWidth="0.3"
                    />
                  )}
                </g>
              );
            })}
          </svg>


          {/* SVG Legend overlay */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'var(--bg-glass)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.66rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <span>Supplier</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
              <span>Resource</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
              <span>Location</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span>Product</span>
            </div>
          </div>
        </div>

        {/* Sidebar Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Tab buttons for sidebar */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: 3, borderRadius: 6, border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 2 }}>
            <button
              onClick={() => setSidebarTab('diagnostics')}
              style={{
                flex: '1 0 45%', padding: '6px 0', fontSize: '0.72rem', fontWeight: 700, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: sidebarTab === 'diagnostics' ? 'white' : 'transparent',
                color: sidebarTab === 'diagnostics' ? 'var(--text-primary)' : 'var(--text-muted)'
              }}
            >
              Audits
            </button>
            <button
              onClick={() => setSidebarTab('details')}
              disabled={!selectedNode && !selectedEdge}
              style={{
                flex: '1 0 45%', padding: '6px 0', fontSize: '0.72rem', fontWeight: 700, borderRadius: 4, border: 'none',
                cursor: (!selectedNode && !selectedEdge) ? 'not-allowed' : 'pointer',
                background: sidebarTab === 'details' ? 'white' : 'transparent',
                color: sidebarTab === 'details' ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity: (!selectedNode && !selectedEdge) ? 0.5 : 1
              }}
            >
              Details
            </button>
            <button
              onClick={() => {
                setSidebarTab('flow');
                setSimulationActive(true); // Auto-start simulation when switching to this tab
              }}
              style={{
                flex: '1 0 45%', padding: '6px 0', fontSize: '0.72rem', fontWeight: 700, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: sidebarTab === 'flow' ? 'white' : 'transparent',
                color: sidebarTab === 'flow' ? 'var(--text-primary)' : 'var(--text-muted)'
              }}
            >
              Sourcing Flow
            </button>
            <button
              onClick={() => setSidebarTab('editor')}
              style={{
                flex: '1 0 45%', padding: '6px 0', fontSize: '0.72rem', fontWeight: 700, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: sidebarTab === 'editor' ? 'white' : 'transparent',
                color: sidebarTab === 'editor' ? 'var(--text-primary)' : 'var(--text-muted)'
              }}
            >
              Editor
            </button>
          </div>

          <div className="card" style={{ padding: 18, background: 'var(--bg-glass)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
            <AnimatePresence mode="wait">
              
              {/* TAB 1: Diagnostics Audit status */}
              {sidebarTab === 'diagnostics' && (
                <motion.div
                  key="diagnostics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>EKG Architecture Audit</span>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                      background: healthScore >= 75 ? 'var(--accent-emerald-light)' : healthScore >= 45 ? 'var(--accent-amber-light)' : 'var(--accent-rose-light)',
                      color: healthScore >= 75 ? 'var(--accent-emerald)' : healthScore >= 45 ? 'var(--accent-amber)' : 'var(--accent-rose)'
                    }}>
                      {healthScore}/100
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
                    
                    {/* Loops indicator */}
                    <div style={{ padding: '8px 12px', borderRadius: 6, background: cycles.length > 0 ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.04)', border: `1px solid ${cycles.length > 0 ? '#fecaca' : '#a7f3d0'}`, fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: cycles.length > 0 ? '#ef4444' : '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RefreshCw size={13} className={cycles.length > 0 ? 'spinner' : ''} />
                        Loop Scan: {cycles.length > 0 ? 'CRITICAL DETECTED' : 'PASSED'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                        {cycles.length > 0
                          ? `Found ${cycles.length} circular references (loops) which risk crashing allocation solvers.`
                          : 'No circular routes detected in EKG hierarchy mappings.'
                        }
                      </div>
                    </div>

                    {/* Interactive loop list breakdown */}
                    {cycles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Hover to highlight loop path:
                        </span>
                        {cycles.map((cycle, cIdx) => {
                          const nodeNames = cycle.map(nId => nodes.find(n => n.id === nId)?.name || nId);
                          const isHovered = hoveredCycleIdx === cIdx;
                          return (
                            <div
                              key={cIdx}
                              onMouseEnter={() => setHoveredCycleIdx(cIdx)}
                              onMouseLeave={() => setHoveredCycleIdx(null)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 4,
                                background: isHovered ? 'rgba(239,68,68,0.08)' : 'var(--bg-input)',
                                border: `1px solid ${isHovered ? '#ef4444' : 'var(--border-subtle)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                fontSize: '0.7rem',
                                color: isHovered ? '#991b1b' : 'var(--text-secondary)'
                              }}
                            >
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>⚠️ Cycle #{cIdx + 1} ({cycle.length} nodes)</span>
                              </div>
                              <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nodeNames.join(' → ') + ' → ' + nodeNames[0]}>
                                {nodeNames.join(' → ')} → {nodeNames[0]}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Orphans indicator */}
                    <div style={{ padding: '8px 12px', borderRadius: 6, background: orphans.length > 0 ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.04)', border: `1px solid ${orphans.length > 0 ? '#fecaca' : '#a7f3d0'}`, fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: orphans.length > 0 ? '#ef4444' : '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={13} />
                        Orphan Scan: {orphans.length > 0 ? `${orphans.length} WARN DETECTED` : 'PASSED'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                        {orphans.length > 0
                          ? `Detected disconnected elements: [${orphans.map(o => o.name).join(', ')}]. Orphans will be excluded from replenishments.`
                          : 'All modeled products are correctly mapped to sourcing lanes.'
                        }
                      </div>
                    </div>

                    {/* Bottlenecks indicator */}
                    <div style={{ padding: '8px 12px', borderRadius: 6, background: bottlenecks.length > 0 ? 'rgba(245,158,11,0.04)' : 'rgba(16,185,129,0.04)', border: `1px solid ${bottlenecks.length > 0 ? '#fde68a' : '#a7f3d0'}`, fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: bottlenecks.length > 0 ? '#d97706' : '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sliders size={13} />
                        Centrality Bottlenecks: {bottlenecks.length > 0 ? `${bottlenecks.length} NODES HIGH` : 'PASSED'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                        {bottlenecks.length > 0
                          ? `Nodes with high degrees of connections (≥3): [${bottlenecks.map(b => b.name).join(', ')}]. Aggregations here are costly.`
                          : 'Node degree distribution is balanced.'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Action delete prompt */}
                  {(selectedNodeId || selectedEdgeIdx !== null) && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleDeleteSelected}
                      style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Trash2 size={13} />
                      Delete Selected {selectedNodeId ? 'Node' : 'Link'}
                    </button>
                  )}
                </motion.div>
              )}

              {/* TAB 2: Properties & o9 Query Generator */}
              {sidebarTab === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}
                >
                  {selectedNode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 350px)', paddingRight: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: `${selectedNode.color}15`, color: selectedNode.color, fontWeight: 700 }}>
                          {selectedNode.type}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {selectedNode.id}</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Node Name</label>
                        <input
                          type="text"
                          value={selectedNode.name}
                          onChange={(e) => handleUpdateNodeName(e.target.value)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            borderRadius: 4,
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      <div style={{ fontSize: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Model Properties:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          {Object.entries(selectedNode.details || {}).map(([key, val]) => (
                            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr auto', gap: 6, alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={key}>
                                {key.replace(/([A-Z])/g, ' $1')}
                              </span>
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleUpdateNodeDetails(key, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  borderRadius: 4,
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-input)',
                                  color: 'var(--text-primary)'
                                }}
                              />
                              <button
                                onClick={() => {
                                  const updatedDetails = { ...selectedNode.details };
                                  delete updatedDetails[key];
                                  setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, details: updatedDetails } : n));
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--accent-rose)',
                                  cursor: 'pointer',
                                  padding: 4,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Delete attribute"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add property inline form */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr auto', gap: 6, marginTop: 12, alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Key"
                            id="new-prop-key"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              borderRadius: 4,
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)'
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Val"
                            id="new-prop-val"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              borderRadius: 4,
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)'
                            }}
                          />
                          <button
                            onClick={() => {
                              const keyEl = document.getElementById('new-prop-key');
                              const valEl = document.getElementById('new-prop-val');
                              const k = keyEl.value.trim().replace(/\s+/g, '');
                              const v = valEl.value.trim();
                              if (k && v) {
                                handleUpdateNodeDetails(k, v);
                                keyEl.value = '';
                                valEl.value = '';
                              }
                            }}
                            style={{
                              background: 'var(--accent-blue)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '0.72rem',
                              fontWeight: 'bold'
                            }}
                            title="Add property"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* o9 Query Gen */}
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                        {/* Custom Query Controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, background: 'var(--bg-input)', padding: 8, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Query Optimizations</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginTop: 2 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)' }}>
                              <input type="checkbox" checked={useNamedSets} onChange={e => setUseNamedSets(e.target.checked)} style={{ width: 12, height: 12, accentColor: 'var(--accent-blue)' }} />
                              Named Sets
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)' }}>
                              <input type="checkbox" checked={hideNulls} onChange={e => setHideNulls(e.target.checked)} style={{ width: 12, height: 12, accentColor: 'var(--accent-blue)' }} />
                              Hide Nulls
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)' }}>
                              <input type="checkbox" checked={limitReportingMeasures} onChange={e => setLimitReportingMeasures(e.target.checked)} style={{ width: 12, height: 12, accentColor: 'var(--accent-blue)' }} />
                              Limit Measures (≤3)
                            </label>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <FileCode size={13} /> Optimized o9 Query
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={copyGeneratedQuery}
                              style={{
                                background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4,
                                padding: '2px 6px', fontSize: '0.68rem', color: copiedQuery ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              {copiedQuery ? <Check size={10} /> : <Copy size={10} />}
                              {copiedQuery ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              onClick={downloadQuery}
                              style={{
                                background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4,
                                padding: '2px 6px', fontSize: '0.68rem', color: 'var(--text-secondary)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <Download size={10} />
                              Download
                            </button>
                          </div>
                        </div>
                        <pre style={{
                          background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                          borderRadius: 4, padding: 10, fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                          whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto', color: 'var(--text-primary)',
                          lineHeight: '1.4'
                        }}>
                          {generatedQuery}
                        </pre>
                      </div>
                    </div>
                  ) : selectedEdge ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: 'var(--bg-input)', color: 'var(--text-secondary)', fontWeight: 700, alignSelf: 'flex-start' }}>
                        Graph Relationship
                      </span>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800 }}>{selectedEdge.label}</h4>

                      <div style={{ fontSize: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>From Node:</span>
                          <span style={{ fontWeight: 600, marginLeft: 8 }}>{selectedEdge.from}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>To Node:</span>
                          <span style={{ fontWeight: 600, marginLeft: 8 }}>{selectedEdge.to}</span>
                        </div>
                        {isEdgeInCycle(selectedEdge) && (
                          <div style={{ color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.04)', padding: 8, border: '1px solid #fecaca', borderRadius: 4, marginTop: 10 }}>
                            ⚠️ This relationship forms a directed loop in the supply chain schema!
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
                      <Eye size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                      <span style={{ fontSize: '0.75rem' }}>Select a node or connection on the canvas to inspect detail metadata.</span>
                    </div>
                  )}

                  {/* Delete button fallback */}
                  {(selectedNodeId || selectedEdgeIdx !== null) && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleDeleteSelected}
                      style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'auto' }}
                    >
                      <Trash2 size={13} />
                      Delete Selected {selectedNodeId ? 'Node' : 'Link'}
                    </button>
                  )}
                </motion.div>
              )}

              {/* TAB 4: Sourcing Flow Simulator */}
              {sidebarTab === 'flow' && (
                <motion.div
                  key="flow"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={16} color="var(--accent-blue)" /> Telemetry Controls
                    </span>
                    <button
                      onClick={() => setSimulationActive(prev => !prev)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: simulationActive ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {simulationActive ? (
                        <>
                          <Pause size={14} /> Stop
                        </>
                      ) : (
                        <>
                          <Play size={14} /> Run
                        </>
                      )}
                    </button>
                  </div>

                  {simulationActive ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
                      {/* Supply Pressure Slider */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Inbound Supply Pressure</span>
                          <span style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{supplyPressure}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={supplyPressure}
                          onChange={(e) => setSupplyPressure(Number(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Simulates shifts in market demand and arrival pressure.
                        </span>
                      </div>

                      {/* Capacity Utilizations */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          Live Node Utilization
                        </span>
                        
                        {/* Render active locations/resources based on archetype */}
                        {nodes
                          .filter(n => n.type === 'Location' || n.type === 'Resource' || n.type === 'Supplier')
                          .map(node => {
                            const util = simulatedFlows?.nodeUtils[node.id] || 0;
                            let barColor = 'var(--accent-emerald)';
                            if (util >= 85) barColor = 'var(--accent-rose)';
                            else if (util >= 65) barColor = 'var(--accent-amber)';

                            return (
                              <div key={node.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                  <span style={{ fontWeight: 600 }}>{node.name}</span>
                                  <span style={{ fontFamily: 'var(--font-mono)', color: barColor, fontWeight: 700 }}>{util}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div 
                                    className="progress-bar-fill" 
                                    style={{ 
                                      width: `${util}%`, 
                                      background: barColor,
                                      transition: 'width 0.3s ease-out' 
                                    }} 
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Warning and Allocation Controller */}
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                        {activeArchetype === 'default' && simulatedFlows?.nodeUtils['dc-1'] >= 85 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: 10, borderRadius: 6 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <AlertTriangle size={14} /> Sourcing Bottleneck Warning
                            </div>
                            <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              North DC capacity exceeds threshold (96%). Sourcing splits are set to default (75% North / 25% South).
                            </p>
                            <button
                              onClick={() => setAllocationMode('balanced')}
                              className="btn btn-primary btn-sm"
                              style={{ width: '100%', fontSize: '0.72rem', padding: '6px 10px', marginTop: 4 }}
                            >
                              Apply Balanced Sourcing (50/50 Split)
                            </button>
                          </div>
                        ) : activeArchetype === 'default' && allocationMode === 'balanced' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 10, borderRadius: 6 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CheckCircle2 size={14} /> Optimization Plan Active
                            </div>
                            <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              Sourcing balanced (50% North / 50% South). North DC load dropped to safe level ({simulatedFlows?.nodeUtils['dc-1']}%).
                            </p>
                            <button
                              onClick={() => setAllocationMode('default')}
                              className="btn btn-secondary btn-sm"
                              style={{ width: '100%', fontSize: '0.72rem', padding: '6px 10px', marginTop: 4 }}
                            >
                              Reset to Default Split
                            </button>
                          </div>
                        ) : (
                          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', padding: 10, borderRadius: 6, fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {activeArchetype === 'default' 
                              ? 'Simulation running normally. Adjust pressure sliders to trigger capacity warnings.'
                              : 'Simulation active for selected supply chain archetype. Feel free to inspect flows.'
                            }
                            {activeArchetype !== 'default' && (
                              <button
                                onClick={() => setAllocationMode(prev => prev === 'balanced' ? 'default' : 'balanced')}
                                className="btn btn-secondary btn-sm"
                                style={{ width: '100%', fontSize: '0.72rem', padding: '6px 10px', marginTop: 8 }}
                              >
                                Toggle Allocation: {allocationMode === 'balanced' ? 'Balanced' : 'Default'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', flex: 1 }}>
                      <PlayCircle size={32} style={{ marginBottom: 8, opacity: 0.5, color: 'var(--accent-blue)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Simulation Inactive</span>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', maxWidth: 200, marginTop: 4 }}>
                        Click Run to enable dynamic edge flows and live capacity utilization metrics.
                      </p>
                      <button
                        onClick={() => setSimulationActive(true)}
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: 12, padding: '6px 16px' }}
                      >
                        Start Simulation
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: Canvas Schema Editor (Add Nodes/Edges) */}
              {sidebarTab === 'editor' && (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
                    Schema Constructor
                  </span>

                  {/* Add Node form */}
                  <form onSubmit={handleAddNode} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                      + Add New Node
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Node Name (e.g. DC East)"
                        value={newNodeName}
                        onChange={e => setNewNodeName(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                        <select
                          value={newNodeType}
                          onChange={e => setNewNodeType(e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
                        >
                          {['Product', 'Location', 'Resource', 'Supplier', 'Customer'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-primary btn-sm" style={{ padding: 0 }}>
                          <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> Create
                        </button>
                      </div>

                      {/* X/Y coordinate sliders */}
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          <span>Pos X: {newNodeX}%</span>
                          <span>Pos Y: {newNodeY}%</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                          <input type="range" min="10" max="90" value={newNodeX} onChange={e => setNewNodeX(e.target.value)} style={{ accentColor: 'var(--accent-blue)' }} />
                          <input type="range" min="10" max="95" value={newNodeY} onChange={e => setNewNodeY(e.target.value)} style={{ accentColor: 'var(--accent-blue)' }} />
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Add Edge form */}
                  <form onSubmit={handleAddEdge} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                      + Add Sourcing Connection
                    </span>
                    
                    <select
                      value={newLinkFrom}
                      onChange={e => setNewLinkFrom(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
                      required
                    >
                      <option value="">-- Select Source Node --</option>
                      {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.type})</option>)}
                    </select>

                    <select
                      value={newLinkTo}
                      onChange={e => setNewLinkTo(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
                      required
                    >
                      <option value="">-- Select Target Node --</option>
                      {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.type})</option>)}
                    </select>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Label (e.g. Air Freight)"
                        value={newLinkLabel}
                        onChange={e => setNewLinkLabel(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" style={{ padding: 0 }}>
                        <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> Connect
                      </button>
                    </div>
                  </form>

                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>

    </div>
  );
}
