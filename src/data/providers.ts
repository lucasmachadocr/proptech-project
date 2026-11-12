import type { Provider } from '../types';

// Fictional professional operators (demo data). "Provider" in code = "operator" in the UI.
const p = (id: string, name: string, legalName: string, cif: string, city: string, joined: string, extra: Partial<Provider> = {}): Provider => ({
  id,
  name,
  legalName,
  cif,
  registryName: legalName,
  contact: `ops@${name.toLowerCase().replace(/[^a-z]/g, '')}.example`,
  city,
  status: 'verified',
  joined,
  kycVerified: true,
  ...extra,
});

export const PROVIDERS: Provider[] = [
  p('P01', 'Henares Living', 'Henares Living Residencial S.L.', 'B87120341', 'Madrid', '2026-06-02'),
  p('P02', 'Castellana Corporate Flats', 'Castellana Corporate Flats S.L.', 'B87344512', 'Madrid', '2026-06-10'),
  p('P03', 'Barajas Stay', 'Barajas Stay Gestión S.L.', 'B88015673', 'Madrid', '2026-07-01'),
  p('P04', 'Llobregat Apartments', 'Llobregat Apartments S.L.', 'B67220984', 'Barcelona', '2026-06-15'),
  p('P05', 'Montjuïc Homes', 'Montjuïc Homes S.L.', 'B67451230', 'Barcelona', '2026-07-04'),
  p('P06', 'Camp de Morvedre Flats', 'Camp de Morvedre Flats S.L.', 'B98774561', 'Valencia', '2026-07-11'),
  p('P07', 'Costa Azahar Living', 'Costa Azahar Living S.L.', 'B98654302', 'Valencia', '2026-07-20'),
  p('P08', 'Guadalhorce Stay', 'Guadalhorce Stay S.L.', 'B93441207', 'Málaga', '2026-08-03'),
  p('P09', 'Teatinos Residences', 'Teatinos Residences S.L.', 'B93528816', 'Málaga', '2026-08-09'),
  p('P10', 'Gállego Homes', 'Gállego Homes Gestión S.L.', 'B99420187', 'Zaragoza', '2026-07-01'),
  p('P11', 'Actur Stay', 'Actur Stay Residencial S.L.', 'B50655098', 'Zaragoza', '2026-07-04'),
  p('P12', 'Prime Stay Madrid', 'Prime Stay Madrid S.L.', 'B88733015', 'Madrid', '2026-10-12', { status: 'pending', kycVerified: false }),
];

/** Live mode: flats come from a public marketplace; the operator behind each listing is not known yet. */
export const PUBLIC_SOURCE: Provider = { ...p('SPOTAHOME', 'Spotahome (public listing)', 'Operator not yet onboarded', '—', 'Madrid', '2026-11-12'), status: 'pending', kycVerified: false };

export const providerById = (id: string) => PROVIDERS.find((x) => x.id === id) ?? PUBLIC_SOURCE;
