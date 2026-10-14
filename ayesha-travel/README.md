# Ayesha Travel website

A one-page travel enquiry site for international visitors planning a trip to Sri Lanka. It uses plain HTML, CSS and JavaScript with no front-end framework. A small serverless function emails each enquiry to Ayesha.

> **The site collects enquiries only.** It has no booking or payment flow.

## What still needs configuring

| Item | Status | Where |
| --- | --- | --- |
| **Logo** | ⚠️ **Placeholder.** The supplied logo was not in the repository, so a simple wordmark is in its place. | Replace `assets/img/logo.svg` (see below) |
| **Email delivery** | ⚠️ Not configured. Until it is, the form shows an honest "not sent" error and keeps what the visitor typed. | Environment variables (see below) |
| **Contact email / WhatsApp / social links** | Empty, so nothing is shown and there are no broken links. | `assets/js/site-config.js` |
| **Domain for social sharing** | `og:image` is a relative path. Some platforms need a full URL. | `index.html` `<head>` |
| **Data retention period** | Not stated in the privacy notice. Add one when it is decided. | `index.html`, `#privacy` |

## Files

```
ayesha-travel/
├── index.html                 Page markup and copy
├── credits.html               Photo sources and licences (public page)
├── assets/
│   ├── css/styles.css         All styles (design tokens at the top)
│   ├── css/no-js.css          Fallback when JavaScript is off
│   ├── js/site-config.js      ← EDIT THIS: contact details + destinations
│   ├── js/main.js             Behaviour: nav, trip selection, form
│   ├── fonts/                 Self-hosted Cormorant Garamond + Source Sans 3 (OFL)
│   └── img/                   Logo, hero, destination photos (WebP + JPEG, 3 sizes)
├── lib/enquiry.js             Validation, spam checks, rate limit, email formatting, sending
├── api/enquiry.js             Vercel function  → POST /api/enquiry
├── netlify/functions/enquiry.js  Netlify function (netlify.toml routes /api/enquiry to it)
├── server/dev-server.js       Local preview server (Node built-ins only)
├── tests/enquiry.test.js      Endpoint tests (node --test)
├── .env.example               Environment variable template
├── vercel.json / netlify.toml Security headers and caching
└── package.json               No dependencies; npm run dev / npm test
```

## Updating content (for Ayesha)

All everyday changes are in **`assets/js/site-config.js`**. Edit the text between the quote marks, save, and redeploy.

### Contact details

```js
contact: {
  email: 'hello@yourdomain.com',   // shown in the Contact section and privacy notice
  whatsapp: '94771234567',         // digits only, with country code; opens wa.me
  instagram: 'https://www.instagram.com/yourprofile',
  facebook: '',                    // empty = hidden
  tiktok: '',
},
```

Any value left as `''` is hidden. Email addresses, WhatsApp numbers and social links are checked before they are shown. A badly formed value is skipped rather than shown as a broken link.

### Destinations

Each destination in the `destinations` list becomes a card **and** an option in the enquiry form. To change one, edit its `name`, `summary` and three `highlights`. To add one:

1. Prepare a landscape photo and export six files to `assets/img/destinations/`: `NAME-480`, `NAME-800` and `NAME-1200`, each as `.jpg` and `.webp` (for example with [Squoosh](https://squoosh.app)).
2. Copy an existing destination block, give it a new `id` and set `image: 'NAME'`, `imageAlt`, `imageRatio` (width ÷ height) and `credit`.
3. Add the photo's source and licence to `credits.html`.

Only use photos you own or that have a licence allowing commercial use. Check that they were actually taken at the place named.

### Replacing the logo

Save the supplied logo as `assets/img/logo.svg`, replacing the placeholder. If the logo is a PNG, save it as `assets/img/logo.png` and update the two `<img src="assets/img/logo.svg">` tags in `index.html`. In the header the logo is shown about 200 px wide. The footer shows a white version created with a CSS filter. If the real logo has colours that must be kept, replace that filter with a separate light version of the logo.

## Email delivery setup

Enquiries are sent through **[Resend](https://resend.com)**, which has a free tier. The site only reports success after Resend has accepted the email.

1. Create a Resend account and **verify a sending domain** (Domains → Add domain, then add the DNS records it lists).
2. Create an API key with sending access.
3. Set these environment variables on the hosting platform. They are **never** placed in browser code:

| Variable | Example | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_…` | Resend API key |
| `ENQUIRY_TO_EMAIL` | `ayesha@yourdomain.com` | Where enquiries arrive (comma-separate several) |
| `ENQUIRY_FROM_EMAIL` | `Ayesha Travel Website <enquiries@yourdomain.com>` | Sender, must be on the verified domain |
| `ALLOWED_ORIGINS` *(optional)* | `https://yourdomain.com,https://www.yourdomain.com` | Reject submissions from other sites |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MINUTES` *(optional)* | `5` / `15` | Per-IP limit |

Each email includes every submitted field in a clear table. Its **Reply-To** is set to the visitor, so pressing *Reply* answers them directly.

To use a different provider, such as SendGrid, Postmark or SMTP, replace `sendWithResend()` in `lib/enquiry.js`. The rest of the code does not depend on Resend.

## Running locally

Requires Node 18 or later. There is nothing to install.

```bash
cd ayesha-travel
cp .env.example .env      # fill in real values to test actual delivery
npm run dev               # http://localhost:8080
npm test                  # endpoint tests (mocked email provider)
```

Without a `.env` file the site still runs, and submitting the form shows the "not sent" error.

## Deploying

**Vercel:** import the repository, set *Root Directory* to `ayesha-travel`, choose *Framework: Other*, and leave the build command empty. Add the environment variables, then deploy. `api/enquiry.js` becomes `/api/enquiry` automatically.

**Netlify:** import the repository, set *Base directory* to `ayesha-travel` and leave the build command empty. The publish directory and functions directory come from `netlify.toml`. Add the environment variables, then deploy.

**Any Node host** (VPS, Render, Railway): run `npm start` behind HTTPS with the environment variables set. The server only serves `index.html`, `credits.html`, `robots.txt` and `assets/`.

After deploying, send a test enquiry to yourself and confirm it arrives. Also check that replying reaches the visitor's address.

## Security and privacy notes

- Server-side validation re-checks every field, sets length limits, and discards checkbox values that are not on the allowed list. Requests are limited to 20 KB.
- All visitor text is HTML-escaped in the email. Control characters are removed.
- Spam protection uses a hidden honeypot field and rejects forms submitted in under 2.5 seconds. Each IP is limited to 5 enquiries per 15 minutes by default.
- The rate limiter keeps its counts in memory, so each serverless instance has its own counter. For stronger protection, enable the platform's firewall or rate-limit rules, or move the counter to a shared store such as Upstash Redis.
- Fonts and images are self-hosted. There are no third-party scripts, cookies or analytics. The trip selection is stored in the visitor's own browser (`localStorage`), as the privacy notice states.
- A strict Content-Security-Policy is set in `vercel.json` and `netlify.toml`.
- On Netlify, the whole folder is published as static files, including server code. That code contains no secrets, which live only in environment variables.

## Photo credits

All photographs are from Wikimedia Commons under CC BY, CC BY-SA or Free Art licences. Each was taken at the Sri Lankan location named. Photographer, source link and licence are listed in [`credits.html`](credits.html), which is linked from the site footer, and on each card.
