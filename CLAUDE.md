# Settle In – PropTech MVP (investor demo 13 Nov 2026)

Clickable, 100% static MVP of a B2B managed marketplace that houses relocated project teams
(engineers, technicians, managers, expat families; 1–12 months) near the Zaragoza data-centre and
gigafactory sites. Business model: 18% take rate = 10% landlord commission + 8% company fee.
Source of truth for operations content: ESCP Deliverable 1, Section 5 (Operations) – see PLAN.md.

## Rules
- Static only: no backend, no API keys or secrets in the front-end. Phase-2 LLM goes through a
  serverless function behind `src/ai/llm.ts` (`LlmClient` interface; `MockLlmClient` today).
- "AI" in phase 1 = local deterministic engines in `src/ai/` (allocation, verification, compliance,
  triage). Every AI-produced output in the UI carries `<AiBadge />`.
- All seed data is fictional and labelled "Demo data". Keep the calibration locked by tests:
  demo plan = €27,000/month → 6 months = €162,000 rent → €174,960 invoiced → €29,160 revenue.
- App name lives only in `src/config.ts` (`APP_NAME`). Rename there.
- HashRouter (GitHub Pages). Vite `base` comes from `BASE_PATH` (set in CI).
- Design: "settle in" logo (terracotta arch, `src/components/Logo.tsx`); cream background + stone neutrals + one accent `brand-*` (terracotta, defined in `src/index.css`); tabular numbers; visible focus rings; responsive; iPhone home-screen icons in `public/`.
- Before every commit: `npm test` and `npm run build` must pass. Conventional commits.
- E2E: `npm run e2e` (local preview) or `BASE_URL=<live url> npm run e2e`.

## Layout
- `src/data/` seed (sites, providers, units, companies, demo brief, risks)
- `src/ai/` engines + tests · `src/lib/` money, dates, format · `src/store.ts` Zustand (persisted)
- `src/pages/{demo,client,provider,employee,ops,about}` · `src/components/` shared UI
