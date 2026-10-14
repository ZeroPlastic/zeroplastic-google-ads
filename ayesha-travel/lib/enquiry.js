'use strict';

/**
 * Ayesha Travel — enquiry handling core.
 *
 * Platform-neutral: validates a submitted enquiry, applies a honeypot and a
 * basic rate limit, formats a plain-text + HTML email, and sends it through
 * the Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 *
 * Thin adapters wrap this for Vercel (api/enquiry.js), Netlify
 * (netlify/functions/enquiry.js) and the local dev server (server/dev-server.js).
 *
 * Configuration comes only from environment variables — see .env.example.
 * Nothing in this file is ever sent to the browser.
 */

const LIMITS = {
  fullName: 100,
  email: 254,
  country: 80,
  whatsapp: 24,
  listItem: 60,
  listCount: 20,
  accommodation: 60,
  budgetAmount: 12,
  message: 3000,
  totalBody: 20000,
};

const STAY_LENGTHS = [
  'Up to 5 days',
  '6 to 9 days',
  '10 to 14 days',
  '15 to 21 days',
  'More than 3 weeks',
  'Not sure yet',
];
const DATE_STATUSES = ['fixed', 'approximate', 'undecided'];
const INTERESTS = ['Culture', 'Nature', 'Wildlife', 'Beaches', 'Local crafts', 'Food', 'Adventure'];
const ARRANGEMENTS = [
  'Airport transfers',
  'Driver and vehicle',
  'Accommodation assistance',
  'Guided experiences',
  'Complete itinerary',
  'Not sure yet',
];
const ACCOMMODATION = [
  '',
  'No preference',
  'Guesthouses and homestays',
  'Mid-range hotels',
  'Boutique hotels',
  'Luxury hotels and resorts',
  'Eco lodges and nature stays',
  'A mix of styles',
];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'INR', 'LKR', 'Other'];
const BUDGET_BASIS = ['total', 'per person'];
const HELP_ME_CHOOSE = 'Help me choose';

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const WHATSAPP_RE = /^\+[0-9][0-9 ()-]{6,22}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_FILL_MS = 2500;

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

