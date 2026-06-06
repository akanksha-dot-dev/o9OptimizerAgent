import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, AlertTriangle, Info, Eye, CheckCircle2 } from 'lucide-react';

const NODES = [
  { id: 'sup-1', name: 'Material Supplier S', type: 'Supplier', x: 25, y: 15, color: '#f59e0b', details: { leadTime: '14 days', reliability: '98%', status: 'Active' } },
  { id: 'res-1', name: 'Production Line A', type: 'Resource', x: 75, y: 15, color: '#8b5cf6', details: { capacity: '500 units/day', utilization: '94%', shiftType: 'Double Shift' } },
  { id: 'plant-1', name: 'Manufacturing Plant 1', type: 'Location', x: 50, y: 35, color: '#3b82f6', details: { region: 'North America', type: 'Factory', storageCapacity: '50,000 units' } },
  { id: 'dc-1', name: 'North DC (Bottleneck)', type: 'Location', x: 30, y: 65, color: '#ef4444', details: { region: 'North', type: 'Distribution Center', backlog: '25%' }, isBottleneck: true },
  { id: 'dc-2', name: 'South DC', type: 'Location', x: 70, y: 65, color: '#3b82f6', details: { region: 'South', type: 'Distribution Center', backlog: '2%' } },
  { id: 'sku-1', name: 'Electronics SKU 1', type: 'Product', x: 20, y: 90, color: '#10b981', details: { unitCost: '$120', margin: '35%', abcSegment: 'A' } },
  { id: 'sku-2', name: 'Apparel SKU 2', type: 'Product', x: 50, y: 90, color: '#10b981', details: { unitCost: '$45', margin: '50%', abcSegment: 'B' } },
  { id: 'sku-orphan', name: 'Orphan Legacy SKU', type: 'Product', x: 90, y: 90, color: '#ef4444', details: { unitCost: '$15', margin: '10%', abcSegment: 'C' }, isOrphan: true }
];

const EDGES = [
  { from: 'sup-1', to: 'plant-1', label: 'Raw Material Delivery' },
  { from: 'res-1', to: 'plant-1', label: 'Capacity allocation' },
  { from: 'plant-1', to: 'dc-1', label: 'Primary Distribution' },
  { from: 'plant-1', to: 'dc-2', label: 'Primary Distribution' },
  { from: 'sku-1', to: 'dc-1', label: 'Sourcing mapping' },
  { from: 'sku-2', to: 'dc-2', label: 'Sourcing mapping' }
];

