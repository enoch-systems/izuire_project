/**
 * Minimal static server for the built app, with the SPA fallback the router
 * needs so a deep link like /marketplace is not a 404. One-off; safe to delete.
 *
 *   node tools/serve-dist.mjs [port] [dir]
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.argv[2] || 4300);
const root = process.argv[3] || 'dist/izuire/browser';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // normalize() collapses any ../ before it is joined, so a crafted path
  // cannot walk out of the served directory.
  const rel = normalize(path).replace(/^([/\\])+/, '');
  const file = join(root, rel);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    try {
      const shell = await readFile(join(root, 'index.html'));
      res.writeHead(200, { 'content-type': TYPES['.html'] });
      res.end(shell);
    } catch {
      res.writeHead(404).end('not found');
    }
  }
}).listen(port, '127.0.0.1', () => console.log('serving', root, 'on', port));
