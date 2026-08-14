// Packs the built game into ONE self-contained .html file that runs by
// double-clicking it — no server, no install, no internet. Every asset is
// embedded as a data URI. Ideal for demos on a laptop or emailing a build.
//
// Usage: npm run build && node tools/build-standalone.mjs [outfile]

import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'viktor-v-demo.html';
const dist = 'dist';

if (!fs.existsSync(dist)) {
  console.error('run `npm run build` first');
  process.exit(1);
}

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.json': 'application/json',
};

// collect every asset under dist/assets, keyed by path relative to assets/
const assets = {};
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    const key = path.relative(path.join(dist, 'assets'), full).split(path.sep).join('/');
    const ext = path.extname(entry.name).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    assets[key] = `data:${mime};base64,${fs.readFileSync(full).toString('base64')}`;
  }
};
if (fs.existsSync(path.join(dist, 'assets'))) walk(path.join(dist, 'assets'));

let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

// inline the bundled script(s), dropping the module tag that points at a file
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g, (_m, src) => {
  const file = path.join(dist, src.replace(/^\//, ''));
  if (!fs.existsSync(file)) return '';
  return `<script type="module">\n${fs.readFileSync(file, 'utf8')}\n</script>`;
});
// inline any stylesheet links
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_m, href) => {
  const file = path.join(dist, href.replace(/^\//, ''));
  if (!fs.existsSync(file)) return '';
  return `<style>\n${fs.readFileSync(file, 'utf8')}\n</style>`;
});

// asset map must exist before the module runs
html = html.replace('</head>',
  `<script>window.__INLINE_ASSETS=${JSON.stringify(assets)};</script>\n</head>`);

fs.writeFileSync(out, html);
const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`wrote ${out} (${mb} MB, ${Object.keys(assets).length} assets embedded)`);
