import type { Unit, UnitType, VerificationStatus } from '../types';
import { PROVIDERS } from './providers';
import { MADRID_RINGS, ZONES, kmForMinutes, madridPoint } from './sites';

// Fictional furnished apartments (bills, Wi-Fi and fortnightly cleaning included). Demo data.
// ~20 per city near the project sites. Madrid carries the demo case (20 engineers) and is laid out
// in three commute rings so the engine's options land on the business-plan numbers:
//   near ≈ 12 min / €2,140, mid ≈ 22 min / €1,992, far ≈ 31 min / €1,935 (company price per apartment-month).

type Spec = [UnitType, number, Partial<Unit>?]; // type, rent €/month, overrides
interface ZoneBlock {
  code: string; // city code for ids
  zone: string;
  providerId: string;
  streets: string[];
  units: Spec[];
}

const DEFAULT_FROM = '2026-11-01';
const DEFAULT_TO = '2027-12-31';
// The current lease cycle of these units ends with the demo mission's original 6-month window.
export const ENDS_MAY_2027: Partial<Unit> = { availableTo: '2027-05-31' };
const PENDING: Partial<Unit> = { status: 'pending' };

const SQM: Record<UnitType, number> = { studio: 32, '1bed': 48, '2bed': 70, '3bed': 92 };

const BLOCKS: ZoneBlock[] = [
  // ── Barcelona ──────────────────────────────────────────────────────────
  { code: 'BCN', zone: 'Sants', providerId: 'P04', streets: ['Carrer de Sants', 'Carrer de Galileu', 'Carrer de Numància', 'Carrer de Viriat', 'Carrer de Badal'],
    units: [['1bed', 1950], ['1bed', 2020], ['studio', 1620], ['2bed', 2480], ['1bed', 1980]] },
  { code: 'BCN', zone: "L'Hospitalet", providerId: 'P04', streets: ['Rambla de Just Oliveras', 'Carrer de Rafael Campalans', 'Avinguda de Josep Tarradellas', 'Carrer del Xipreret', 'Carrer de la Riera Blanca'],
    units: [['1bed', 1720], ['1bed', 1760], ['studio', 1480], ['2bed', 2180], ['1bed', 1740, { ...PENDING, registrationNo: undefined }]] },
  { code: 'BCN', zone: 'Poble-sec', providerId: 'P05', streets: ['Carrer de Blai', 'Carrer de Margarit', 'Avinguda del Paral·lel', 'Carrer de Elkano', 'Carrer de Tapioles'],
    units: [['1bed', 2050], ['studio', 1690], ['1bed', 2080], ['2bed', 2560], ['1bed', 2010]] },
  { code: 'BCN', zone: 'El Prat', providerId: 'P05', streets: ['Carrer de Jaume Casanovas', 'Avinguda del Remolar', 'Carrer de Ferran Puig', 'Carrer del Centre', 'Plaça de Catalunya'],
    units: [['1bed', 1640], ['1bed', 1600], ['studio', 1390], ['2bed', 2050], ['1bed', 1620]] },
  // ── Valencia (Sagunto) ─────────────────────────────────────────────────
  { code: 'VLC', zone: 'Sagunto', providerId: 'P06', streets: ['Avinguda País Valencià', 'Carrer Major', 'Carrer Camí Real', 'Carrer Sant Vicent', 'Plaça del Cronista Chabret'],
    units: [['1bed', 1120], ['1bed', 1150], ['studio', 940], ['2bed', 1420], ['1bed', 1180]] },
  { code: 'VLC', zone: 'Puerto de Sagunto', providerId: 'P06', streets: ['Avinguda Mediterrània', 'Carrer Sant Pere', 'Carrer Progrés', 'Carrer Teodoro Llorente', 'Carrer Numància'],
    units: [['1bed', 1090], ['studio', 910], ['1bed', 1110], ['2bed', 1380], ['1bed', 1130]] },
  { code: 'VLC', zone: 'Puçol', providerId: 'P07', streets: ['Carrer Major', 'Avinguda Alacant', 'Carrer Sant Joan', 'Carrer Sagunt', 'Carrer Joan XXIII'],
    units: [['1bed', 1050], ['1bed', 1070], ['studio', 880], ['2bed', 1340], ['1bed', 1060]] },
  { code: 'VLC', zone: "Canet d'en Berenguer", providerId: 'P07', streets: ['Avinguda Mediterrània', 'Carrer Pintor Sorolla', 'Carrer Alboraia', 'Carrer Pare Recaredo', 'Carrer Major'],
    units: [['1bed', 1160], ['studio', 960], ['1bed', 1190], ['2bed', 1460], ['1bed', 1170]] },
  // ── Málaga ─────────────────────────────────────────────────────────────
  { code: 'AGP', zone: 'Campanillas', providerId: 'P08', streets: ['Calle Severo Ochoa', 'Avenida Juan López Peñalver', 'Calle Lope de Rueda', 'Calle Las Pirámides', 'Calle Maestro Ruiz'],
    units: [['1bed', 1280], ['1bed', 1310], ['studio', 1050], ['2bed', 1620], ['1bed', 1290]] },
  { code: 'AGP', zone: 'Teatinos', providerId: 'P09', streets: ['Avenida de Plutarco', 'Calle Hermanos Lumière', 'Calle Bergamín', 'Avenida de Jorge Luis Borges', 'Calle Navarro Ledesma'],
    units: [['1bed', 1420], ['1bed', 1450], ['studio', 1150], ['2bed', 1780], ['1bed', 1430]] },
  { code: 'AGP', zone: 'Churriana', providerId: 'P08', streets: ['Calle Torremolinos', 'Calle Maestro Vert', 'Calle Mercurio', 'Calle Alcalde Rafael Bravo', 'Calle Diego de Vergara'],
    units: [['1bed', 1350], ['studio', 1080], ['1bed', 1370], ['2bed', 1690], ['1bed', 1360]] },
  { code: 'AGP', zone: 'Alhaurín de la Torre', providerId: 'P09', streets: ['Avenida de la Ilustración', 'Calle Málaga', 'Avenida Reyes de España', 'Calle Juan Carlos I', 'Calle Antonio Machado'],
    units: [['1bed', 1240], ['1bed', 1260], ['studio', 990], ['2bed', 1560], ['1bed', 1250]] },
  // ── Zaragoza ───────────────────────────────────────────────────────────
  { code: 'ZAZ', zone: 'Villanueva de Gállego', providerId: 'P10', streets: ['Calle Mayor', 'Avenida de Zaragoza', 'Calle Gállego', 'Calle San Pedro', 'Plaza de España'],
    units: [['1bed', 980], ['1bed', 1010], ['studio', 820], ['2bed', 1250], ['1bed', 995]] },
  { code: 'ZAZ', zone: 'Zuera', providerId: 'P10', streets: ['Calle Gil Tarín', 'Avenida Zaragoza', 'Calle Lanuza', 'Calle San Juan', 'Calle Mayor'],
    units: [['1bed', 900], ['studio', 760], ['1bed', 930], ['2bed', 1150], ['1bed', 915]] },
  { code: 'ZAZ', zone: 'San Juan de Mozarrifar', providerId: 'P11', streets: ['Calle Mayor', 'Calle Teniente Ortiz', 'Calle Joaquín Costa', 'Plaza Mayor', 'Calle Ramón y Cajal'],
    units: [['1bed', 950], ['1bed', 970], ['studio', 790], ['2bed', 1190], ['1bed', 960]] },
  { code: 'ZAZ', zone: 'Actur', providerId: 'P11', streets: ['Calle Pablo Ruiz Picasso', 'Avenida de Ranillas', 'Calle María Zambrano', 'Calle Emilia Pardo Bazán', 'Calle Antonio Leyva'],
    units: [['1bed', 1020], ['studio', 840], ['1bed', 1040], ['2bed', 1280], ['1bed', 1030]] },
];

