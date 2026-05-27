import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces

// Enable gzip compression for faster loading
app.use(compression());

// Serve static files from the production build
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',       // Cache static assets for 1 day
  etag: true,
  lastModified: true,
}));

// SPA fallback — serve index.html for all client-side routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Get all network IPs
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

app.listen(PORT, HOST, () => {
  const networkIPs = getNetworkIPs();

  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║       o9 Report Optimizer Agent — Server Running        ║');
  console.log('  ╠══════════════════════════════════════════════════════════╣');
  console.log(`  ║  Local:     http://localhost:${PORT}/                      ║`);
  networkIPs.forEach(ip => {
    const url = `http://${ip.address}:${PORT}/`;
    const pad = ' '.repeat(Math.max(0, 40 - url.length));
    console.log(`  ║  Network:   ${url}${pad}║`);
  });
  console.log('  ╠══════════════════════════════════════════════════════════╣');
  console.log('  ║  Share the Network URL above to access from any VDI    ║');
  console.log('  ║  or machine on the same network.                       ║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log('');
});