/** Normalise a single-line value: string only, no control chars, trimmed. */
function cleanLine(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Normalise multi-line text: keep newlines, drop other control chars. */
function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asList(value) {
  if (value == null || value === '') return [];
  return (Array.isArray(value) ? value : [value]).map(cleanLine).filter(Boolean);
}

function isValidIsoDate(value) {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validate and normalise a raw enquiry payload.
 * Returns { ok: true, data } or { ok: false, errors: { field: message } }.
 * `now` is injectable for tests.
 */
function validateEnquiry(raw, now = new Date()) {
  const errors = {};
  const input = raw && typeof raw === 'object' ? raw : {};

  const tooLong = (field, value, max) => {
    if (value.length > max) errors[field] = `Please keep this under ${max} characters.`;
  };

  const fullName = cleanLine(input.fullName);
  if (!fullName) errors.fullName = 'Please enter your full name.';
  tooLong('fullName', fullName, LIMITS.fullName);

  const email = cleanLine(input.email).toLowerCase();
  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email address, for example name@example.com.';
  }

  const country = cleanLine(input.country);
  tooLong('country', country, LIMITS.country);

  const whatsapp = cleanLine(input.whatsapp);
  if (whatsapp && (whatsapp.length > LIMITS.whatsapp || !WHATSAPP_RE.test(whatsapp))) {
    errors.whatsapp = 'Please include your country code, for example +44 7700 900123.';
  }

  const stayLength = cleanLine(input.stayLength);
  if (!STAY_LENGTHS.includes(stayLength)) errors.stayLength = 'Please choose your length of stay.';

  let datesStatus = cleanLine(input.datesStatus) || 'undecided';
  if (!DATE_STATUSES.includes(datesStatus)) datesStatus = 'undecided';
  let arrivalDate = cleanLine(input.arrivalDate);
  let departureDate = cleanLine(input.departureDate);
  if (datesStatus === 'undecided') {
    arrivalDate = '';
    departureDate = '';
  } else {
    const today = now.toISOString().slice(0, 10);
    if (arrivalDate && !isValidIsoDate(arrivalDate)) errors.arrivalDate = 'Please enter a valid arrival date.';
    else if (arrivalDate && arrivalDate < today) errors.arrivalDate = 'Arrival date cannot be in the past.';
    if (departureDate && !isValidIsoDate(departureDate)) errors.departureDate = 'Please enter a valid departure date.';
    else if (departureDate && departureDate < today) errors.departureDate = 'Departure date cannot be in the past.';
    if (!errors.arrivalDate && !errors.departureDate && arrivalDate && departureDate && departureDate <= arrivalDate) {
      errors.departureDate = 'Departure date must be after your arrival date.';
    }
  }

  const parseCount = (field, value, min, max) => {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors[field] = `Please enter a whole number between ${min} and ${max}.`;
      return null;
    }
    return n;
  };
  const adults = parseCount('adults', input.adults, 1, 30);
  const children = parseCount('children', input.children, 0, 20);

  const destinations = asList(input.destinations);
  if (destinations.length === 0) {
    errors.destinations = 'Please choose at least one destination, or select “Help me choose”.';
  } else if (destinations.length > LIMITS.listCount || destinations.some((d) => d.length > LIMITS.listItem)) {
    errors.destinations = 'Please check your destination selection.';
  }

  const interests = asList(input.interests).filter((i) => INTERESTS.includes(i));
  const arrangements = asList(input.arrangements).filter((a) => ARRANGEMENTS.includes(a));

  const accommodation = cleanLine(input.accommodation);
  if (!ACCOMMODATION.includes(accommodation)) errors.accommodation = 'Please choose an accommodation option.';

  const budgetUndecided = input.budgetUndecided === true || input.budgetUndecided === 'true' || input.budgetUndecided === 'on';
  let budgetAmount = '';
  let budgetCurrency = cleanLine(input.budgetCurrency) || 'USD';
  let budgetBasis = cleanLine(input.budgetBasis) || 'total';
  if (!CURRENCIES.includes(budgetCurrency)) budgetCurrency = 'USD';
  if (!BUDGET_BASIS.includes(budgetBasis)) budgetBasis = 'total';
  if (!budgetUndecided) {
    const rawAmount = cleanLine(String(input.budgetAmount ?? '')).replace(/[,\s]/g, '');
    if (rawAmount) {
      const n = Number(rawAmount);
      if (rawAmount.length > LIMITS.budgetAmount || !Number.isFinite(n) || n <= 0) {
        errors.budgetAmount = 'Please enter an approximate amount as a positive number, or choose “Not decided”.';
      } else {
        budgetAmount = String(Math.round(n));
      }
    }
  }

  const message = cleanText(input.message);
  tooLong('message', message, LIMITS.message);

  const consent = input.consent === true || input.consent === 'true' || input.consent === 'on';
  if (!consent) errors.consent = 'Please confirm we may use these details to respond to your enquiry.';

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      fullName,
      email,
      country,
      whatsapp,
      stayLength,
      datesStatus,
      arrivalDate,
      departureDate,
      adults,
      children,
      destinations,
      interests,
      arrangements,
      accommodation,
      budgetUndecided: budgetUndecided || !budgetAmount,
      budgetAmount,
      budgetCurrency,
      budgetBasis,
      message,
      consent,
    },
  };
}

