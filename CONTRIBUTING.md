# Contributing to Settle In (team guide)

You can change the app with your own AI assistant (Claude, ChatGPT, Codex, Copilot…). Give it this
repo and say: **"Read AGENTS.md and SETTLE_IN_FACTS.md first."**

## 1. Get it running (once)
```bash
git clone https://github.com/lucasmachadocr/proptech-project.git
cd proptech-project
npm install
npm run dev          # opens http://localhost:5173
```

## 2. Make a change
1. Create a branch: `git checkout -b my-change`
2. Edit. Where things are:
   - **A number** (price, KPI, demo case): edit `SETTLE_IN_FACTS.md` **and** `src/data/facts.ts`, nothing else.
   - **Text on a screen**: the page in `src/pages/…` (e.g. the invoice is `src/pages/client/InvoicePage.tsx`).
   - **The guided demo** (steps, speaker notes): `src/demo/steps.ts`.
   - **Apartments / cities**: `src/data/units.ts`, `src/data/sites.ts`.
3. Check: `npm test` (numbers + engines) and `npm run build` must pass.
4. Optional: `npm run e2e` runs the whole demo in a headless browser.

## 3. Share it
```bash
git add -A && git commit -m "feat: what you changed"
git push -u origin my-change
```
Open a Pull Request on GitHub. The CI runs the tests; when it is green, merge to `main`.
Every merge to `main` publishes GitHub Pages automatically (Netlify is updated by Lucas).

## Rules of thumb
- Don't type business numbers into pages — import `FACTS`.
- Keep screens minimal: one primary button, short sentences, a tooltip for every number.
- All data is fictional: don't add real people, companies or listings.
