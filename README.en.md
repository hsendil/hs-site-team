# hs-site-team

> A 7-agent Claude Code team that manages hayrettinsendil.tr.
> 1 Product Owner + 6 specialist sub-agents. Chat-driven, fully autonomous commit + deploy.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-7C3AED.svg)](https://code.claude.com/docs/en/discover-plugins)
**English** · [Türkçe](README.md)

---

## What it does

Instead of managing your personal site alone, a **specialized agent team** runs it for you. In Claude Code, one command summons a webmaster, SEO specialist, content editor, brand designer, social media strategist or editorial reviewer. Each works within their domain and commits and deploys directly to the site repo.

### Architecture

| Agent | Responsibility |
|---|---|
| **hs-site-po** | Orchestrator: decomposes the request, routes to the right sub-agent, consolidates output |
| **WEB** (Webmaster) | Next.js pages and components, performance, Lighthouse, deploy verification |
| **SEO** | Meta, JSON-LD, sitemap, GA4 events, GSC monitoring, keyword work |
| **CON** (Content) | MDX blog drafts, title optimization, tag consistency, editorial calendar |
| **BRD** (Brand) | Color and typography consistency, OG image generation, iconography |
| **SOC** (Social) | Per-platform drafts for LinkedIn, X and Instagram (draft-only model) |
| **EDT** (Editor) | Editorial review: does not write, reviews. P0, P1, P2 findings report and fix brief |

---

## Install

```bash
# 1. Add as a marketplace
/plugin marketplace add hsendil/hs-site-team

# 2. Install the plugin
/plugin install hs-site-team@hs-site-team
```

After restart, the skill triggers automatically on keywords like `hs-site`, `webmaster`, `og image`.

---

## Usage Examples

```
# Orchestrator: make a plan
hs-site-po: draft Sprint 4 plan for the site

# Direct sub-agent
webmaster: run Lighthouse, fix categories below 90

# Content draft
content: MDX draft for "How Agent Skills work in practice"

# Editorial review
editor: review the latest post and site copy for style and factual consistency

# OG image refresh
brand: regenerate opengraph-image for the latest post

# Social drafts
social: produce LinkedIn, X and Instagram drafts for the latest post
```

---

## Why this repo exists

Two goals:

1. **Practical:** day-to-day management of hayrettinsendil.tr (code, content, SEO, brand).
2. **Showcase:** a live reference of multi-agent orchestration in Claude Code, useful for consulting and teaching.

> **Note:** the site source code is **not** in this repo. The site repo (`hsendil/hayrettinsendil`) is private; this plugin commits to it via GitHub MCP.

---

## Documentation

- [Architecture Decision Log](docs/architecture.md): why 7 agents, why lazy-loaded references, why Claude Code over Cowork; rationale for every choice
- [Pattern Notes](docs/patterns.md): sub-agent isolation, lazy loading, context engineering, orchestrator-worker; reusable patterns for your own projects
- [CHANGELOG](CHANGELOG.md)

---

## Author

Hayrettin Şendil, PMP®
AI / Context Engineering Trainer

20+ years of enterprise IT operations. Verifiable certification list:
[hayrettinsendil.tr/about#sertifikalar](https://hayrettinsendil.tr/about#sertifikalar)

[hayrettinsendil.tr](https://hayrettinsendil.tr) · [LinkedIn](https://www.linkedin.com/in/eniac)

MIT licensed. PRs welcome, fork freely, adapt to your project.
