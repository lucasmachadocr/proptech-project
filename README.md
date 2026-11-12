# Settle In — AI MVP (ESCP investor pitch, 13 Nov 2026)

*Housing that follows your project.* Settle In finds, books and manages furnished apartments for whole project teams: one brief, one plan, one monthly invoice.

1. **Live demo:** https://settle-in-app.netlify.app (mirror: https://lucasmachadocr.github.io/proptech-project/). Click **Start the demo** and use **Next →** in the bottom bar (Brief → Plan → Approve → Re-plan → Invoice). "Reset demo" is in the header.
2. **Demo case:** 20 engineers in Madrid for 6 months. The engine offers A lowest cost €1,935 / 31 min, B balanced €1,992 / 22 min (recommended), C closest €2,140 / 12 min per apartment-month. A person reviews before the client sees it.
3. **Pricing (business plan, November 2026):** 6% operator commission + company markup 5% / 4% / 3% (1–9 / 10–24 / 25+ apartments) + optional Flex 2% (1 pt revenue, 1 pt operator pool). Demo: rent €225,504 → company pays €239,034 → Settle In revenue €24,805.
4. **Re-plan:** +3 engineers from month 3 → 3 × €1,992 × 4 months = +€23,904, nobody moves, 23 apartments (still 4%).
5. **Ops console:** plan review, verification (KYC, Catastro, duplicate photos, price, regional registration — a fake listing is caught), lease compliance (RDL 29/2026, signing blocked on red), payouts ledger (Flex pool kept out of revenue), KPIs (39 vs 182 ops hours, 1 agent per 150 apartments, break-even in year 3: 308 apartments occupied vs 284 needed).
6. **Employee:** a WhatsApp-style chat (welcome pack, check-in photos, AI issue triage) — no app.
7. **All numbers** come from `SETTLE_IN_FACTS.md` and `src/data/facts.ts`, locked by tests. All data is fictional.
8. **Run locally:** `npm install`, then `npm run dev` (http://localhost:5173). Tests: `npm test` · demo e2e: `npm run e2e` · deck screenshots: `npm run shots`.
9. **Contribute with your own AI:** read `CONTRIBUTING.md`; give your assistant `AGENTS.md` and `SETTLE_IN_FACTS.md` first.
10. **Tools:** Claude Code (paid), Claude (paid); React, Vite, TypeScript, Tailwind, Leaflet, OpenStreetMap (free); Netlify and GitHub Pages (free). Full disclosure on the in-app "About this MVP" page.
