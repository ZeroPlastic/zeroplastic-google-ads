# ZeroPlastic Movement — Google Ads Grant Account Status

Living status doc. Update this whenever material progress is made, so a fresh session doesn't have to rediscover everything from conversation history.

## Account identifiers

- **Live Google Ads account:** 542-121-6511 ("ZeroPlastic Movement")
- **Manager account (MCC):** 471-687-2746 ("ZeroPlastic Movement — Manager")
- **Google Cloud project (for Ads API access):** `zeroplastic-google-ads-mcp` (project number `765474995894`)
- **Developer token access level:** Explorer Access (read-only). Basic access application submitted; still pending Google's review as of this writing. Brand verification was declined by the org — standard review queue only.

## Root cause of suspension

Account was `SUSPENDED` for an Ad Grants Website Policy violation. Root cause, confirmed via direct investigation (not assumption): grant-funded ads were driving traffic to commercial activity — a live e-commerce store (1,000+ products) and paid tourism/workshop bookings under `impactcenter.zeroplastic.lk`, plus a commercial web-design/graphic-design/content-writing services page (`/services/`) on the main `zeroplastic.lk` domain itself.

## Reactivation (2026-07-28)

Google sent the standard reactivation notice: account was suspended to verify billing information and policy compliance, and has now been reactivated. Verified live via API the same day:

- Account status: **ENABLED** (`get_account_info` / `list_accounts` both confirm).
- **All 12 campaigns in the account are `REMOVED`** (not paused — removed/deleted), confirmed via `run_gaql` on `campaign.status`. This includes every Impact Center campaign, the Smart campaigns, and all Search/PMax campaigns listed below. `get_policy_issues` and `list_recommendations` both return empty, consistent with no active campaigns.
- **Practical effect: no ads can serve and no spend can accrue right now**, regardless of the billing-information warning in Google's email — there is nothing live or paused to auto-resume. The "pause your campaigns or cancel your account" advice in the reactivation email is moot; it's already at "removed."
- Open question, not yet answered: who/what removed all 12 campaigns, and when (mid-suspension cleanup by the org, or a side effect of the suspension itself). Worth confirming with the org before rebuilding, in case there's campaign history/learnings worth referencing.

## Campaign live (2026-07-29)

Campaign **24084222862** ("ZP | Search | Negombo Tourists | Sigiriya Free Visit") is the rebuilt-from-zero replacement for the suspended account's old campaigns, and is now **ENABLED and SERVING** — first compliant campaign live since reactivation.

- Structure: 2 ad groups (Sigiriya Eco & Craft Experience `196546768017`, Sigiriya Things To Do `201824165747`), 2 RSAs per ad group (4 total, all `APPROVED`), 20 keywords (10 Phrase/10 Exact, 0 Broad), 15 campaign negatives, 4 sitelinks, 6 callouts, 0 structured snippets.
- Targeting: Negombo city only (PRESENCE), English only, Search only (Search Partners + Display both off).
- Budget/bidding: $50/day, Manual CPC, $2.00 bids on both ad groups.
- Final URL: `https://zeroplastic.lk/impact-center-premium.html`, with UTM suffix `utm_source=google&utm_medium=cpc&utm_campaign=negombo_sigiriya_free_visit&utm_content={adgroupid}_{creative}&utm_term={keyword}`.
- Conversion tracking: landing page's gtag was fixed to the correct account tag `AW-17612444693` (was wrongly pointing at `AW-18330573756`), deployed via the `zeroPlastic-landing-pages` repo's GitHub Actions pipeline. Conversion action **7701353172** ("Impact Center – Free Visit Request Submitted") is `ENABLED`/`WEBPAGE`/`SUBMIT_LEAD_FORM`/Primary/`ONE_PER_CLICK`/no value/data-driven attribution.
- Reporting isolation: created custom conversion goal **"Free Visit Only – Negombo Search"** (`6458493274`) containing only conversion action 7701353172, and assigned it at the campaign level (all default category goals disabled for this campaign) — so the account's other lead-form/page-view/GA4 conversion actions can't dilute this campaign's reported conversions.
- Activated via the Google Ads MCP's draft → dry-run → apply → GAQL-verify sequence, entity by entity (ads → ad groups → campaign), with a full pre-activation re-audit before the final campaign enable.

