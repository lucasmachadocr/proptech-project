# Settle In: PropTech MVP (ESCP investor demo, 13 Nov 2026)

1. **Live demo:** https://settle-in-app.netlify.app (mirror: https://lucasmachadocr.github.io/proptech-project/). Click **▶ Start guided demo** and use Next → in the bottom bar. "Reset demo" is in the footer. On iPhone: Safari → Share → Add to Home Screen.
2. **What it is:** a clickable, 100% static MVP. A company sends one brief, an "AI" engine proposes one housing plan, and the platform handles changes, verification, lease compliance and one monthly invoice.
3. **Roles** (switcher in the header): Client (brief → plan → changes → invoice) · Provider (units, onboarding, payouts) · Employee (phone app, AI issue triage) · Operations (Section 5 of our report).
4. **The AI is local and explainable.** `src/ai/` holds the allocation optimiser, verification checks, the RDL 29/2026 compliance rules and triage. There are no API keys. `src/ai/llm.ts` is where Claude plugs in for phase 2.
5. **Numbers:** the demo plan is locked by tests at €27,000/month. Over 6 months that is €162,000 rent, €174,960 invoiced and €29,160 revenue (18% take rate).
6. **All data is fictional** (`src/data/`). To rename the product, edit `APP_NAME` in `src/config.ts`.
7. **Run locally:** `npm install`, then `npm run dev` (http://localhost:5173).
8. **Tests:** `npm test` runs 37 unit tests. `npm run e2e` runs the 5-step demo in a headless browser (`npx playwright install chromium` the first time).
9. **Deploy:** every push to `main` publishes to GitHub Pages (`.github/workflows/deploy.yml`). Netlify: `npm run build`, zip `dist/` and drop it on the settle-in-app project (Deploys → drag and drop).
10. **More detail:** PLAN.md (design), CLAUDE.md (rules for AI-assisted edits), and the /about-tech page (tools and costs disclosure).
