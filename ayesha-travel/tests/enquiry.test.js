'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnquiry, isLikelySpam, createRateLimiter, buildEmail, handleEnquiry } = require('../lib/enquiry');

const NOW = new Date('2026-10-14T09:00:00Z');

function valid(overrides = {}) {
  return {
    fullName: 'Jane Traveller',
    email: 'jane@example.com',
    stayLength: '10 to 14 days',
    destinations: ['Kandy', 'Ella'],
    consent: true,
    formStartedAt: Date.now() - 60000,
    ...overrides,
  };
}

const ENV = {
  RESEND_API_KEY: 're_test',
  ENQUIRY_TO_EMAIL: 'ayesha@example.com',
  ENQUIRY_FROM_EMAIL: 'Ayesha Travel <enquiries@example.com>',
};

const silent = { info() {}, warn() {}, error() {} };

function request(body, extra = {}) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(extra.headers || {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ip: extra.ip || '203.0.113.1',
  };
}

function okFetch(calls) {
  return async (url, init) => {
    calls.push({ url, init, payload: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ id: 'email_123' }) };
  };
}

const freshLimiter = () => createRateLimiter({ max: 100, windowMs: 60000 });

test('accepts a minimal valid enquiry', () => {
  const r = validateEnquiry(valid(), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.data.datesStatus, 'undecided');
  assert.equal(r.data.budgetUndecided, true);
});

test('requires name, email, stay length, destinations and consent', () => {
  const r = validateEnquiry({}, NOW);
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['consent', 'destinations', 'email', 'fullName', 'stayLength']);
});

test('accepts "Help me choose" in place of destinations', () => {
  assert.equal(validateEnquiry(valid({ destinations: ['Help me choose'] }), NOW).ok, true);
});

test('validates date order and rejects past dates', () => {
  let r = validateEnquiry(valid({ datesStatus: 'fixed', arrivalDate: '2026-12-10', departureDate: '2026-12-05' }), NOW);
  assert.match(r.errors.departureDate, /after your arrival/);
  r = validateEnquiry(valid({ datesStatus: 'fixed', arrivalDate: '2026-01-01' }), NOW);
  assert.match(r.errors.arrivalDate, /past/);
  r = validateEnquiry(valid({ datesStatus: 'approximate', arrivalDate: '2026-02-30' }), NOW);
  assert.match(r.errors.arrivalDate, /valid/);
  r = validateEnquiry(valid({ datesStatus: 'approximate', arrivalDate: '2026-12-01', departureDate: '2026-12-15' }), NOW);
  assert.equal(r.ok, true);
});

test('ignores dates when the visitor has not decided', () => {
  const r = validateEnquiry(valid({ datesStatus: 'undecided', arrivalDate: '2020-01-01' }), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.data.arrivalDate, '');
});

test('validates traveller numbers and budget', () => {
  let r = validateEnquiry(valid({ adults: '0', children: '2.5' }), NOW);
  assert.ok(r.errors.adults && r.errors.children);
  r = validateEnquiry(valid({ adults: '2', children: '0', budgetAmount: '-50' }), NOW);
  assert.ok(r.errors.budgetAmount);
  r = validateEnquiry(valid({ adults: '2', budgetAmount: '4,500', budgetCurrency: 'GBP', budgetBasis: 'per person' }), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.data.budgetAmount, '4500');
});

test('enforces length limits and WhatsApp format', () => {
  let r = validateEnquiry(valid({ fullName: 'x'.repeat(101), message: 'y'.repeat(3001) }), NOW);
  assert.ok(r.errors.fullName && r.errors.message);
  r = validateEnquiry(valid({ whatsapp: '07700 900123' }), NOW);
  assert.ok(r.errors.whatsapp);
  assert.equal(validateEnquiry(valid({ whatsapp: '+44 7700 900123' }), NOW).ok, true);
});

test('drops unknown checkbox values', () => {
  const r = validateEnquiry(valid({ interests: ['Culture', 'Hacking'], arrangements: ['Airport transfers', '<b>x</b>'] }), NOW);
  assert.deepEqual(r.data.interests, ['Culture']);
  assert.deepEqual(r.data.arrangements, ['Airport transfers']);
});

test('detects honeypot and too-fast submissions', () => {
  assert.equal(isLikelySpam({ website: 'http://spam' }), true);
  assert.equal(isLikelySpam({ formStartedAt: Date.now() - 500 }), true);
  assert.equal(isLikelySpam({ formStartedAt: Date.now() - 10000 }), false);
});

