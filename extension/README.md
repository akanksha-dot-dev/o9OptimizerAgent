# o9 Report Optimizer — Browser Extension

A Chrome/Edge browser extension that scans live o9 Platform reports and sends the extracted configuration to the o9 Optimizer Web App for full performance optimization analysis.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Generate Icons (one-time)

```powershell
cd d:\o9OptimizerAgent\extension
npm install canvas --save-dev
node generate-icons.js
```

> **Alternative**: If `canvas` package fails to install, just remove the `icons` fields from `manifest.json` — the extension will work with the default browser extension icon.

### Step 2: Load in Chrome/Edge

1. Open Chrome and go to: `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the folder: `d:\o9OptimizerAgent\extension\`
5. The **o9 Report Optimizer** extension will appear ✅

### Step 3: Configure the Optimizer URL

1. Click the extension icon in the Chrome toolbar
2. In the popup, set the **Optimizer Web App URL** to where your app is running:
   - Development: `http://localhost:5173`
   - Production: your deployed URL
3. Click **Save**

### Step 4: Start the Optimizer Web App

```powershell
cd d:\o9OptimizerAgent
npm run dev
```

---

## 🔍 How to Use

1. **Open an o9 Platform report** in your browser (e.g., `https://gtmtest.o9solutions.com/kibo2/...`)
2. You'll see the **o9 Optimizer sidebar** on the right side of the page
3. **Choose Scan Mode**:
   - ⚡ **Fast Scan**: Reads DOM only — results in ~2 seconds. Good for visible layout signals.
   - 🔬 **Deep Scan**: Reads DOM + intercepts API responses — results in ~12 seconds. Captures measure counts, filter types, named sets, tenant settings, and timing data.
4. Click **"Start Scan"**
5. Watch signals appear in the sidebar as they're detected
6. Click **"🚀 Analyze in Optimizer"**
7. The Optimizer Web App opens automatically with all fields pre-populated
8. Review the auto-filled form and click **"Run Analysis"** when ready

---

## 📊 What the Extension Detects

### Via DOM Scanning (Fast Scan)
| Signal | How Detected |
|--------|-------------|
| Report name | Page title, breadcrumb, heading elements |
| Report type | URL hash + page title keywords (demand, supply, inventory...) |
| Measure/column count | Grid column header elements |
| Row count (estimated) | Rendered grid rows × virtualization factor |
| Named sets | Named set DOM elements in filter panel |
| Conditional formatting | Formatted cell elements |
| Null rows visible | Empty/blank row elements |
| Hierarchy depth | Tree node indentation levels |

### Via API Interception (Deep Scan)
| Signal | Source |
|--------|--------|
| Exact measure list + types | Report config API response |
| Reporting measures count | Measure type field in API |
| Transient measures count | Measure type field in API |
| Filter configuration | Filter config API response |
| Named sets (exact count) | Named sets API response |
| Max Intersection (tenant) | Tenant settings API response |
| Graph Cube execution time | Request timing from fetch/XHR |
| Web API total time | Request timing from fetch/XHR |
| Factory settings enabled | Report config API |
| Chain-linked reports | Report config API |

---

## 🏗️ Extension Architecture

```
extension/
├── manifest.json     ← MV3 manifest (host permissions, CSP declarations)
├── inject.js         ← Runs in PAGE context: XHR/fetch monkey-patching + DOM scanning
├── content.js        ← Runs in ISOLATED context: sidebar UI + signal aggregation  
├── sidebar.css       ← Sidebar styles (premium dark theme)
├── background.js     ← Service worker: opens Optimizer tab + bridges data
├── popup.html/js     ← Extension toolbar popup (settings + status)
└── icons/            ← Generated PNG icons (16, 48, 128px)
```

### Data Flow
```
inject.js (page context)
    ↓ window.postMessage
content.js (isolated world, sidebar)
    ↓ chrome.runtime.sendMessage  
background.js (service worker)
    ↓ chrome.storage.session + scripting.executeScript
AnalyzerPage.jsx (Optimizer web app)
    ↓ window.postMessage received → form auto-populated
```

---

## ⚙️ Extension Popup Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Optimizer Web App URL | `http://localhost:5173` | Where your o9 Optimizer app is running |
| Default Scan Mode | Fast | Fast (DOM) or Deep (DOM + API intercept) |

---

## 🔒 Privacy & Security

- **No data is sent to external servers** — everything stays local
- Bearer tokens are never read, stored, or transmitted (the extension does not touch authentication)
- API response bodies are only read in memory during Deep Scan and immediately discarded after extraction
- The extension only activates on `*.o9solutions.com` pages

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|---------|
| Sidebar doesn't appear | Check that extension is loaded and enabled in `chrome://extensions` |
| "Analyze in Optimizer" fails | Make sure the Optimizer web app is running (`npm run dev`) and the URL is correct in popup settings |
| Deep Scan shows 0 API responses | The page may have cached the report data. Try refreshing the o9 report page then starting a deep scan |
| Low confidence score | Use Deep Scan mode for more accurate extraction |
| Icons missing | Run `node generate-icons.js` or remove icon fields from `manifest.json` |

---

## 📝 Known Limitations

- **CSP**: If the o9 platform has a strict CSP blocking script injection, `inject.js` may not activate. In this case, Fast Scan (DOM only) will still work via `content.js`.
- **Virtual scrolling**: Row counts are estimated (visible rows × virtualization factor) — actual counts require API interception via Deep Scan.
- **DOM selectors**: The extension uses generic selectors that work with Angular/ag-Grid patterns. Some o9-specific class names may need adjustment per tenant version.
