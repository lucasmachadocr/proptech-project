import type { Site } from '../types';

// Project sites per city. Chapter-06 site list not available → placeholders [CONFIRM] (approximate public areas).
export const SITES: Site[] = [
  { id: 'S-MAD', city: 'Madrid', name: 'Data-centre campus · San Fernando de Henares', operator: 'Madrid data-centre site', town: 'San Fernando de Henares', lat: 40.4237, lng: -3.5361 }, // = MADRID_SITE
  { id: 'S-BCN', city: 'Barcelona', name: 'Industrial site · Zona Franca', operator: 'Barcelona Zona Franca site', town: 'Barcelona', lat: 41.3398, lng: 2.131 },
  { id: 'S-VLC', city: 'Valencia', name: 'Battery gigafactory · Parc Sagunt', operator: 'Sagunto gigafactory site', town: 'Sagunto', lat: 39.6455, lng: -0.238 },
  { id: 'S-AGP', city: 'Málaga', name: 'Technology park · Málaga TechPark', operator: 'Málaga TechPark site', town: 'Campanillas', lat: 36.7343, lng: -4.5554 },
  { id: 'S-ZAZ', city: 'Zaragoza', name: 'Data-centre campus · Villanueva de Gállego', operator: 'Zaragoza data-centre site', town: 'Villanueva de Gállego', lat: 41.7688, lng: -0.8262 },
];

export interface Zone {
  city: string;
  town: string;
  lat: number;
  lng: number;
  /** Region asks for a rental registration number on mid-term listings [CONFIRM]. */
  registrationRequired: boolean;
}

// Neighbourhood / town centroids used for seeding and the address check.
export const ZONES: Record<string, Zone> = {
  // Madrid: ring zones around the site, see MADRID_RINGS below (positions computed).
  // Barcelona (Catalonia)
  Sants: { city: 'Barcelona', town: 'Barcelona', lat: 41.375, lng: 2.135, registrationRequired: true },
  "L'Hospitalet": { city: 'Barcelona', town: "L'Hospitalet de Llobregat", lat: 41.36, lng: 2.11, registrationRequired: true },
  'Poble-sec': { city: 'Barcelona', town: 'Barcelona', lat: 41.373, lng: 2.16, registrationRequired: true },
  'El Prat': { city: 'Barcelona', town: 'El Prat de Llobregat', lat: 41.327, lng: 2.095, registrationRequired: true },
  // Valencia (Comunitat Valenciana)
  Sagunto: { city: 'Valencia', town: 'Sagunto', lat: 39.68, lng: -0.278, registrationRequired: true },
  'Puerto de Sagunto': { city: 'Valencia', town: 'Sagunto', lat: 39.66, lng: -0.23, registrationRequired: true },
  Puçol: { city: 'Valencia', town: 'Puçol', lat: 39.617, lng: -0.305, registrationRequired: true },
  "Canet d'en Berenguer": { city: 'Valencia', town: "Canet d'en Berenguer", lat: 39.678, lng: -0.218, registrationRequired: true },
  // Málaga (Andalucía)
  Campanillas: { city: 'Málaga', town: 'Málaga', lat: 36.723, lng: -4.552, registrationRequired: true },
  Teatinos: { city: 'Málaga', town: 'Málaga', lat: 36.72, lng: -4.475, registrationRequired: true },
  Churriana: { city: 'Málaga', town: 'Málaga', lat: 36.668, lng: -4.503, registrationRequired: true },
  'Alhaurín de la Torre': { city: 'Málaga', town: 'Alhaurín de la Torre', lat: 36.662, lng: -4.56, registrationRequired: true },
  // Zaragoza (Aragón)
  'Villanueva de Gállego': { city: 'Zaragoza', town: 'Villanueva de Gállego', lat: 41.7688, lng: -0.8262, registrationRequired: false },
  Zuera: { city: 'Zaragoza', town: 'Zuera', lat: 41.868, lng: -0.789, registrationRequired: false },
  'San Juan de Mozarrifar': { city: 'Zaragoza', town: 'Zaragoza', lat: 41.716, lng: -0.843, registrationRequired: false },
  Actur: { city: 'Zaragoza', town: 'Zaragoza', lat: 41.672, lng: -0.885, registrationRequired: false },
};

