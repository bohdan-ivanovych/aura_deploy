import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Try to find pngjs in node_modules
let PNG;
try {
  ({ PNG } = require('pngjs'));
} catch {
  // walk up to find it
  const mods = path.resolve(__dirname, '../../../node_modules/.pnpm');
  const { readdirSync } = await import('fs');
  const found = readdirSync(mods).find(d => d.startsWith('pngjs@'));
  if (found) {
    ({ PNG } = require(path.join(mods, found, 'node_modules', 'pngjs')));
  }
}

if (!PNG) {
  console.error('pngjs not found');
  process.exit(1);
}

// BG color #090F1A
const BG = { r: 9, g: 15, b: 26 };
const FG = { r: 255, g: 255, b: 255 };
const SUB = { r: 255, g: 255, b: 255, a: 102 }; // rgba(255,255,255,0.4)

// Minimal 5x7 bitmap font for uppercase latin + special chars
// Each char is an array of 7 rows, each row is a 5-bit bitmask
const FONT5x7 = {
  'A': [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'U': [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'R': [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  '▼': [0b00000,0b00000,0b11111,0b01110,0b00100,0b00000,0b00000],
};

function drawText(png, text, startX, startY, scale, color) {
  const charW = 5 * scale;
  const charH = 7 * scale;
  const charSpacing = scale;
  let cx = startX;
  for (const ch of text) {
    const bitmap = FONT5x7[ch] || FONT5x7['A'];
    for (let row = 0; row < 7; row++) {
      const bits = bitmap[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cx + col * scale + sx;
              const py = startY + row * scale + sy;
              if (px >= 0 && px < png.width && py >= 0 && py < png.height) {
                const idx = (py * png.width + px) * 4;
                png.data[idx]     = color.r;
                png.data[idx + 1] = color.g;
                png.data[idx + 2] = color.b;
                png.data[idx + 3] = color.a !== undefined ? color.a : 255;
              }
            }
          }
        }
      }
    }
    cx += charW + charSpacing;
  }
}

function textWidth(text, scale) {
  return text.length * (5 * scale + scale) - scale;
}

async function generateSplash(width, height, outPath) {
  const png = new PNG({ width, height, filterType: -1 });

  // Fill background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      png.data[idx]     = BG.r;
      png.data[idx + 1] = BG.g;
      png.data[idx + 2] = BG.b;
      png.data[idx + 3] = 255;
    }
  }

  // Draw "AURA" text centered — 64px = scale 9
  const auraText = 'AURA';
  const auraScale = 9;
  const auraW = textWidth(auraText, auraScale);
  const auraH = 7 * auraScale;
  const auraX = Math.floor((width - auraW) / 2);
  const auraY = Math.floor(height / 2) - auraH - auraScale * 3;
  drawText(png, auraText, auraX, auraY, auraScale, FG);

  // Draw "▼" symbol — 32px = scale 4
  const arrowText = '▼';
  const arrowScale = 4;
  const arrowW = textWidth(arrowText, arrowScale);
  const arrowX = Math.floor((width - arrowW) / 2);
  const arrowY = auraY + auraH + auraScale * 4;
  drawText(png, arrowText, arrowX, arrowY, arrowScale, { ...SUB });

  await mkdir(path.dirname(outPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const ws = createWriteStream(outPath);
    png.pack().pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
}

const publicDir = path.resolve(__dirname, '../public/splash');
await generateSplash(1170, 2532, path.join(publicDir, 'splash-1170.png'));
console.log('Generated splash-1170.png');
await generateSplash(1290, 2796, path.join(publicDir, 'splash-1290.png'));
console.log('Generated splash-1290.png');
