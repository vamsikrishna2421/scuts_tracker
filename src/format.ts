export const nowISO = (): string => new Date().toISOString();

export function addDaysISO(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function relative(iso?: string): string {
  if (!iso) return '';
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let val: string;
  if (mins < 1) return 'just now';
  if (mins < 60) val = `${mins}m`;
  else if (hours < 24) val = `${hours}h`;
  else if (days < 7) val = `${days}d`;
  else val = `${Math.max(1, Math.round(days / 7))}w`;
  return diffMs < 0 ? `${val} ago` : `in ${val}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function dayTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isOverdue(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < startOfToday();
}

export function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function isTomorrow(iso?: string): boolean {
  if (!iso) return false;
  const n = new Date();
  n.setDate(n.getDate() + 1);
  const d = new Date(iso);
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function dueLabel(iso: string | undefined, overdue: boolean): string {
  if (!iso) return '';
  if (overdue) return `Overdue · ${shortDate(iso)}`;
  if (isToday(iso)) return 'Today';
  if (isTomorrow(iso)) return 'Tomorrow';
  return shortDate(iso);
}
