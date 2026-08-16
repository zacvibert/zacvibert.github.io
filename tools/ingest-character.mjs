// Ingest pose art into an engine-ready sprite sheet, with scale calibration.
//
// Usage: node tools/ingest-character.mjs <character-id> [--contact]
//
// INPUT  art-src/<id>/poses/*.png — one file per animation, named by animation
//        key (idle.png, 5HP.png, hitstun.png…). Multi-frame animations are
//        either numbered files (5HP_1.png, 5HP_2.png, 5HP_3.png) or a single
//        horizontal strip (walkF@6.png). idle is required.
//
// CALIBRATION  art-src/<id>/calibration.json (optional but recommended):
//   {
//     "charH": 165,                        // idle height in game pixels
//     "autoLevel": ["walkF","5LP", ...],   // poses normalised to idle height
//     "poses": { "5HK": { "scale": 1.06, "dx": 0, "dy": 0 } }
//   }
// AI-generated poses are drawn at inconsistent zoom; "autoLevel" fixes upright
// poses automatically (their full-body height must equal idle's), and per-pose
// "scale" corrects the rest by eye using the contact sheet (--contact).
//
// OUTPUT public/assets/characters/<id>/{sheet.png,frames.json}
//        art-src/<id>/contact-sheet.png (with --contact) for QA.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const id = process.argv[2];
const wantContact = process.argv.includes('--contact');
if (!id) {
  console.error('usage: node tools/ingest-character.mjs <character-id> [--contact]');
  process.exit(1);
}

const srcDir = `art-src/${id}/poses`;
const outDir = `public/assets/characters/${id}`;
const calPath = `art-src/${id}/calibration.json`;

const STATE_KEYS = new Set([
  'idle', 'walkF', 'walkB', 'crouch', 'prejump', 'jump', 'hitstun', 'blockstun',
  'launched', 'knockdown', 'wakeup', 'throwHold', 'thrown', 'victory',
]);
const MOVE_KEYS = new Set([
  '5LP', '5MP', '5HP', '5LK', '5MK', '5HK', '2LK', '2HK', 'jP', 'jK', 'QCFP', 'DPP', 'throw',
]);
const ALIASES = [
  ['walkB', 'walkF'], ['prejump', 'crouch'], ['wakeup', 'crouch'],
  ['launched', 'hitstun'], ['thrown', 'hitstun'], ['throwHold', 'idle'],
];
// Upright, both-feet-planted poses: full-body height should match idle exactly.
const DEFAULT_AUTOLEVEL = ['walkF', '5LP', '5MP', '5HP', 'QCFP', 'blockstun', 'hitstun', 'throw'];

const cal = fs.existsSync(calPath) ? JSON.parse(fs.readFileSync(calPath, 'utf8')) : {};
const charH = cal.charH ?? 165;
const autoLevel = new Set(cal.autoLevel ?? DEFAULT_AUTOLEVEL);
const poseCal = cal.poses ?? {};

if (!fs.existsSync(srcDir)) {
  console.error(`no pose folder at ${srcDir}`);
  process.exit(1);
}

// group files by animation key
const groups = new Map();
for (const f of fs.readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.png'))) {
  const m = /^(.+?)(?:@(\d+))?(?:_(\d+))?\.png$/i.exec(f);
  const key = m[1];
  if (!STATE_KEYS.has(key) && !MOVE_KEYS.has(key)) {
    console.warn(`skipping ${f}: "${key}" is not a known animation key`);
    continue;
  }
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({
    file: f,
    order: m[3] ? Number(m[3]) : 0,
    strip: m[2] ? Number(m[2]) : 1,
    data: `data:image/png;base64,${fs.readFileSync(path.join(srcDir, f)).toString('base64')}`,
  });
}
for (const list of groups.values()) list.sort((a, b) => a.order - b.order);
if (!groups.has('idle')) {
  console.error('idle.png is required — it sets the scale for every other pose');
  process.exit(1);
}

const inputs = [...groups.entries()].map(([key, files]) => ({
  key,
  files,
  scale: poseCal[key]?.scale ?? 1,
  dx: poseCal[key]?.dx ?? 0,
  dy: poseCal[key]?.dy ?? 0,
  level: autoLevel.has(key),
}));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();

