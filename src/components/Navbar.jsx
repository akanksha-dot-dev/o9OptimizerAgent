import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap, BarChart3, BookOpen, Settings, Database, Target, Layout, Menu, X,
  Sun, Moon, Command,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: <Zap size={15} /> },
  { path: '/analyzer', label: 'Analyzer', icon: <BarChart3 size={15} /> },
  { path: '/ekg-health', label: 'EKG Health', icon: <Database size={15} /> },
  { path: '/snop-advisor', label: 'S&OP Advisor', icon: <Target size={15} /> },
  { path: '/templates', label: 'Templates', icon: <Layout size={15} /> },
  { path: '/knowledge', label: 'Knowledge', icon: <BookOpen size={15} /> },
  { path: '/best-practices', label: 'Practices', icon: <Settings size={15} /> },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // ---------- Scroll shadow ----------
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ---------- Dark mode ----------
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('o9-theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('o9-theme', theme);
    } catch {
      // storage unavailable
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">o9</div>
          <span>Optimizer Agent</span>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'nav-link active' : 'nav-link'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {item.icon} {item.label}
              </span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Command Palette Hint */}
          <button
            className="cmd-palette-hint"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'k', ctrlKey: !isMac, metaKey: isMac, bubbles: true,
              }));
            }}
            title="Quick navigation (Ctrl+K)"
          >
            <Command size={12} />
            <span>K</span>
          </button>

          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm, 8px)',
              border: '1px solid var(--border-subtle, #e2e6ef)',
              background: 'var(--bg-card, #fff)',
              color: 'var(--text-secondary, #475569)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast, 150ms)',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Mobile Toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none', border: 'none', background: 'none',
              color: 'var(--text-primary)', padding: 8,
            }}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mobile-menu">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'nav-link active' : 'nav-link'}
              onClick={() => setMobileOpen(false)}
              style={{ display: 'block', padding: '12px 24px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.icon} {item.label}
              </span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
