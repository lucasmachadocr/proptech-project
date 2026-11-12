// Map style for the 3D map: OpenFreeMap "Positron" (OpenStreetMap data, free, no key), recoloured to the brand,
// with 3D buildings. Same look as the experience film.
import type { StyleSpecification } from 'maplibre-gl';

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

let cached: Promise<StyleSpecification> | null = null;

export function brandStyle(): Promise<StyleSpecification> {
  cached ??= (async () => {
    const style = (await (await fetch(STYLE_URL)).json()) as StyleSpecification;
    const keepLabels = new Set(['label_city', 'label_city_capital', 'label_town', 'label_village', 'label_other', 'highway-name-major', 'highway-name-minor']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layers = style.layers as any[];
    for (const l of layers) {
      l.paint ??= {};
      if (l.id === 'background') l.paint['background-color'] = '#F3ECE5';
      else if (l.id === 'water') l.paint['fill-color'] = '#D8E1E3';
      else if (l.id === 'park' || l.id === 'landcover_wood') l.paint['fill-color'] = '#E4E5D6';
      else if (l.id === 'landuse_residential') l.paint['fill-color'] = '#EEE5DD';
      else if (l.id === 'building') l.paint['fill-color'] = '#E8DED5';
      else if (l.type === 'line' && l.id.startsWith('boundary')) l.paint['line-color'] = '#C9BBB0';
      else if (l.type === 'line' && l.id.includes('casing')) l.paint['line-color'] = '#E0D4CA';
      else if (l.type === 'line' && l.id.includes('rail')) l.paint['line-color'] = '#DCCFC5';
      else if (l.type === 'line' && l['source-layer'] === 'transportation') l.paint['line-color'] = '#FFFFFF';
      if (l.type === 'symbol') {
        if (!keepLabels.has(l.id)) l.layout = { ...(l.layout ?? {}), visibility: 'none' };
        else {
          l.paint['text-color'] = '#8C7D75';
          l.paint['text-halo-color'] = '#F3ECE5';
        }
      }
    }
    layers.splice(layers.findIndex((l) => l.id === 'building') + 1, 0, {
      id: 'bld3d',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': '#E3D8CE',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.9,
      },
    });
    return style;
  })();
  cached.catch(() => (cached = null));
  return cached;
}
