import { ClaudeError, ClaudeMessage, complete } from './claude';
import { addDaysISO, nowISO, shortDate } from './format';
import { extractJSON } from './json';
import {
  AgentRole,
  ClaudeModelId,
  FollowUpPlan,
  Interaction,
  Momentum,
  Partner,
  PipelineStage,
  Priority,
  Reminder,
  SentimentAnalysis,
  Strategy,
  newId,
} from './types';

export interface AgentConfig {
  apiKey: string;
  models: Record<AgentRole, ClaudeModelId>;
  knowledge: string;
  defaultCadenceDays: number;
}

const pick = (cfg: AgentConfig, role: AgentRole): string => cfg.models[role];

function parse<T>(text: string): T {
  const value = extractJSON<T>(text);
  if (!value) throw new ClaudeError("Couldn't read Claude's structured answer. Try again.");
  return value;
}

// MARK: Summarizer
export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  commitments: string[];
  objections: string[];
}

export async function summarize(rawText: string, partner: Partner, cfg: AgentConfig): Promise<SummaryResult> {
  const system = `You are the note summarizer in Scuts' partnership tracker. A founder just logged a raw, possibly messy voice or text note about a conversation with a salon owner. Turn it into a clean, faithful summary and structured points. Never invent facts that aren't in the note.

${cfg.knowledge}

Respond with ONLY a JSON object, no prose, in this exact shape:
{"summary": string, "key_points": [string], "commitments": [string], "objections": [string]}
- summary: 1–3 tight sentences in plain English.
- commitments: things the founder or owner agreed to do.
- objections: concerns or hesitations the owner raised.`;
  const user = `Salon owner: ${partner.name}${partner.salonName ? ` — ${partner.salonName}` : ''}\nRaw note:\n${rawText}`;
  const text = await complete({ apiKey: cfg.apiKey, model: pick(cfg, 'summarizer'), system, messages: [{ role: 'user', content: user }], maxTokens: 800 });
  const dto = parse<{ summary: string; key_points?: string[]; commitments?: string[]; objections?: string[] }>(text);
  return {
    summary: dto.summary ?? '',
    keyPoints: dto.key_points ?? [],
    commitments: dto.commitments ?? [],
    objections: dto.objections ?? [],
  };
}

// MARK: Sentiment
export async function analyzeSentiment(rawText: string, summary: string, partner: Partner, cfg: AgentConfig): Promise<SentimentAnalysis> {
  const system = `You are the sentiment analyst in Scuts' partnership tracker. Read how interested this salon owner is in partnering with Scuts, and where the relationship is heading. Be realistic and evidence-based, not optimistic by default.

${cfg.knowledge}

Respond with ONLY a JSON object in this exact shape:
{"interest_score": int 0-100, "momentum": "rising"|"steady"|"cooling"|"stalled", "stage": "prospect"|"contacted"|"interested"|"negotiating"|"partner"|"onHold"|"lost", "headline": string (<=140 chars), "buying_signals": [string], "concerns": [string]}`;
  const user = `Salon owner: ${partner.name}${partner.salonName ? ` — ${partner.salonName}` : ''}\nCurrent stage: ${partner.stage}. Previous interest score: ${partner.interestScore}/100.\nLatest note summary: ${summary || rawText}\nRaw note: ${rawText}`;
  const text = await complete({ apiKey: cfg.apiKey, model: pick(cfg, 'sentiment'), system, messages: [{ role: 'user', content: user }], maxTokens: 700 });
  const dto = parse<{ interest_score: number; momentum?: string; stage?: string; headline: string; buying_signals?: string[]; concerns?: string[] }>(text);
  return {
    interestScore: clamp(dto.interest_score),
    momentum: mapMomentum(dto.momentum),
    suggestedStage: mapStage(dto.stage),
    headline: dto.headline ?? '',
    buyingSignals: dto.buying_signals ?? [],
    concerns: dto.concerns ?? [],
    createdAt: nowISO(),
  };
}

