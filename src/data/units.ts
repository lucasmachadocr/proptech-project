import type { Unit, UnitType, VerificationStatus } from '../types';
import { PROVIDERS } from './providers';
import { ZONE_CENTROIDS } from './sites';

// Fictional furnished units (bills, Wi-Fi and fortnightly cleaning included). Demo data.
// Row: id, provider, type, m², rent €/month, zone, street address, lat/lng offset from zone centroid (×1e-3)
type Row = [string, string, UnitType, number, number, string, string, number, number, Partial<Unit>?];

const ZARAGOZA_ZONES = new Set(['Actur', 'Centro', 'Universidad', 'Delicias', 'Puerto Venecia']);
const DEFAULT_FROM = '2026-11-01';
const DEFAULT_TO = '2027-12-31';
// The current lease cycle of these units ends with the demo project's original 6-month window.
const ENDS_MAY_2027: Partial<Unit> = { availableTo: '2027-05-31' };
const PENDING: Partial<Unit> = { status: 'pending' };

const ROWS: Row[] = [
  // Villanueva de Gállego — next to the data-centre campus
  ['U01', 'P04', 'studio', 32, 1590, 'Villanueva de Gállego', 'Calle Mayor 18, 2ºB', 1.2, -2.0],
  ['U02', 'P04', '1bed', 48, 1990, 'Villanueva de Gállego', 'Avenida de Zaragoza 7, 1ºA', -2.1, 1.4],
  ['U03', 'P04', '2bed', 70, 2050, 'Villanueva de Gállego', 'Calle Gállego 3, 3ºC', 0.6, 2.8],
  ['U04', 'P04', '3bed', 95, 2200, 'Villanueva de Gállego', 'Calle San Pedro 22', -1.0, -3.1],
  ['U05', 'P04', '1bed', 50, 1960, 'Villanueva de Gállego', 'Plaza de España 5, 2ºD', 2.6, 0.4, ENDS_MAY_2027],
  // Zuera
  ['U06', 'P04', 'studio', 30, 1540, 'Zuera', 'Calle Gil Tarín 11, 1ºB', 0.8, 1.2],
  ['U07', 'P04', '1bed', 45, 1800, 'Zuera', 'Avenida Zaragoza 40, 2ºA', -1.5, -0.6],
  ['U08', 'P04', '2bed', 72, 1890, 'Zuera', 'Calle Lanuza 2, 3ºA', 1.9, -1.8],
  ['U09', 'P04', '3bed', 98, 2120, 'Zuera', 'Calle San Juan 14', -0.4, 2.2],
  // San Juan de Mozarrifar
  ['U10', 'P11', 'studio', 28, 1600, 'San Juan de Mozarrifar', 'Calle Mayor 61, 1ºA', 0.5, -1.1],
  ['U11', 'P11', '1bed', 46, 1850, 'San Juan de Mozarrifar', 'Calle Teniente Ortiz 9, 2ºB', -1.4, 0.9],
  ['U12', 'P11', '2bed', 68, 1980, 'San Juan de Mozarrifar', 'Calle Joaquín Costa 4, 1ºC', 1.1, 1.7],
  ['U13', 'P11', '1bed', 52, 1900, 'San Juan de Mozarrifar', 'Plaza Mayor 2, 3ºA', -0.7, -2.3],
  // Actur (Zaragoza)
  ['U14', 'P05', 'studio', 30, 1490, 'Actur', 'Calle Pablo Ruiz Picasso 34, 5ºB', 1.3, 1.0],
  ['U15', 'P05', 'studio', 33, 1560, 'Actur', 'Calle Gertrudis Gómez de Avellaneda 12, 2ºA', -1.6, 2.2],
  ['U16', 'P05', '1bed', 47, 1880, 'Actur', 'Avenida de Ranillas 5, 4ºC', 2.4, -2.5],
  ['U17', 'P05', '1bed', 50, 1780, 'Actur', 'Calle María Zambrano 19, 6ºD', 0.2, 3.3, ENDS_MAY_2027],
  ['U18', 'P05', '2bed', 75, 1990, 'Actur', 'Calle Emilia Pardo Bazán 8, 3ºA', -2.2, -1.2],
  ['U19', 'P05', '3bed', 92, 2180, 'Actur', 'Calle Margarita Xirgú 3, 1ºB', 3.1, 0.6],
  ['U20', 'P05', '1bed', 44, 1840, 'Actur', 'Calle Antonio Leyva 21, 2ºC', -0.9, -3.4],
  // Centro (Zaragoza)
  ['U21', 'P03', 'studio', 31, 1620, 'Centro', 'Calle Alfonso I 26, 3ºD', 1.4, 0.8],
  ['U22', 'P03', '1bed', 52, 2000, 'Centro', 'Paseo de la Independencia 19, 5ºA', -2.0, -1.0],
  ['U23', 'P03', '1bed', 49, 1940, 'Centro', 'Calle Coso 88, 2ºB', 0.4, 2.1],
  ['U24', 'P03', '2bed', 80, 2100, 'Centro', 'Plaza de Aragón 10, 4ºC', -3.0, -2.2],
  ['U25', 'P09', 'studio', 27, 1540, 'Centro', 'Calle Mayor 33, 1ºA', 2.6, 1.6],
  ['U26', 'P09', '1bed', 45, 1860, 'Centro', 'Calle Espoz y Mina 14, 2ºA', 2.0, -0.3],
  ['U27', 'P09', '3bed', 105, 2200, 'Centro', 'Calle San Vicente de Paúl 7, 3º', 1.0, 3.0],
  // Universidad (Zaragoza)
  ['U28', 'P02', 'studio', 29, 1470, 'Universidad', 'Calle Corona de Aragón 41, 6ºA', 0.7, 0.9],
  ['U29', 'P02', '1bed', 46, 1790, 'Universidad', 'Calle Pedro Cerbuna 6, 3ºB', -1.2, 1.8],
  ['U30', 'P02', '2bed', 72, 1950, 'Universidad', 'Calle Violante de Hungría 9, 2ºC', 1.6, -1.4],
  ['U31', 'P02', '1bed', 48, 1830, 'Universidad', 'Avenida de Valencia 22, 4ºD', -0.5, -2.6],
  ['U32', 'P02', 'studio', 31, 1510, 'Universidad', 'Calle Duquesa Villahermosa 15, 1ºB', 2.3, 2.4],
  // Delicias (Zaragoza)
  ['U33', 'P06', 'studio', 30, 1430, 'Delicias', 'Avenida de Madrid 112, 3ºA', 0.9, -0.8],
  ['U34', 'P06', '1bed', 47, 1780, 'Delicias', 'Calle Delicias 48, 2ºC', -1.3, 1.1],
  ['U35', 'P06', '2bed', 70, 1880, 'Delicias', 'Calle Santa Orosia 6, 4ºB', 1.8, 2.0],
  ['U36', 'P06', '1bed', 45, 1790, 'Delicias', 'Vía Univérsitas 30, 1ºD', -2.4, -1.9],
  // Puerto Venecia (south Zaragoza)
  ['U37', 'P01', 'studio', 31, 1450, 'Puerto Venecia', 'Calle Isla de Cerdeña 4, 2ºA', 0.8, 0.5],
  ['U38', 'P01', '1bed', 49, 1720, 'Puerto Venecia', 'Calle Isla de Sicilia 11, 5ºC', -0.9, -0.7, PENDING],
  // Utebo
  ['U39', 'P10', '1bed', 50, 1780, 'Utebo', 'Avenida de Navarra 23, 1ºA', 0.8, 1.5],
  ['U40', 'P10', '2bed', 74, 1820, 'Utebo', 'Calle Joaquín Costa 17, 2ºB', -1.1, -0.9],
  ['U41', 'P10', 'studio', 32, 1480, 'Utebo', 'Calle Constitución 5, 3ºA', 1.7, -2.1],
  ['U42', 'P10', '3bed', 100, 2050, 'Utebo', 'Calle Las Fuentes 9', -2.0, 2.3],
  // Casetas
  ['U43', 'P10', '1bed', 48, 1580, 'Casetas', 'Calle Antonio Machado 12, 1ºB', 0.6, 0.9],
  ['U44', 'P10', 'studio', 30, 1390, 'Casetas', 'Calle Mayor 70, 2ºA', -0.8, -1.2, ENDS_MAY_2027],
  // El Burgo de Ebro — AWS campus area
  ['U45', 'P08', 'studio', 30, 1050, 'El Burgo de Ebro', 'Calle Mayor 9, 1ºA', 0.9, -1.0],
  ['U46', 'P08', '1bed', 46, 1280, 'El Burgo de Ebro', 'Avenida de la Constitución 15, 2ºB', -1.1, 1.3],
  ['U47', 'P08', '2bed', 70, 1600, 'El Burgo de Ebro', 'Calle Goya 4, 1ºC', 1.6, 1.9, PENDING],
  ['U48', 'P08', '3bed', 96, 1850, 'El Burgo de Ebro', 'Calle San Miguel 21', -1.9, -2.2],
  // Fuentes de Ebro
  ['U49', 'P08', 'studio', 29, 790, 'Fuentes de Ebro', 'Calle Mayor 41, 1ºA', 0.5, 0.6],
  ['U50', 'P08', '1bed', 44, 950, 'Fuentes de Ebro', 'Avenida Zaragoza 18, 2ºB', -0.8, -0.9],
  ['U51', 'P08', '2bed', 68, 1250, 'Fuentes de Ebro', 'Calle Aragón 3, 1ºD', 1.2, -1.5],
  // La Cartuja Baja
  ['U52', 'P01', '1bed', 47, 1700, 'La Cartuja Baja', 'Calle Mayor 2, 1ºA', 0.4, -0.6],
  ['U53', 'P01', '2bed', 72, 1700, 'La Cartuja Baja', 'Plaza de la Iglesia 6, 2ºB', -0.6, 0.8],
  // Alagón / Pedrola / Figueruelas — gigafactory area
  ['U54', 'P07', 'studio', 30, 1050, 'Alagón', 'Calle Mayor 52, 1ºA', 0.8, -0.7],
  ['U55', 'P07', '1bed', 46, 1150, 'Alagón', 'Avenida de Zaragoza 31, 2ºC', -1.0, 1.1],
  ['U56', 'P07', '2bed', 71, 1450, 'Alagón', 'Calle Santa Ana 8, 1ºB', 1.5, 1.8],
  ['U57', 'P07', '3bed', 94, 1700, 'Alagón', 'Calle San Antonio 19', -1.6, -1.4],
  ['U58', 'P07', '1bed', 45, 990, 'Pedrola', 'Calle Mayor 12, 1ºA', 0.5, 0.9, PENDING],
  ['U59', 'P07', '2bed', 70, 1380, 'Figueruelas', 'Calle Joaquín Costa 2, 2ºB', -0.6, 0.7],
  // New listing from a provider in onboarding — see verification queue
  ['U60', 'P12', '1bed', 50, 1160, 'Centro', 'Calle Coso 88, 2ºB', 0.5, 2.0, {
    status: 'pending',
    photos: ['ph-U23-a', 'ph-U23-b', 'ph-U23-c'],
    ownerName: 'Javier Ortiz Lahoz',
    title: 'Bright 1-bed by Plaza España — all bills included',
  }],
];

