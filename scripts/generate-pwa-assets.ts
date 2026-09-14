import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function makePNG(
  width: number,
  height: number,
  getPixel: (x: number, y: number, w: number, h: number) => [number, number, number, number]
): Buffer {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(rawData);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = chunk('IHDR', ihdrData);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Ensure public dir exists
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Dark Rounded App Canvas -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" stroke="#27272a" stroke-width="8" />

  <!-- Oscilloscope Background Grid -->
  <g opacity="0.15" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,4">
    <line x1="80" y1="160" x2="432" y2="160" />
    <line x1="80" y1="256" x2="432" y2="256" />
    <line x1="80" y1="352" x2="432" y2="352" />
    <line x1="168" y1="80" x2="168" y2="432" />
    <line x1="256" y1="80" x2="256" y2="432" />
    <line x1="344" y1="80" x2="344" y2="432" />
  </g>

  <!-- Outer Ring Accent -->
  <circle cx="256" cy="256" r="172" fill="none" stroke="#27272a" stroke-width="6" />

  <!-- Central CAN Pulse Shield -->
  <rect x="116" y="116" width="280" height="280" rx="48" fill="#18181b" stroke="#3f3f46" stroke-width="4" />

  <!-- CAN High & Low Differential Trace Waves -->
  <!-- CAN High (Recessive 2.5V -> Dominant 3.5V) -->
  <path d="M 140 230 L 190 230 L 205 180 L 255 180 L 270 230 L 310 230 L 325 180 L 350 180 L 372 230"
        fill="none" stroke="url(#accentGrad)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />

  <!-- CAN Low (Recessive 2.5V -> Dominant 1.5V) -->
  <path d="M 140 282 L 190 282 L 205 332 L 255 332 L 270 282 L 310 282 L 325 332 L 350 332 L 372 282"
        fill="none" stroke="#38bdf8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />

  <!-- Bus Node Connection Dots -->
  <circle cx="140" cy="230" r="8" fill="#22d3ee" />
  <circle cx="372" cy="230" r="8" fill="#818cf8" />
  <circle cx="140" cy="282" r="7" fill="#38bdf8" />
  <circle cx="372" cy="282" r="7" fill="#38bdf8" />

  <!-- Central Indicator Beacon -->
  <circle cx="256" cy="116" r="10" fill="#34d399" />
  <circle cx="256" cy="116" r="18" fill="none" stroke="#34d399" stroke-width="3" opacity="0.5" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Created public/icon.svg');

// Renderer helper for PNG pixels
function getCANPixel(x: number, y: number, w: number, h: number, isMaskable: boolean): [number, number, number, number] {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background
  const bgR = 10, bgG = 10, bgB = 14;

  if (isMaskable) {
    // Full bleed dark background with subtle radial gradient
    const t = Math.min(1, dist / r);
    const gradR = Math.round(14 + (10 - 14) * t);
    const gradG = Math.round(20 + (10 - 20) * t);
    const gradB = Math.round(30 + (14 - 30) * t);

    // Inner icon zone: within 70% radius
    const innerScale = 0.65;
    const nx = (dx / (r * innerScale));
    const ny = (dy / (r * innerScale));

    if (Math.abs(nx) <= 1 && Math.abs(ny) <= 1) {
      // Inside icon box
      // Draw square badge
      const boxR = 0.85;
      if (Math.abs(nx) < boxR && Math.abs(ny) < boxR) {
        // Draw differential wave
        const py1 = -0.15; // CAN H
        const py2 = 0.15;  // CAN L
        
        // Check if on pulse
        let pulseH = false;
        let pulseL = false;

        // Wave shape
        // -0.8 to -0.4: base
        // -0.4 to -0.2: rise to -0.45
        // -0.2 to 0.1: high at -0.45
        // 0.1 to 0.3: fall to base
        // 0.3 to 0.5: rise to -0.45
        // 0.5 to 0.8: base
        let waveY_H = py1;
        let waveY_L = py2;

        if (nx >= -0.3 && nx <= 0.0) {
          waveY_H = py1 - 0.3;
          waveY_L = py2 + 0.3;
        } else if (nx >= 0.25 && nx <= 0.55) {
          waveY_H = py1 - 0.3;
          waveY_L = py2 + 0.3;
        }

        const distH = Math.abs(ny - waveY_H);
        const distL = Math.abs(ny - waveY_L);

        if (distH < 0.08) {
          return [34, 211, 238, 255]; // Cyan 400
        }
        if (distL < 0.07) {
          return [56, 189, 248, 240]; // Sky 400
        }

        return [24, 24, 28, 255]; // Box fill
      }
    }
    return [gradR, gradG, gradB, 255];
  } else {
    // Rounded rect icon for 'any'
    const cornerRadius = r * 0.44;
    const qx = Math.max(0, Math.abs(dx) - (r - cornerRadius));
    const qy = Math.max(0, Math.abs(dy) - (r - cornerRadius));
    const cornerDist = Math.sqrt(qx * qx + qy * qy);

    if (cornerDist > cornerRadius) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }

    // Border
    if (cornerDist > cornerRadius - 4 || Math.abs(dx) > r - 3 || Math.abs(dy) > r - 3) {
      return [63, 63, 70, 255];
    }

    // Inside
    const nx = dx / (r * 0.85);
    const ny = dy / (r * 0.85);

    // Differential wave
    let waveY_H = -0.15;
    let waveY_L = 0.15;

    if (nx >= -0.35 && nx <= -0.05) {
      waveY_H = -0.45;
      waveY_L = 0.45;
    } else if (nx >= 0.2 && nx <= 0.5) {
      waveY_H = -0.45;
      waveY_L = 0.45;
    }

    const distH = Math.abs(ny - waveY_H);
    const distL = Math.abs(ny - waveY_L);

    if (distH < 0.09) {
      return [34, 211, 238, 255]; // Cyan pulse
    }
    if (distL < 0.08) {
      return [56, 189, 248, 240]; // Sky pulse
    }

    return [15, 17, 23, 255];
  }
}

// Generate PNGs
console.log('Generating PWA PNG icons...');
const png192 = makePNG(192, 192, (x, y, w, h) => getCANPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

const png512 = makePNG(512, 512, (x, y, w, h) => getCANPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

const pngMaskable512 = makePNG(512, 512, (x, y, w, h) => getCANPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);

const appleTouch = makePNG(180, 180, (x, y, w, h) => getCANPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

const favicon = makePNG(32, 32, (x, y, w, h) => getCANPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);

console.log('All PWA assets successfully generated in public/ directory!');
