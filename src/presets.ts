import { AgentRole, ClaudeModelId, DEFAULT_MODELS } from './types';

export type PresetId = 'best' | 'balanced' | 'economy';

export const PRESETS: { id: PresetId; label: string; detail: string }[] = [
  { id: 'best', label: 'Best quality', detail: 'Opus everywhere — sharpest output, highest cost.' },
  { id: 'balanced', label: 'Balanced', detail: 'Opus for strategy & chat, Sonnet/Haiku elsewhere.' },
  { id: 'economy', label: 'Economy', detail: 'Haiku & Sonnet only — fastest and cheapest.' },
];

export function presetModels(p: PresetId): Record<AgentRole, ClaudeModelId> {
  if (p === 'best') {
    return { summarizer: 'claude-opus-4-8', sentiment: 'claude-opus-4-8', strategist: 'claude-opus-4-8', followUp: 'claude-opus-4-8', insight: 'claude-opus-4-8', chat: 'claude-opus-4-8' };
  }
  if (p === 'economy') {
    return { summarizer: 'claude-haiku-4-5', sentiment: 'claude-haiku-4-5', strategist: 'claude-sonnet-4-6', followUp: 'claude-haiku-4-5', insight: 'claude-haiku-4-5', chat: 'claude-sonnet-4-6' };
  }
  return { ...DEFAULT_MODELS };
}

export function matchedPreset(models: Record<AgentRole, ClaudeModelId>): PresetId | null {
  for (const p of PRESETS) {
    const m = presetModels(p.id);
    if ((Object.keys(m) as AgentRole[]).every((r) => m[r] === models[r])) return p.id;
  }
  return null;
}
