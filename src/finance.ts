import * as FileSystem from 'expo-file-system/legacy';
import { displayTitle } from './select';
import type { Partner, SalonFinance } from './types';

export interface ParsedFinance {
  salon: string;
  bookings: number;
  paidValue: number;
  actualBillValue: number;
  inventoryCost: number;
  margin: number;
  pgCharges: number;
  profitBeforeTax: number;
  gst: number;
  tcs: number;
  netProfit: number;
}

const NUM_FIELDS: (keyof ParsedFinance)[] = [
  'bookings', 'paidValue', 'actualBillValue', 'inventoryCost', 'margin', 'pgCharges', 'profitBeforeTax', 'gst', 'tcs', 'netProfit',
];
const FIELD_BY_HEADER: Record<string, keyof ParsedFinance> = {
  salon: 'salon', bookings: 'bookings', paidvalue: 'paidValue', actualbillvalue: 'actualBillValue',
  inventorycost: 'inventoryCost', margin: 'margin', pgcharges: 'pgCharges',
  profitbeforetax: 'profitBeforeTax', gst: 'gst', tcs: 'tcs', netprofit: 'netProfit',
};
const SKIP_NAMES = new Set(['total', 'grandtotal', 'subtotal', 'comissionbasedsalons', 'commissionbasedsalons']);

const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export const normSalon = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const round2 = (n: number) => Math.round(n * 100) / 100;

function toNumber(x: unknown): number {
  if (x === null || x === undefined) return 0;
  if (typeof x === 'number') return isFinite(x) ? x : 0;
  const n = parseFloat(String(x).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

/** Minimal CSV parser that respects quoted fields (salon names contain commas and pipes). */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Read a picked CSV file into a grid of cells. */
export async function readSheet(uri: string, name: string): Promise<string[][]> {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext && ext !== 'csv' && ext !== 'txt' && ext !== 'tsv') {
    throw new Error('Please export the sheet as CSV and import that. In Numbers: tap ··· → Export → CSV.');
  }
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return parseCSV(text);
}

/** Map a raw grid to salon finance rows: find the header, skip totals/blanks, sum duplicates. */
export function extractFinances(rows: string[][]): ParsedFinance[] {
  const headerIdx = rows.findIndex((r) => r.some((c) => normHeader(String(c ?? '')) === 'salon'));
  if (headerIdx < 0) throw new Error('Couldn’t find a “Salon” column — check the sheet has the standard headers.');
  const header = rows[headerIdx].map((c) => normHeader(String(c ?? '')));
  const col: Partial<Record<keyof ParsedFinance, number>> = {};
  header.forEach((h, i) => { const f = FIELD_BY_HEADER[h]; if (f) col[f] = i; });
  if (col.salon === undefined) throw new Error('No “Salon” column found in the sheet.');

  const agg = new Map<string, ParsedFinance>();
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const raw = rows[r] || [];
    const salon = String(raw[col.salon] ?? '').trim();
    const key = normSalon(salon);
    if (!salon || SKIP_NAMES.has(key) || key.includes('total')) continue;
    let rec = agg.get(key);
    if (!rec) { rec = { salon } as ParsedFinance; NUM_FIELDS.forEach((f) => { (rec as ParsedFinance)[f] = 0 as never; }); agg.set(key, rec); }
    for (const f of NUM_FIELDS) {
      const ci = col[f];
      if (ci !== undefined) (rec[f] as number) = round2((rec[f] as number) + toNumber(raw[ci]));
    }
  }
  return [...agg.values()].filter((r) => !(r.bookings === 0 && r.paidValue === 0 && r.actualBillValue === 0 && r.netProfit === 0));
}

export function buildFinanceRecords(period: string, parsed: ParsedFinance[], createdAt: string): SalonFinance[] {
  return parsed.map((p) => ({ ...p, id: `${period}::${normSalon(p.salon)}`, period, createdAt }));
}

// ── Analytics ──────────────────────────────────────────────────────────────────
export interface FinanceTotals {
  salons: number; bookings: number; paidValue: number; actualBillValue: number; inventoryCost: number; margin: number; netProfit: number;
}
export function totals(records: SalonFinance[]): FinanceTotals {
  const t: FinanceTotals = { salons: records.length, bookings: 0, paidValue: 0, actualBillValue: 0, inventoryCost: 0, margin: 0, netProfit: 0 };
  for (const r of records) {
    t.bookings += r.bookings; t.paidValue += r.paidValue; t.actualBillValue += r.actualBillValue;
    t.inventoryCost += r.inventoryCost; t.margin += r.margin; t.netProfit += r.netProfit;
  }
  return t;
}
export const periodsOf = (f: SalonFinance[]): string[] => [...new Set(f.map((x) => x.period))].sort();
export const forPeriod = (f: SalonFinance[], period: string): SalonFinance[] => f.filter((x) => x.period === period);
export const netMarginPct = (t: FinanceTotals): number => (t.paidValue > 0 ? (t.netProfit / t.paidValue) * 100 : 0);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y || ''}`.trim();
}
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function prevPeriod(period: string): string {
  let [y, m] = period.split('-').map(Number);
  m -= 1; if (m < 1) { m = 12; y -= 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}
/** Best-effort period from a filename like "may_profit_breakdown" or "2026-05". */
export function guessPeriod(filename: string): string {
  const low = filename.toLowerCase();
  const ym = low.match(/(20\d\d)[-_ ]?(0[1-9]|1[0-2])\b/);
  if (ym) return `${ym[1]}-${ym[2]}`;
  const names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const yr = (low.match(/20\d\d/) || [String(new Date().getFullYear())])[0];
  for (let i = 0; i < 12; i++) if (low.includes(names[i])) return `${yr}-${String(i + 1).padStart(2, '0')}`;
  return currentPeriod();
}

/** Match a salon name to an existing partner record (by salon/owner name). */
export function matchPartner(salon: string, partners: Partner[]): Partner | undefined {
  const n = normSalon(salon);
  if (!n) return undefined;
  return partners.find((p) => {
    const a = normSalon(p.salonName || '');
    const b = normSalon(p.name || '');
    const t = normSalon(displayTitle(p));
    return (!!a && (a === n || a.includes(n) || n.includes(a))) || (!!b && b === n) || (!!t && t === n);
  });
}

/** Indian-format currency, e.g. ₹1,14,840. */
export function inr(n: number): string {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString();
  let last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  if (rest) last3 = ',' + last3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-₹' : '₹') + rest + last3;
}