const result = await page.evaluate(async ({ inputs, charH, wantContact }) => {
  const load = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

  // Flood-fill background keying from the borders (plain backdrops only).
  const keyBackground = (imgData, w, h) => {
    const d = imgData.data;
    let opaque = true;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { opaque = false; break; }
    if (!opaque) return;
    const tol = 30;
    const ref = [d[0], d[1], d[2]];
    const near = (i) =>
      Math.abs(d[i] - ref[0]) < tol && Math.abs(d[i + 1] - ref[1]) < tol && Math.abs(d[i + 2] - ref[2]) < tol;
    const seen = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, x + (h - 1) * w);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      if (!near(p * 4)) continue;
      d[p * 4 + 3] = 0;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }
  };

  const trimBox = (imgData, w, h) => {
    const d = imgData.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };

  // pass 1 — key + trim every frame
  const anims = [];
  for (const inp of inputs) {
    const frames = [];
    for (const fileRec of inp.files) {
      const img = await load(fileRec.data);
      const n = fileRec.strip;
      const fw = Math.floor(img.width / n);
      for (let f = 0; f < n; f++) {
        const c = document.createElement('canvas');
        c.width = fw; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, f * fw, 0, fw, img.height, 0, 0, fw, img.height);
        const idata = g.getImageData(0, 0, fw, img.height);
        keyBackground(idata, fw, img.height);
        g.putImageData(idata, 0, 0);
        const box = trimBox(idata, fw, img.height);
        if (box) frames.push({ canvas: c, box });
      }
    }
    if (frames.length) anims.push({ ...inp, frames });
  }

  // pass 2 — per-animation scale factor
  const idle = anims.find((a) => a.key === 'idle');
  const idleSrcH = idle.frames[0].box.h;
  const baseScale = charH / idleSrcH;

  for (const a of anims) {
    // autoLevel: this pose stands upright, so make its body height match idle's
    const srcH = a.frames[0].box.h;
    const level = a.level ? idleSrcH / srcH : 1;
    a.finalScale = baseScale * level * a.scale;
  }

  // cell size fits every scaled frame
  let cellW = 0, cellH = 0, maxFrames = 1;
  for (const a of anims) {
    maxFrames = Math.max(maxFrames, a.frames.length);
    for (const f of a.frames) {
      cellW = Math.max(cellW, Math.ceil(f.box.w * a.finalScale) + 10);
      cellH = Math.max(cellH, Math.ceil(f.box.h * a.finalScale) + 10);
    }
  }
  cellW += cellW % 2; cellH += cellH % 2;
  const anchor = { x: Math.floor(cellW / 2), y: cellH - 5 };

  // pass 3 — compose the sheet, feet centred on the anchor
  const sheet = document.createElement('canvas');
  sheet.width = cellW * maxFrames;
  sheet.height = cellH * anims.length;
  const sg = sheet.getContext('2d');
  const animations = {};
  anims.forEach((a, row) => {
    a.frames.forEach((f, col) => {
      const dw = f.box.w * a.finalScale, dh = f.box.h * a.finalScale;
      sg.drawImage(
        f.canvas, f.box.x, f.box.y, f.box.w, f.box.h,
        col * cellW + anchor.x - dw / 2 + a.dx,
        row * cellH + anchor.y - dh + a.dy,
        dw, dh,
      );
    });
    animations[a.key] = { row, frames: a.frames.length };
  });

  // QA contact sheet: every pose feet-aligned with idle's head line drawn across
  let contact = null;
  if (wantContact) {
    const cols = 7;
    const rows = Math.ceil(anims.length / cols);
    const cw = cellW + 20, ch = cellH + 30;
    const cc = document.createElement('canvas');
    cc.width = cols * cw; cc.height = rows * ch;
    const cg = cc.getContext('2d');
    cg.fillStyle = '#1b1b24';
    cg.fillRect(0, 0, cc.width, cc.height);
    anims.forEach((a, i) => {
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
      const baseline = cy + ch - 22;
      // idle head-height reference line
      cg.strokeStyle = '#ff4466';
      cg.setLineDash([4, 4]);
      cg.beginPath();
      cg.moveTo(cx, baseline - charH); cg.lineTo(cx + cw, baseline - charH);
      cg.stroke();
      cg.setLineDash([]);
      cg.strokeStyle = '#44ff88';
      cg.beginPath();
      cg.moveTo(cx, baseline); cg.lineTo(cx + cw, baseline);
      cg.stroke();
      const f = a.frames[0];
      const dw = f.box.w * a.finalScale, dh = f.box.h * a.finalScale;
      cg.drawImage(
        f.canvas, f.box.x, f.box.y, f.box.w, f.box.h,
        cx + cw / 2 - dw / 2 + a.dx, baseline - dh + a.dy, dw, dh,
      );
      cg.fillStyle = '#ffffff';
      cg.font = '12px monospace';
      cg.textAlign = 'center';
      cg.fillText(`${a.key} ${a.finalScale.toFixed(3)}${a.level ? ' L' : ''}`, cx + cw / 2, cy + ch - 6);
    });
    contact = cc.toDataURL('image/png');
  }

  return {
    sheet: sheet.toDataURL('image/png'),
    contact, cellW, cellH, anchor, animations,
    scales: Object.fromEntries(anims.map((a) => [a.key, +a.finalScale.toFixed(4)])),
  };
}, { inputs, charH, wantContact });

await browser.close();

const MOVE_SYNC = MOVE_KEYS;
const HOLD_LAST = new Set(['hitstun', 'blockstun', 'knockdown', 'launched', 'thrown', 'victory']);
const animations = {};
for (const [key, def] of Object.entries(result.animations)) {
  animations[key] = { row: def.row, frames: def.frames };
  if (MOVE_SYNC.has(key)) animations[key].sync = 'move';
  else if (def.frames > 1) animations[key].fps = key === 'idle' ? 8 : 10;
  if (HOLD_LAST.has(key)) animations[key].loop = false;
}
for (const [missing, from] of ALIASES) {
  if (!animations[missing] && animations[from]) animations[missing] = { ...animations[from] };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/sheet.png`, Buffer.from(result.sheet.split(',')[1], 'base64'));
fs.writeFileSync(`${outDir}/frames.json`, JSON.stringify({
  cell: { w: result.cellW, h: result.cellH },
  anchor: result.anchor,
  animations,
}, null, 2));
if (result.contact) {
  fs.writeFileSync(`art-src/${id}/contact-sheet.png`, Buffer.from(result.contact.split(',')[1], 'base64'));
  console.log(`wrote art-src/${id}/contact-sheet.png`);
}

console.log(`wrote ${outDir}/sheet.png (${result.cellW}x${result.cellH} cells, charH ${charH}) + frames.json`);
console.log('scales:', JSON.stringify(result.scales));
