import type {
  AgentRole,
  ClaudeModelId,
  Momentum,
  PipelineStage,
  Priority,
  ReminderType,
} from './types';

// MARK: Palette
export const C = {
  bg: '#F1F2F8',
  card: '#FFFFFF',
  elevated: '#F6F7FC',
  border: '#E6E8F1',
  text: '#15161B',
  textDim: '#6A6E7D',
  textFaint: '#9AA0B0',

  indigo: '#5C50DC',
  indigoSoft: '#ECEAFB',
  violet: '#8C5CEB',
  pink: '#ED66AE',
  amber: '#FAB23A',
  teal: '#1FBDAB',

  positive: '#2EB56B',
  caution: '#EE9A1C',
  negative: '#E54D4D',
  neutral: '#9AA0B0',

  white: '#FFFFFF',
};

export const R = { card: 22, control: 14, pill: 999 };
export const S = { screen: 18, gap: 14, tight: 8 };

export const shadow = {
  shadowColor: '#1A1B2E',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

// MARK: Domain metadata
export function stageMeta(stage: PipelineStage): { label: string; color: string; icon: string } {
  switch (stage) {
    case 'prospect': return { label: 'Prospect', color: C.neutral, icon: 'search' };
    case 'contacted': return { label: 'Contacted', color: C.indigo, icon: 'hand-left' };
    case 'interested': return { label: 'Interested', color: C.teal, icon: 'heart' };
    case 'negotiating': return { label: 'Negotiating', color: C.amber, icon: 'swap-horizontal' };
    case 'partner': return { label: 'Partner', color: C.positive, icon: 'ribbon' };
    case 'onHold': return { label: 'On hold', color: C.caution, icon: 'pause-circle' };
    case 'lost': return { label: 'Lost', color: C.negative, icon: 'close-circle' };
  }
}

export const ACTIVE_STAGES: PipelineStage[] = ['prospect', 'contacted', 'interested', 'negotiating', 'partner'];
export const ALL_STAGES: PipelineStage[] = ['prospect', 'contacted', 'interested', 'negotiating', 'partner', 'onHold', 'lost'];

export function momentumMeta(m: Momentum): { label: string; color: string; icon: string } {
  switch (m) {
    case 'rising': return { label: 'Warming up', color: C.positive, icon: 'trending-up' };
    case 'steady': return { label: 'Steady', color: C.indigo, icon: 'remove' };
    case 'cooling': return { label: 'Cooling', color: C.caution, icon: 'trending-down' };
    case 'stalled': return { label: 'Stalled', color: C.negative, icon: 'pause' };
  }
}

export function priorityMeta(p: Priority): { label: string; color: string } {
  switch (p) {
    case 'low': return { label: 'Low', color: C.neutral };
    case 'medium': return { label: 'Medium', color: C.indigo };
    case 'high': return { label: 'High', color: C.caution };
    case 'urgent': return { label: 'Urgent', color: C.negative };
  }
}

export function reminderTypeMeta(t: ReminderType): { label: string; color: string; icon: string } {
  switch (t) {
    case 'followUp': return { label: 'Follow up', color: C.indigo, icon: 'call' };
    case 'prepare': return { label: 'Prepare', color: C.teal, icon: 'clipboard' };
    case 'objection': return { label: 'Objection', color: C.caution, icon: 'shield-half' };
    case 'milestone': return { label: 'Milestone', color: C.positive, icon: 'flag' };
    case 'nudge': return { label: 'Nudge', color: C.violet, icon: 'notifications' };
  }
}

export function interestColor(score: number): string {
  if (score < 35) return C.negative;
  if (score < 55) return C.caution;
  if (score < 75) return C.teal;
  return C.positive;
}

export function modelMeta(m: ClaudeModelId): { label: string; blurb: string } {
  switch (m) {
    case 'claude-opus-4-8': return { label: 'Opus 4.8', blurb: 'Deepest reasoning — best for strategy & chat' };
    case 'claude-sonnet-4-6': return { label: 'Sonnet 4.6', blurb: 'Balanced speed and intelligence' };
    case 'claude-haiku-4-5': return { label: 'Haiku 4.5', blurb: 'Fastest and most economical' };
  }
}

export const MODELS: ClaudeModelId[] = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'];

export function agentMeta(role: AgentRole): { name: string; blurb: string; icon: string } {
  switch (role) {
    case 'summarizer': return { name: 'Summarizer', blurb: 'Cleans a raw note into a description and key points.', icon: 'document-text' };
    case 'sentiment': return { name: 'Sentiment reader', blurb: 'Reads how interested the owner is and where momentum heads.', icon: 'heart-circle' };
    case 'strategist': return { name: 'Strategist', blurb: 'Designs how to convince the owner and handle objections.', icon: 'bulb' };
    case 'followUp': return { name: 'Follow-up planner', blurb: 'Decides when, how often, and on what points to follow up.', icon: 'calendar' };
    case 'insight': return { name: 'Daily insight', blurb: 'Writes your daily brief across the whole pipeline.', icon: 'sunny' };
    case 'chat': return { name: 'Assistant', blurb: 'Your interactive partner for questions and planning.', icon: 'chatbubbles' };
  }
}
