# Impact Center | Negombo Tourists | Search — DRAFT PROPOSAL

**Status:** Proposal only. Nothing has been created in Google Ads. Awaiting approval per the workflow in the request that produced this doc.
**Account:** ZeroPlastic Movement, Customer ID 542-121-6511 (MCC 471-687-2746), currency USD, timezone Asia/Colombo.
**Landing page:** https://zeroplastic.lk/impact-center-premium.html

## Journey model this campaign is built around

Foreign tourists arrive at Bandaranaike International Airport and typically stay in Negombo for their first 1–2 days before heading inland. While in Negombo, they research and book the next leg of their trip — including Sigiriya / Cultural Triangle activities.

This campaign targets people **physically present in Negombo** (location option: Presence, not "interest in"), bidding on **Sigiriya-intent keywords**, with ad copy that is explicit the experience is in Sigiriya and can be booked now for later. Ads must never imply the Impact Center is in Negombo. Negombo-only-intent searches (activities located within Negombo itself) are excluded via negatives.

## 1. Landing page audit vs. required checklist

| Requirement | Status | Detail |
|---|---|---|
| States the experience is in Sigiriya | ✅ Clear | Title: "Impact Center Sigiriya"; "Where: Sigiriya, Central Province, Sri Lanka" |
| What visitors will do | ✅ Clear | Mask-painting from bottle lids, coconut-shell craft, life-size elephant built from salvaged plastic, sit in with the makers, Tree-of-Life story, plastic-pledge QR |
| How long it takes | ✅ Present, loose | "About 10 min" up to "stay as long as you like" |
| Available booking times | ✅ Clear | "Every day, 7:30–18:30" |
| Price | ✅ Clear | Free — "No payment, now or later" |
| Location | ✅ Clear | Address given + Google Maps link (resolves to 7.9267°N, 80.6973°E) |
| What participants take home | ⚠️ **Not a physical item** | The page's only "take home" language is about a QR-code plastic-reduction *pledge*, not a souvenir. An older, removed campaign's sitelink said "take home a handmade souvenir, from $12" — that's stale/inaccurate for this free page and **must not be reused** in ad copy. |
| Suitability for adults, families, children | ❌ **Missing** | No statement anywhere on the page confirming family/child suitability. The booking form's optional note field hints ("travelling with kids") but that's a form prompt, not a claim by the business. |
| Booking CTA | ✅ Clear | Form, WhatsApp (+94 71 690 1094), email; walk-ins welcome |

