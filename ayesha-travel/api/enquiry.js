'use strict';

// Vercel serverless function: POST /api/enquiry
// Environment variables are set in Vercel → Project → Settings → Environment Variables.

const { handleEnquiry, LIMITS } = require('../lib/enquiry');

function readRawBody(req) {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
  if (req.body && typeof req.body === 'object') return Promise.resolve(JSON.stringify(req.body));
  return new Promise((resolve, reject) => {
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
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  let body = '';
  try {
    body = req.method === 'POST' ? await readRawBody(req) : '';
  } catch (_) {
    body = '';
  }
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const result = await handleEnquiry({
    method: req.method,
    headers: req.headers,
    body,
    ip: forwarded || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '',
  });
  res.statusCode = result.status;
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.end(result.body == null ? '' : JSON.stringify(result.body));
};
