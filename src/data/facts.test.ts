import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FACTS } from './facts';

// Parse the machine-checked table in SETTLE_IN_FACTS.md and compare it with facts.ts.
const md = readFileSync(resolve(__dirname, '../../SETTLE_IN_FACTS.md'), 'utf8');
const rows = Object.fromEntries(
  md
    .split('\n')
    .filter((l) => /^\| [a-z]/.test(l) && !l.startsWith('| key'))
    .map((l) => l.split('|').map((c) => c.trim()))
    .map((c) => [c[1], c[2]]),
);
const num = (k: string) => Number(rows[k]);

describe('SETTLE_IN_FACTS.md ↔ facts.ts', () => {
  it('brand', () => {
    expect(rows['brand.tagline']).toBe(FACTS.brand.tagline);
    expect(rows['brand.terracotta']).toBe(FACTS.brand.terracotta);
    expect(rows['brand.cream']).toBe(FACTS.brand.cream);
    expect(rows['brand.ink']).toBe(FACTS.brand.ink);
    expect(rows['cities'].split(', ')).toEqual([...FACTS.cities]);
  });

  it('pricing', () => {
    expect(num('pricing.operatorCommission')).toBe(FACTS.pricing.operatorCommission);
    expect([num('pricing.markup.1-9'), num('pricing.markup.10-24'), num('pricing.markup.25+')]).toEqual(FACTS.pricing.markupTiers.map((t) => t.rate));
    expect(num('pricing.flex')).toBe(FACTS.pricing.flex);
    expect(num('pricing.flexRevenue')).toBe(FACTS.pricing.flexRevenue);
    expect(num('pricing.flexPool')).toBe(FACTS.pricing.flexPool);
  });

  it('demo case and KPIs', () => {
    for (const k of ['people', 'months', 'apartmentMonths', 'rentPerApartmentMonth', 'rentTotal', 'markupRate', 'companyPays', 'revenue', 'flexPool', 'directCostPerApartmentMonth', 'directCost', 'contribution', 'hotelPerEngineerMonth', 'companyPaysHotel', 'savingVsHotel', 'hrHoursByHand'] as const) {
      expect(num(`demo.${k}`), k).toBe(FACTS.demo[k]);
    }
    for (const k of ['A', 'B', 'C'] as const) {
      expect(rows[`options.${k}`], k).toBe(`${FACTS.options[k].pricePerApartmentMonth} / ${FACTS.options[k].avgCommuteMin}`);
    }
    for (const k of ['people', 'fromMonth', 'months', 'pricePerApartmentMonth', 'delta', 'apartmentsAfter', 'moved', 'noticeMonthsWithoutFlex', 'deltaWithoutFlex'] as const) {
      expect(num(`replan.${k}`), k).toBe(FACTS.replan[k]);
    }
    expect(num('kpi.briefToPlanHours')).toBe(FACTS.kpi.briefToPlanHours);
    expect(num('kpi.opsHoursPerMission')).toBe(FACTS.kpi.opsHoursPerMission);
    expect(num('kpi.opsHoursAtLaunch')).toBe(FACTS.kpi.opsHoursAtLaunch);
    expect(num('kpi.opsHoursManual')).toBe(FACTS.kpi.opsHoursManual);
    expect(num('kpi.opsHoursSaving')).toBe(FACTS.kpi.opsHoursSaving);
    expect(Math.round((1 - FACTS.kpi.opsHoursPerMission / FACTS.kpi.opsHoursManual) * 100)).toBe(79);
    expect(num('kpi.apartmentsPerAgent')).toBe(FACTS.kpi.apartmentsPerAgent);
    expect(num('kpi.breakEvenApartments')).toBe(FACTS.kpi.breakEvenApartments);
    expect(num('kpi.breakEvenApartmentsYear3')).toBe(FACTS.kpi.breakEvenApartmentsYear3);
    expect(num('kpi.occupiedApartmentsYear3')).toBe(FACTS.kpi.occupiedApartmentsYear3);
    expect(rows['kpi.breakEvenMonth']).toBe(FACTS.kpi.breakEvenMonth);
    expect(rows['kpi.occupiedByYear']).toBe(FACTS.kpi.occupiedByYear.join(', '));
    for (const k of Object.keys(FACTS.finance) as (keyof typeof FACTS.finance)[]) expect(num(`finance.${k}`), k).toBe(FACTS.finance[k]);
    expect(rows['expansionNext']).toBe(FACTS.expansionNext);
    expect(FACTS.replan.delta).toBe(-FACTS.replan.people * FACTS.replan.pricePerApartmentMonth * FACTS.replan.months);
    expect(FACTS.replan.deltaWithoutFlex).toBe(-FACTS.replan.people * FACTS.replan.pricePerApartmentMonth * (FACTS.replan.months - FACTS.replan.noticeMonthsWithoutFlex));
    expect(Math.round((1 - FACTS.demo.companyPays / FACTS.demo.companyPaysHotel) * 100) / 100).toBe(FACTS.demo.savingVsHotel);
    expect(rows['rollout']).toBe(FACTS.cities.map((c) => `${c}: ${FACTS.rollout[c]}`).join('; '));
    expect(rows['launchOffer']).toBe(FACTS.launchOffer);
    expect(FACTS.demo.revenue - FACTS.demo.directCost).toBe(FACTS.demo.contribution);
    // Direct cost rebuilt from the financial model's unit costs.
    // support (1 agent per 300 flats) + ops time (39 h × €24.88 per 120 apartment-months) + platform + payments
    expect(Math.round(120 * ((19834 * 1.31) / 12 / 300 + (39 * 24.88) / 120 + 4 + 0.5) + 20 * 43 + 0.003 * 239034.24)).toBe(FACTS.demo.directCost);
    expect(rows['vat']).toBe(FACTS.vatNote);
    expect(md).not.toMatch(/\| CONFIRM \|/);
    expect(num('lease.tenantExitAfterMonths')).toBe(FACTS.lease.tenantExitAfterMonths);
    expect(num('lease.exitNoticeDays')).toBe(FACTS.lease.exitNoticeDays);
  });
});
