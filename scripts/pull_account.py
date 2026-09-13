#!/usr/bin/env python3
"""Pull a read-only snapshot of the ZeroPlastic Movement Google Ads account.

Reads the live account via the Google Ads REST API (searchStream) and writes
the results into reports/snapshots/<date>/ as raw JSON plus a human-readable
summary that includes an automated Ad Grants compliance check.

Read-only: every call is a GAQL SELECT. Nothing here mutates the account, so it
is safe to run with an Explorer (read-only) developer token.

Credentials are never printed. They are read from environment variables, or
from the local credential files documented in docs/account-status.md:

    ~/.mcp-google-ads/credentials.json    OAuth client id/secret
    ~/.mcp-google-ads/token.json          OAuth refresh token
    ~/.mcp-google-ads/developer_token.txt Developer token

Environment overrides (all optional if the files above exist):

    GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN,
    GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID,
    GOOGLE_ADS_LOGIN_CUSTOMER_ID, GOOGLE_ADS_API_VERSION

Usage:
    python3 scripts/pull_account.py                 # full pull
    python3 scripts/pull_account.py --dry-run       # print queries, call nothing
    python3 scripts/pull_account.py --include-removed
    python3 scripts/pull_account.py --date-range LAST_7_DAYS
"""

from __future__ import annotations

import argparse
import re
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
CRED_DIR = pathlib.Path(os.path.expanduser("~/.mcp-google-ads"))

# Verified live 2026-09-04 by probing googleads.googleapis.com: v22-v26 accept
# requests (401 = auth required), v21 and below are retired (404). Bump this
# default when a newer version starts answering; older ones sunset roughly
# yearly.
DEFAULT_API_VERSION = "v26"

# Account identifiers from docs/account-status.md. Overridable via env.
DEFAULT_CUSTOMER_ID = "5421216511"        # 542-121-6511 ZeroPlastic Movement
DEFAULT_LOGIN_CUSTOMER_ID = "4716872746"  # 471-687-2746 Manager (MCC)

TOKEN_URL = "https://oauth2.googleapis.com/token"
MICROS = 1_000_000


# --------------------------------------------------------------------------
# Credentials
# --------------------------------------------------------------------------

def _read_json(path: pathlib.Path) -> dict:
    try:
        with path.open() as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def load_credentials() -> dict:
    """Assemble credentials from env vars, falling back to local files.

    Returns a dict with client_id, client_secret, refresh_token,
    developer_token, customer_id, login_customer_id. Missing values are "".
    """
    client = _read_json(CRED_DIR / "credentials.json")
    # OAuth client JSON is either {"installed": {...}} / {"web": {...}} or flat.
    client = client.get("installed") or client.get("web") or client
    token = _read_json(CRED_DIR / "token.json")

    dev_token = ""
    dev_path = CRED_DIR / "developer_token.txt"
    if dev_path.exists():
        dev_token = dev_path.read_text().strip()

    return {
        "client_id": os.environ.get("GOOGLE_ADS_CLIENT_ID")
        or client.get("client_id", ""),
        "client_secret": os.environ.get("GOOGLE_ADS_CLIENT_SECRET")
        or client.get("client_secret", ""),
        "refresh_token": os.environ.get("GOOGLE_ADS_REFRESH_TOKEN")
        or token.get("refresh_token", ""),
        "developer_token": os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN")
        or dev_token,
        "customer_id": (
            os.environ.get("GOOGLE_ADS_CUSTOMER_ID") or DEFAULT_CUSTOMER_ID
        ).replace("-", ""),
        "login_customer_id": (
            os.environ.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID")
            or DEFAULT_LOGIN_CUSTOMER_ID
        ).replace("-", ""),
    }


def missing_credentials(creds: dict) -> list[str]:
    required = ("client_id", "client_secret", "refresh_token", "developer_token")
    return [name for name in required if not creds.get(name)]


def fetch_access_token(creds: dict) -> str:
    """Exchange the refresh token for a short-lived access token."""
    body = urllib.parse.urlencode(
        {
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
            "refresh_token": creds["refresh_token"],
            "grant_type": "refresh_token",
        }
    ).encode()
    req = urllib.request.Request(TOKEN_URL, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)["access_token"]
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:400]
        raise SystemExit(
            f"OAuth token refresh failed ({exc.code}). The refresh token is "
            f"likely expired or revoked; re-authorize the OAuth client.\n{detail}"
        ) from exc


# --------------------------------------------------------------------------
# Queries
# --------------------------------------------------------------------------

