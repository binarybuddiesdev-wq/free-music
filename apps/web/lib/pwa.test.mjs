import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(WEB_DIR, 'public');

test('PWA manifest exists and is valid', () => {
  const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  assert.equal(manifest.name, 'Music');
  assert.equal(manifest.short_name, 'Music');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Must have at least 2 icons');
  assert.ok(Array.isArray(manifest.screenshots) && manifest.screenshots.length >= 1, 'Must have screenshots');

  const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
  const icon512 = manifest.icons.find((i) => i.sizes === '512x512');
  assert.ok(icon192, 'Must have 192x192 icon');
  assert.ok(icon512, 'Must have 512x512 icon');
});

test('PWA icon files exist and have valid PNG signatures', () => {
  const icon192Path = path.join(PUBLIC_DIR, 'icons', 'icon-192.png');
  const icon512Path = path.join(PUBLIC_DIR, 'icons', 'icon-512.png');

  assert.ok(fs.existsSync(icon192Path), 'icon-192.png must exist');
  assert.ok(fs.existsSync(icon512Path), 'icon-512.png must exist');

  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const buf192 = fs.readFileSync(icon192Path);
  assert.deepEqual(buf192.subarray(0, 8), pngHeader, 'icon-192.png must have PNG header');

  const buf512 = fs.readFileSync(icon512Path);
  assert.deepEqual(buf512.subarray(0, 8), pngHeader, 'icon-512.png must have PNG header');
});

test('Service worker is hand-written, versioned and never intercepts audio or API requests', () => {
  const swPath = path.join(PUBLIC_DIR, 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist');
  const content = fs.readFileSync(swPath, 'utf8');

  assert.ok(content.includes('offline.html'), 'Must reference offline.html fallback');
  assert.match(content, /const CACHE_VERSION = '/, 'Must declare CACHE_VERSION');
  assert.ok(!content.includes('precacheAndRoute'), 'Must not be a stale workbox build artifact');
  assert.ok(!content.includes('createPartialResponse') && !content.includes('_ref'), 'Must not call undefined helpers');
  assert.ok(content.includes("request.headers.has('range')"), 'Range (audio) requests must bypass the SW');
  assert.ok(content.includes("url.pathname.startsWith('/api/')"), 'API requests must bypass the SW');
});

test('No leftover workbox runtime files in public/', () => {
  const leftovers = fs.readdirSync(PUBLIC_DIR).filter((f) => /^workbox-.*\.js$/.test(f));
  assert.deepEqual(leftovers, []);
});

test('offline.html fallback page exists', () => {
  const offlinePath = path.join(PUBLIC_DIR, 'offline.html');
  assert.ok(fs.existsSync(offlinePath), 'offline.html must exist');
  const content = fs.readFileSync(offlinePath, 'utf8');
  assert.ok(content.includes("You're offline"), 'Must have offline message');
});
