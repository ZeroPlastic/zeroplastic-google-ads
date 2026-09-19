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

## Zero-impressions investigation and resolution (2026-07-29 to 2026-08-04)

Campaign 24084222862 showed **zero impressions, clicks, and cost for over a week** after going live, despite campaign/ad-group/ad/keyword all reporting `ELIGIBLE` and zero policy issues via the API throughout. Root-caused via a mix of self-diagnosis and direct escalation to Google Ad Grants support:

- **Fixes applied along the way** (all confirmed live, none of these were the root cause but all were real improvements): replaced 16 of 20 keywords that had zero measurable Keyword Planner search volume (`AD_GROUP_CRITERION_RARELY_SERVED`) with volume-backed alternatives; widened geo-targeting from Negombo-only to 8 Sri Lanka locations (Negombo, Kandy, Dambulla, Habarana, Colombo, Polonnaruwa, Anuradhapura, Ella); switched location option from `PRESENCE` to `PRESENCE_OR_INTEREST`; added a 3rd, stronger 15-headline RSA to one ad group.
- **Actual root cause, confirmed directly by Google Ad Grants support (2026-08-04 email from Bharath, Google for Nonprofits Team):** the account had a **system-imposed daily spending limit tied to a post-reactivation security review** — invisible via the API or dashboard the entire time. This has now been **lifted**, and the account is confirmed **fully compliant**, with the spending limit restored to the full **$10,000/month** Ad Grants allowance.
- Bidding strategy was also switched from Manual CPC ($2.00 cap) to **Maximize Conversions** (the Ad Grants-sanctioned exception to the $2 cap) around the same time, per a recommendation independently confirmed by both this analysis and Google support — currently in `LEARNING` status (`campaign.primary_status`).
- As of the last check (still same day as the lift), impressions/clicks/cost are still at 0 — expected immediately after the block lifts; watch over the next 48-72 hours per Google support's own guidance.
- **Lesson for future sessions:** when a fully-eligible, policy-clean campaign shows zero impressions for an extended period with no visible cause, a silent account-level spend/security hold tied to recent reactivation is a real, confirmed failure mode for this account — escalate directly to Google Ad Grants support rather than continuing to iterate on campaign-level settings.

## Zero impressions persist post-fix, escalated again (2026-08-09 to 2026-08-11)

Despite the 2026-08-04 fix (spending limit lifted, account confirmed fully compliant), campaign 24084222862 still showed **zero impressions, clicks, cost, and conversions** as of the next check:

- **2026-08-09** (5 days after the fix, via email to Bharath/Ad Grants support, case `6-4338000041723`): confirmed no change at all — still 0/0/0/0. Both previously-suspected causes were explicitly ruled out: Maximize Conversions bidding had exited `LEARNING` (`campaign.primary_status` = `ELIGIBLE`), and the spend-limit block was already confirmed lifted by Google. Campaign state at that check: Enabled/Serving/Eligible, 2 ad groups, 5 approved RSAs, 20 keywords (mostly Eligible), 8 Sri Lanka locations targeted (Presence or Interest), no policy issues or recommendations flagged via the API.
- **No reply received** from Google Ad Grants support to the Aug 9 follow-up as of this writing.
- **2026-08-11:** a **new, separate support case was opened** — `0-4196000041259`, via general `ads-support@google.com` rather than the Ad Grants (`googlegrants-support@google.com`) queue. Only an auto-acknowledgment received so far; no substantive reply yet.
- **Status as of 2026-08-12: still open and unresolved.** Campaign has now been fully compliant and nominally "serving" for over a week with zero measured activity, and two Google support threads are outstanding (`6-4338000041723` awaiting a real reply since Aug 9; `0-4196000041259` newly opened Aug 11).
- **Next step:** watch both case threads for a reply; if no response arrives soon, consider escalating further (e.g. via the Google for Nonprofits community forum or requesting a specialist follow-up), since two independently-confirmed-resolved blockers have not restored actual delivery.

## Full email-trail reconstruction and new findings (2026-09-09)

