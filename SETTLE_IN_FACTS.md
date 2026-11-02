# SETTLE_IN_FACTS — single source of numbers for the MVP

Source: business plan **v11**. This file was drafted from the v11 summary because the original
FACTS file was not available. Rows marked **CONFIRM** are not in that summary: the group must
validate them, and the app shows a "to confirm" marker next to them.

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
| kpi.briefToPlanHours | 48 | v11 | target, at most |
| kpi.opsHoursPerMission | 39 | v11 | with Settle In |
| kpi.opsHoursManual | 182 | CONFIRM | baseline "182" from the brief; basis to confirm |
| kpi.apartmentsPerAgent | 150 | v11 | 1 support agent per 150 apartments |
| kpi.breakEvenApartments | 235 | CONFIRM | occupied apartments at break-even; unit and period to confirm |
| lease.minDays | 31 | v11 | more than 31 days |
| lease.maxMonths | 12 | v11 | |
| lease.month6Exit | true | v11 | month-6 exit right noted in every lease |
| vat | not shown on demo totals | CONFIRM | VAT treatment of markup / Flex to confirm |
| sites | see facts.ts SITES | CONFIRM | chapter 06 site list not available; demo sites are placeholders |
| mvp.tool | Claude Code (paid) | v11 decision | v11 text says "Lovable"; group chose this build |

## Arithmetic check (demo case)
- Rent: 120 apartment-months × €1,879.20 = **€225,504**
- Company pays: 225,504 × (1 + 0.04 + 0.02) = 239,034.24 → **€239,034**
- Settle In revenue: 225,504 × (0.06 + 0.04 + 0.01) = 24,805.44 → **€24,805**
- Flex pool (operators): 225,504 × 0.01 = **€2,255**
- Operator payout: 225,504 × 0.94 = **€211,974**, plus the Flex pool
- Direct cost: 120 × €36 = **€4,320**; contribution ≈ **€20,485**
