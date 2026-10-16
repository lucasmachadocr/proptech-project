import type { Site } from '../types';

// Approximate coordinates of the project areas (public locations, demo use only).
export const SITES: Site[] = [
  {
    id: 'S-MSFT',
    name: 'Data-centre campus · Villanueva de Gállego',
    operator: 'Microsoft campus area',
    town: 'Villanueva de Gállego',
    lat: 41.7688,
    lng: -0.8262,
  },
  {
    id: 'S-AWS',
    name: 'Data-centre campus · El Burgo de Ebro',
    operator: 'AWS campus area',
    town: 'El Burgo de Ebro',
    lat: 41.5712,
    lng: -0.7431,
  },
  {
    id: 'S-GIGA',
    name: 'Battery gigafactory · Figueruelas',
    operator: 'Stellantis-CATL area',
    town: 'Figueruelas',
    lat: 41.7655,
    lng: -1.1712,
  },
];

// Town / neighbourhood centroids used by the address-match check.
export const ZONE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'Villanueva de Gállego': { lat: 41.7688, lng: -0.8262 },
  Zuera: { lat: 41.868, lng: -0.789 },
  'San Juan de Mozarrifar': { lat: 41.716, lng: -0.843 },
  Actur: { lat: 41.672, lng: -0.885 },
  Centro: { lat: 41.651, lng: -0.882 },
  Universidad: { lat: 41.642, lng: -0.902 },
  Delicias: { lat: 41.648, lng: -0.912 },
  'Puerto Venecia': { lat: 41.613, lng: -0.873 },
  Utebo: { lat: 41.712, lng: -0.996 },
  Casetas: { lat: 41.72, lng: -1.015 },
  'El Burgo de Ebro': { lat: 41.5712, lng: -0.7431 },
  'Fuentes de Ebro': { lat: 41.512, lng: -0.633 },
  'La Cartuja Baja': { lat: 41.596, lng: -0.828 },
  Alagón: { lat: 41.769, lng: -1.119 },
  Pedrola: { lat: 41.79, lng: -1.214 },
  Figueruelas: { lat: 41.766, lng: -1.173 },
};

export const siteById = (id: string) => SITES.find((s) => s.id === id)!;
