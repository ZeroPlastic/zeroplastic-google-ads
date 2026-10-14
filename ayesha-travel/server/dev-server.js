'use strict';

/**
 * Local preview server — serves the static site and POST /api/enquiry.
 * Uses only Node built-ins. Run with:  npm run dev   (reads .env if present)
 *
 * Also suitable for a simple Node host (e.g. a VPS or Render) behind HTTPS.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleEnquiry, LIMITS } = require('../lib/enquiry');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;
// Only these top-level paths are served as static files; server code and .env never are.
const PUBLIC = ['index.html', 'credits.html', 'assets', 'robots.txt'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.resolve(ROOT, rel);
  const top = rel.split('/')[0];
  if (!file.startsWith(ROOT + path.sep) || !PUBLIC.includes(top)) return notFound(res);
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return notFound(res);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > LIMITS.totalBody) {
        resolve(data);
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/enquiry') {
      const body = req.method === 'POST' ? await readBody(req) : '';
      const result = await handleEnquiry({
        method: req.method,
        headers: req.headers,
        body,
        ip: req.socket.remoteAddress,
      });
      res.writeHead(result.status, result.headers);
      return res.end(result.body == null ? '' : JSON.stringify(result.body));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    serveStatic(req, res);
  });
}

if (require.main === module) {
  loadDotEnv();
  createServer().listen(PORT, () => {
    const configured = ['RESEND_API_KEY', 'ENQUIRY_TO_EMAIL', 'ENQUIRY_FROM_EMAIL'].filter((k) => !process.env[k]);
    console.log(`Ayesha Travel running at http://localhost:${PORT}`);
    if (configured.length) console.log(`Email delivery NOT configured (missing ${configured.join(', ')}). Enquiries will show an error.`);
  });
}

module.exports = { createServer };
