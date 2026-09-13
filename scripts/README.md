# scripts/

Tooling for pulling live data out of the ZeroPlastic Movement Google Ads account.

## `pull_account.py`

Pulls a **read-only** snapshot of the account and writes it to
`reports/snapshots/<date>/`:

- `raw/<query>.json` — one file per GAQL query, exactly as the API returned it
- `summary.md` — account/campaign tables plus an automated Ad Grants
  compliance check against the checklist in [CLAUDE.md](../CLAUDE.md)

Every call is a GAQL `SELECT`. Nothing in this script mutates the account, so
it is safe to run with an **Explorer (read-only) developer token** — which is
what this account currently has per
[docs/account-status.md](../docs/account-status.md).

Standard library only — no `pip install` required.

### Running it

```bash
python3 scripts/pull_account.py                      # full pull, last 30 days
python3 scripts/pull_account.py --dry-run            # print queries, call nothing
python3 scripts/pull_account.py --date-range LAST_7_DAYS
python3 scripts/pull_account.py --include-removed    # include REMOVED entities
python3 scripts/pull_account.py --out /tmp/pull      # write somewhere else
```

Exit codes: `0` all queries succeeded, `1` some queries failed (details in the
raw JSON), `2` credentials missing.

### Credentials

The script reads credentials from environment variables, falling back to the
local files documented in `docs/account-status.md`. It never prints their
values, and nothing under `~/.mcp-google-ads/` is ever written into the repo.

| Env var | File fallback |
| --- | --- |
| `GOOGLE_ADS_CLIENT_ID` | `~/.mcp-google-ads/credentials.json` |
| `GOOGLE_ADS_CLIENT_SECRET` | `~/.mcp-google-ads/credentials.json` |
| `GOOGLE_ADS_REFRESH_TOKEN` | `~/.mcp-google-ads/token.json` |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | `~/.mcp-google-ads/developer_token.txt` |
| `GOOGLE_ADS_CUSTOMER_ID` | defaults to `5421216511` (542-121-6511) |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | defaults to `4716872746` (471-687-2746, MCC) |
| `GOOGLE_ADS_API_VERSION` | defaults to `v26` |

**This only runs where those credentials exist.** They live on the operator's
local machine, not in Claude Code's remote sandbox — a remote session has no
`~/.mcp-google-ads/` and cannot reach the account.

### API version

Verified against `googleads.googleapis.com` on 2026-09-04: **v22–v26 accept
requests; v21 and below are retired** (404). The default is `v26`. Google
sunsets versions roughly yearly — when a pull starts returning 404 on every
query, probe for the current version and bump `DEFAULT_API_VERSION`:

```bash
for v in v26 v27 v28 v29; do
  printf '%s -> ' "$v"
  curl -s -o /dev/null -w '%{http_code}\n' -X POST \
    "https://googleads.googleapis.com/$v/customers/5421216511/googleAds:searchStream" \
    -H 'Content-Type: application/json' -d '{"query":"SELECT customer.id FROM customer"}'
done
```

`401` means the version is live (auth required); `404` means it is retired or
does not exist yet.

### What it pulls

| Query | Contents |
| --- | --- |
| `account` | Customer settings, status, currency, time zone, auto-tagging |
| `account_metrics` | Account-level impressions/clicks/CTR/cost/conversions |
| `campaigns` | Per-campaign performance for the date range |
| `campaigns_settings` | Status, primary status + reasons, bidding, budget, networks |
| `ad_groups` | Ad groups with status and CPC bids |
| `ads` | RSAs with headlines, descriptions, final URLs, policy approval status |
| `keywords` | Keywords with match type, status, quality score, serving status |
| `keyword_metrics` | Per-keyword performance |
| `negative_keywords_campaign` / `_ad_group` | Negative keyword lists |
| `geo_targets` / `language_targets` | Location and language targeting |
| `campaign_assets` / `customer_assets` | Sitelinks, callouts, structured snippets |
| `conversion_actions` | Conversion actions with category, counting, attribution |
| `search_terms` | Search terms report for the date range |
| `daily_metrics` | Day-by-day campaign metrics |

### Compliance check

`summary.md` ends with an automated pass over the Ad Grants checklist:

- 2+ ad groups per enabled campaign, each with 2+ enabled ads
- No disapproved ads
- No single-word keywords; broad-match keywords flagged
- $2.00 max CPC, with Maximize Conversions / Target CPA recognised as the
  sanctioned exception
- Account CTR at or above 5%
- Deliberate geo targeting (no campaign defaulting to worldwide)
- 2+ active sitelinks per enabled campaign (campaign- and account-level)
- All destination URLs on HTTPS

Each line is `PASS`, `FAIL`, `WARN`, or `SKIP`. **`SKIP` means the pull did not
return the data needed to judge that rule** — treat it as unknown, not as a
pass.

The check reads only what the API returns. It cannot see account-level spend
or security holds, which are invisible to the API — the confirmed root cause of
this account's 2026-08 zero-impressions episode. A clean compliance report is
therefore not on its own an explanation for a campaign that is not serving.
