export type PipelineStage =
  | 'prospect' | 'contacted' | 'interested' | 'negotiating' | 'partner' | 'onHold' | 'lost';
export type Momentum = 'rising' | 'steady' | 'cooling' | 'stalled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderType = 'followUp' | 'prepare' | 'objection' | 'milestone' | 'nudge';
export type InteractionSource = 'voice' | 'text';
export type ProcessingState =
  | 'queued' | 'summarizing' | 'analyzing' | 'strategizing' | 'planning' | 'completed' | 'failed';
export type AgentRole = 'summarizer' | 'sentiment' | 'strategist' | 'followUp' | 'insight' | 'chat';
export type ClaudeModelId = 'claude-opus-4-8' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';

export interface SentimentAnalysis {
  interestScore: number;
  momentum: Momentum;
  suggestedStage?: PipelineStage;
  headline: string;
  buyingSignals: string[];
  concerns: string[];
  createdAt: string;
}

export interface ObjectionHandler { objection: string; response: string; }

export interface Strategy {
  headline: string;
  approach: string;
  talkingPoints: string[];
  valueProps: string[];
  objectionHandlers: ObjectionHandler[];
  nextBestAction: string;
  createdAt: string;
}

export interface FollowUpPlan {
  nextFollowUpAt: string;
  cadenceDays: number;
  channel: string;
  focusPoints: string[];
  rationale: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  salonName: string;
  location: string;
  phone: string;
  email: string;
  stage: PipelineStage;
  interestScore: number;
  momentum: Momentum;
  tags: string[];
  notes: string;
  createdAt: string;
  addedBy?: string;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  latestSentiment?: SentimentAnalysis;
  latestStrategy?: Strategy;
  latestFollowUp?: FollowUpPlan;
}

export interface Interaction {
  id: string;
  partnerId: string;
  createdAt: string;
  source: InteractionSource;
  rawText: string;
  summary: string;
  keyPoints: string[];
  commitments: string[];
  objections: string[];
  sentiment?: SentimentAnalysis;
  processingState: ProcessingState;
  errorMessage?: string;
  addedBy?: string;
}

export interface Reminder {
  id: string;
  partnerId?: string;
  partnerName: string;
  title: string;
  detail: string;
  dueDate?: string;
  priority: Priority;
  type: ReminderType;
  isDone: boolean;
  isAuto: boolean;
  createdAt: string;
  addedBy?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface Founder { id: string; name: string; role: string; }
export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  addedBy?: string;
  /** Original uploaded file, mirrored to Supabase Storage so every device can open it. */
  fileName?: string;
  filePath?: string;
  mimeType?: string;
}

/** One salon's monthly financials (from the imported profit breakdown). */
export interface SalonFinance {
  id: string;             // `${period}::${normalizedSalon}` — stable so re-imports update in place
  period: string;         // 'YYYY-MM'
  salon: string;
  bookings: number;
  paidValue: number;      // what customers paid through Scuts
  actualBillValue: number;
  inventoryCost: number;
  margin: number;
  pgCharges: number;
  profitBeforeTax: number;
  gst: number;
  tcs: number;
  netProfit: number;
  addedBy?: string;
  createdAt: string;
}

export interface CompanyProfile {
  name: string;
  tagline: string;
  about: string;
  valueProps: string[];
  differentiators: string[];
  pricingNotes: string;
  targetCustomer: string;
  founders: Founder[];
}

export interface Settings {
  onboardingComplete: boolean;
  company: CompanyProfile;
  knowledge: KnowledgeDoc[];
  models: Record<AgentRole, ClaudeModelId>;
  autoRun: boolean;
  notifications: boolean;
  defaultCadenceDays: number;
}

export interface AppData {
  partners: Partner[];
  interactions: Interaction[];
  reminders: Reminder[];
  chat: ChatMessage[];
  finances: SalonFinance[];
}

export const AGENT_ROLES: AgentRole[] = ['summarizer', 'sentiment', 'strategist', 'followUp', 'insight', 'chat'];

export const DEFAULT_MODELS: Record<AgentRole, ClaudeModelId> = {
  summarizer: 'claude-haiku-4-5',
  sentiment: 'claude-sonnet-4-6',
  strategist: 'claude-opus-4-8',
  followUp: 'claude-sonnet-4-6',
  insight: 'claude-sonnet-4-6',
  chat: 'claude-opus-4-8',
};

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${idCounter}`;
}

export function defaultCompany(): CompanyProfile {
  return {
    name: 'Scuts',
    tagline: 'A better salon experience — transparent, reviewed, fairly priced.',
    about:
      'Scuts is a salon service provider that partners with local salons to give customers a better ' +
      'experience: transparency, genuine reviews and ratings, and better pricing. We bring salons more ' +
      'discoverability and footfall while raising the quality bar for customers.',
    valueProps: [
      'More customers and visibility for the salon',
      'Transparent pricing that builds customer trust',
      'Verified reviews & ratings that reward good work',
      'A simple way to manage bookings and reputation',
    ],
    differentiators: [
      'Transparency-first: no hidden charges',
      'Real, verified customer reviews',
      'Fairer, clearer pricing than walk-in norms',
      'Local-salon focused, not a faceless chain',
    ],
    pricingNotes:
      'Position Scuts as added revenue and reputation, not a cost. Emphasize incremental customers over commission.',
    targetCustomer:
      'Independent and local salon owners who want more customers, better reputation, and fair, transparent pricing.',
    founders: [
      { id: newId(), name: 'Abhishek', role: 'Co-founder' },
      { id: newId(), name: 'Pavan Kalyan', role: 'Co-founder' },
    ],
  };
}

export function defaultSettings(): Settings {
  return {
    onboardingComplete: false,
    company: defaultCompany(),
    knowledge: [],
    models: { ...DEFAULT_MODELS },
    autoRun: true,
    notifications: true,
    defaultCadenceDays: 5,
  };
}
