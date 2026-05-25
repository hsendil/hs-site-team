# hs-site-team

> A 6-agent Claude Code team that manages hayrettinsendil.tr.
> 1 Product Owner + 5 specialist sub-agents. Chat-driven, fully autonomous commit + deploy.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-7C3AED.svg)](https://code.claude.com/docs/en/discover-plugins)
**English** · [Türkçe](README.md)

---

## What it does

Instead of managing your personal site alone, a **specialized agent team** runs it for you. In Claude Code, one command summons a webmaster, SEO specialist, content editor, brand designer, or social media strategist — each works within their domain and commits + deploys directly to the site repo.

### Architecture

| Agent | Responsibility |
|---|---|
| **hs-site-po** | Orchestrator — decomposes the request, routes to the right sub-agent, consolidates output |
| **WEB** (Webmaster) | Next.js pages/components, performance, Lighthouse, deploy verification |
| **SEO** | Meta + JSON-LD + sitemap + GA4 events + GSC monitoring + keyword work |
| **CON** (Content) | MDX blog drafts, title optimization, tag consistency, editorial calendar |
| **BRD** (Brand) | Color/typography consistency, OG image generation, iconography |
| **SOC** (Social) | Per-platform drafts for LinkedIn/X/Instagram (draft-only model) |

---

## Install

```bash
# 1. Add as a marketplace
/plugin marketplace add hsendil/hs-site-team

# 2. Install the plugin
/plugin install hs-site-team@hs-site-team
```

After restart, the skill triggers automatically on keywords like `hs-site`, `webmaster`, `og image`, etc.

---

## Usage Examples

```
# Orchestrator — make a plan
hs-site-po — draft Sprint 4 plan for the site

# Direct sub-agent
webmaster — run Lighthouse, fix categories below 90

# Content draft
content — MDX draft for "How Agent Skills work in practice"

# OG image refresh
brand — regenerate opengraph-image for the latest post

# Social drafts
social — produce LinkedIn + X + Instagram drafts for the latest post
```

---

## Why this repo exists

Two goals:

1. **Practical:** day-to-day management of hayrettinsendil.tr (code, content, SEO, brand).
2. **Showcase:** a live reference of multi-agent orchestration in Claude Code — useful for consulting and teaching.

> **Note:** the site source code is **not** in this repo. The site repo (`hsendil/hayrettinsendil`) is private; this plugin commits to it via GitHub MCP.

---

## Documentation

- [Architecture Decision Log](docs/architecture.md) — why 6 agents, why lazy-loaded references, why Claude Code (vs Cowork) — rationale for every choice
- [Pattern Notes](docs/patterns.md) — sub-agent isolation, lazy loading, context engineering, orchestrator-worker — reusable patterns for your own projects
- [CHANGELOG](CHANGELOG.md)

---

## Author

Hayrettin Şendil, PMP — AI / Context Engineering Trainer
PMP + 8 Anthropic certifications · 21+ years of enterprise IT operations
[hayrettinsendil.tr](https://hayrettinsendil.tr) · [LinkedIn](https://www.linkedin.com/in/eniac)

MIT licensed. PRs welcome, fork freely, adapt to your project.
