import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Zap, BarChart3, Database, Target, Layout, BookOpen, Settings,
  ArrowUp, ArrowDown, CornerDownLeft, Command, Sparkles,
} from 'lucide-react';

const COMMANDS = [
  { id: 'home',       path: '/',               label: 'Home',               desc: 'Dashboard overview',                              icon: <Zap size={18} />,       group: 'Pages' },
  { id: 'analyzer',   path: '/analyzer',        label: 'Report Analyzer',    desc: 'Deep-dive report performance analysis',            icon: <BarChart3 size={18} />, group: 'Pages' },
  { id: 'ekg',        path: '/ekg-health',      label: 'EKG Health Checker', desc: 'Audit your Enterprise Knowledge Graph',            icon: <Database size={18} />,  group: 'Pages' },
  { id: 'snop',       path: '/snop-advisor',    label: 'S&OP Advisor',       desc: 'Maturity assessment & what-if sandbox',            icon: <Target size={18} />,    group: 'Pages' },
  { id: 'copilot',    path: '/copilot',         label: 'AI Copilot & Generator', desc: 'Interactive AI Consultant & MDX Script Generator', icon: <Sparkles size={18} />, group: 'Pages' },
  { id: 'templates',  path: '/templates',       label: 'Templates Gallery',  desc: 'Pre-built optimized report configurations',        icon: <Layout size={18} />,    group: 'Pages' },
  { id: 'knowledge',  path: '/knowledge',       label: 'Knowledge Base',     desc: 'Searchable optimization rules catalog',            icon: <BookOpen size={18} />,  group: 'Pages' },
  { id: 'practices',  path: '/best-practices',  label: 'Best Practices',     desc: 'Curated tips from real-world implementations',     icon: <Settings size={18} />,  group: 'Pages' },
];

function fuzzyMatch(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const filtered = query.trim() === ''
    ? COMMANDS
    : COMMANDS.filter(c =>
        fuzzyMatch(query, c.label) || fuzzyMatch(query, c.desc)
      );

  const toggle = useCallback(() => {
    setOpen(prev => {
      if (!prev) {
        setQuery('');
        setSelectedIdx(0);
      }
      return !prev;
    });
  }, []);

  // Global shortcut listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIdx];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  const handleSelect = (cmd) => {
    navigate(cmd.path);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault();
      handleSelect(filtered[selectedIdx]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: '18%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: '100%',
              maxWidth: 560,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Search Input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages and tools…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <kbd style={{
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.68rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
              }}>
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              style={{
                maxHeight: 340,
                overflowY: 'auto',
                padding: '8px',
              }}
            >
              {filtered.length === 0 && (
                <div style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}>
                  No matching pages found
                </div>
              )}
              {filtered.map((cmd, idx) => (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: idx === selectedIdx ? 'var(--accent-blue-light)' : 'transparent',
                    transition: 'background 100ms ease',
                  }}
                >
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: 'var(--radius-sm)',
                    background: idx === selectedIdx ? 'var(--gradient-primary)' : 'var(--bg-input)',
                    color: idx === selectedIdx ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 150ms ease',
                  }}>
                    {cmd.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: idx === selectedIdx ? 'var(--accent-blue-dark)' : 'var(--text-primary)',
                    }}>
                      {cmd.label}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {cmd.desc}
                    </div>
                  </div>
                  {idx === selectedIdx && (
                    <CornerDownLeft size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>

            {/* Footer Hints */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '10px 20px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowUp size={11} /><ArrowDown size={11} /> Navigate
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CornerDownLeft size={11} /> Open
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{
                  padding: '1px 5px', borderRadius: 4, fontSize: '0.62rem',
                  background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                }}>ESC</kbd> Close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
