export function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatPct(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(value?: number | null, digits = 3): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'N/A';
  }
  return value.toFixed(digits);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function bestMetricName(problemType: 'classification' | 'regression'): 'f1_score' | 'r2_score' {
  return problemType === 'classification' ? 'f1_score' : 'r2_score';
}
