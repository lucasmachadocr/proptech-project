# SETTLE_IN_FACTS — single source of numbers for the MVP

Source: business plan **v11 (investor version)**. Every number shown in the app comes from this table.

`src/data/facts.ts` mirrors the table below. `src/data/facts.test.ts` fails if a value drifts.
To change a number, edit this table and `facts.ts` together.

## Facts table (machine-checked)

| key | value | status | note |
|---|---|---|---|
| brand.tagline | Housing that follows your project | v11 | |
| brand.terracotta | #C4573D | v11 | |
| brand.cream | #F7EEE7 | v11 | |
| brand.ink | #2A2320 | v11 | |
| cities | Madrid, Barcelona, Valencia, Málaga, Zaragoza | v11 | about 20 seeded units each |
| pricing.operatorCommission | 0.06 | v11 | % of rent, deducted from the operator payout |
| pricing.markup.1-9 | 0.05 | v11 | company markup on rent, by apartments in the mission |
| pricing.markup.10-24 | 0.04 | v11 | |
| pricing.markup.25+ | 0.03 | v11 | |
| pricing.flex | 0.02 | v11 | optional; billed to the company as a separate line |
| pricing.flexRevenue | 0.01 | v11 | Settle In's share of Flex |
| pricing.flexPool | 0.01 | v11 | operator pool share of Flex; NOT revenue |
| terms.billing | SEPA B2B direct debit, monthly in advance | v11 | |
| terms.payout | at check-in, then monthly, net of 6% | v11 | |
| demo.city | Madrid | v11 | |
| demo.people | 20 | v11 | engineers, one apartment each |
| demo.months | 6 | v11 | |
| demo.apartmentMonths | 120 | derived | 20 × 6 |
| demo.rentPerApartmentMonth | 1879.20 | derived | 239,034 ÷ 1.06 ÷ 120 |
| demo.rentTotal | 225504 | derived | 120 × 1,879.20 |
| demo.markupRate | 0.04 | v11 | 20 apartments → 10–24 tier |
| demo.companyPays | 239034 | v11 | rent + 4% markup + 2% Flex (VAT excluded) |
| demo.revenue | 24805 | v11 | 6% + 4% + 1 pt Flex of rent |
| demo.flexPool | 2255 | derived | 1% of rent |
| demo.directCostPerApartmentMonth | 36 | v11 | |
| demo.directCost | 4320 | derived | 36 × 120 |
| options.A | 1935 / 31 | v11 | lowest cost: € per apartment-month (all-in) / average commute min |
| options.B | 1992 / 22 | v11 | balanced — recommended and released |
| options.C | 2140 / 12 | v11 | closest |
| replan.people | 3 | v11 | engineers join from month 3, no extension |
| replan.fromMonth | 3 | v11 | |
| replan.months | 4 | derived | months 3–6 |
| replan.pricePerApartmentMonth | 1992 | derived | mission average: 239,034 ÷ 120 |
| replan.delta | 23904 | v11 | 3 × 1,992 × 4 |
| replan.apartmentsAfter | 23 | v11 | still the 4% tier (10–24) |
| replan.moved | 0 | v11 | nobody already housed moves |
| kpi.briefToPlanHours | 48 | v11 | target, at most |
| kpi.opsHoursPerMission | 38.5 | v11 | ops hours per mission with Settle In |
| kpi.opsHoursManual | 182 | v11 | ops hours per mission done by hand |
| kpi.opsHoursSaving | 0.79 | derived | 1 − 38.5 ÷ 182 ≈ −79% |
| kpi.apartmentsPerAgent | 150 | v11 | 1 support agent per 150 apartments |
| kpi.breakEvenApartments | 235 | v11 | occupied apartments at break-even |
| lease.minDays | 31 | v11 | more than 31 days |
| lease.maxMonths | 12 | v11 | |
| lease.tenantExitAfterMonths | 1 | RDL 29/2026 | tenant may leave after 1 month (LAU art. 11.2) |
| lease.exitNoticeDays | 10 | RDL 29/2026 | with 10 days' notice |
| vat | VAT excluded on demo totals | v11 | |
| sites | see facts.ts SITES | illustrative | approximate public areas |
| mvp.tool | Claude Code (paid) | v11 decision | v11 text says "Lovable"; group chose this build |

## Arithmetic check (demo case)
- Rent: 120 apartment-months × €1,879.20 = **€225,504**
- Company pays: 225,504 × (1 + 0.04 + 0.02) = 239,034.24 → **€239,034**
- Settle In revenue: 225,504 × (0.06 + 0.04 + 0.01) = 24,805.44 → **€24,805**
- Flex pool (operators): 225,504 × 0.01 = **€2,255**
- Operator payout: 225,504 × 0.94 = **€211,974**, plus the Flex pool
- Direct cost: 120 × €36 = **€4,320**; contribution ≈ **€20,485**
- Re-plan: 3 engineers × €1,992 × 4 months = **+€23,904**; 23 apartments → still 4% tier
