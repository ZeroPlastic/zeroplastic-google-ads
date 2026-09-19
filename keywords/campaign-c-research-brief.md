# Campaign C keyword research brief — READ-ONLY

Status: **not yet run**. Requires live Google Ads API access (Keyword Planner / `KeywordPlanIdeaService`), which is not available from a cloud/remote session — run this from a local Claude Code session on the machine with the `FGRibreau/mcp-google-ads` MCP server configured (see `docs/account-status.md` → Technical setup reference).

## Hard constraints

- READ-ONLY. Do not modify Google Ads in any way.
- Do NOT add keywords, do NOT create ad groups, do NOT enable Campaign C.
- Campaign C must remain PAUSED throughout and after this task.

## Scope

- Customer: `5421216511`
- Campaign C: `24266993423`

## Known baseline (as reported, not yet independently verified via API)

- 91 keywords total: 16 EXACT / 75 PHRASE / 0 BROAD
- Only 11 keywords currently ELIGIBLE
- Most ultra-specific long-tail phrases are RARELY_SERVED
- **Do not blindly add another large batch.**

## Research groups

Run each list through Keyword Planner / `KeywordPlanIdeaService`, plus Google-generated related keyword ideas.

**Group 1 — Community / local experiences:** community based activities in sigiriya; community based tourism sigiriya; community tourism sigiriya; community experience sigiriya; local community experience sigiriya; local experience sigiriya; local experience sri lanka; local experiences sri lanka; authentic experience sri lanka; authentic local experience sri lanka; meaningful travel sri lanka; community tourism sri lanka; community based tourism sri lanka.

**Group 2 — Tree of Life / Kapruka / coconut:** tree of life experience sri lanka; tree of life experience sigiriya; kapruka experience sri lanka; kapruka experience sigiriya; coconut tree experience sri lanka; coconut experience sri lanka; coconut experience sigiriya; coconut craft sri lanka; coconut shell craft sri lanka; coconut shell craft sigiriya; coconut shell workshop sigiriya; traditional coconut craft sri lanka.

**Group 3 — Make / take-home / souvenir:** make a craft in sigiriya; make your own craft sigiriya; make a souvenir sigiriya; make your own souvenir sigiriya; make your own souvenir sri lanka; craft to take home sigiriya; make and take craft sigiriya; handmade souvenir sri lanka; handmade souvenir experience sri lanka; souvenir making sri lanka; souvenir workshop sri lanka; craft workshop sri lanka; hands on craft sigiriya.

**Group 4 — Sustainable / responsible travel:** sustainable tourism sigiriya; sustainable tourism sri lanka; sustainable travel sri lanka; responsible tourism sri lanka; responsible travel sri lanka; eco tourism sri lanka; ecotourism sri lanka; eco friendly activities sri lanka; eco friendly activities sigiriya; sustainable tourism activities sigiriya; sustainable tourism experience sri lanka; environmental experience sri lanka; plastic free travel sri lanka; zero plastic travel sri lanka; zeroplastic travel sri lanka; travel without single use plastic sri lanka; give back travel sri lanka; give back to sri lanka; support local communities sri lanka.

**Group 5 — Volunteering / environment (RESEARCH ONLY — not for Campaign C, future campaign candidate):** volunteering in sri lanka; volunteer sri lanka; volunteer opportunities sri lanka; environmental volunteering sri lanka; conservation volunteering sri lanka; environmental organization sri lanka; support environmental organization sri lanka; support wildlife conservation sri lanka; wildlife volunteering sri lanka; give back sri lanka; zero plastic movement sri lanka; zeroplastic movement.

**Group 6 — Sigiriya informational intent (RESEARCH ONLY — separate informational from activity/booking intent):** why sigiriya is important; why visit sigiriya; why is sigiriya famous; sigiriya importance; sigiriya culture; sigiriya local culture; sigiriya cultural experience.

## Markets

- English set: Sri Lanka, United States, United Kingdom, Canada, Australia, New Zealand
- Second set (English-language SL travel planning may still occur): Germany, France, Netherlands, Spain

## Metrics to capture per keyword

keyword; group; average monthly searches; competition; competition index; low top-of-page bid; high top-of-page bid; existing in Campaign A?; existing in Campaign C?; current Campaign C serving status if existing; recommended match type; intent classification.

## Classification buckets

- **A. Add now** — relevant, meaningful demand or strong related-keyword demand, fits the current Impact Center landing page, not a duplicate of Campaign A/C.
- **B. Strategic long-tail** — relevant but low-volume; keep only a small number (campaign already has excess dormant/RARELY_SERVED inventory).
- **C. Future campaign** — volunteering, donation/support, environmental organization, wildlife conservation.
- **D. Reject** — too informational, irrelevant, or poor landing-page match.

## Output caps

- Do NOT recommend adding 40–50 more zero-volume keywords.
- Recommend a **maximum of 10–15 new keywords total** for Campaign C.
- Prefer PHRASE, selected EXACT where justified. **No BROAD match.**
- Strategic long-tail: max 5.

## Required final output format

```
CURRENT CAMPAIGN C: 91 keywords, 11 currently eligible
TOP 10 KEYWORD OPPORTUNITIES: ranked by relevance + demand
COMMUNITY / LOCAL: best candidates
TREE OF LIFE / COCONUT: best candidates
MAKE & TAKE / SOUVENIR: best candidates
SUSTAINABLE TRAVEL: best candidates
VOLUNTEERING: future campaign opportunities only
SIGIRIYA INFORMATIONAL: SEO/content opportunities only
RECOMMENDED ADD NOW: max 10-15 keywords
RECOMMENDED STRATEGIC LONG-TAIL: max 5
DO NOT ADD: list
GOOGLE ADS CHANGES: NONE
CAMPAIGN C: PAUSED
```