def where(*clauses: str) -> str:
    """Join non-empty clauses into a WHERE block, or return '' if there are none."""
    live = [c for c in clauses if c]
    return (" WHERE " + " AND ".join(live)) if live else ""


def date_expression(date_range: str) -> str:
    """Return a GAQL date predicate for a literal or an explicit START:END window.

    "LAST_7_DAYS"              -> DURING LAST_7_DAYS
    "2026-09-11:2026-09-13"    -> BETWEEN '2026-09-11' AND '2026-09-13'
    "2026-09-11"               -> BETWEEN '2026-09-11' AND '2026-09-11'
    """
    iso = r"\d{4}-\d{2}-\d{2}"
    m = re.fullmatch(rf"({iso}):({iso})", date_range)
    if m:
        return f"BETWEEN '{m.group(1)}' AND '{m.group(2)}'"
    if re.fullmatch(iso, date_range):
        return f"BETWEEN '{date_range}' AND '{date_range}'"
    if not re.fullmatch(r"[A-Z_0-9]+", date_range):
        raise SystemExit(
            f"Invalid --date-range {date_range!r}: expected a GAQL literal such as "
            "LAST_7_DAYS, or an explicit window like 2026-09-11:2026-09-13"
        )
    return f"DURING {date_range}"


def build_queries(date_range: str, include_removed: bool) -> dict[str, str]:
    # date_range is either a GAQL date literal (LAST_7_DAYS, TODAY, ...) or an
    # explicit "YYYY-MM-DD:YYYY-MM-DD" window. Ad Grants reporting often needs a
    # specific window (e.g. comparing Sep 11-13 against Sep 8-10), which the
    # DURING literals cannot express.
    date_expr = date_expression(date_range)
    date_clause = f"segments.date {date_expr}"
    camp_live = "" if include_removed else "campaign.status != 'REMOVED'"
    ag_live = "" if include_removed else "ad_group.status != 'REMOVED'"
    ada_live = "" if include_removed else "ad_group_ad.status != 'REMOVED'"
    kw_live = "" if include_removed else "ad_group_criterion.status != 'REMOVED'"

    camp_filter = where(camp_live)
    ag_filter = where(ag_live)
    ada_filter = where(ada_live)
    camp_perf_filter = where(camp_live, date_clause)
    kw_filter = where("ad_group_criterion.type = 'KEYWORD'", kw_live)

    return {
        "account": """
            SELECT customer.id, customer.descriptive_name, customer.currency_code,
                   customer.time_zone, customer.status, customer.manager,
                   customer.test_account, customer.auto_tagging_enabled,
                   customer.optimization_score, customer.tracking_url_template
            FROM customer
        """,
        "account_metrics": f"""
            SELECT customer.id, metrics.impressions, metrics.clicks, metrics.ctr,
                   metrics.cost_micros, metrics.average_cpc, metrics.conversions,
                   metrics.conversions_value, metrics.all_conversions
            FROM customer
            WHERE segments.date {date_expr}
        """,
        "campaigns": f"""
            SELECT campaign.id, campaign.name, campaign.status,
                   campaign.primary_status, campaign.primary_status_reasons,
                   campaign.serving_status, campaign.advertising_channel_type,
                   campaign.advertising_channel_sub_type,
                   campaign.bidding_strategy_type, campaign.start_date,
                   campaign.end_date, campaign.tracking_url_template,
                   campaign.final_url_suffix,
                   campaign.network_settings.target_google_search,
                   campaign.network_settings.target_search_network,
                   campaign.network_settings.target_content_network,
                   campaign_budget.amount_micros,
                   campaign_budget.explicitly_shared,
                   metrics.impressions, metrics.clicks, metrics.ctr,
                   metrics.cost_micros, metrics.average_cpc, metrics.conversions
            FROM campaign{camp_perf_filter}
        """,
        "campaigns_settings": f"""
            SELECT campaign.id, campaign.name, campaign.status,
                   campaign.primary_status, campaign.primary_status_reasons,
                   campaign.advertising_channel_type,
                   campaign.bidding_strategy_type,
                   campaign.maximize_conversions.target_cpa_micros,
                   campaign.target_spend.cpc_bid_ceiling_micros,
                   campaign.geo_target_type_setting.positive_geo_target_type,
                   campaign.final_url_suffix, campaign_budget.amount_micros
            FROM campaign{camp_filter}
        """,
        "ad_groups": f"""
            SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
                   ad_group.status, ad_group.primary_status, ad_group.type,
                   ad_group.cpc_bid_micros, ad_group.target_cpa_micros
            FROM ad_group{ag_filter}
        """,
        "ads": f"""
            SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
                   ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status,
                   ad_group_ad.primary_status,
                   ad_group_ad.policy_summary.approval_status,
                   ad_group_ad.policy_summary.review_status,
                   ad_group_ad.ad.final_urls,
                   ad_group_ad.ad.responsive_search_ad.headlines,
                   ad_group_ad.ad.responsive_search_ad.descriptions,
                   ad_group_ad.ad.responsive_search_ad.path1,
                   ad_group_ad.ad.responsive_search_ad.path2
            FROM ad_group_ad{ada_filter}
        """,
        "keywords": f"""
            SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
                   ad_group_criterion.criterion_id,
                   ad_group_criterion.keyword.text,
                   ad_group_criterion.keyword.match_type,
                   ad_group_criterion.status,
                   ad_group_criterion.approval_status,
                   ad_group_criterion.system_serving_status,
                   ad_group_criterion.quality_info.quality_score,
                   ad_group_criterion.quality_info.search_predicted_ctr,
                   ad_group_criterion.quality_info.creative_quality_score,
                   ad_group_criterion.quality_info.post_click_quality_score,
                   ad_group_criterion.effective_cpc_bid_micros,
                   ad_group_criterion.final_urls
            FROM ad_group_criterion{kw_filter}
        """,
        "keyword_metrics": f"""
            SELECT campaign.name, ad_group.name,
                   ad_group_criterion.keyword.text,
                   ad_group_criterion.keyword.match_type,
                   metrics.impressions, metrics.clicks, metrics.ctr,
                   metrics.cost_micros, metrics.average_cpc, metrics.conversions
            FROM keyword_view
            WHERE segments.date {date_expr}
        """,
        "negative_keywords_campaign": """
            SELECT campaign.id, campaign.name, campaign_criterion.criterion_id,
                   campaign_criterion.keyword.text,
                   campaign_criterion.keyword.match_type,
                   campaign_criterion.negative, campaign_criterion.type
            FROM campaign_criterion
            WHERE campaign_criterion.negative = TRUE
              AND campaign_criterion.type = 'KEYWORD'
        """,
        "negative_keywords_ad_group": """
            SELECT campaign.name, ad_group.id, ad_group.name,
                   ad_group_criterion.criterion_id,
                   ad_group_criterion.keyword.text,
                   ad_group_criterion.keyword.match_type
            FROM ad_group_criterion
            WHERE ad_group_criterion.negative = TRUE
              AND ad_group_criterion.type = 'KEYWORD'
        """,
        "geo_targets": """
            SELECT campaign.id, campaign.name, campaign_criterion.criterion_id,
                   campaign_criterion.location.geo_target_constant,
                   campaign_criterion.negative, campaign_criterion.type
            FROM campaign_criterion
            WHERE campaign_criterion.type IN ('LOCATION', 'PROXIMITY')
        """,
        "language_targets": """
            SELECT campaign.id, campaign.name,
                   campaign_criterion.language.language_constant
            FROM campaign_criterion
            WHERE campaign_criterion.type = 'LANGUAGE'
        """,
        "campaign_assets": """
            SELECT campaign.id, campaign.name, campaign_asset.asset,
                   campaign_asset.field_type, campaign_asset.status,
                   asset.id, asset.type, asset.name,
                   asset.sitelink_asset.link_text,
                   asset.sitelink_asset.description1,
                   asset.sitelink_asset.description2,
                   asset.callout_asset.callout_text,
                   asset.structured_snippet_asset.header,
                   asset.structured_snippet_asset.values,
                   asset.final_urls
            FROM campaign_asset
        """,
        "customer_assets": """
            SELECT customer_asset.asset, customer_asset.field_type,
                   customer_asset.status, asset.id, asset.type, asset.name,
                   asset.sitelink_asset.link_text, asset.callout_asset.callout_text,
                   asset.final_urls
            FROM customer_asset
        """,
        "conversion_actions": """
            SELECT conversion_action.id, conversion_action.name,
                   conversion_action.status, conversion_action.type,
                   conversion_action.category,
                   conversion_action.primary_for_goal,
                   conversion_action.counting_type,
                   conversion_action.attribution_model_settings.attribution_model,
                   conversion_action.value_settings.default_value,
                   conversion_action.click_through_lookback_window_days
            FROM conversion_action
        """,
        "search_terms": f"""
            SELECT campaign.name, ad_group.name,
                   search_term_view.search_term,
                   search_term_view.status,
                   segments.search_term_match_type,
                   metrics.impressions, metrics.clicks, metrics.ctr,
                   metrics.cost_micros, metrics.conversions
            FROM search_term_view
            WHERE segments.date {date_expr}
        """,
        "daily_metrics": f"""
            SELECT segments.date, campaign.id, campaign.name,
                   metrics.impressions, metrics.clicks, metrics.ctr,
                   metrics.cost_micros, metrics.average_cpc,
                   metrics.conversions, metrics.conversions_value,
                   metrics.all_conversions,
                   metrics.conversions_from_interactions_rate,
                   metrics.cost_per_conversion,
                   metrics.search_impression_share,
                   metrics.search_top_impression_share,
                   metrics.search_absolute_top_impression_share,
                   metrics.search_rank_lost_impression_share,
                   metrics.search_budget_lost_impression_share
            FROM campaign
            WHERE segments.date {date_expr}
        """,
        # Today only, split by hour - "up to the latest available hour".
        "hourly_today": f"""
            SELECT segments.date, segments.hour, campaign.id, campaign.name,
                   metrics.impressions, metrics.clicks, metrics.ctr,
                   metrics.cost_micros, metrics.conversions
            FROM campaign
            WHERE segments.date DURING TODAY
        """,
        # Ad group performance over the window (Step 5). The `ad_groups` query
        # above carries settings only and has no date segment.
        "ad_group_metrics": f"""
            SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
                   ad_group.status,
                   metrics.impressions, metrics.clicks, metrics.ctr,
                   metrics.cost_micros, metrics.average_cpc,
                   metrics.conversions,
                   metrics.conversions_from_interactions_rate,
                   metrics.cost_per_conversion
            FROM ad_group
            WHERE segments.date {date_expr}
        """,
        # Per-ad performance over the window (Step 8).
        "ad_metrics": f"""
            SELECT campaign.name, ad_group.name, ad_group_ad.ad.id,
                   ad_group_ad.status,
                   ad_group_ad.policy_summary.approval_status,
                   metrics.impressions, metrics.clicks, metrics.ctr,
                   metrics.cost_micros, metrics.conversions
            FROM ad_group_ad
            WHERE segments.date {date_expr}
        """,
        # Which conversion action each conversion came from (Step 4) - the only
        # way to prove a campaign is optimising toward the intended action and
        # not being diluted by unrelated ones.
        "conversions_by_action": f"""
            SELECT campaign.id, campaign.name, ad_group.name,
                   segments.conversion_action,
                   segments.conversion_action_name,
                   segments.conversion_action_category,
                   metrics.conversions, metrics.all_conversions,
                   metrics.conversions_value
            FROM campaign
            WHERE segments.date {date_expr}
        """,
        # Budget delivery + whether the campaign is budget-limited (Step 3).
        "budget_details": f"""
            SELECT campaign.id, campaign.name, campaign_budget.id,
                   campaign_budget.name, campaign_budget.amount_micros,
                   campaign_budget.status, campaign_budget.delivery_method,
                   campaign_budget.period, campaign_budget.explicitly_shared,
                   campaign_budget.has_recommended_budget,
                   campaign_budget.recommended_budget_amount_micros
            FROM campaign{camp_filter}
        """,
        # Portfolio bid strategies, if any are attached (Step 3).
        "portfolio_bid_strategies": """
            SELECT bidding_strategy.id, bidding_strategy.name,
                   bidding_strategy.type, bidding_strategy.status,
                   bidding_strategy.campaign_count,
                   bidding_strategy.non_removed_campaign_count
            FROM bidding_strategy
        """,
        # Customer Match / audience state (Step 9).
        "user_lists": """
            SELECT user_list.id, user_list.name, user_list.type,
                   user_list.membership_status, user_list.size_for_search,
                   user_list.size_for_display, user_list.eligible_for_search,
                   user_list.eligible_for_display, user_list.match_rate_percentage,
                   user_list.read_only, user_list.access_reason
            FROM user_list
        """,
        "campaign_audiences": """
            SELECT campaign.id, campaign.name, campaign_criterion.criterion_id,
                   campaign_criterion.type, campaign_criterion.status,
                   campaign_criterion.bid_modifier,
                   campaign_criterion.user_list.user_list
            FROM campaign_criterion
            WHERE campaign_criterion.type = 'USER_LIST'
        """,
        # bid_only = true means Observation; false means Targeting (Step 9).
        "targeting_settings": f"""
            SELECT campaign.id, campaign.name,
                   campaign.targeting_setting.target_restrictions
            FROM campaign{camp_filter}
        """,
        # Asset-level policy detail, for the known "Destination not working"
        # disapproval. May not be supported on every API version; a failure here
        # is isolated to this one query.
        "asset_policy": """
            SELECT campaign.name, ad_group.name, asset.id, asset.type,
                   asset.name, asset.final_urls,
                   ad_group_ad_asset_view.field_type,
                   ad_group_ad_asset_view.policy_summary.approval_status,
                   ad_group_ad_asset_view.policy_summary.review_status
            FROM ad_group_ad_asset_view
        """,
    }


