# Settle In: clickable MVP for the investor demo (13 Nov 2026)

## Context
This is a static, clickable MVP of the B2B housing platform described in Deliverable 1 (Section 5 Operations, v2). It must be live on GitHub Pages by the end of this session. The /demo page runs the 5-step investor story. The Operations screens mirror the report: §5.3 workflow, §5.4 RDL 29/2026 rules, §5.8 KPIs and §5.9 risks. All numbers match the report: 15 occupants × 6 months = €162,000 rent → €174,960 invoiced → €29,160 revenue (18%).

**Decisions already made**
- Repo: `proptech-zaragoza-mvp` (public). URL: `https://<gh-user>.github.io/proptech-zaragoza-mvp/`
- Code lives at `~/code/proptech-zaragoza-mvp`, not in Google Drive. At the end I copy README.md and PLAN.md into the ESCP Drive folder.
- `gh` is not logged in yet. You said you'd run `gh auth login`. I check `gh auth status` before the deploy step and pause if it's still logged out.

## Stack
Vite + React 18 + TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`), React Router (HashRouter), Zustand with `persist` to localStorage, Leaflet + react-leaflet with OSM tiles (CircleMarkers, so no icon-asset problems), Vitest, and Playwright for the e2e demo run only. Inter font is self-hosted through `@fontsource/inter`. There is no backend and there are no API keys. `vite.config.ts` reads `base` from `BASE_PATH`, which the CI workflow sets to `/proptech-zaragoza-mvp/`.

## Data model (`src/types.ts`)
- `Site {id, name, operator, town, lat, lng}`. Three sites: Microsoft campus (Villanueva de Gállego), AWS campus (El Burgo de Ebro), Stellantis-CATL (Figueruelas).
- `Provider {id, name, legalName, cif, registryName, contact, trustScore, status}`. 12 professional operators.
- `Unit {id, providerId, title, type: studio|1bed|2bed|3bed, rent, town, address, lat, lng, amenities[], availableFrom, availableTo, photos: photoHash[], ownerName, verification {status, checks[], trustScore}}`. About 60 units across Zaragoza (Actur, Centro, Delicias, Universidad), Villanueva de Gállego, Zuera, San Juan de Mozarrifar, Utebo, Casetas, El Burgo de Ebro, Fuentes de Ebro, Alagón and Pedrola.
  - Photos are deterministic SVG placeholders keyed by hash, so there are no external images.
  - A few units near the Microsoft site have `availableTo` set to the original end date. This forces visible moves when the stay is extended.
  - **One fraudulent unit:** its photo hashes are copied from another listing, its rent is about 40% below the median for its type and zone, and `ownerName` does not match the provider's `registryName`.
- `Company`: two clients, a data-centre owner and the gigafactory JV.
- `Employee {id, name, role: engineer|technician|manager|expat, household {adults, children}}`
- `Brief {companyId, siteId, start, months, maxCommuteMin, budgetCaps per role, employees[]}`
  - Demo brief: 15 people at the Microsoft site, 6 months from 1 Dec 2026, 30-minute commute cap.
  - The 15 are 6 engineers, 4 technicians, 3 managers and 2 expat families.
- `Plan {assignments[{employeeId, unitId, rent, commuteMin}], unassigned[{employeeId, reason}], metrics, tradeoffs[], computedMs, status}`
- `Lease`, `Invoice`, `LedgerEntry`, `Incident`, `Risk`, each in the shape needed by its screen.
- **Calibration:** the seed is tuned so that the demo plan costs exactly €27,000 a month (€162,000 over 6 months). A seed test locks this.
- Everything is labelled "Demo data — fictional" in the UI footer and on every data screen.

## AI layer (`src/ai/`). Every output carries an `<AiBadge/>`.
- `geo.ts`: `haversineKm` and `commuteMin = km × 1.3 / 50 × 60`. The UI labels it "estimate".
- `allocate.ts`, which exports `allocate(brief, units, opts)` and `reallocate(prevPlan, brief', units, opts)`:
  - **Objective:** minimise Σrent + λ·Σcommute. λ is configurable, default €15 per one-way minute per month.
  - **Hard rules:**
    - Rent within the role's budget cap.
    - Unit type matches the household: single → studio or 1-bed; couple → 1- or 2-bed; 1 child → 2-bed; 2+ children → 3-bed.
    - Unit available for the whole stay.
    - Commute within the cap.
    - One household per unit.
  - **Method:**
    - Greedy start: the most constrained employee picks first, taking the cheapest feasible unit.
    - Local search: pairwise swaps and moves to free units until there is no improvement or the iteration cap is hit.
    - Deterministic tie-breaks.
  - **Re-allocation:** each moved person adds a penalty (default €400). People keep their unit when it's still feasible. The diff lists kept, moved and new people plus the monthly and total cost delta.
  - **Returns:** the assignment, the metrics (monthly rent, average and max commute, the saving against a hotel at €74 × 30.4 nights, budget use per role), the unassigned people with a reason, and human-readable trade-offs. Example: "Ana (manager) is 6 min further away to save €220/mo".
- `verify.ts`: four checks feed a 0–100 trust score with flags.
  - Document consistency: CIF and registry name.
  - Duplicate photo: the same hash appears in another listing.
  - Price outlier: rent below the median for its type and zone by more than 30%.
  - Address match: the address's town matches its coordinates.
  - Results: approve ≥ 75, review 50–74, reject < 50.
- `compliance.ts`: RDL 29/2026 seasonal-lease rules.
  - Duration must be more than 31 days and no more than 12 months.
  - A written work-displacement cause and an assignment letter must be attached.
  - At most 2 consecutive leases between the same parties on the same unit.
  - The extra guarantee is capped at 1 month.
  - Each rule returns green, amber or red with an explanation. A red anywhere sets `canSign = false`.
- `triage.ts`: rule and keyword triage. Urgent (SLA < 2 h) covers gas, flooding, no heating or hot water, lock-out and safety. High is < 24 h, normal is < 72 h. It also assigns a category and suggests the first reply.
- `llm.ts`: an `LlmClient` interface (`explainPlan`, `triageIssue`, `draftLeaseClause`) with a `MockLlmClient` that wraps the local engines. A comment shows where phase 2 plugs Claude in through a serverless function (`/api/llm`), with no key in the front-end.
- `src/lib/money.ts`:
  - `invoice(rent)`: fee 8%, VAT 21% on the fee only (residential rent is VAT-exempt, noted in the UI).
  - `payout(rent) = rent × 0.9`.
  - `platformRevenue = 10% + 8%`.

## Screens (`src/pages/`, HashRouter)
- **Header:** logo/`APP_NAME` from `src/config.ts`, a role switcher (Client · Provider · Employee · Operations) that drives the sub-nav, a "Demo data" pill, and a "Reset demo" control.
- **`/demo`** (default route):
  - Five numbered cards with buttons. Each one auto-runs any earlier step it depends on, so any step works even if an earlier one was skipped live.
  - Each button navigates to its target screen with the relevant item highlighted.
- **Client**
  - `/client/brief`: company, site, dates, commute cap and per-role caps. Upload a CSV or "Use demo team"; a sample CSV is in `public/`.
  - `/client/plan`: the hero map (the site, units coloured assigned/free, commute lines), KPI cards, a table per employee and the "Why this plan" panel.
  - `/client/change`: preset "Extend 2 months + 3 engineers" and a custom form. Shows a diff table with kept/moved/new badges and the cost delta.
  - `/client/invoice`: one monthly project invoice with lines per unit, the 8% fee and VAT on the fee.
- **Provider** (`/provider`): onboarding wizard (company → documents → first unit → bank account, masked mock), units list with verification status, payouts table (rent − 10%).
- **Employee** (`/employee`), shown inside a phone frame:
  - My home, check-in steps and a commute card.
  - Report an issue → AI triage result with urgency, SLA countdown and category.
- **Operations** (`/ops/*`)
  - verification queue: run checks, see flags, approve or reject.
  - compliance: lease checker with the traffic-light rules, and signing blocked on red.
  - leases: generator with the client company as tenant, named occupants, a pre-filled cause clause and a mocked e-signature (timestamp and hash).
  - ledger: flow collected → held at the payment provider → provider payouts → platform revenue, with GMV vs net revenue (€174,960 vs €29,160).
  - kpis: §5.8 targets against demo actuals as progress bars.
  - risks: §5.9's six risks with likelihood × impact, mitigation and owner.
- **`/about-tech`**: a table of every tool with a free/paid column and a note.
  - Tools covered: Vite, React, TS, Tailwind, Router, Zustand, Leaflet, OSM tiles (free, attribution and usage policy), Vitest, Playwright, GitHub, Actions and Pages (free for public repos), Fontsource, Claude Code (paid subscription, used to build), and Claude API for phase 2 (paid per token).
  - Includes an AI-use disclosure.

**Design:** warm stone neutrals (`stone-50` background, `stone-900` text) with one accent, deep teal (`teal-700`). Generous spacing, compact readable tables (tabular numbers, right-aligned money, sticky headers), visible focus rings and AA contrast. The layout is responsive, and the map stacks above the table on mobile.

## Tests (Vitest, `src/**/*.test.ts`)
- **geo:** known Zaragoza–Villanueva distance ±1 km; commute formula.
- **allocate:**
  - All 15 are assigned and every hard rule holds for every assignment.
  - Results are deterministic.
  - The local search result is no worse than the greedy start.
  - An infeasible person is reported with a reason.
  - Trade-offs are not empty.
  - The run takes under 1 s for 50 people × 200 generated units.
- **reallocate:**
  - +2 months moves only the people whose unit expires.
  - +3 engineers adds exactly 3 assignments.
  - A higher move penalty never increases the number of moves.
- **money:**
  - €162,000 → €174,960 invoiced and €29,160 revenue.
  - VAT is 21% of the fee only.
  - Payout is rent × 0.9.
- **compliance:** boundaries at 31 and 32 days and at 12 and 13 months; missing cause or letter is red; a third consecutive lease is red; a 2-month guarantee is red; red sets `canSign = false`.
- **verify:** the fraud unit is rejected with all three flags; a normal unit is approved.
- **triage:** a gas smell is urgent with a 2 h SLA; a dripping tap is normal.
- **seed:** 60 units, 12 providers, exactly one fraud unit, 3 sites, and a demo plan of exactly €27,000 a month.
- **e2e** (`e2e/demo.spec.ts`, Playwright Chromium): runs the 5 /demo steps and asserts the map, KPIs, diff, rejected listing, disabled Sign button and the GMV/revenue figures. It runs against `vite preview` and then against the live URL through `BASE_URL`.

## Build order (tests and build after each block, then a conventional commit)
0. Create `~/code/proptech-zaragoza-mvp` and move the session there. Scaffold Vite, write PLAN.md (this plan), CLAUDE.md (rules: static-only, no keys, AI badge on AI output, demo-data labels, run test and build before each commit, conventional commits, rename through `src/config.ts`), `.gitignore`, `git init`. Commit `chore: scaffold`.
1. Seed data, types and seed tests: `feat(data)`.
2. Geo, allocation, verify, compliance, triage, money and llm mock, with tests: `feat(ai)`.
3. Client flow: `feat(client)`.
4. Operations back office: `feat(ops)`.
5. Provider and employee: `feat(provider,employee)`.
6. /demo: `feat(demo)`.
7. /about-tech and README (10 lines for teammates): `docs`.
8. Playwright e2e locally: `test(e2e)`.
9. Deploy:
   - Add `.github/workflows/deploy.yml`. It runs checkout, setup-node 22, `npm ci`, `npm test`, `npm run build` with `BASE_PATH=/proptech-zaragoza-mvp/`, then upload-pages-artifact, deploy-pages. It triggers on push and `workflow_dispatch`.
   - Check `gh auth status`.
   - `gh repo create proptech-zaragoza-mvp --public --source=. --push`.
   - `gh api -X POST repos/{owner}/proptech-zaragoza-mvp/pages -f build_type=workflow`.
   - `gh workflow run deploy` and wait for it to finish.
10. Verify the live URL loads, run the Playwright suite against it, copy README.md and PLAN.md into the Drive folder, and report the live URL, the README and anything broken.

## Verification
- `npm test` (Vitest) and `npm run build` must be green after every block.
- `npx playwright test` against the local preview, then `BASE_URL=https://<user>.github.io/proptech-zaragoza-mvp/ npx playwright test` against the live site. This is acceptance criteria 1–5, including the plan being computed in under 2 s.
- A manual check in the built-in browser at phone width (375 px) and desktop for layout and focus states.

## Notes and risks
- Playwright needs a one-time Chromium download (~150 MB) from Playwright's CDN.
- OSM tiles are fine for demo traffic but need attribution, which is shown on the map.
- Commute times are estimates (haversine × 1.3 at 50 km/h), not routing.
