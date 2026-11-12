# Settle In – AI MVP · instructions for AI coding assistants (GPT, Codex, Claude, Copilot…)

Clickable, 100% static MVP of a B2B managed marketplace that houses project teams (engineers, 1–12
months) in verified furnished apartments in Madrid, Barcelona, Valencia, Málaga and Zaragoza.
Source of truth: business plan (November 2026 version) and the financial model → **SETTLE_IN_FACTS.md**.
This file mirrors CLAUDE.md. Keep both in sync when you change the rules.

## Rules
- **Numbers live only in `SETTLE_IN_FACTS.md` + `src/data/facts.ts`.** Never hard-code a business
  number in a page; import it from `FACTS`. `src/data/facts.test.ts` fails if the two drift.
- Demo case locked by tests: 20 engineers · Madrid · 6 months · rent €225,504 → company pays
  €239,034 (rent + 4% markup + 2% Flex) → Settle In revenue €24,805; Flex pool €2,255 is NOT revenue.
  Options A/B/C = €1,935/31 min · €1,992/22 min · €2,140/12 min. Re-plan = the team drops to 15 from
  month 4: −€29,880 with Flex (5 × €1,992 × 3), −€9,960 without; nobody moves; 15 apartments (4% tier).
- Static only: no backend, no API keys. The hosted LLM of phase 2 goes behind `src/ai/llm.ts` (`LlmClient`).
- "AI" = engines in `src/ai/`. One is a real language model: the brief reader (`briefReader.ts`,
  DistilBERT through transformers.js, downloaded by the browser on first use, rule parser as fallback).
  The others are deterministic (optimiser, rule engines). Every AI output in the UI carries `<AiBadge />`
  and `/about-tech` says which technique each one uses. Never label a rule as a model.
- Minimal UX: one idea and one primary button per screen; numbers get an `<Explain>` tooltip.
- Brand: terracotta #C4573D · cream #F7EEE7 · ink #2A2320 (`src/index.css`, `brand-*` / `cream` / `ink`).
- All seed data is fictional ("Demo data"). App name only in `src/config.ts`.
- Before every commit: `npm test` and `npm run build`. Conventional commits.
- E2E: `npm run e2e` (local) or `BASE_URL=<live url> npm run e2e`. Deck screenshots: `npm run shots`.

## Layout
- `src/data/` seed + facts · `src/ai/` engines + tests · `src/lib/` money, dates, format
- `src/store.ts` Zustand state · `src/demo/steps.ts` the 5-step guided demo
- `src/pages/{demo,client,provider,employee,ops,about}` · `src/components/` shared UI (CityMap, DemoBar, ui)