# --------------------------------------------------------------------------
# API access
# --------------------------------------------------------------------------

def run_gaql(query: str, creds: dict, access_token: str, version: str) -> dict:
    """Run one GAQL query via searchStream. Returns {"results": [...]} or an error."""
    url = (
        f"https://googleads.googleapis.com/{version}/customers/"
        f"{creds['customer_id']}/googleAds:searchStream"
    )
    payload = json.dumps({"query": " ".join(query.split())}).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {access_token}")
    req.add_header("developer-token", creds["developer_token"])
    if creds.get("login_customer_id"):
        req.add_header("login-customer-id", creds["login_customer_id"])
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            chunks = json.load(resp)
    except urllib.error.HTTPError as exc:
        return {
            "error": {
                "http_status": exc.code,
                "detail": exc.read().decode("utf-8", "replace")[:2000],
            }
        }
    except urllib.error.URLError as exc:
        return {"error": {"http_status": None, "detail": str(exc.reason)}}

    results: list = []
    if isinstance(chunks, list):
        for chunk in chunks:
            results.extend(chunk.get("results", []))
    else:
        results.extend(chunks.get("results", []))
    return {"results": results}


# --------------------------------------------------------------------------
# Summary + compliance
# --------------------------------------------------------------------------

def _camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(word.capitalize() for word in rest)