// MARK: Strategist
export async function buildStrategy(partner: Partner, sentiment: SentimentAnalysis, history: Interaction[], cfg: AgentConfig): Promise<Strategy> {
  const system = `You are the partnership strategist in Scuts' tracker. Design a practical, respectful, India-local strategy to convince this salon owner to partner with Scuts. Ground everything in the company's real value props and differentiators below. Be specific and actionable — no generic sales fluff.

${cfg.knowledge}

Respond with ONLY a JSON object in this exact shape:
{"headline": string, "approach": string (2-4 sentences), "talking_points": [string], "value_props": [string], "objection_handlers": [{"objection": string, "response": string}], "next_best_action": string}`;
  const recent = history.slice(0, 4).map((i) => `• ${i.summary || i.rawText}`).join('\n');
  const concerns = uniq([...sentiment.concerns, ...history.flatMap((i) => i.objections)]).slice(0, 5).join('; ');
  const user = `Salon owner: ${partner.name}${partner.salonName ? ` — ${partner.salonName}` : ''} in ${partner.location || 'unknown location'}
Stage: ${partner.stage}. Interest: ${sentiment.interestScore}/100. Momentum: ${sentiment.momentum}.
Where they stand: ${sentiment.headline}
Known concerns/objections: ${concerns || 'none noted yet'}
Recent notes:\n${recent || 'none yet'}`;
  const text = await complete({ apiKey: cfg.apiKey, model: pick(cfg, 'strategist'), system, messages: [{ role: 'user', content: user }], maxTokens: 1400 });
  const dto = parse<{ headline: string; approach: string; talking_points?: string[]; value_props?: string[]; objection_handlers?: { objection: string; response: string }[]; next_best_action: string }>(text);
  return {
    headline: dto.headline ?? '',
    approach: dto.approach ?? '',
    talkingPoints: dto.talking_points ?? [],
    valueProps: dto.value_props ?? [],
    objectionHandlers: dto.objection_handlers ?? [],
    nextBestAction: dto.next_best_action ?? '',
    createdAt: nowISO(),
  };
}

// MARK: Follow-up
export async function planFollowUp(partner: Partner, sentiment: SentimentAnalysis, strategy: Strategy, cfg: AgentConfig): Promise<FollowUpPlan> {
  const system = `You are the follow-up planner in Scuts' tracker. Decide exactly when, how often, through which channel, and on what points to follow up with this salon owner. Calibrate cadence to interest and momentum: hot and rising deals get a tight cadence (2-4 days); cooling deals get a gentle, value-adding touch (7-14 days); stalled deals get a low-pressure re-open. Pick concrete focus points the founder should raise next time.

${cfg.knowledge}

Respond with ONLY a JSON object in this exact shape:
{"cadence_days": int, "channel": "Call"|"WhatsApp"|"Visit"|"Email", "focus_points": [string], "rationale": string}`;
  const user = `Salon owner: ${partner.name}. Stage: ${partner.stage}.
Interest: ${sentiment.interestScore}/100. Momentum: ${sentiment.momentum}.
Where they stand: ${sentiment.headline}
Recommended next action: ${strategy.nextBestAction}
Open concerns: ${sentiment.concerns.join('; ')}`;
  const text = await complete({ apiKey: cfg.apiKey, model: pick(cfg, 'followUp'), system, messages: [{ role: 'user', content: user }], maxTokens: 700 });
  const dto = parse<{ cadence_days: number; channel: string; focus_points?: string[]; rationale: string }>(text);
  const cadence = Math.max(1, Math.min(60, Math.round(dto.cadence_days || cfg.defaultCadenceDays)));
  return {
    nextFollowUpAt: addDaysISO(cadence),
    cadenceDays: cadence,
    channel: dto.channel || 'Call',
    focusPoints: dto.focus_points ?? [],
    rationale: dto.rationale ?? '',
    createdAt: nowISO(),
  };
}

// MARK: Daily brief
export async function dailyBrief(snapshot: string, cfg: AgentConfig): Promise<string> {
  const system = `You are the morning briefer for Scuts' founders, Abhishek and Pavan Kalyan. Given a snapshot of their whole salon-partnership pipeline, write a short, specific, motivating brief for today. 4–7 sentences. Name who to prioritize and exactly why, call out anyone cooling or overdue, and end with one clear focus for the day. Warm but crisp. Plain text — no markdown, no headers, no JSON.

${cfg.knowledge}`;
  return complete({ apiKey: cfg.apiKey, model: pick(cfg, 'insight'), system, messages: [{ role: 'user', content: snapshot }], maxTokens: 600 });
}