**Recommended landing-page fix before the "Family-Friendly Activities" ad group goes live:** add one factual line confirming who the visit suits (e.g., "Suitable for all ages" or similar — only if actually true) near the booking section. I have not made this edit — need to confirm I have edit access to this specific static file (it doesn't look like a WordPress page) and that the org confirms the claim is accurate.

## 2. Conversion tracking audit — fix required before enabling

- The page fires a Google Ads conversion on successful form submission, coded as `AW-18330573756/vpK9CJHhoNccELy32aRE`.
- **This account's actual Google Ads conversion tracking ID (verified via API) is `AW-17612444693`.** Mismatch confirmed — the tag on this page is not reporting into this account today.
- No Google Analytics 4 tag exists on this page, so the account's existing GA4-imported conversions ("book_appointment_Impact_center," "form_submit") won't fire here either.
- The WhatsApp link and the "Open in Google Maps" link have no click-tracking at all.
- No phone/`tel:` link exists on the page — WhatsApp only.

**Required before enabling:** correct the `AW-` ID in the page's script to `AW-17612444693` (keeping the correct conversion label for "visit request submitted" from Google Ads > Conversions in this account), and ideally add click-tracking on the WhatsApp and Maps links. Until this is fixed, Maximize Conversions bidding has no signal to use.

## 3. Campaign settings (proposed)

| Setting | Value |
|---|---|
| Name | Impact Center \| Negombo Tourists \| Search |
| Type | Search |
| Networks | Google Search only. Display Network off. |
| Search Partners | **Off initially** — lower/less consistent intent and location signal than Search itself; revisit after a few weeks of clean Search-only data. |
| Location | Negombo (city, geo target ID `9069438`) + ~15km radius, **Presence: people physically in the targeted location** (not "interest in") |
| Language | English |
| Final URL | https://zeroplastic.lk/impact-center-premium.html |
| Ad schedule | 07:00–22:00 daily, Asia/Colombo, all days — hypothesis for a new-arrival research pattern (settling in / evening planning, or morning-before-heading-out); revisit with real hour-of-day data after 2–4 weeks |
| Bidding | Manual CPC, $2.00 max CPC (Ad Grants-safe) to start — see §6 |
| Budget | See §6 — needs your confirmation before anything is created |
| Status on creation | **PAUSED** |

## 4. Ad groups

Consolidated the brief's 8 suggested themes into 5 ad groups with real, verifiable content and (where available) real search-volume signal, rather than splitting into 8 thin groups with near-zero independent volume. Two deliberate deviations, flagged for your sign-off:

- **Dropped a standalone "rainy-day activities" ad group.** Reason: (a) `rainy day activities sigiriya` has no measurable independent search volume, and (b) the page describes the studio as "open-sided" — I can't honestly market it as a guaranteed rain shelter. Happy to reconsider if you can confirm the studio has a full roof over the whole space.
- **Family-Friendly Activities in Sigiriya is drafted below but recommended to stay PAUSED** even after the rest of the campaign is enabled, until the landing-page gap in §1 is fixed.

All keywords are Phrase or Exact match only. Search volumes below are Sri Lanka/global Keyword Planner data for the exact phrase — not filtered to "people currently in Negombo," which Google's tools can't isolate. Treat as directional, not a promise of reach (see §8).

### Ad Group 1 — Sigiriya: Things To Do & Trip Planning

**Keywords**
| Keyword | Match | Avg. monthly searches | Top-of-page bid range |
|---|---|---|---|
| things to do in sigiriya | Exact | 1,300 | $0.03–$0.45 |
| sigiriya things to do | Exact | 320–390 | up to $0.57 |
| places to visit in sigiriya | Exact | 320 | up to $0.56 |
| sigiriya places to visit | Exact | 170–210 | — |
| sigiriya day trips | Exact | 70–90 | $0.21–$1.31 |
| sigiriya itinerary | Exact | 10–70 | — |
| best things to do in sigiriya | Exact | 30–110 | up to $0.57 |
| "things to do near sigiriya" | Phrase | 30–70 | $0.04–$1.41 |
| "things to do in sigiriya" | Phrase | (rolls up with exact) | |
| "sigiriya day trips" | Phrase | (rolls up with exact) | |
| "sigiriya itinerary" | Phrase | (rolls up with exact) | |
| "what to book in sigiriya" | Phrase | no independent data — long-tail | |
| "sigiriya sightseeing" | Phrase | 30–90 | |

**Headlines:** Visiting Sigiriya Next? · Plan Your Sigiriya Experience · Book Before You Reach Sigiriya · Free Craft Studio, Sigiriya · Open Daily, 7:30–18:30 · No Entry Fee - Ever · Add This To Your Sigiriya Trip · Free Craft Stop Near Sigiriya · Walk In Or Book Ahead · A Studio Beside Sigiriya Road · Book Your Sigiriya Stop Free · Run By Sri Lanka's ZeroPlastic

**Descriptions:** Reserve a time by form, WhatsApp or email - or simply walk in during opening hours. / Add a free, honest stop to your Sigiriya plans. Real artisans on an ordinary working day. / Plastic-free studio in Sigiriya, Sri Lanka. Open daily 7:30-18:30. No payment, ever. / Book ahead by WhatsApp so someone's at the bench when you arrive - or just walk in.

### Ad Group 2 — Sri Lankan Craft Workshops & Demonstrations

**Keywords**
| Keyword | Match |
|---|---|
| sigiriya craft workshop | Exact |
| sri lankan craft experience | Exact |
| craft workshop sigiriya | Exact |
| "sri lankan craft experience" | Phrase |
| "craft workshop sigiriya" | Phrase |
| "traditional craft demonstration sri lanka" | Phrase |
| "mask painting demonstration sri lanka" | Phrase |
| "coconut shell craft sri lanka" | Phrase |

No independent Keyword Planner volume on these exact long-tail phrases (too specific) — treat as a low-volume, high-relevance precision layer, not a volume driver.

**Headlines:** Free Craft Studio, Sigiriya · 249 Artisans, 100+ Pieces · An Elephant Made From Plastic · Masks Made From Bottle Lids · Sit With Sri Lanka's Makers · Coconut Shell & Clay, By Hand · Real Artisans, No Staged Show · Handmade By 249 Artisans · Not One Piece Is Plastic · See Sri Lanka's Craft Makers · From Waste To Handmade Art · Made From What Was Thrown Out · Made By Hand, Not Machine

**Descriptions:** Watch mask-painting and coconut-shell craft made by 249 local artisans. Free, every day. / Sit in while the makers work. Stay 10 minutes or all afternoon. Message us on WhatsApp. / 249 artisans, 100+ pieces from coconut shell, clay and reed. Costs nothing, ever. / No staging, no stock photography - the bench, the elephant, the artisans, as they are.

### Ad Group 3 — Cultural & Authentic Local Experiences

**Keywords**
| Keyword | Match |
|---|---|
| sigiriya cultural experiences | Exact |
| authentic sri lankan experience | Exact |
| sigiriya experiences | Exact |
| "sigiriya cultural experiences" | Phrase |
| "authentic sri lankan experience" | Phrase |
| "authentic local experience sri lanka" | Phrase |
| "cultural triangle activities" | Phrase |
| "cultural experience near sigiriya" | Phrase |

No independent volume data on these either — same caveat as Ad Group 2.

**Headlines:** Visiting Sigiriya Next? · Plan Your Sigiriya Experience · Sigiriya's Plastic-Free Studio · Sit With Sri Lanka's Makers · Real Artisans, No Staged Show · Not One Piece Is Plastic · A Studio Beside Sigiriya Road · See Sri Lanka's Craft Makers · Run By Sri Lanka's ZeroPlastic · From Waste To Handmade Art · Made By Hand, Not Machine

**Descriptions:** No staging, no stock photography - the bench, the elephant, the artisans, as they are. / Add a free, honest stop to your Sigiriya plans. Real artisans on an ordinary working day. / Sit in while the makers work. Stay 10 minutes or all afternoon. Message us on WhatsApp. / Run by ZeroPlastic, Sri Lanka's largest volunteer environmental movement. Free to visit.

### Ad Group 4 — Sustainable & Community Tourism

**Keywords**
| Keyword | Match |
|---|---|
| sustainable tourism sri lanka | Exact |
| eco friendly activities sigiriya | Exact |
| "sustainable tourism sri lanka" | Phrase |
| "eco friendly experience sri lanka" | Phrase |
| "plastic free sri lanka" | Phrase |
| "responsible tourism sigiriya" | Phrase |
| "community tourism sri lanka" | Phrase |

No independent volume data — precision layer for a specific traveler mindset, not a volume driver.

**Headlines:** Sigiriya's Plastic-Free Studio · No Entry Fee - Ever · Not One Piece Is Plastic · Sustainable Craft, Sigiriya · Run By Sri Lanka's ZeroPlastic · From Waste To Handmade Art · Made From What Was Thrown Out · Made By Hand, Not Machine · Open Daily, 7:30–18:30 · Free Craft Stop Near Sigiriya

**Descriptions:** Run by ZeroPlastic, Sri Lanka's largest volunteer environmental movement. Free to visit. / See a life-size elephant built entirely from salvaged plastic. No entry fee, no staging. / Plastic-free studio in Sigiriya, Sri Lanka. Open daily 7:30-18:30. No payment, ever. / 249 artisans, 100+ pieces from coconut shell, clay and reed. Costs nothing, ever.

### Ad Group 5 — Family-Friendly Activities in Sigiriya ⚠️ HOLD — keep PAUSED after launch

**Keywords**
| Keyword | Match |
|---|---|
| family activities sigiriya | Exact |
| things to do with kids sigiriya | Exact |
| "family activities sigiriya" | Phrase |
| "activities for kids sigiriya" | Phrase |
| "family friendly things to do sigiriya" | Phrase |

Copy is deliberately enquiry-framed, not a suitability claim, since the page doesn't confirm family/child suitability yet.

**Headlines:** Visiting Sigiriya Next? · Plan Your Sigiriya Experience · Free Craft Studio, Sigiriya · 249 Artisans, 100+ Pieces · Open Daily, 7:30–18:30 · No Entry Fee - Ever · Reserve By WhatsApp, Minutes · Walk In Or Book Ahead · Family? Ask Us First - Enquire

**Descriptions:** Reserve a time by form, WhatsApp or email - or simply walk in during opening hours. / Sit in while the makers work. Stay 10 minutes or all afternoon. Message us on WhatsApp. / Book ahead by WhatsApp so someone's at the bench when you arrive - or just walk in. / Add a free, honest stop to your Sigiriya plans. Real artisans on an ordinary working day.

## 5. Sitelinks, callouts, structured snippets (campaign level)

**Sitelinks** (all point to real, distinct sections of the actual landing page):
- "What You'll See" → `#see` — "The elephant, masks, craft bench"
- "Meet The Makers" → `#makers` — "249 artisans and their work"
- "Plan Your Visit" → `#plan` — "Book by form, WhatsApp or email"

**Callouts:** Free Entry, Every Day · 249 Local Artisans · 100+ Handmade Pieces · No Plastic, Anywhere · Open 7:30 AM–6:30 PM · Book By WhatsApp · Walk-Ins Welcome · No Payment, Ever · Real Artisans At Work · A Life-Size Elephant · Run By ZeroPlastic

**Structured snippet** — Header "Types": Mask Painting, Coconut Shell Craft, Elephant Sculpture, Maker Demonstrations

## 6. Budget & bidding — needs your explicit confirmation before anything is created

- Account currency is **USD**, not LKR — the campaign budget field will be entered in USD; the LKR figure below is for your reference only.
- The Google Ads MCP tool connected here enforces a hard safety cap of **$50/day** on anything it creates, separate from the Ad Grant's own ~$329/day theoretical ceiling ($10,000/month ÷ ~30.4 days).
- **Recommended starting daily budget: $15–20 USD/day (~LKR 5,000–6,700 at today's rate of ~336 LKR/USD, which fluctuates)** — modest on purpose, since conversion tracking isn't reliable yet and this account has zero fresh conversion history to bid against.
- **Recommended bidding strategy: Manual CPC, $2.00 max CPC** (the standard Ad Grants-safe default) to start. Do not switch to Maximize Conversions until the conversion-tracking fix in §2 is live and has 2–4 weeks of real data — bidding to a broken signal would optimize toward nothing.
- **Campaign dates:** none proposed yet — need your input on a start date and whether there's an end date or this runs ongoing.

**None of the above is final — I need your explicit confirmation on daily budget, dates, and bidding strategy before creating anything**, per your instructions.

## 7. UTM / tracking plan

Use the **Final URL suffix** field (not the Final URL itself, to keep Google's auto-tagging/GCLID intact — `autoTaggingEnabled` is already on for this account):

```
utm_source=google&utm_medium=cpc&utm_campaign={_campaignname}&utm_content={adgroupid}&utm_term={keyword}&utm_matchtype={matchtype}
```

This reports campaign/ad group/keyword into GA4 or the Make.com webhook payload if either is later instrumented to read query params. It does not fix the conversion-tracking mismatch in §2 — that's a separate, required fix.

## 8. Forecast — directional only, not a promise

- Keyword Planner volume for the core "things to do in Sigiriya" cluster is roughly 2,000–2,500 searches/month **Sri-Lanka/globally** — not filtered to people physically in Negombo, which no keyword tool can isolate.
- The actual reachable audience (foreign, English-language, physically in Negombo, searching Sigiriya-intent terms, within our ~15km radius and ad schedule) is a narrow subset of that — realistically a small fraction, size unknown until we have real impression data.
- Most of the ad-group themes beyond Ad Group 1 have no independent measurable search volume at all — they're relevance/precision layers, not volume drivers.
- With no working conversion tracking yet and no prior data for this exact page, **there is no reliable basis for a booking/enquiry number forecast.** Expect an early-weeks learning phase; a realistic first checkpoint is click volume and CTR (must stay ≥5% account-wide for Grant retention) after 2–4 weeks, once tracking is fixed — not a booking count.

## 9. Ad Grants compliance checklist — how this plan satisfies it

| Requirement | This plan |
|---|---|
| ≥2 ad groups per campaign, ≥2 active ads each | 5 ad groups drafted (4 intended to launch active, 1 on hold); 2 RSAs to be created per active ad group |
| No single-word / overly generic keywords | All keywords are multi-word, Sigiriya/craft/culture-qualified |
| Max $2.00 CPC unless Maximize Conversions | Manual CPC $2.00 cap proposed to start |
| Account CTR ≥5% | Presence-based Negombo targeting + Sigiriya-intent keywords + honest "book now, visit in Sigiriya" copy, aimed at minimizing irrelevant clicks |
| Deliberate geo-targeting, not worldwide | Negombo city + ~15km radius, Presence-only |
| ≥2 active sitelinks | 3 proposed |
| No misleading/unsubstantiated claims | Every headline/description/callout/snippet traced to a specific fact confirmed on the landing page (see §1); no prices, ratings, souvenirs, or family-suitability claims invented |
| HTTPS destination on the Grant's domain | https://zeroplastic.lk/... — confirmed HTTPS, main domain, not the previously-flagged `impactcenter.zeroplastic.lk` subdomain |

## 10. Open items requiring your decision

1. **Landing page fixes** — confirm the family/child suitability claim (if true) and whether I have edit access to add it; confirm you're comfortable with no "take home" souvenir claim in ads (page doesn't support one).
2. **Conversion tracking fix** — who corrects the `AW-18330573756` → `AW-17612444693` mismatch on the page, and when? This should happen before enabling.
3. **Daily budget** — confirm $15–20 USD/day, or set your own figure (subject to the tool's $50/day cap).
4. **Campaign dates** — start date, and ongoing vs. an end date.
5. **Bidding strategy** — confirm Manual CPC $2.00 cap to start.
6. **Dropped rainy-day ad group** — confirm you're OK with this, or tell me if the studio has full roof coverage.
7. **Family ad group on hold** — confirm you're OK launching without it initially.

Once you approve or revise the above, I'll create the full campaign structure in Google Ads as **PAUSED**, show you exactly what was created, and ask for a separate final confirmation before enabling.