No live API/MCP access exists in this environment, so this review is reconstructed entirely from the Gmail trail (`nish@zeroplasticmovement.org`). It fills in three weeks (Aug 11 – Sep 9) not previously captured here, and surfaces two live, unresolved issues.

**Case churn, Aug 11–22 (case `0-4196000041259`, opened via general `ads-support@google.com` after the original Grants case went unanswered):**
- Aug 19: a *third*, separate case (`1-8950000041329`) was also opened around the same time; Google's reply (Rajeshwari) punted impressions/disapproval questions to "the Google Ads team" and gave only generic Ad Grants tips — no account-specific diagnosis.
- Aug 21: a support agent (Sumedh) on case `0-4196000041259` told Nish the account "needs to change as per Account management policy" and to switch to Maximize Conversions — **despite this already having been done and confirmed on Aug 9**. Nish replied visibly frustrated: different support agents were giving contradictory/repeated instructions with no continuity between them.
- Aug 22: Nish confirmed (again) both enabled Search campaigns are on Maximize Conversions with no Target CPA, no policy issues, correct primary conversion action, and asked Sumedh to restore the daily spend limit to $329 (the daily-equivalent of the $10,000/month Ad Grants cap) as promised.
- **No reply from Google since Aug 22 (18 days as of 2026-09-09).** This case is still open and unanswered — a second, separate stall after the Aug 9 stall on the original case.

**New issue #1 — disapproved asset, unresolved (2026-09-05):** Google Ads sent a policy notice: **1 asset disapproved, policy reason "Destination not working."** This is a concrete, fixable compliance issue (Google Ads Compliance Officer hat) and — given the account's history of unexplained zero delivery — a real candidate contributing cause, not just cosmetic. No evidence in the mailbox that this has been investigated or fixed yet. **Action needed:** open Policy Manager, identify the specific disapproved asset, fix its destination URL (check for a broken/redirecting/blocked landing page), then use the "Appeal" action on that ad once the destination is confirmed working.

**New issue #2 — pending admin security approval, unresolved, deadline 2026-09-19:** Google sent "[Action required] Review security request" (Aug 30) and "[Reminder]" (Sep 2): admin `nish@zeroplasticmovement.org` requested a "sensitive change" on account 542-121-6511 that requires a separate in-UI admin approval (Google's standard 2-step sensitive-change confirmation, not something actionable by email or API). **This has not been approved or rejected yet**, and the request expires **2026-09-19**. Until it's approved (or re-requested after expiry), whatever change was queued will not take effect — worth checking whether this is tied to the still-pending $329/day spend-limit restoration. **Action needed:** sign into the Google Ads UI and approve/reject this request before it expires.

**Net assessment:** as of 2026-09-09, the account has now gone over five weeks since the Aug 4 "fully compliant, $10,000/month restored" confirmation with no confirmed impressions, and has accumulated three open/stalled support threads plus two unresolved account-level issues (disapproved asset, pending security approval) that were never surfaced back to Google support or resolved. These are higher-confidence, concrete next steps compared to the earlier speculative "silent spend limit" theory — recommend resolving both before further escalating to Google support again.

## Full account analysis (2026-09-19) — corrected timeline, root-cause hypothesis, priority actions

Deeper pass through the same three Google support cases fills in gaps the 09-09 entry missed, and the deadline flagged then has now arrived. No live Ads API access in this environment — this is a Gmail-trail reconstruction plus analysis, not a live account pull.