// MARK: Chat
export async function chatReply(history: ClaudeMessage[], snapshot: string, cfg: AgentConfig): Promise<string> {
  const system = `You are Scuts' in-app assistant for the founders, Abhishek and Pavan Kalyan. You help them grow salon partnerships: strategize, prep for specific conversations, handle objections, and decide what to prioritize. Be practical, specific and concise — give them something they can act on. Use the company knowledge and live pipeline snapshot below. If they ask about a specific salon owner, use what the snapshot says about that person.

${cfg.knowledge}

CURRENT PIPELINE SNAPSHOT:
${snapshot}`;
  return complete({ apiKey: cfg.apiKey, model: pick(cfg, 'chat'), system, messages: history, maxTokens: 1400 });
}

// MARK: Snapshot
export function pipelineSnapshot(partners: Partner[], focus: Reminder[]): string {
  const lines: string[] = [];
  const active = partners.filter((p) => p.stage !== 'lost').sort((a, b) => b.interestScore - a.interestScore);
  const signed = partners.filter((p) => p.stage === 'partner').length;
  lines.push(`Partners (${partners.length} total, ${signed} signed):`);
  for (const p of active.slice(0, 20)) {
    let row = `• ${p.salonName || p.name} — ${p.stage}, interest ${p.interestScore}/100, ${p.momentum}`;
    if (p.nextFollowUpAt) {
      const overdue = new Date(p.nextFollowUpAt).getTime() < Date.now();
      row += `, next follow-up ${shortDate(p.nextFollowUpAt)}${overdue ? ' (OVERDUE)' : ''}`;
    }
    if (p.latestSentiment?.headline) row += `. ${p.latestSentiment.headline}`;
    lines.push(row);
  }
  if (focus.length) {
    lines.push('');
    lines.push("Today's focus points:");
    for (const r of focus.slice(0, 12)) {
      lines.push(`• ${r.title}${r.partnerName ? ` (${r.partnerName})` : ''}`);
    }
  }
  return lines.join('\n');
}

// MARK: Reminder generation
export function makeReminders(partner: Partner, sentiment: SentimentAnalysis, strategy: Strategy, followUp: FollowUpPlan): Reminder[] {
  const reminders: Reminder[] = [];
  const priority: Priority =
    sentiment.momentum === 'cooling' && sentiment.interestScore >= 50
      ? 'high'
      : sentiment.interestScore >= 65
      ? 'high'
      : sentiment.interestScore >= 40
      ? 'medium'
      : 'low';

  const focusDetail = followUp.focusPoints.length
    ? followUp.focusPoints.map((p) => `• ${p}`).join('\n')
    : strategy.nextBestAction;

  reminders.push({
    id: newId(),
    partnerId: partner.id,
    partnerName: partner.salonName || partner.name,
    title: `${followUp.channel} ${partner.name}: ${strategy.headline}`,
    detail: focusDetail,
    dueDate: followUp.nextFollowUpAt,
    priority,
    type: 'followUp',
    isDone: false,
    isAuto: true,
    createdAt: nowISO(),
  });

  const firstObjection = strategy.objectionHandlers[0];
  if (firstObjection) {
    reminders.push({
      id: newId(),
      partnerId: partner.id,
      partnerName: partner.salonName || partner.name,
      title: `Be ready for: ${firstObjection.objection}`,
      detail: firstObjection.response,
      dueDate: addDaysISO(-1, new Date(followUp.nextFollowUpAt)),
      priority: 'medium',
      type: 'objection',
      isDone: false,
      isAuto: true,
      createdAt: nowISO(),
    });
  }
  return reminders;
}

// MARK: helpers
function clamp(n: number): number {
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function mapMomentum(s?: string): Momentum {
  switch ((s ?? '').toLowerCase()) {
    case 'rising': case 'warming': case 'up': case 'improving': return 'rising';
    case 'cooling': case 'down': case 'declining': return 'cooling';
    case 'stalled': case 'stuck': case 'flat': case 'dead': return 'stalled';
    default: return 'steady';
  }
}

function mapStage(s?: string): PipelineStage | undefined {
  switch ((s ?? '').toLowerCase()) {
    case 'prospect': return 'prospect';
    case 'contacted': return 'contacted';
    case 'interested': return 'interested';
    case 'negotiating': case 'negotiation': return 'negotiating';
    case 'partner': case 'signed': case 'won': case 'closed': case 'active': return 'partner';
    case 'onhold': case 'on hold': case 'on_hold': case 'hold': case 'paused': return 'onHold';
    case 'lost': case 'dead': case 'no': return 'lost';
    default: return undefined;
  }
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