const AMENITIES: Record<UnitType, string[]> = {
  studio: ['Wi-Fi 600 Mb', 'Work desk', 'Washer', 'A/C'],
  '1bed': ['Wi-Fi 600 Mb', 'Work desk', 'Washer', 'A/C', 'Lift'],
  '2bed': ['Wi-Fi 1 Gb', 'Work desk', 'Washer-dryer', 'A/C', 'Lift', 'Dishwasher'],
  '3bed': ['Wi-Fi 1 Gb', 'Two desks', 'Washer-dryer', 'A/C', 'Dishwasher', 'Storage'],
};

const TYPE_LABEL: Record<UnitType, string> = { studio: 'Studio', '1bed': '1-bed apartment', '2bed': '2-bed apartment', '3bed': '3-bed apartment' };
export const UNIT_TYPE_SHORT: Record<UnitType, string> = { studio: 'Studio', '1bed': '1-bed', '2bed': '2-bed', '3bed': '3-bed' };

// Deterministic jitter around the zone centroid (≈ ±400 m).
const jitter = (i: number, salt: number) => (((i * 7919 + salt * 104729) % 17) - 8) * 0.00055;

function buildAll(): Unit[] {
  const counters: Record<string, number> = {};
  const out: Unit[] = [];
  BLOCKS.forEach((b, bi) => {
    const z = ZONES[b.zone];
    const provider = PROVIDERS.find((p) => p.id === b.providerId)!;
    b.units.forEach(([type, rent, extra], i) => {
      counters[b.code] = (counters[b.code] ?? 0) + 1;
      const id = `${b.code}${String(counters[b.code]).padStart(2, '0')}`;
      const n = counters[b.code];
      out.push({
        id,
        providerId: b.providerId,
        title: `${TYPE_LABEL[type]} · ${b.zone}`,
        type,
        sqm: SQM[type] + ((n * 3) % 7) - 3,
        rent,
        zone: b.zone,
        town: z.town,
        city: z.city,
        address: `${b.streets[i % b.streets.length]} ${(n * 13) % 90 + 2}, ${(i % 4) + 1}º${'ABCD'[n % 4]}, ${z.town}`,
        lat: +(z.lat + jitter(n, bi)).toFixed(5),
        lng: +(z.lng + jitter(n, bi + 7)).toFixed(5),
        amenities: [...AMENITIES[type], ...(n % 3 === 0 ? ['Parking'] : []), 'Cleaning fortnightly'],
        availableFrom: DEFAULT_FROM,
        availableTo: DEFAULT_TO,
        photos: [`ph-${id}-a`, `ph-${id}-b`, `ph-${id}-c`],
        ownerName: provider.legalName,
        catastroOwner: provider.legalName,
        listingCif: provider.cif,
        registrationNo: z.registrationRequired ? `REG-${z.city.slice(0, 3).toUpperCase()}-${String(4000 + n * 37)}` : undefined,
        status: 'verified' as VerificationStatus,
        ...extra,
      });
    });
  });
  return out;
}