// ── Madrid demo geography ────────────────────────────────────────────────
// Apartments sit in three commute rings around the Madrid site so the allocation engine
// produces the three options of the business plan: closest (~12 min), balanced (~22 min),
// lowest cost (~31 min). Each zone is named after the real town in that direction.
export const MADRID_SITE = { lat: 40.4237, lng: -3.5361 };
const KM_PER_DEG = 111.195;
/** Point at `km` from the Madrid site, in the direction of (lat, lng), rotated by `rotDeg`. */
export function madridPoint(toward: { lat: number; lng: number }, km: number, rotDeg = 0) {
  const c = Math.cos((MADRID_SITE.lat * Math.PI) / 180);
  const dx = (toward.lng - MADRID_SITE.lng) * c;
  const dy = toward.lat - MADRID_SITE.lat;
  const a = Math.atan2(dy, dx) + (rotDeg * Math.PI) / 180;
  return { lat: MADRID_SITE.lat + (km * Math.sin(a)) / KM_PER_DEG, lng: MADRID_SITE.lng + (km * Math.cos(a)) / (KM_PER_DEG * c) };
}
/** One-way minutes → straight-line km, inverse of commuteMin in src/ai/geo.ts. */
export const kmForMinutes = (min: number) => ((min / 60) * 50) / 1.3;

export const MADRID_RINGS: Record<string, { ring: 'near' | 'mid' | 'far'; town: string; toward: { lat: number; lng: number } }> = {
  'Torrejón de Ardoz': { ring: 'near', town: 'Torrejón de Ardoz', toward: { lat: 40.4589, lng: -3.4782 } },
  Barajas: { ring: 'near', town: 'Madrid', toward: { lat: 40.4731, lng: -3.5799 } },
  'San Blas': { ring: 'near', town: 'Madrid', toward: { lat: 40.4321, lng: -3.6122 } },
  'Mejorada del Campo': { ring: 'near', town: 'Mejorada del Campo', toward: { lat: 40.3946, lng: -3.4884 } },
  'Alcalá de Henares': { ring: 'mid', town: 'Alcalá de Henares', toward: { lat: 40.4818, lng: -3.3644 } },
  Chamartín: { ring: 'mid', town: 'Madrid', toward: { lat: 40.4722, lng: -3.6797 } },
  Retiro: { ring: 'mid', town: 'Madrid', toward: { lat: 40.4153, lng: -3.6845 } },
  'Arganda del Rey': { ring: 'mid', town: 'Arganda del Rey', toward: { lat: 40.3016, lng: -3.4372 } },
  Getafe: { ring: 'far', town: 'Getafe', toward: { lat: 40.3057, lng: -3.7329 } },
  Carabanchel: { ring: 'far', town: 'Madrid', toward: { lat: 40.383, lng: -3.735 } },
  Alcobendas: { ring: 'far', town: 'Alcobendas', toward: { lat: 40.5475, lng: -3.642 } },
  Villaverde: { ring: 'far', town: 'Madrid', toward: { lat: 40.3456, lng: -3.7096 } },
};
const RING_MIN = { near: 12, mid: 22, far: 31 };
for (const [name, z] of Object.entries(MADRID_RINGS)) {
  ZONES[name] = { city: 'Madrid', town: z.town, ...madridPoint(z.toward, kmForMinutes(RING_MIN[z.ring])), registrationRequired: false };
}

/** Back-compat alias used by the verification engine. */
export const ZONE_CENTROIDS = ZONES;

export const siteById = (id: string) => SITES.find((s) => s.id === id)!;
export const siteForCity = (city: string) => SITES.find((s) => s.city === city)!;