def get(obj: dict, path: str, default=None):
    """Nested lookup by GAQL-style snake_case path: get(row, 'campaign.name').

    The Google Ads REST API serialises protobuf to JSON with lowerCamelCase
    keys ('adGroupAd', 'costMicros'), so each path segment is tried in both
    forms. Written this way so query fields and lookups use one spelling.
    """
    cur = obj
    for part in path.split("."):
        if not isinstance(cur, dict):
            return default
        if part in cur:
            cur = cur[part]
            continue
        camel = _camel(part)
        if camel in cur:
            cur = cur[camel]
            continue
        return default
    return cur


def cell(value) -> str:
    """Render a value for a markdown table cell, escaping pipes.

    Campaign names in this account contain '|' (e.g. 'ZP | Search | Negombo'),
    which would otherwise split into extra columns.
    """
    return str(value).replace("|", "\\|")


def micros(value) -> float:
    try:
        return int(value) / MICROS
    except (TypeError, ValueError):
        return 0.0


def compliance_report(data: dict[str, dict]) -> list[str]:
    """Ad Grants checklist from CLAUDE.md, evaluated against the pulled data.

    Each line is prefixed PASS / FAIL / WARN / SKIP. SKIP means the pull didn't
    return the data needed to judge (e.g. the query errored).
    """
    lines: list[str] = []

    def rows(name: str) -> list[dict] | None:
        block = data.get(name, {})
        if "error" in block:
            return None
        return block.get("results", [])

    campaigns = rows("campaigns_settings")
    ad_groups = rows("ad_groups")
    ads = rows("ads")
    keywords = rows("keywords")
    geo = rows("geo_targets")
    camp_assets = rows("campaign_assets")
    cust_assets = rows("customer_assets")
    acct_metrics = rows("account_metrics")

    active = (
        [c for c in campaigns if get(c, "campaign.status") == "ENABLED"]
        if campaigns is not None
        else None
    )

    # 1. >= 2 ad groups per enabled campaign, each with >= 2 active ads.
    if active is None or ad_groups is None or ads is None:
        lines.append("SKIP  Ad group / ad minimums — required data not returned")
    elif not active:
        lines.append("WARN  No ENABLED campaigns — nothing is serving")
    else:
        for camp in active:
            cid = get(camp, "campaign.id")
            name = get(camp, "campaign.name", cid)
            camp_ags = [
                a
                for a in ad_groups
                if get(a, "campaign.id") == cid
                and get(a, "ad_group.status") == "ENABLED"
            ]
            if len(camp_ags) < 2:
                lines.append(
                    f"FAIL  '{name}' has {len(camp_ags)} enabled ad group(s); "
                    "Ad Grants requires 2+"
                )
            else:
                lines.append(
                    f"PASS  '{name}' has {len(camp_ags)} enabled ad groups"
                )
            for ag in camp_ags:
                agid = get(ag, "ad_group.id")
                agname = get(ag, "ad_group.name", agid)
                live = [
                    a
                    for a in ads
                    if get(a, "ad_group.id") == agid
                    and get(a, "ad_group_ad.status") == "ENABLED"
                ]
                if len(live) < 2:
                    lines.append(
                        f"FAIL  Ad group '{agname}' has {len(live)} enabled "
                        "ad(s); Ad Grants requires 2+"
                    )
                disapproved = [
                    a
                    for a in live
                    if get(a, "ad_group_ad.policy_summary.approval_status")
                    not in ("APPROVED", "APPROVED_LIMITED", None)
                ]
                for ad in disapproved:
                    lines.append(
                        f"FAIL  Ad {get(ad, 'ad_group_ad.ad.id')} in '{agname}' is "
                        f"{get(ad, 'ad_group_ad.policy_summary.approval_status')}"
                    )

    # 2. No single-word keywords.
    if keywords is None:
        lines.append("SKIP  Single-word keywords — keyword query returned no data")
    else:
        singles = sorted(
            {
                get(k, "ad_group_criterion.keyword.text", "")
                for k in keywords
                if get(k, "ad_group_criterion.status") == "ENABLED"
                and len(get(k, "ad_group_criterion.keyword.text", "").split()) == 1
            }
        )
        if singles:
            lines.append(
                f"FAIL  {len(singles)} single-word keyword(s): "
                + ", ".join(singles[:10])
                + (" ..." if len(singles) > 10 else "")
            )
        else:
            lines.append("PASS  No single-word keywords")

        broad = [
            k
            for k in keywords
            if get(k, "ad_group_criterion.status") == "ENABLED"
            and get(k, "ad_group_criterion.keyword.match_type") == "BROAD"
        ]
        if broad:
            lines.append(
                f"WARN  {len(broad)} enabled BROAD-match keyword(s) — review for "
                "Ad Grants relevance risk"
            )
        else:
            lines.append("PASS  No enabled BROAD-match keywords")

    # 3. Max CPC <= $2 unless Maximize Conversions.
    if active is None:
        lines.append("SKIP  $2.00 CPC cap — campaign settings not returned")
    else:
        for camp in active:
            name = get(camp, "campaign.name")
            strategy = get(camp, "campaign.bidding_strategy_type")
            if strategy in ("MAXIMIZE_CONVERSIONS", "MAXIMIZE_CONVERSION_VALUE",
                            "TARGET_CPA", "TARGET_ROAS"):
                lines.append(
                    f"PASS  '{name}' uses {strategy} — sanctioned exception to "
                    "the $2.00 cap"
                )
                continue
            cid = get(camp, "campaign.id")
            over = []
            for ag in ad_groups or []:
                if get(ag, "campaign.id") != cid:
                    continue
                if get(ag, "ad_group.status") != "ENABLED":
                    continue
                bid = micros(get(ag, "ad_group.cpc_bid_micros"))
                if bid > 2.0:
                    over.append(f"{get(ag, 'ad_group.name')} (${bid:.2f})")
            if over:
                lines.append(
                    f"FAIL  '{name}' ({strategy}) has bids over $2.00: "
                    + ", ".join(over)
                )
            else:
                lines.append(f"PASS  '{name}' ({strategy}) within the $2.00 cap")

    # 4. Account CTR >= 5%.
    if not acct_metrics:
        lines.append("SKIP  Account CTR — no metrics returned for the period")
    else:
        clicks = sum(int(get(r, "metrics.clicks", 0) or 0) for r in acct_metrics)
        impr = sum(int(get(r, "metrics.impressions", 0) or 0) for r in acct_metrics)
        if impr == 0:
            lines.append("WARN  Account CTR — 0 impressions in the period")
        else:
            ctr = clicks / impr * 100
            verdict = "PASS" if ctr >= 5.0 else "FAIL"
            lines.append(
                f"{verdict}  Account CTR {ctr:.2f}% ({clicks} clicks / "
                f"{impr} impressions); Ad Grants floor is 5%"
            )

    # 5. Geo targeting set deliberately.
    if active is None or geo is None:
        lines.append("SKIP  Geo targeting — data not returned")
    else:
        for camp in active:
            cid = get(camp, "campaign.id")
            name = get(camp, "campaign.name")
            targets = [
                g
                for g in geo
                if get(g, "campaign.id") == cid
                and not get(g, "campaign_criterion.negative", False)
            ]
            if not targets:
                lines.append(
                    f"FAIL  '{name}' has no positive location targets — "
                    "defaults to worldwide"
                )
            else:
                lines.append(
                    f"PASS  '{name}' targets {len(targets)} location(s)"
                )

    # 6. At least 2 active sitelinks.
    if camp_assets is None and cust_assets is None:
        lines.append("SKIP  Sitelinks — asset queries returned no data")
    else:
        def count_sitelinks(rows_, key):
            return len(
                [
                    r
                    for r in rows_ or []
                    if get(r, f"{key}.field_type") == "SITELINK"
                    and get(r, f"{key}.status") == "ENABLED"
                ]
            )

        acct_sitelinks = count_sitelinks(cust_assets, "customer_asset")
        if active:
            for camp in active:
                cid = get(camp, "campaign.id")
                name = get(camp, "campaign.name")
                n = len(
                    [
                        r
                        for r in camp_assets or []
                        if get(r, "campaign.id") == cid
                        and get(r, "campaign_asset.field_type") == "SITELINK"
                        and get(r, "campaign_asset.status") == "ENABLED"
                    ]
                )
                total = n + acct_sitelinks
                verdict = "PASS" if total >= 2 else "FAIL"
                lines.append(
                    f"{verdict}  '{name}' has {total} active sitelink(s) "
                    f"({n} campaign-level + {acct_sitelinks} account-level); "
                    "Ad Grants requires 2+"
                )
        else:
            lines.append(
                f"WARN  {acct_sitelinks} account-level sitelink(s); no enabled "
                "campaigns to check against"
            )

    # 7. HTTPS destination URLs.
    urls: set[str] = set()
    for ad in ads or []:
        for u in get(ad, "ad_group_ad.ad.final_urls", []) or []:
            urls.add(u)
    for kw in keywords or []:
        for u in get(kw, "ad_group_criterion.final_urls", []) or []:
            urls.add(u)
    if not urls:
        lines.append("SKIP  Destination URLs — none returned")
    else:
        insecure = sorted(u for u in urls if not u.lower().startswith("https://"))
        if insecure:
            lines.append(
                f"FAIL  {len(insecure)} non-HTTPS destination URL(s): "
                + ", ".join(insecure[:5])
            )
        else:
            lines.append(f"PASS  All {len(urls)} destination URL(s) use HTTPS")

    return lines


