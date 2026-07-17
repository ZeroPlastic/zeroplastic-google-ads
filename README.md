# ZeroPlastic Google Ads AI

An AI-powered Google Ads management platform for [ZeroPlastic Movement](https://zeroplasticmovement.org). Claude acts as the primary manager of our **Google Ad Grants** account — full-stack account engineering, PPC strategy, and compliance review, operating directly against the account through the official Google Ads API.

## Purpose

This repository is the working home for AI-driven Google Ads management: account architecture, campaign structures, keyword and negative keyword management, ad copy, and reporting — with Claude authorized to apply changes directly to the live account via the Google Ads API, not just produce drafts for manual application.

The one constraint that always outranks performance is full compliance with Google Ads policies and Google Ad Grants policies. See [CLAUDE.md](CLAUDE.md) for the full operating model.

## Repository Structure

```
.
├── CLAUDE.md        # AI assistant role definition and operating model
├── docs/            # Strategy notes, policies, onboarding, and reference docs
├── campaigns/        # Campaign structures (managed by Claude, reflect live account state)
├── prompts/          # Reusable prompt templates for Ads/PPC/Grant/Compliance work
├── keywords/         # Keyword research, management, and match-type decisions
└── reports/          # Performance summaries and analysis reports
```

## Project Context

- **Account type:** Google Ad Grants (nonprofit, $10,000/month in-kind budget)
- **Organization:** ZeroPlastic Movement
- **Focus:** Compliant, high-performing PPC strategy under Ad Grants policy constraints

## Operating Model

- Claude is authorized for full administrative access to the Google Ads account via the official Google Ads API — creating and editing campaigns, managing budgets and bidding, keywords, ads, audiences, conversion tracking, and reporting.
- No live API credentials or MCP server are configured in this environment yet; until they are, work here stays in plan/draft form because there's nothing live to act on — not because of a policy restriction.
- The only priority higher than campaign performance is full compliance with Google Ads and Google Ad Grants policies. See [CLAUDE.md](CLAUDE.md) for the complete operating model and compliance checklist.

## Getting Started

See [CLAUDE.md](CLAUDE.md) for how the AI assistant is expected to operate in this repository, and [docs/](docs/) for onboarding and strategy notes.
