/**
 * Parse a timestamp returned by the backend.
 *
 * Our DB historically stored `TIMESTAMP` (timezone-naive). Supabase returns
 * those as ISO-like strings WITHOUT a trailing `Z` or offset, e.g.
 *   "2026-05-02T13:00:00"
 * `new Date()` then interprets that as *local* time, which in IST (UTC+5:30)
 * shifts the value 5.5 hours into the past and makes fresh donations look
 * "expired".
 *
 * This helper is robust to both cases — TIMESTAMPTZ (has offset/Z) and plain
 * TIMESTAMP (naive → we treat it as UTC).
 */
export function parseServerDate(input: string | number | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return Number.isFinite(input.getTime()) ? input : null;
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  let s = String(input).trim();
  if (!s) return null;

  // If no timezone designator (Z or ±HH:MM) is present, treat as UTC.
  // We detect an offset at the end of the string.
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(s);
  if (!hasOffset) {
    // Normalize space separator → 'T' (Postgres sometimes returns "2026-05-02 13:00:00")
    s = s.replace(' ', 'T');
    s = `${s}Z`;
  }

  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function timeLeftMs(expiry: string | Date | null | undefined): number {
  const d = parseServerDate(expiry);
  if (!d) return 0;
  return d.getTime() - Date.now();
}

export function formatTimeLeft(expiry: string | Date | null | undefined): {
  text: string;
  expired: boolean;
  urgent: boolean;
} {
  const diff = timeLeftMs(expiry);
  if (diff <= 0) return { text: 'Expired', expired: true, urgent: true };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const text = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  return { text, expired: false, urgent: diff < 3_600_000 };
}

export function formatDateTime(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
): string {
  const d = parseServerDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-IN', opts);
}

export function formatDate(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string {
  const d = parseServerDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', opts);
}

export function formatRelativeTime(value: string | Date | null | undefined): string {
  const d = parseServerDate(value);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const sec = Math.floor(abs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const suffix = diff >= 0 ? 'ago' : 'from now';
  if (sec < 45) return 'just now';
  if (min < 60) return `${min}m ${suffix}`;
  if (hr < 24) return `${hr}h ${suffix}`;
  if (day < 7) return `${day}d ${suffix}`;
  return formatDate(value);
}
