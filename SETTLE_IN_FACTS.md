# SETTLE_IN_FACTS — single source of numbers for the MVP

Source: business plan **(November 2026 version)** and the financial model (Excel, **version 3**, Alix, 12 Nov 2026). Where the two differ, the Excel wins. Every number shown in the app comes from this table.

`src/data/facts.ts` mirrors the table below. `src/data/facts.test.ts` fails if a value drifts.
To change a number, edit this table and `facts.ts` together.

## Facts table (machine-checked)

| key | value | status | note |
|---|---|---|---|
| brand.tagline | Housing that follows your project | v11 | |
| brand.terracotta | #C4573D | v11 | |
| brand.cream | #F7EEE7 | v11 | |
| brand.ink | #2A2320 | v11 | |
| cities | Madrid, Valencia, Zaragoza, Barcelona, Málaga | v11 | about 20 seeded units each |
| rollout | Madrid: Launch city; Valencia: Year 2; Zaragoza: Year 2; Barcelona: Year 3; Málaga: Year 3 | BP Nov 2026 | Madrid first, then two cities a year |
| launchOffer | Launch offer: 0% markup on a company's first mission, in the first year of each city | BP Nov 2026 | shown on the invoice page; demo totals unchanged |
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
| demo.directCostPerApartmentMonth | 32.95 | Excel v3 | support 7.22 (1 agent per 300 flats) + ops time 8.09 (39 h × €24.88 ÷ 120) + AI and platform 4.00 + payments 0.50 per apartment-month; €43 per new flat; credit insurance 0.3% of what the company pays |
| demo.directCost | 3954 | derived | 120 × 19.80 + 20 × 43 + 0.3% × 239,034 (business plan: €3,954) |
| demo.contribution | 20851 | derived | 24,805 − 3,954 (€174 per apartment-month, 84%) |
| demo.hotelPerEngineerMonth | 3408 | BP Nov 2026 | 3-star hotel with a 15% long-stay discount |
| demo.companyPaysHotel | 408934 | BP Nov 2026 | same team in hotels |
| demo.savingVsHotel | 0.42 | derived | 1 − 239,034 ÷ 408,934 |
| demo.hrHoursByHand | 500 | deck | 25 h of HR time per relocated employee × 20 |
| options.A | 1935 / 31 | v11 | lowest cost: € per apartment-month (all-in) / average commute min |
| options.B | 1992 / 22 | v11 | balanced — recommended and released |
| options.C | 2140 / 12 | v11 | closest |
| replan.people | 5 | deck | the team drops from 20 to 15 from month 4 |
| replan.fromMonth | 4 | deck | |
| replan.months | 3 | derived | months 4–6 no longer paid |
| replan.pricePerApartmentMonth | 1992 | derived | mission average: 239,034 ÷ 120 |
| replan.delta | -29880 | derived | −5 × 1,992 × 3, with Flex (release with 30 days' notice) |
| replan.apartmentsAfter | 15 | deck | still the 4% tier (10–24) |
| replan.moved | 0 | deck | nobody who stays moves |
| replan.noticeMonthsWithoutFlex | 2 | report D3 | without Flex, each early release costs two months of notice |
| replan.deltaWithoutFlex | -9960 | derived | −5 × 1,992 × (3 − 2) |
| kpi.briefToPlanHours | 48 | v11 | target, at most |
| kpi.opsHoursAtLaunch | 39 | Excel v3 | ops hours for the reference mission (20 people, 6 months) |
| kpi.opsHoursPerMission | 39 | Excel v2 | ops hours for the reference mission from month 12 |
| kpi.opsHoursManual | 182 | v11 | ops hours per mission done by hand |
| kpi.opsHoursSaving | 0.79 | derived | 1 − 39 ÷ 182 ≈ −79% |
| kpi.apartmentsPerAgent | 300 | Excel v3 | WhatsApp AI assistant first; 150 for a people-only desk |
| kpi.breakEvenApartments | 166 | Excel v3 | occupied at the same time, Madrid alone: 28,500 ÷ 171 |
| kpi.breakEvenApartmentsYear3 | 277 | Excel v3 | with the five cities open (year 3) |
| kpi.occupiedApartmentsYear3 | 256 | Excel v3 | monthly average in 2029 |
| kpi.breakEvenMonth | Aug 2029 | Excel v3 | run-rate break-even |
| kpi.occupiedByYear | 40, 119, 256, 443 | Excel v3 | monthly average, 2027–2030 |
| finance.preSeed | 900000 | Excel v3 | pre-seed closed Oct 2026, €3m pre-money |
| finance.cashNeedBase | 657808 | Excel v3 | deepest cumulative burn, base case |
| finance.lowestCash | 242192 | Excel v3 | cash left at the lowest point |
| finance.fixedCostsPerMonth | 28500 | Excel v3 | from October 2026 |
| finance.year1Revenue | 70561 | Excel v3 | 2027 |
| finance.year1Ebitda | -295906 | Excel v3 | 2027 |
| finance.cac | 7240 | Excel v3 | cost to win a client, 2027 |
| expansionNext | Europe · Year 5 | BP Nov 2026 | first hub outside Spain |
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
- Direct cost: 120 × €19.80 + 20 × €43 + 0.3% × 239,034 = **€3,954**; contribution = 24,805 − 3,954 = **€20,851** (€174 per apartment-month, 84%)
- Re-plan: the team drops to 15 from month 4: −5 × €1,992 × 3 months = **−€29,880** with Flex; without Flex two months' notice per flat: **−€9,960**; 15 apartments → still 4% tier
