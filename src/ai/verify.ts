// Listing verification (phase 1 "document AI"): four rule-based checks feed a 0–100 trust score.
import { PROVIDERS } from '../data/providers';
import { ZONE_CENTROIDS } from '../data/sites';
import type { Provider, Unit, VerificationCheck } from '../types';
import { haversineKm } from './geo';

export const PRICE_OUTLIER_THRESHOLD = -0.3; // more than 30% below the area median
export const ADDRESS_MAX_KM = 2.5;

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

export const COMPS_RADIUS_KM = 15;

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

  // 1. Document consistency: listing CIF and owner name vs companies registry.
  const cifOk = !!provider && unit.listingCif === provider.cif;
  const ownerOk = !!provider && unit.ownerName === provider.registryName;
  checks.push({
    id: 'documents',
    label: 'Document consistency',
    weight: 30,
    pass: cifOk && ownerOk,
    detail: !provider
      ? 'Provider not found in registry'
      : !ownerOk
        ? `Owner on title deed "${unit.ownerName}" ≠ registered company "${provider.registryName}"`
        : !cifOk
          ? `CIF on listing ${unit.listingCif} ≠ registry ${provider.cif}`
          : `CIF ${provider.cif} and owner match the companies registry`,
  });

  // 2. Duplicate photos: perceptual hash seen on another listing.
  const dup = unit.photos
    .map((ph) => ({ ph, other: units.find((u) => u.id !== unit.id && u.photos.includes(ph)) }))
    .filter((x) => x.other);
  checks.push({
    id: 'photos',
    label: 'Duplicate-photo scan',
    weight: 30,
    pass: dup.length === 0,
    detail: dup.length
      ? `${dup.length} of ${unit.photos.length} photos match listing ${dup[0].other!.id} (${dup[0].other!.title}, ${providers.find((p) => p.id === dup[0].other!.providerId)?.name})`
      : `${unit.photos.length} photos, no match in ${units.length - 1} other listings`,
  });

  // 3. Price outlier vs area median.
  const med = areaMedian(unit, units);
  const dev = (unit.rent - med) / med;
  checks.push({
    id: 'price',
    label: 'Price vs area median',
    weight: 25,
    pass: dev >= PRICE_OUTLIER_THRESHOLD,
    detail: `€${unit.rent}/mo vs median €${Math.round(med)} for ${unit.type === 'studio' ? 'studios' : unit.type.replace('bed', '-beds')} in ${unit.zone} (${dev >= 0 ? '+' : '−'}${Math.abs(Math.round(dev * 100))}%)`,
  });

  // 4. Address match: declared zone vs geocoded position.
  const c = ZONE_CENTROIDS[unit.zone];
  const km = c ? haversineKm(c, unit) : Infinity;
  checks.push({
    id: 'address',
    label: 'Address match',
    weight: 15,
    pass: km <= ADDRESS_MAX_KM && unit.address.includes(unit.town),
    detail: c ? `Geocoded ${km.toFixed(1)} km from ${unit.zone} centre` : `Unknown zone "${unit.zone}"`,
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
