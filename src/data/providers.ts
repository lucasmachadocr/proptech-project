import type { Provider } from '../types';

// Fictional professional operators (demo data).
export const PROVIDERS: Provider[] = [
  { id: 'P01', name: 'Ebro Living', legalName: 'Ebro Living Residencias S.L.', cif: 'B50912341', registryName: 'Ebro Living Residencias S.L.', contact: 'ops@ebroliving.example', city: 'Zaragoza', status: 'verified', joined: '2026-06-02' },
  { id: 'P02', name: 'Aragón Corporate Flats', legalName: 'Aragón Corporate Flats S.L.', cif: 'B50873312', registryName: 'Aragón Corporate Flats S.L.', contact: 'hello@acflats.example', city: 'Zaragoza', status: 'verified', joined: '2026-06-10' },
  { id: 'P03', name: 'Pilar Serviced Apartments', legalName: 'Pilar Apartamentos Servicios S.L.', cif: 'B50761223', registryName: 'Pilar Apartamentos Servicios S.L.', contact: 'reservas@pilarsa.example', city: 'Zaragoza', status: 'verified', joined: '2026-06-15' },
  { id: 'P04', name: 'Gállego Homes', legalName: 'Gállego Homes Gestión S.L.', cif: 'B99420187', registryName: 'Gállego Homes Gestión S.L.', contact: 'info@gallegohomes.example', city: 'Villanueva de Gállego', status: 'verified', joined: '2026-07-01' },
  { id: 'P05', name: 'Actur Stay', legalName: 'Actur Stay Residencial S.L.', cif: 'B50655098', registryName: 'Actur Stay Residencial S.L.', contact: 'stay@actur.example', city: 'Zaragoza', status: 'verified', joined: '2026-07-04' },
  { id: 'P06', name: 'Delicias Rentals', legalName: 'Delicias Rentals S.L.', cif: 'B50598874', registryName: 'Delicias Rentals S.L.', contact: 'team@deliciasrentals.example', city: 'Zaragoza', status: 'verified', joined: '2026-07-11' },
  { id: 'P07', name: 'Ribera Alta Housing', legalName: 'Ribera Alta Vivienda S.L.', cif: 'B99511460', registryName: 'Ribera Alta Vivienda S.L.', contact: 'alquiler@riberaalta.example', city: 'Alagón', status: 'verified', joined: '2026-07-20' },
  { id: 'P08', name: 'Burgo Residencial', legalName: 'Burgo Residencial Ebro S.L.', cif: 'B99387745', registryName: 'Burgo Residencial Ebro S.L.', contact: 'gestion@burgores.example', city: 'El Burgo de Ebro', status: 'verified', joined: '2026-08-03' },
  { id: 'P09', name: 'Casco Viejo Suites', legalName: 'Casco Viejo Suites S.L.', cif: 'B50433906', registryName: 'Casco Viejo Suites S.L.', contact: 'suites@cascoviejo.example', city: 'Zaragoza', status: 'verified', joined: '2026-08-09' },
  { id: 'P10', name: 'Utebo Business Flats', legalName: 'Utebo Business Flats S.L.', cif: 'B99602231', registryName: 'Utebo Business Flats S.L.', contact: 'flats@utebobf.example', city: 'Utebo', status: 'verified', joined: '2026-08-21' },
  { id: 'P11', name: 'Moncayo Property Mgmt', legalName: 'Moncayo Property Management S.L.', cif: 'B50387719', registryName: 'Moncayo Property Management S.L.', contact: 'pm@moncayo.example', city: 'Zaragoza', status: 'verified', joined: '2026-09-02' },
  { id: 'P12', name: 'Prime Stay Zaragoza', legalName: 'Prime Stay Zaragoza S.L.', cif: 'B99733015', registryName: 'Prime Stay Zaragoza S.L.', contact: 'primestay.zgz@mail.example', city: 'Zaragoza', status: 'pending', joined: '2026-10-12' },
];

export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id)!;