## Outstanding items (Google Ads account side)

Developer token access level (Explorer vs. Basic) has not been re-checked since reactivation — assume it's still Explorer/read-only until confirmed otherwise.

- No conversions have been recorded yet (expected — campaign just went live). Watch the conversion action's diagnostics in the Ads UI over the next few days to confirm it's registering real activity; this isn't visible via the API.
- Confirm current billing status in the Google Ads UI directly (the email says an alert will show there if payment info needs updating) — this isn't visible via the read paths checked so far.
- No optimization has been performed yet — deliberately waiting for real performance data before touching bids, budget, or targeting.

## Website-side fixes completed

All of the following were found live, then trashed/removed via the WordPress REST API (recoverable from Trash for ~30 days unless separately emptied):

- `/services/` — commercial agency services page
- `/support-zeroplastic-sri-lanka/` — broken donation page (no working payment flow)
- `incoming-form-answer`, `-2`, `-3` — possible leaked contact-form submissions (root cause: "User Submitted Posts" plugin)
- 7 empty Eventin plugin placeholder pages under `/etn-schedule/*`
- 1 fabricated demo event ("Applied AI & Machine Learning Summit 2026")
- Duplicate blog post (`how-university-students-are-building-career-readiness-before-graduation` + `-2`)
- Booking Calendar plugin (`booking/wpdev-booking`) — deactivated and deleted, plus 7 leftover pages it had created (including a `/booking/` page titled "Reserve Your Visit – Impact Center")
- "ZP Impact Center" main-menu link → `impactcenter.zeroplastic.lk`
- Dead "List of Plastic Alternatives" footer link → `products.zeroplastic.lk` (subdomain no longer exists, NXDOMAIN)

## Known outstanding items (website side)

- `alert.zeroplastic.lk` ("Report a Problem" link) — DNS resolves but the server times out on every connection. Infrastructure issue outside what Claude can fix; needs the org to check that service directly.
- `zeroplastic.lk/sitemap.xml` → 404 (real sitemap is at `/sitemap_index.xml`); `robots.txt` has no `Sitemap:` directive. Low priority, not an Ad Grants blocker.
- 5 of 6 team member pages use numeric URL slugs instead of names — explicitly left alone per org's instruction.
- 4 unpublished draft Eventin events exist but aren't public — not urgent.

## Technical setup reference

- **MCP server:** `FGRibreau/mcp-google-ads`, cloned at `~/mcp-servers/mcp-google-ads`, built release binary at `~/mcp-servers/mcp-google-ads/target/release/mcp-google-ads`
- **Google Ads credentials:** `~/.mcp-google-ads/credentials.json` (OAuth client), `~/.mcp-google-ads/token.json` (refresh token), `~/.mcp-google-ads/developer_token.txt` — none of these values are ever pasted into chat; read locally only
- **Claude Desktop MCP config:** `~/.config/Claude/claude_desktop_config.json`, `mcpServers.google-ads` entry, currently `GOOGLE_ADS_READ_ONLY=true`
- **WordPress access (zeroplastic.lk):** REST API via Application Password, user `WebEditor` (role: Administrator), password stored at `~/.wp-zeroplastic/app_password.txt`. This is now the reliable path for future edits — no SSH, no browser session, no WP-CLI needed.
- **WordPress MCP Adapter plugin:** installed and active (`mcp-adapter/mcp-adapter`), exposes `/wp-json/mcp/mcp-adapter-default-server`, but only has 6 narrow abilities registered (WP Mail SMTP, WPForms, Yoast SEO) — no post/page management abilities. The direct WordPress REST API (`/wp-json/wp/v2/...`) is the actual working path for content changes, not this MCP server.