export default function EKGGraphVisualizer() {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [scanBottlenecks, setScanBottlenecks] = useState(false);

  const selectedNode = NODES.find(n => n.id === selectedNodeId);

  const handleNodeClick = (id) => {
    setSelectedNodeId(id === selectedNodeId ? null : id);
  };

  const getCoordinates = (nodeId) => {
    const node = NODES.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  return (
    <div className="card" style={{ padding: 24, border: '1px solid var(--border-subtle)', marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Layers size={20} color="var(--accent-indigo)" /> Interactive EKG Model Explorer
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Click on nodes to inspect EKG attributes. Toggle structural checks to visualize network bottlenecks.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setScanBottlenecks(!scanBottlenecks)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: scanBottlenecks ? 'var(--accent-rose-light)' : undefined,
            borderColor: scanBottlenecks ? 'var(--accent-rose)' : undefined,
            color: scanBottlenecks ? 'var(--accent-rose)' : undefined,
            transition: 'all 200ms ease'
          }}
        >
          <AlertTriangle size={14} />
          {scanBottlenecks ? 'Hide Bottlenecks' : 'Highlight Graph Bottlenecks'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.3fr', gap: 20, alignItems: 'stretch' }}>
        {/* SVG Graph Grid Container */}
        <div style={{ position: 'relative', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 10, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg
            viewBox="0 0 100 110"
            className="ekg-graph-svg"
            style={{ width: '100%', height: 'auto', minHeight: 380, maxHeight: 420 }}
          >
            {/* Draw Relationships (Edges) */}
            {EDGES.map((edge, idx) => {
              const fromPt = getCoordinates(edge.from);
              const toPt = getCoordinates(edge.to);
              return (
                <line
                  key={idx}
                  x1={fromPt.x}
                  y1={fromPt.y}
                  x2={toPt.x}
                  y2={toPt.y}
                  className="graph-edge"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Draw Nodes */}
            {NODES.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const hasAlert = scanBottlenecks && (node.isBottleneck || node.isOrphan);
              
              let nodeColor = node.color;
              if (scanBottlenecks) {
                if (node.isOrphan) nodeColor = '#ef4444';
                else if (node.isBottleneck) nodeColor = '#f59e0b';
              }

              return (
                <g
                  key={node.id}
                  className="graph-node"
                  onClick={() => handleNodeClick(node.id)}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                >
                  {/* Alert ripple backdrops */}
                  {hasAlert && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="7.5"
                      fill="none"
                      stroke={node.isOrphan ? '#f87171' : '#fbbf24'}
                      strokeWidth="0.6"
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
                    className="graph-node-circle"
                    fill={nodeColor}
                    stroke={isSelected ? 'white' : 'transparent'}
                    style={{ filter: isSelected ? 'drop-shadow(0px 0px 4px rgba(255,255,255,0.8))' : 'none' }}
                  />

                  {/* Type icon initials */}
                  <text
                    x={node.x}
                    y={node.y}
                    dominantBaseline="central"
                    textAnchor="middle"
                    fill="white"
                    style={{ fontSize: '4.5px', fontWeight: 800, pointerEvents: 'none' }}
                  >
                    {node.type.charAt(0)}
                  </text>

                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + 8}
                    className="graph-node-text"
                    textAnchor="middle"
                    fill="var(--text-primary)"
                  >
                    {node.name.length > 15 ? node.name.slice(0, 14) + '...' : node.name}
                  </text>

                  {/* Warning small triangle flag */}
                  {hasAlert && (
                    <polygon
                      points={`${node.x + 3.5},${node.y - 3.5} ${node.x + 6},${node.y - 1} ${node.x + 1},${node.y - 1}`}
                      fill={node.isOrphan ? '#ef4444' : '#f59e0b'}
                      stroke="white"
                      strokeWidth="0.3"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Graph Legend overlay */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'var(--bg-glass)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
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

        {/* Sidebar Info/Properties Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 18, background: 'var(--bg-glass)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div
                  key={selectedNode.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '3px 8px', borderRadius: 999, background: `${selectedNode.color}20`, color: selectedNode.color, fontSize: '0.68rem', fontWeight: 700, marginBottom: 8, border: `1px solid ${selectedNode.color}30` }}>
                    {selectedNode.type}
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                    {selectedNode.name}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, fontSize: '0.78rem' }}>
                    {Object.entries(selectedNode.details).map(([key, val]) => (
                      <div key={key} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize', display: 'block', marginBottom: 2 }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {scanBottlenecks && (selectedNode.isBottleneck || selectedNode.isOrphan) && (
                    <div style={{ marginTop: 14, padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--accent-rose-light)', border: '1px solid rgba(244,63,90,0.2)' }}>
                      <h5 style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <AlertTriangle size={13} /> Structural Warning
                      </h5>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {selectedNode.isOrphan 
                          ? 'This node is completely disconnected from location dimensions, meaning it will be excluded from standard downstream allocations.'
                          : 'High degree of sourcing pathways converge here. Increases risk of computational bottlenecks.'
                        }
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--text-muted)', padding: 12 }}>
                  <Eye size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                    Click any node on the graph to display its o9 EKG property metadata and relationships.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Warning Alert Banner cards */}
      <AnimatePresence>
        {scanBottlenecks && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}
          >
            <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-glass)', border: '1px solid #fecaca', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>Orphan Node Discovered</h5>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong>Legacy SKU</strong> is disconnected from standard Sourcing relationships. Needs mapping to an active DC or Plant to support replenishment plans.
                </p>
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-glass)', border: '1px solid #fde68a', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#d97706', marginBottom: 4 }}>Graph Bottleneck</h5>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong>North DC</strong> node traverses 25+ sourcing links. Aggregating reports at this node will consume excessive EKG runtime.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