/** True when the request looks automated (honeypot filled or form submitted implausibly fast). */
function isLikelySpam(raw, now = Date.now()) {
  const input = raw && typeof raw === 'object' ? raw : {};
  if (cleanLine(input.website)) return true; // honeypot: hidden from people, filled by bots
  const started = Number(input.formStartedAt);
  if (Number.isFinite(started) && started > 0 && now - started < MIN_FILL_MS) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 * Serverless instances do not share memory, so this is a basic safeguard,
 * not a guarantee — see README for stronger options.
 */
function createRateLimiter({ max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  return function check(key, now = Date.now()) {
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
    }
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    entry.count += 1;
    if (entry.count > max) {
      return { allowed: false, retryAfterSeconds: Math.ceil((entry.start + windowMs - now) / 1000) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

/* ------------------------------------------------------------------ */
/* Email formatting                                                    */
/* ------------------------------------------------------------------ */

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function describeDates(d) {
  if (d.datesStatus === 'undecided') return 'Not decided yet';
  const label = d.datesStatus === 'fixed' ? 'Confirmed' : 'Approximate';
  const parts = [];
  if (d.arrivalDate) parts.push(`arrive ${formatDate(d.arrivalDate)}`);
  if (d.departureDate) parts.push(`depart ${formatDate(d.departureDate)}`);
  return parts.length ? `${label}: ${parts.join(', ')}` : `${label} (dates not given)`;
}

function describeTravellers(d) {
  const parts = [];
  if (d.adults != null) parts.push(`${d.adults} adult${d.adults === 1 ? '' : 's'}`);
  if (d.children != null) parts.push(`${d.children} child${d.children === 1 ? '' : 'ren'}`);
  return parts.join(', ');
}

function describeBudget(d) {
  if (d.budgetUndecided || !d.budgetAmount) return 'Not decided';
  const amount = Number(d.budgetAmount).toLocaleString('en-GB');
  const currency = d.budgetCurrency === 'Other' ? '(currency to confirm)' : d.budgetCurrency;
  return `Approximately ${amount} ${currency}, ${d.budgetBasis === 'per person' ? 'per person' : 'total'}`;
}

/** Build the subject, plain-text and HTML bodies for an enquiry. */
function buildEmail(d, submittedAt = new Date()) {
  const rows = [
    ['Name', d.fullName],
    ['Email', d.email],
    ['WhatsApp', d.whatsapp],
    ['Country of residence', d.country],
    ['Length of stay', d.stayLength],
    ['Travel dates', describeDates(d)],
    ['Travellers', describeTravellers(d)],
    ['Destinations', d.destinations.join(', ')],
    ['Interests', d.interests.join(', ')],
    ['Arrangements wanted', d.arrangements.join(', ')],
    ['Accommodation preference', d.accommodation],
    ['Approximate budget', describeBudget(d)],
  ];
  const shown = rows.filter(([, v]) => v);
  const submitted = submittedAt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  const subject = `Travel enquiry from ${d.fullName} (${d.stayLength})`.slice(0, 150);

  const labelWidth = Math.max(...shown.map(([k]) => k.length)) + 2;
  const text = [
    'New travel enquiry from the Ayesha Travel website',
    '',
    ...shown.map(([k, v]) => `${(k + ':').padEnd(labelWidth)}${v}`),
    '',
    'Special requests, accessibility needs or questions:',
    d.message || '(none)',
    '',
    `Submitted: ${submitted}`,
    'The visitor agreed their details may be used to respond to this enquiry.',
    'Reply to this email to respond directly to the visitor.',
  ].join('\n');

  const cell = 'padding:8px 12px;border-bottom:1px solid #e6dfd0;vertical-align:top;';
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#faf6ee;font-family:Arial,Helvetica,sans-serif;color:#123c3d;">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e6dfd0;">
<div style="padding:20px 24px;border-bottom:3px solid #b08d4a;">
<p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7a6a46;">Ayesha Travel website</p>
<h1 style="margin:6px 0 0;font-size:20px;font-weight:normal;">New travel enquiry from ${escapeHtml(d.fullName)}</h1>
</div>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;">
${shown
  .map(
    ([k, v]) =>
      `<tr><th scope="row" style="${cell}text-align:left;width:38%;color:#5b6f6f;font-weight:normal;">${escapeHtml(k)}</th><td style="${cell}">${escapeHtml(v)}</td></tr>`
  )
  .join('\n')}
</table>
<div style="padding:16px 24px;">
<h2 style="margin:0 0 8px;font-size:15px;">Special requests, accessibility needs or questions</h2>
<p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.6;">${d.message ? escapeHtml(d.message) : '(none)'}</p>
</div>
<p style="margin:0;padding:12px 24px 20px;font-size:12px;color:#5b6f6f;">Submitted ${escapeHtml(submitted)}. The visitor agreed their details may be used to respond to this enquiry. Reply to this email to respond directly to the visitor.</p>
</div></body></html>`;

  return { subject, text, html };
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

function readConfig(env = process.env) {
  return {
    apiKey: env.RESEND_API_KEY || '',
    to: env.ENQUIRY_TO_EMAIL || '',
    from: env.ENQUIRY_FROM_EMAIL || '',
    allowedOrigins: (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    rateLimitMax: Number(env.RATE_LIMIT_MAX) || 5,
    rateLimitWindowMs: (Number(env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  };
}

function missingConfig(config) {
  return ['apiKey', 'to', 'from'].filter((k) => !config[k]);
}

async function sendWithResend(config, data, fetchImpl = globalThis.fetch) {
  const email = buildEmail(data);
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: config.to.split(',').map((s) => s.trim()).filter(Boolean),
      reply_to: `${data.fullName.replace(/["<>]/g, '')} <${data.email}>`,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
    signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
  });
  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }
  if (!response.ok || !body || !body.id) {
    const detail = body && (body.message || body.name) ? `${body.name || ''} ${body.message || ''}`.trim() : `HTTP ${response.status}`;
    throw new Error(`Email provider rejected the message: ${detail}`);
  }
  return body.id;
}

/* ------------------------------------------------------------------ */
/* Request handler                                                     */
/* ------------------------------------------------------------------ */

const defaultLimiter = { fn: null, key: '' };

/**
 * Handle one enquiry request.
 *  req: { method, headers (lower-case keys), body (string), ip }
 * Returns { status, headers, body (object) } — the adapter serialises it.
 */
async function handleEnquiry(req, options = {}) {
  const env = options.env || process.env;
  const config = readConfig(env);
  const fetchImpl = options.fetch || globalThis.fetch;
  const log = options.logger || console;
  let limiter = options.rateLimiter;
  if (!limiter) {
    const key = `${config.rateLimitMax}:${config.rateLimitWindowMs}`;
    if (!defaultLimiter.fn || defaultLimiter.key !== key) {
      defaultLimiter.fn = createRateLimiter({ max: config.rateLimitMax, windowMs: config.rateLimitWindowMs });
      defaultLimiter.key = key;
    }
    limiter = defaultLimiter.fn;
  }

  const headers = req.headers || {};
  const respond = (status, body, extra = {}) => ({
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
    body,
  });

  if (req.method === 'OPTIONS') return respond(204, null, { Allow: 'POST, OPTIONS' });
  if (req.method !== 'POST') return respond(405, { ok: false, message: 'Method not allowed.' }, { Allow: 'POST, OPTIONS' });

  const origin = headers.origin;
  if (config.allowedOrigins.length && origin && !config.allowedOrigins.includes(origin)) {
    return respond(403, { ok: false, message: 'This form can only be submitted from the Ayesha Travel website.' });
  }

  const contentType = String(headers['content-type'] || '');
  if (!contentType.includes('application/json')) {
    return respond(415, { ok: false, message: 'Please submit the enquiry using the website form.' });
  }

  const rawBody = typeof req.body === 'string' ? req.body : '';
  if (rawBody.length > LIMITS.totalBody) {
    return respond(413, { ok: false, message: 'Your enquiry is too long. Please shorten your message and try again.' });
  }

  const ip = cleanLine(req.ip || '') || 'unknown';
  const rate = limiter(ip);
  if (!rate.allowed) {
    return respond(
      429,
      { ok: false, message: 'Too many enquiries have been sent from your connection. Please wait a little while and try again.' },
      { 'Retry-After': String(rate.retryAfterSeconds) }
    );
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (_) {
    return respond(400, { ok: false, message: 'We could not read your enquiry. Please try again.' });
  }

  if (isLikelySpam(payload)) {
    // Do not tell automated senders they were filtered, but never pretend an email was sent to a person either:
    // the honeypot field is invisible to people, so a real visitor never reaches this branch.
    log.warn && log.warn('[enquiry] Discarded submission that failed spam checks.');
    return respond(400, { ok: false, message: 'Your enquiry could not be sent. Please try again.' });
  }

  const result = validateEnquiry(payload);
  if (!result.ok) {
    return respond(422, { ok: false, message: 'Please check the highlighted fields.', errors: result.errors });
  }

  const missing = missingConfig(config);
  if (missing.length) {
    log.error && log.error(`[enquiry] Email delivery is not configured. Missing: ${missing.map((k) => ({ apiKey: 'RESEND_API_KEY', to: 'ENQUIRY_TO_EMAIL', from: 'ENQUIRY_FROM_EMAIL' })[k]).join(', ')}`);
    return respond(503, { ok: false, message: 'The enquiry service is not available right now.' });
  }

  try {
    const id = await sendWithResend(config, result.data, fetchImpl);
    log.info && log.info(`[enquiry] Delivered to email provider (id ${id}).`);
    return respond(200, { ok: true, message: 'Thank you. Your enquiry has been sent to Ayesha.' });
  } catch (err) {
    log.error && log.error(`[enquiry] ${err && err.message ? err.message : err}`);
    return respond(502, { ok: false, message: 'We could not send your enquiry just now. Your details are still in the form, so please try again shortly.' });
  }
}

module.exports = {
  LIMITS,
  STAY_LENGTHS,
  INTERESTS,
  ARRANGEMENTS,
  ACCOMMODATION,
  CURRENCIES,
  HELP_ME_CHOOSE,
  validateEnquiry,
  isLikelySpam,
  createRateLimiter,
  buildEmail,
  escapeHtml,
  readConfig,
  handleEnquiry,
};
