export function formatCurrency(cents: number, currencyCode = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatPercentFromBps(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

export function asArray(value: FormDataEntryValue | null) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
