// Ingest user-made pose images into an engine-ready sprite sheet.
//
// Usage: node tools/ingest-character.mjs <character-id> [--charH 112]
//
// Reads art-src/<id>/poses/*.png where each file is one animation:
//   idle.png        -> single still pose for the "idle" animation
//   walkF@6.png     -> horizontal strip of 6 equal frames for "walkF"
// Accepted keys: engine states (idle, walkF, walkB, crouch, prejump, jump,
// hitstun, blockstun, launched, knockdown, wakeup, throwHold, thrown, victory)
// and move ids (5LP..5HK, 2LK, 2HK, jP, jK, QCFP, DPP, throw).
//
// Does automatically: background keying (flood fill from the borders, so a
// plain white/green backdrop becomes transparency without eating the costume),
// trimming, uniform scaling (idle pose height -> charH px), feet anchoring at
// bottom-center, packing into public/assets/characters/<id>/sheet.png and
// frames.json. Missing keys are aliased where sensible (walkB->walkF,
// prejump/wakeup->crouch, launched/thrown->hitstun) and otherwise fall back
// to the procedural renderer in-game.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const id = process.argv[2];
if (!id) {
  console.error('usage: node tools/ingest-character.mjs <character-id> [--charH 112]');
  process.exit(1);
}
const charH = Number(process.argv[process.argv.indexOf('--charH') + 1]) || 112;
const srcDir = `art-src/${id}/poses`;
const outDir = `public/assets/characters/${id}`;

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

if (!fs.existsSync(srcDir)) {
  console.error(`no pose folder at ${srcDir} — upload PNGs there first (see docs/SPRITE_SPEC.md)`);
  process.exit(1);
}
const inputs = fs.readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.png')).map((f) => {
  const m = /^(.+?)(?:@(\d+))?\.png$/i.exec(f);
  const key = m[1];
  if (!STATE_KEYS.has(key) && !MOVE_KEYS.has(key)) {
    console.warn(`skipping ${f}: "${key}" is not a known animation key`);
    return null;
  }
  return {
    key,
    frames: m[2] ? Number(m[2]) : 1,
    data: `data:image/png;base64,${fs.readFileSync(path.join(srcDir, f)).toString('base64')}`,
  };
}).filter(Boolean);

if (!inputs.some((i) => i.key === 'idle')) {
  console.error('idle.png is required — it sets the character scale for every other pose');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();

const result = await page.evaluate(async ({ inputs, charH }) => {
  const load = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

  // Flood-fill background keying from the borders.
  const keyBackground = (imgData, w, h) => {
    const d = imgData.data;
    let opaque = true;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { opaque = false; break; }
    if (!opaque) return; // already has transparency, trust it
    const tol = 28;
    const ref = [d[0], d[1], d[2]];
    const near = (i) =>
      Math.abs(d[i] - ref[0]) < tol && Math.abs(d[i + 1] - ref[1]) < tol && Math.abs(d[i + 2] - ref[2]) < tol;
    const seen = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) { stack.push(x, x + (h - 1) * w); }
    for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
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

  // pass 1: key + trim every frame of every input
  const anims = [];
  for (const inp of inputs) {
    const img = await load(inp.data);
    const fw = Math.floor(img.width / inp.frames);
    const frames = [];
    for (let f = 0; f < inp.frames; f++) {
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
    if (frames.length) anims.push({ key: inp.key, frames });
  }

  // uniform scale from the idle pose
  const idle = anims.find((a) => a.key === 'idle');
  const scale = charH / idle.frames[0].box.h;

  // cell size fits every scaled frame
  let cellW = 0, cellH = 0, maxFrames = 1;
  for (const a of anims) {
    maxFrames = Math.max(maxFrames, a.frames.length);
    for (const f of a.frames) {
      cellW = Math.max(cellW, Math.ceil(f.box.w * scale) + 8);
      cellH = Math.max(cellH, Math.ceil(f.box.h * scale) + 8);
    }
  }
  cellW += cellW % 2; cellH += cellH % 2;
  const anchor = { x: Math.floor(cellW / 2), y: cellH - 4 };

  // pass 2: compose the sheet — feet (bottom-center of trimmed box) on the anchor
  const sheet = document.createElement('canvas');
  sheet.width = cellW * maxFrames;
  sheet.height = cellH * anims.length;
  const sg = sheet.getContext('2d');
  sg.imageSmoothingEnabled = true;
  const animations = {};
  anims.forEach((a, row) => {
    a.frames.forEach((f, col) => {
      const dw = f.box.w * scale, dh = f.box.h * scale;
      sg.drawImage(
        f.canvas, f.box.x, f.box.y, f.box.w, f.box.h,
        col * cellW + anchor.x - dw / 2, row * cellH + anchor.y - dh, dw, dh,
      );
    });
    animations[a.key] = { row, frames: a.frames.length };
  });

  return { sheet: sheet.toDataURL('image/png'), cellW, cellH, anchor, animations };
}, { inputs, charH });

await browser.close();

// finalize frames.json: playback settings + aliases
const MOVE_SYNC = new Set([...MOVE_KEYS]);
const HOLD_LAST = new Set(['hitstun', 'blockstun', 'knockdown', 'launched', 'thrown']);
const animations = {};
for (const [key, def] of Object.entries(result.animations)) {
  animations[key] = { row: def.row, frames: def.frames };
  if (MOVE_SYNC.has(key)) animations[key].sync = 'move';
  else if (def.frames > 1) animations[key].fps = 10;
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

console.log(`wrote ${outDir}/sheet.png (${result.cellW}x${result.cellH} cells) + frames.json`);
console.log(`animations: ${Object.keys(animations).join(', ')}`);
