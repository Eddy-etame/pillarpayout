export function formatXAF(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  // XAF has no minor units; keep two decimals for UI consistency if needed
  const formatted = Math.abs(safe) >= 1
    ? safe.toLocaleString('fr-CM', { maximumFractionDigits: 0 })
    : safe.toFixed(2);
  return `${formatted} FCFA`;
}

export function parseAmount(input: unknown): number {
  if (typeof input === 'number') return input;
  const parsed = parseFloat(String(input ?? '0').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
