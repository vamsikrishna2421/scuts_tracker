import { isOverdue, isToday } from './format';
import type { AppData, Interaction, Partner, PipelineStage, Priority, Reminder } from './types';

const priorityRank: Record<Priority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

export function sortReminders(a: Reminder, b: Reminder): number {
  const ao = isOverdue(a.dueDate) && !a.isDone;
  const bo = isOverdue(b.dueDate) && !b.isDone;
  if (ao !== bo) return ao ? -1 : 1;
  const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
  const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
  if (ad !== bd) return ad - bd;
  return priorityRank[b.priority] - priorityRank[a.priority];
}

export const interactionsFor = (data: AppData, partnerId: string): Interaction[] =>
  data.interactions.filter((i) => i.partnerId === partnerId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

export const remindersFor = (data: AppData, partnerId: string): Reminder[] =>
  data.reminders.filter((r) => r.partnerId === partnerId).sort(sortReminders);

export const openReminders = (data: AppData): Reminder[] => data.reminders.filter((r) => !r.isDone).sort(sortReminders);

export const todayFocus = (data: AppData): Reminder[] =>
  openReminders(data).filter((r) => !r.dueDate || isToday(r.dueDate) || isOverdue(r.dueDate));

export const recentInteractions = (data: AppData): Interaction[] =>
  [...data.interactions].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

export const activePartners = (data: AppData): Partner[] => data.partners.filter((p) => p.stage !== 'lost');

export const signedCount = (data: AppData): number => data.partners.filter((p) => p.stage === 'partner').length;

export const overdueCount = (data: AppData): number => openReminders(data).filter((r) => isOverdue(r.dueDate)).length;

export const countForStage = (data: AppData, stage: PipelineStage): number => data.partners.filter((p) => p.stage === stage).length;

export function averageInterest(data: AppData): number {
  const scope = data.partners.filter((p) => p.stage !== 'lost' && p.stage !== 'partner');
  if (!scope.length) return 0;
  return Math.round(scope.reduce((s, p) => s + p.interestScore, 0) / scope.length);
}

export const risingPartners = (data: AppData): Partner[] =>
  data.partners.filter((p) => p.momentum === 'rising' && p.stage !== 'partner' && p.stage !== 'lost').sort((a, b) => b.interestScore - a.interestScore);

export const coolingPartners = (data: AppData): Partner[] =>
  data.partners
    .filter((p) => (p.momentum === 'cooling' || p.momentum === 'stalled') && p.stage !== 'lost' && p.stage !== 'partner')
    .sort((a, b) => a.interestScore - b.interestScore);

export function initials(p: Partner): string {
  const src = p.salonName || p.name;
  const letters = src.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
  return (letters || 'S').toUpperCase();
}

export const displayTitle = (p: Partner): string => p.salonName || p.name;

export function subtitle(p: Partner): string {
  const parts: string[] = [];
  if (p.salonName) parts.push(p.name);
  if (p.location) parts.push(p.location);
  return parts.join(' · ');
}