const AMENITIES: Record<UnitType, string[]> = {
  studio: ['Wi-Fi 600 Mb', 'Work desk', 'Washer', 'A/C'],
  '1bed': ['Wi-Fi 600 Mb', 'Work desk', 'Washer', 'A/C', 'Lift'],
  '2bed': ['Wi-Fi 1 Gb', 'Work desk', 'Washer-dryer', 'A/C', 'Lift', 'Dishwasher'],
  '3bed': ['Wi-Fi 1 Gb', 'Two desks', 'Washer-dryer', 'A/C', 'Dishwasher', 'Kids room', 'Storage'],
};

const TYPE_LABEL: Record<UnitType, string> = {
  studio: 'Studio',
  '1bed': '1-bed apartment',
  '2bed': '2-bed apartment',
  '3bed': '3-bed family home',
};

export const UNIT_TYPE_SHORT: Record<UnitType, string> = {
  studio: 'Studio',
  '1bed': '1-bed',
  '2bed': '2-bed',
  '3bed': '3-bed',
};

function build([id, providerId, type, sqm, rent, zone, street, dLat, dLng, extra]: Row): Unit {
  const c = ZONE_CENTROIDS[zone];
  const provider = PROVIDERS.find((p) => p.id === providerId)!;
  const n = Number(id.slice(1));
  const town = ZARAGOZA_ZONES.has(zone) ? 'Zaragoza' : zone;
  return {
    id,
    providerId,
    title: `${TYPE_LABEL[type]} · ${zone}`,
    type,
    sqm,
    rent,
    zone,
    town,
    address: `${street}, ${town}`,
    lat: +(c.lat + dLat / 1000).toFixed(5),
    lng: +(c.lng + dLng / 1000).toFixed(5),
    amenities: [...AMENITIES[type], ...(n % 3 === 0 ? ['Parking'] : []), 'Cleaning fortnightly'],
    availableFrom: DEFAULT_FROM,
    availableTo: DEFAULT_TO,
    photos: [`ph-${id}-a`, `ph-${id}-b`, `ph-${id}-c`],
    ownerName: provider.legalName,
    listingCif: provider.cif,
    status: 'verified' as VerificationStatus,
    ...extra,
  };
}

export const UNITS: Unit[] = ROWS.map(build);
export const FRAUD_UNIT_ID = 'U60';
export const unitById = (id: string) => UNITS.find((u) => u.id === id);
