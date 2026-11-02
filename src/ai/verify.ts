// Listing verification (phase 1 "document AI"): five rule-based checks feed a 0–100 trust score.
// KYC · Catastro ownership · duplicate photos · price outlier · regional registration (where required).
import { PROVIDERS } from '../data/providers';
import { ZONES } from '../data/sites';
import type { Provider, Unit, VerificationCheck } from '../types';
import { haversineKm } from './geo';

export const PRICE_OUTLIER_THRESHOLD = -0.3; // more than 30% below the area median
export const COMPS_RADIUS_KM = 15;

export type Decision = 'approve' | 'review' | 'reject';

export interface VerificationResult {
  unitId: string;
  checks: VerificationCheck[];
  trustScore: number;
  decision: Decision;
  flags: string[];
  areaMedian: number;
  priceDeviation: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Median rent of comparable units: same type in the same zone, else same type within 15 km. */
export function areaMedian(unit: Unit, units: Unit[]): number {
  const others = units.filter((u) => u.id !== unit.id && u.type === unit.type);
  let comps = others.filter((u) => u.zone === unit.zone);
  if (comps.length < 3) comps = others.filter((u) => haversineKm(u, unit) <= COMPS_RADIUS_KM);
  if (comps.length === 0) comps = others;
  return median(comps.map((u) => u.rent));
}

export function decide(score: number): Decision {
  if (score >= 75) return 'approve';
  if (score >= 50) return 'review';
  return 'reject';
}

export function verifyUnit(unit: Unit, units: Unit[], providers: Provider[] = PROVIDERS): VerificationResult {
  const provider = providers.find((p) => p.id === unit.providerId);
  const checks: VerificationCheck[] = [];

  // 1. KYC: operator identity and company verified at the payment provider; CIF on listing matches.
  const kycOk = !!provider && provider.kycVerified && unit.listingCif === provider.cif;
  checks.push({
    id: 'kyc',
    label: 'Operator KYC',
    weight: 20,
    pass: kycOk,
    detail: !provider
      ? 'Operator not found'
      : !provider.kycVerified
        ? `${provider.legalName}: identity and company documents not yet verified`
        : unit.listingCif !== provider.cif
          ? `CIF on listing ${unit.listingCif} ≠ operator CIF ${provider.cif}`
          : `${provider.legalName} · CIF ${provider.cif} verified`,
  });

  // 2. Catastro: owner on the listing matches the owner in the land registry for that address.
  const catastroOk = unit.ownerName === unit.catastroOwner;
  checks.push({
    id: 'catastro',
    label: 'Catastro ownership',
    weight: 25,
    pass: catastroOk,
    detail: catastroOk ? `Owner matches Catastro: ${unit.catastroOwner}` : `Listing says "${unit.ownerName}", Catastro says "${unit.catastroOwner}"`,
  });

  // 3. Duplicate photos: perceptual hash seen on another listing.
  const dup = unit.photos.map((ph) => ({ ph, other: units.find((u) => u.id !== unit.id && u.photos.includes(ph)) })).filter((x) => x.other);
  checks.push({
    id: 'photos',
    label: 'Duplicate-photo scan',
    weight: 25,
    pass: dup.length === 0,
    detail: dup.length
      ? `${dup.length} of ${unit.photos.length} photos match listing ${dup[0].other!.id} (${providers.find((p) => p.id === dup[0].other!.providerId)?.name})`
      : `${unit.photos.length} photos, no match in ${units.length - 1} other listings`,
  });

  // 4. Price outlier vs area median.
  const med = areaMedian(unit, units);
  const dev = (unit.rent - med) / med;
  const typeLabel = unit.type === 'studio' ? 'studios' : unit.type.replace('bed', '-beds');
  checks.push({
    id: 'price',
    label: 'Price vs area median',
    weight: 20,
    pass: dev >= PRICE_OUTLIER_THRESHOLD,
    detail: `€${unit.rent.toLocaleString('en-GB')}/mo vs median €${Math.round(med).toLocaleString('en-GB')} for ${typeLabel} in ${unit.zone} (${dev >= 0 ? '+' : '−'}${Math.abs(Math.round(dev * 100))}%)`,
  });

  // 5. Regional registration, only where the region requires it.
  const zone = ZONES[unit.zone];
  const required = !!zone?.registrationRequired;
  const regOk = !required || !!unit.registrationNo;
  checks.push({
    id: 'registration',
    label: 'Regional registration',
    weight: 10,
    pass: regOk,
    detail: !required ? `Not required in ${zone?.city ?? unit.city}` : unit.registrationNo ? `Registration ${unit.registrationNo} found` : `Required in ${zone.city}, no registration number on the listing`,
  });

  const trustScore = checks.reduce((s, ch) => s + (ch.pass ? ch.weight : 0), 0);
  return {
    unitId: unit.id,
    checks,
    trustScore,
    decision: decide(trustScore),
    flags: checks.filter((ch) => !ch.pass).map((ch) => ch.label),
    areaMedian: Math.round(med),
    priceDeviation: dev,
  };
}