def write_summary(
    out_dir: pathlib.Path,
    data: dict[str, dict],
    date_range: str,
    version: str,
    customer_id: str,
) -> pathlib.Path:
    now = dt.datetime.now(dt.timezone.utc)
    parts: list[str] = []
    parts.append(f"# Google Ads account pull — {now:%Y-%m-%d}")
    parts.append("")
    parts.append(f"- **Customer ID:** {customer_id}")
    parts.append(f"- **Pulled (UTC):** {now:%Y-%m-%d %H:%M}")
    parts.append(f"- **API version:** {version}")
    parts.append(f"- **Metrics date range:** {date_range}")
    parts.append("")

    errors = {k: v["error"] for k, v in data.items() if "error" in v}
    if errors:
        parts.append("## Queries that failed")
        parts.append("")
        for name, err in errors.items():
            parts.append(f"- `{name}` — HTTP {err['http_status']}")
        parts.append("")

    parts.append("## Row counts")
    parts.append("")
    parts.append("| Query | Rows |")
    parts.append("| --- | ---: |")
    for name in sorted(data):
        block = data[name]
        count = "error" if "error" in block else str(len(block.get("results", [])))
        parts.append(f"| {name} | {count} |")
    parts.append("")

    acct = data.get("account", {}).get("results", [])
    if acct:
        c = acct[0]
        parts.append("## Account")
        parts.append("")
        parts.append(f"- Name: {get(c, 'customer.descriptive_name')}")
        parts.append(f"- Status: {get(c, 'customer.status')}")
        parts.append(f"- Currency: {get(c, 'customer.currency_code')}")
        parts.append(f"- Time zone: {get(c, 'customer.time_zone')}")
        parts.append(f"- Auto-tagging: {get(c, 'customer.auto_tagging_enabled')}")
        parts.append("")

    camps = data.get("campaigns_settings", {}).get("results", [])
    if camps:
        parts.append("## Campaigns")
        parts.append("")
        parts.append("| ID | Name | Status | Primary status | Channel | Bidding | Budget/day |")
        parts.append("| --- | --- | --- | --- | --- | --- | ---: |")
        for c in camps:
            budget = micros(get(c, "campaign_budget.amount_micros"))
            parts.append(
                f"| {get(c, 'campaign.id')} | {cell(get(c, 'campaign.name'))} "
                f"| {get(c, 'campaign.status')} "
                f"| {get(c, 'campaign.primary_status')} "
                f"| {get(c, 'campaign.advertising_channel_type')} "
                f"| {get(c, 'campaign.bidding_strategy_type')} "
                f"| ${budget:,.2f} |"
            )
        parts.append("")

    perf = data.get("campaigns", {}).get("results", [])
    if perf:
        parts.append(f"## Campaign performance ({date_range})")
        parts.append("")
        parts.append("| Campaign | Impr | Clicks | CTR | Cost | Avg CPC | Conv |")
        parts.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
        for c in perf:
            parts.append(
                f"| {cell(get(c, 'campaign.name'))} "
                f"| {get(c, 'metrics.impressions', 0)} "
                f"| {get(c, 'metrics.clicks', 0)} "
                f"| {float(get(c, 'metrics.ctr', 0) or 0) * 100:.2f}% "
                f"| ${micros(get(c, 'metrics.cost_micros')):,.2f} "
                f"| ${micros(get(c, 'metrics.average_cpc')):,.2f} "
                f"| {get(c, 'metrics.conversions', 0)} |"
            )
        parts.append("")

    parts.append("## Ad Grants compliance check")
    parts.append("")
    parts.append(
        "Automated evaluation of the checklist in CLAUDE.md against this pull. "
        "`SKIP` means the pull did not return the data needed to judge."
    )
    parts.append("")
    for line in compliance_report(data):
        parts.append(f"- `{line[:4].strip()}` {line[6:]}")
    parts.append("")

    path = out_dir / "summary.md"
    path.write_text("\n".join(parts) + "\n")
    return path


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true",
                    help="print the queries and exit without calling the API")
    ap.add_argument("--include-removed", action="store_true",
                    help="include REMOVED campaigns, ad groups, ads and keywords")
    ap.add_argument("--date-range", default="LAST_30_DAYS",
                    help="GAQL date constant for metrics (default LAST_30_DAYS)")
    ap.add_argument("--out", default=None,
                    help="output directory (default reports/snapshots/<date>)")
    args = ap.parse_args()

    version = os.environ.get("GOOGLE_ADS_API_VERSION", DEFAULT_API_VERSION)
    queries = build_queries(args.date_range, args.include_removed)

    if args.dry_run:
        for name, q in queries.items():
            print(f"--- {name} ---")
            print(" ".join(q.split()))
            print()
        print(f"{len(queries)} queries. API version {version}. Nothing was called.")
        return 0

    creds = load_credentials()
    missing = missing_credentials(creds)
    if missing:
        print(
            "Missing credentials: " + ", ".join(missing) + "\n\n"
            "Provide them as environment variables (GOOGLE_ADS_CLIENT_ID, "
            "GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, "
            "GOOGLE_ADS_DEVELOPER_TOKEN) or in the local credential files under "
            f"{CRED_DIR}. See scripts/README.md.",
            file=sys.stderr,
        )
        return 2

    print(f"Authenticating (customer {creds['customer_id']}, API {version}) ...")
    access_token = fetch_access_token(creds)

    out_dir = (
        pathlib.Path(args.out)
        if args.out
        else REPO_ROOT / "reports" / "snapshots" / dt.date.today().isoformat()
    )
    raw_dir = out_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    data: dict[str, dict] = {}
    failures = 0
    for name, query in queries.items():
        print(f"  {name} ...", end=" ", flush=True)
        result = run_gaql(query, creds, access_token, version)
        data[name] = result
        (raw_dir / f"{name}.json").write_text(json.dumps(result, indent=2) + "\n")
        if "error" in result:
            failures += 1
            print(f"error (HTTP {result['error']['http_status']})")
        else:
            print(f"{len(result['results'])} rows")

    summary = write_summary(
        out_dir, data, args.date_range, version, creds["customer_id"]
    )
    print(f"\nRaw JSON: {raw_dir}")
    print(f"Summary:  {summary}")
    if failures:
        print(
            f"\n{failures} of {len(queries)} queries failed — see the raw JSON "
            "for the error detail.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
