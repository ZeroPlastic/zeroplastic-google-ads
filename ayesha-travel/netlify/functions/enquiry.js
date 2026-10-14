'use strict';

// Netlify function. netlify.toml redirects POST /api/enquiry here.
// Environment variables are set in Netlify → Site configuration → Environment variables.

const { handleEnquiry } = require('../../lib/enquiry');

exports.handler = async function handler(event) {
  const headers = {};
  for (const [k, v] of Object.entries(event.headers || {})) headers[k.toLowerCase()] = v;
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '';
  const result = await handleEnquiry({
    method: event.httpMethod,
    headers,
    body,
    ip: headers['x-nf-client-connection-ip'] || String(headers['x-forwarded-for'] || '').split(',')[0].trim(),
  });
  return {
    statusCode: result.status,
    headers: result.headers,
    body: result.body == null ? '' : JSON.stringify(result.body),
  };
};