test('rate limiter blocks after the limit', () => {
  const limit = createRateLimiter({ max: 2, windowMs: 1000 });
  assert.equal(limit('a', 0).allowed, true);
  assert.equal(limit('a', 1).allowed, true);
  assert.equal(limit('a', 2).allowed, false);
  assert.equal(limit('b', 2).allowed, true);
  assert.equal(limit('a', 2000).allowed, true);
});

test('email escapes user-provided HTML', () => {
  const r = validateEnquiry(valid({ fullName: '<script>alert(1)</script>', message: '<img src=x onerror=alert(1)>\nLine two' }), NOW);
  const email = buildEmail(r.data, NOW);
  assert.ok(!email.html.includes('<script>'));
  assert.ok(!email.html.includes('<img src=x'));
  assert.ok(email.html.includes('&lt;script&gt;'));
  assert.ok(email.text.includes('Line two'));
});

test('sends a formatted email with Reply-To set to the visitor', async () => {
  const calls = [];
  const res = await handleEnquiry(
    request(valid({ country: 'United Kingdom', whatsapp: '+44 7700 900123', interests: ['Wildlife'], message: 'Step-free access please.' })),
    { env: ENV, fetch: okFetch(calls), rateLimiter: freshLimiter(), logger: silent }
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(calls.length, 1);
  const { url, init, payload } = calls[0];
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(init.headers.Authorization, 'Bearer re_test');
  assert.deepEqual(payload.to, ['ayesha@example.com']);
  assert.equal(payload.from, ENV.ENQUIRY_FROM_EMAIL);
  assert.equal(payload.reply_to, 'Jane Traveller <jane@example.com>');
  assert.match(payload.subject, /Jane Traveller/);
  for (const expected of ['United Kingdom', '+44 7700 900123', 'Kandy, Ella', 'Wildlife', 'Step-free access please.']) {
    assert.ok(payload.text.includes(expected), `text contains ${expected}`);
  }
});

test('reports failure when the email provider rejects the message', async () => {
  const failing = async () => ({ ok: false, status: 403, json: async () => ({ name: 'validation_error', message: 'domain not verified' }) });
  const res = await handleEnquiry(request(valid()), { env: ENV, fetch: failing, rateLimiter: freshLimiter(), logger: silent });
  assert.equal(res.status, 502);
  assert.equal(res.body.ok, false);
});

test('reports failure when the provider is unreachable', async () => {
  const throwing = async () => { throw new Error('network down'); };
  const res = await handleEnquiry(request(valid()), { env: ENV, fetch: throwing, rateLimiter: freshLimiter(), logger: silent });
  assert.equal(res.status, 502);
});

test('never reports success when email is not configured', async () => {
  const calls = [];
  const res = await handleEnquiry(request(valid()), { env: {}, fetch: okFetch(calls), rateLimiter: freshLimiter(), logger: silent });
  assert.equal(res.status, 503);
  assert.equal(res.body.ok, false);
  assert.equal(calls.length, 0);
});

test('returns field errors for invalid submissions without sending', async () => {
  const calls = [];
  const res = await handleEnquiry(request(valid({ email: 'nope' })), { env: ENV, fetch: okFetch(calls), rateLimiter: freshLimiter(), logger: silent });
  assert.equal(res.status, 422);
  assert.ok(res.body.errors.email);
  assert.equal(calls.length, 0);
});

test('rejects honeypot submissions without sending', async () => {
  const calls = [];
  const res = await handleEnquiry(request(valid({ website: 'filled' })), { env: ENV, fetch: okFetch(calls), rateLimiter: freshLimiter(), logger: silent });
  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test('applies rate limiting, method, content-type, size and origin checks', async () => {
  const opts = { env: ENV, fetch: okFetch([]), rateLimiter: createRateLimiter({ max: 1, windowMs: 60000 }), logger: silent };
  assert.equal((await handleEnquiry(request(valid()), opts)).status, 200);
  assert.equal((await handleEnquiry(request(valid()), opts)).status, 429);

  const o2 = { ...opts, rateLimiter: freshLimiter() };
  assert.equal((await handleEnquiry({ method: 'GET', headers: {} }, o2)).status, 405);
  assert.equal((await handleEnquiry({ ...request(valid()), headers: { 'content-type': 'text/plain' } }, o2)).status, 415);
  assert.equal((await handleEnquiry(request('x'.repeat(25000)), o2)).status, 413);
  assert.equal((await handleEnquiry(request('{not json'), o2)).status, 400);

  const o3 = { ...o2, env: { ...ENV, ALLOWED_ORIGINS: 'https://ayesha.example' } };
  assert.equal((await handleEnquiry(request(valid(), { headers: { origin: 'https://evil.example' } }), o3)).status, 403);
  assert.equal((await handleEnquiry(request(valid(), { headers: { origin: 'https://ayesha.example' } }), o3)).status, 200);
});