// ── Madrid (generated in commute rings; [minutes, rent, rotation°]) ───────────
type RingSpec = [number, number, number];
const MAD_SPEC: Record<string, { providerId: string; streets: string[]; units: RingSpec[]; extra?: Partial<Unit> }> = {
  'Torrejón de Ardoz': { providerId: 'P01', streets: ['Calle Hospital', 'Avenida de la Constitución', 'Calle Silicio', 'Calle Cristo', 'Calle Londres'], units: [[11.6, 2024, -6], [12.4, 2014, -3], [11.8, 2021, 0], [12.2, 2017, 3], [12.0, 2019, 6]] },
  Barajas: { providerId: 'P03', streets: ['Avenida de Logroño', 'Calle Bergantín', 'Calle General', 'Calle Playa de Riazor', 'Calle Ayerbe'], units: [[11.6, 2024, -6], [12.4, 2014, -3], [11.8, 2021, 0], [12.2, 2017, 3], [12.0, 2019, 6]] },
  'San Blas': { providerId: 'P02', streets: ['Calle Alcalá', 'Calle Amposta', 'Avenida de Arcentales', 'Calle Arcos de Jalón', 'Calle Suecia'], units: [[11.6, 2024, -6], [12.4, 2014, -3], [11.8, 2021, 0], [12.2, 2017, 3], [12.0, 2019, 6]] },
  'Mejorada del Campo': { providerId: 'P01', streets: ['Calle Mayor', 'Avenida de la Constitución', 'Calle del Pilar', 'Calle Cervantes', 'Plaza de España'], units: [[11.6, 2024, -6], [12.4, 2014, -3], [11.8, 2021, 0], [12.2, 2017, 3], [12.0, 2019, 6]] },
  'Alcalá de Henares': { providerId: 'P01', streets: ['Calle Mayor', 'Vía Complutense', 'Calle Libreros', 'Paseo de la Estación', 'Calle Santiago'], units: [[21.9, 1874, -5], [22.1, 1884, -2], [22.0, 1876, 0], [21.95, 1882, 2], [22.05, 1879, 5]] },
  Chamartín: { providerId: 'P02', streets: ['Calle Príncipe de Vergara', 'Calle López de Hoyos', 'Paseo de la Castellana', 'Calle Alberto Alcocer', 'Calle Corazón de María'], units: [[21.9, 1878, -5], [22.1, 1880, -2], [22.0, 1877, 0], [21.95, 1881, 2], [22.05, 1880, 5]] },
  Retiro: { providerId: 'P03', streets: ['Calle Ibiza', 'Calle Doctor Esquerdo', 'Avenida de Menéndez Pelayo', 'Calle Narváez', 'Calle O\'Donnell'], units: [[21.9, 1875, -5], [22.1, 1883, -2], [22.0, 1879, 0], [21.95, 1879, 2], [22.05, 1880, 5]] },
  'Arganda del Rey': { providerId: 'P02', streets: ['Calle Real', 'Avenida del Ejército', 'Calle San Juan', 'Calle Juan de la Cierva', 'Plaza de la Constitución'], units: [[21.9, 1876, -5], [22.1, 1882, -2], [22.0, 1878, 0], [21.95, 1880, 2], [22.05, 1881, 5]] },
  Getafe: { providerId: 'P03', streets: ['Calle Madrid', 'Avenida de España', 'Calle Toledo', 'Calle Leganés', 'Calle Ramón y Cajal'], units: [[30.7, 1815, -5], [31.3, 1835, -2], [30.9, 1820, 0], [31.1, 1830, 2], [31.0, 1826, 5]] },
  Carabanchel: { providerId: 'P02', streets: ['Calle General Ricardos', 'Vía Carpetana', 'Calle Oca', 'Calle Eugenia de Montijo', 'Calle Antonio Leyva'], units: [[30.7, 1822, -5], [31.3, 1828, -2], [30.9, 1818, 0], [31.1, 1832, 2], [31.0, 1825, 5]] },
  Alcobendas: { providerId: 'P01', streets: ['Calle Marquesa Viuda de Aldama', 'Avenida de España', 'Calle Constitución', 'Paseo de la Chopera', 'Calle Málaga'], units: [[30.7, 1824, -5], [31.3, 1827, -2], [30.9, 1819, 0], [31.1, 1831, 2], [31.0, 1826, 5]] },
  Villaverde: { providerId: 'P03', streets: ['Avenida de Andalucía', 'Calle Alcocer', 'Calle Doctor Martín Arévalo', 'Calle Villalonso', 'Calle Unanimidad'], units: [[30.7, 1823, -5], [31.3, 1829, -2], [30.9, 1821, 0], [31.1, 1830, 2], [31.0, 1828, 5]] },
};
// Three more mid-ring apartments, free from month 3 — used when 3 engineers join mid-mission.
const MAD_FROM_MONTH_3: [string, RingSpec][] = [
  ['Chamartín', [22.0, 1879, 8]],
  ['Retiro', [22.0, 1879, 8]],
  ['Alcalá de Henares', [22.0, 1880, 8]],
];
export const MONTH_3 = '2027-02-01';

