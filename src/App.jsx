import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AnalyzerPage from './pages/AnalyzerPage';
import KnowledgePage from './pages/KnowledgePage';
import BestPracticesPage from './pages/BestPracticesPage';
import EKGHealthPage from './pages/EKGHealthPage';
import SNOPAdvisorPage from './pages/SNOPAdvisorPage';
import TemplatesPage from './pages/TemplatesPage';
import CopilotPage from './pages/CopilotPage';
import CommandPalette from './components/CommandPalette';
import ToastProvider from './components/ToastProvider';

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <div className="app-container">
          <Navbar />
          <CommandPalette />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analyzer" element={<AnalyzerPage />} />
              <Route path="/ekg-health" element={<EKGHealthPage />} />
              <Route path="/snop-advisor" element={<SNOPAdvisorPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/copilot" element={<CopilotPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/best-practices" element={<BestPracticesPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <footer className="footer">
            <div className="footer-inner">
              <div className="footer-brand">
                <h4>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.65rem', color: 'white' }}>o9</div>
                  Optimizer Agent
                </h4>
                <p>Enterprise-grade optimization intelligence for o9 Solutions implementations. Built with deep domain expertise from real-world deployments.</p>
              </div>
              <div className="footer-col">
                <h5>Tools</h5>
                <Link to="/analyzer">Report Analyzer</Link>
                <Link to="/ekg-health">EKG Health</Link>
                <Link to="/snop-advisor">S&OP Advisor</Link>
                <Link to="/templates">Templates</Link>
                <Link to="/copilot">AI Copilot</Link>
              </div>
              <div className="footer-col">
                <h5>Resources</h5>
                <Link to="/knowledge">Knowledge Base</Link>
                <Link to="/best-practices">Best Practices</Link>
              </div>
              <div className="footer-col">
                <h5>About</h5>
                <a href="#">o9 Solutions</a>
                <a href="#">Documentation</a>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© {new Date().getFullYear()} o9 Optimizer Agent — Powered by AI-driven optimization intelligence</p>
              <span className="version-badge">v1.3.0</span>
            </div>
          </footer>
        </div>
      </ToastProvider>
    </Router>
  );
}
