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

## Outstanding items (Google Ads account side — status changed)

Developer token access level (Explorer vs. Basic) has not been re-checked since reactivation — assume it's still Explorer/read-only until confirmed otherwise. Regardless, the old "fix in place" plan is moot: since every campaign is removed, there's nothing left to patch. Any path forward is a **rebuild from zero**:

- Rebuild campaign(s) compliant from day one: Manual CPC ($2 cap) or Maximize Conversions bidding only, minimum 2 ad groups per campaign with 2+ active ads each, Phrase/Exact match keywords (no Broad-match-only, no single-word/overly generic terms), 2+ active sitelinks, deliberate geo-targeting.
- Decision still needed from the org: rebuild the Impact Center campaigns (tourism/booking angle) at all, given that angle is what caused the suspension in the first place — or rebuild around a different, unambiguously non-commercial angle (e.g. straight donation/volunteer-recruitment traffic to zeroplastic.lk).
- Confirm current billing status in the Google Ads UI directly (the email says an alert will show there if payment info needs updating) — this isn't visible via the read paths checked so far.

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
