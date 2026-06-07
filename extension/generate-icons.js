/**
 * generate-icons.js
 * Run once with Node.js to create PNG icons for the extension.
 * Usage: node generate-icons.js
 * 
 * Requires: npm install canvas (run in extension/ directory)
 * 
 * NOTE: If you can't run this, you can also:
 *   1. Use any image editor to create 16x16, 48x48, 128x128 PNGs in icons/
 *   2. Or remove the "icons" fields from manifest.json (extension will use default icon)
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 48, 128];
const ICONS_DIR = path.join(__dirname, 'icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

SIZES.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background rounded rect (approximate with full circle for small sizes)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#6366f1');

  const radius = size <= 16 ? 3 : size <= 48 ? 10 : 22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Text "o9"
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = size <= 16 ? 7 : size <= 48 ? 20 : 52;
  ctx.font = `900 ${fontSize}px sans-serif`;
  ctx.fillText('o9', size / 2, size / 2 + (size <= 16 ? 0.5 : 1));

  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(ICONS_DIR, `icon${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Created ${filePath}`);
});

console.log('\nIcons generated successfully! ✨');