function madridUnits(): Unit[] {
  const out: Unit[] = [];
  let n = 0;
  const make = (zone: string, [min, rent, rot]: RingSpec, streetIdx: number, extra: Partial<Unit> = {}): Unit => {
    n += 1;
    const id = `MAD${String(n).padStart(2, '0')}`;
    const spec = MAD_SPEC[zone];
    const z = ZONES[zone];
    const provider = PROVIDERS.find((p) => p.id === spec.providerId)!;
    const pt = madridPoint(MADRID_RINGS[zone].toward, kmForMinutes(min), rot);
    return {
      id,
      providerId: spec.providerId,
      title: `1-bed apartment · ${zone}`,
      type: '1bed',
      sqm: 45 + (n % 7),
      rent,
      zone,
      town: z.town,
      city: 'Madrid',
      address: `${spec.streets[streetIdx % spec.streets.length]} ${(n * 13) % 90 + 2}, ${(n % 4) + 1}º${'ABCD'[n % 4]}, ${z.town}`,
      lat: +pt.lat.toFixed(5),
      lng: +pt.lng.toFixed(5),
      amenities: [...AMENITIES['1bed'], ...(n % 3 === 0 ? ['Parking'] : []), 'Cleaning fortnightly'],
      availableFrom: DEFAULT_FROM,
      availableTo: DEFAULT_TO,
      photos: [`ph-${id}-a`, `ph-${id}-b`, `ph-${id}-c`],
      ownerName: provider.legalName,
      catastroOwner: provider.legalName,
      listingCif: provider.cif,
      status: 'verified',
      ...extra,
    };
  };
  for (const [zone, spec] of Object.entries(MAD_SPEC)) spec.units.forEach((u, i) => out.push(make(zone, u, i)));
  for (const [zone, u] of MAD_FROM_MONTH_3) out.push(make(zone, u, 2, { availableFrom: MONTH_3 }));
  return out;
}

const BASE = [...madridUnits(), ...buildAll()];

// A deliberately fraudulent new listing in Madrid (operator in onboarding): photos copied from MAD27
// (Chamartín), owner on the listing ≠ owner in Catastro, rent ≈ 40% below the zone median.
const COPIED = BASE.find((u) => u.id === 'MAD27')!;
const FRAUD: Unit = {
  ...COPIED,
  id: 'MAD99',
  providerId: 'P12',
  title: 'Bright 1-bed in Chamartín — all bills included',
  rent: 1127,
  photos: [...COPIED.photos],
  ownerName: 'Javier Ortiz Lahoz',
  catastroOwner: COPIED.catastroOwner,
  listingCif: 'B88733015',
  status: 'pending',
  lat: +(COPIED.lat + 0.0004).toFixed(5),
};

export const UNITS: Unit[] = [...BASE, FRAUD];
export const FRAUD_UNIT_ID = 'MAD99';
export const unitById = (id: string) => UNITS.find((u) => u.id === id);
