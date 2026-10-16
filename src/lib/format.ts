const eur0 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const eur = (n: number) => eur0.format(Math.round(n));
export const eurCents = (n: number) => eur2.format(n);
export const signedEur = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + eur0.format(Math.abs(Math.round(n)));
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const mins = (n: number) => `${Math.round(n)} min`;