**Corrected/extended support timeline:**
- **Aug 19 08:22** (case `6-4338000041723`): Bharath sends a **second, word-for-word repeat** of the Aug 3 "fully compliant, $10,000/month restored" confirmation.
- **Aug 19 11:22:** Nish pushes back — "two weeks back also you told the same but nothing happened," 30 days running with zero impressions using the Google Ads MCP connector.
- **Aug 19 14:19 / 17:02:** Two more generic, non-diagnostic replies land (case `1-8950000041329` punts to "the Google Ads team"; case `6-4338000041723` repeats boilerplate tips).
- **Aug 21 00:49:** Nish explicitly **requests escalation beyond the standard support queue** on case `6-4338000041723`.
- **Aug 21–22** (case `0-4196000041259`): the Sumedh back-and-forth already logged above.
- **Aug 24 20:15** (case `0-4196000041259`): Sumedh sends a **third** "fully compliant, $10,000/month restored" confirmation — essentially the same message as Aug 3 and Aug 19, on yet another case thread.
- **Aug 30 / Sep 2:** pending admin security-approval request ("sensitive change" on the account), unactioned, expiry set for **2026-09-19 — today**.
- **Sep 5:** disapproved asset notice, "Destination not working."
- **Sep 7 18:23:** Bharath's reply to Nish's **Aug 21 escalation request — 17 days later** — is a two-line non-answer ("we understand your concern... follow the steps in the previous email"). The explicit escalation ask was never actually honored.
- **Sep 13:** account granted **Customer Match** access — a mildly positive signal (Google doesn't typically extend this to accounts under active major penalty), but not proof of ad delivery.
- **Sep 14:** a **second** "Assets (1) impacted — Destination not working" notice, 9 days after the first. Same policy reason both times — strong evidence this is an unresolved, possibly recurring/unfixed disapproval, not a one-off.
- **No further correspondence found Sep 14 → Sep 19 (today).** No confirmation the security request was ever approved/rejected before its deadline.

**Root-cause reassessment (Ad Grant Specialist + Compliance Officer hats):** Google support has now told Nish "fully compliant, spend limit restored" **three separate times** (Aug 3, Aug 19, Aug 24) across three case numbers, without impressions ever materializing. That repetition itself is a signal: these replies check a compliance status field, not actual serving — they are not proof the account can serve ads. Meanwhile two concrete, mechanically-plausible blockers have sat unaddressed:
1. **A recurring "Destination not working" disapproval.** Ad Grants requires **at least 2 active ads per ad group**. If this disapproval affects an RSA (rather than just a sitelink/callout asset), and it has now persisted across two separate notices nine days apart, it may have silently dropped one or both ad groups below the 2-active-ad minimum — which would suppress serving for the whole ad group, not just the flagged asset. This is a materially stronger candidate than the earlier "silent spend limit" theory, precisely because that theory has now been "fixed" three times without effect.
2. **The unactioned sensitive-change security approval**, expired or expiring today. Whatever change was queued (possibly the very bid-strategy/budget change support asked for) will not take effect until approved — and if it lapsed today, it needs to be re-requested, which likely restarts another silent wait.

**Priority actions, in order:**
1. **Today:** sign into the Ads UI and check whether the security request from Aug 30 is still pending, expired, or was already resolved. If still open, approve/reject it before the window closes (if not already closed).
2. **Immediately:** open Policy Manager, identify the specific disapproved asset (is it an RSA or an ad extension?), check whether either ad group has dropped below 2 active ads, and fix the destination URL — test it directly for redirects, server errors, or a broken/moved landing page — then use "Appeal" once confirmed working.
3. **If ad-group active-ad counts are below the Ad Grants minimum**, add compliant replacement RSAs immediately regardless of the disapproval appeal outcome, to restore compliance and remove that specific serving suppression.
4. **On the next support contact**, stop asking "why zero impressions" (which invites generic tips) — cite the specific unresolved items instead: case numbers `6-4338000041723`, `0-4196000041259`, `1-8950000041329`; the Sep 5/Sep 14 disapproval; and the Aug 30 security request — and ask Google to confirm actual ad-serving/impression status directly, not just compliance status.
5. Once both are resolved, resume the 48–72 hour delivery watch as before.

## Outstanding items (Google Ads account side)

Developer token access level (Explorer vs. Basic) has not been re-checked since reactivation — assume it's still Explorer/read-only until confirmed otherwise.

- Watch for first real impressions/clicks/conversions now that the spending limit is restored and bidding is on Maximize Conversions in learning mode.
- No conversions have been recorded yet. Watch the conversion action's diagnostics in the Ads UI to confirm it's registering real activity; this isn't visible via the API.
- Campaign name still reads "Negombo Tourists" despite targeting 8 cities — cosmetic only (no functional/compliance effect), rename left to the org's discretion.
- No further optimization planned until real performance data comes in from the now-unblocked account.

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
