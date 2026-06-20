import { addDaysISO, nowISO } from './format';
import { AppData, FollowUpPlan, Interaction, Partner, Reminder, SentimentAnalysis, Strategy, newId } from './types';

const d = (n: number) => addDaysISO(n);

export function makeSeed(): AppData {
  const partners: Partner[] = [];
  const interactions: Interaction[] = [];
  const reminders: Reminder[] = [];

  // 1 — Warm, negotiating
  const rohitSentiment: SentimentAnalysis = {
    interestScore: 78, momentum: 'rising', suggestedStage: 'negotiating',
    headline: 'Keen on more footfall, weighing the commission split.',
    buyingSignals: ['Asked how soon he’d see new customers', 'Liked the verified-reviews idea'],
    concerns: ['Worried about commission eating into margins'], createdAt: d(-2),
  };
  const rohitStrategy: Strategy = {
    headline: 'Anchor on incremental revenue, not commission',
    approach: 'Frame Scuts as net-new customers he wouldn’t otherwise get. Reframe the commission as a marketing cost with guaranteed reach.',
    talkingPoints: ['Show a 3-month footfall projection', 'Highlight verified reviews lifting his rating', 'Offer a low-risk trial month'],
    valueProps: ['More repeat customers', 'Higher Google rating via verified reviews'],
    objectionHandlers: [{ objection: 'Commission cuts my margin', response: 'These are customers you wouldn’t have had — the commission only applies to incremental bookings, so it’s upside, not a cut.' }],
    nextBestAction: 'Send the footfall projection and propose a trial month on the next call.', createdAt: d(-2),
  };
  const rohitFollow: FollowUpPlan = {
    nextFollowUpAt: d(2), cadenceDays: 3, channel: 'Call',
    focusPoints: ['Walk through the footfall projection', 'Pin down trial-month terms'],
    rationale: 'He’s warm and close — keep a tight 3-day cadence so momentum doesn’t cool.', createdAt: d(-2),
  };
  const rohit: Partner = {
    id: newId(), name: 'Rohit Verma', salonName: "Verma's Gents Salon", location: 'Madhapur, Hyderabad',
    phone: '+91 98480 11223', email: 'rohit.verma@example.com', stage: 'negotiating', interestScore: 78,
    momentum: 'rising', tags: ['High footfall', 'Owner-operated'], notes: 'Cares about repeat customers and his Google rating.',
    createdAt: d(-21), lastContactAt: d(-2), nextFollowUpAt: d(2),
    latestSentiment: rohitSentiment, latestStrategy: rohitStrategy, latestFollowUp: rohitFollow,
  };
  partners.push(rohit);
  interactions.push({
    id: newId(), partnerId: rohit.id, createdAt: d(-2), source: 'voice',
    rawText: 'Met Rohit at his salon. He’s interested, asked how quickly he’d get new customers and was happy about the reviews thing, but he’s nervous about the commission.',
    summary: 'Met Rohit in person. Genuinely interested — focused on speed of new customers and liked verified reviews. Main hesitation is commission impact on margins.',
    keyPoints: ['Interested in new customer volume', 'Liked verified reviews', 'Nervous about commission'],
    commitments: ['Send footfall projection'], objections: ['Commission impact on margins'],
    sentiment: rohitSentiment, processingState: 'completed',
  });
  reminders.push({ id: newId(), partnerId: rohit.id, partnerName: "Verma's Gents Salon", title: 'Call Rohit with the footfall projection', detail: 'Anchor on incremental revenue and propose a trial month.', dueDate: d(2), priority: 'high', type: 'followUp', isDone: false, isAuto: true, createdAt: nowISO() });
  reminders.push({ id: newId(), partnerId: rohit.id, partnerName: "Verma's Gents Salon", title: 'Prepare 3-month footfall projection', detail: 'He needs to see the upside in numbers before committing.', dueDate: d(1), priority: 'high', type: 'prepare', isDone: false, isAuto: true, createdAt: nowISO() });

  // 2 — Cooling, needs nurturing
  const sahanaSentiment: SentimentAnalysis = {
    interestScore: 54, momentum: 'cooling', suggestedStage: 'interested',
    headline: 'Likes the idea but went quiet — worried Scuts dilutes her premium brand.',
    buyingSignals: ['Initially liked the reviews angle'], concerns: ['Brand dilution', 'Discount-seeking customers'], createdAt: d(-9),
  };
  const sahana: Partner = {
    id: newId(), name: 'Sahana Reddy', salonName: 'Glow Studio', location: 'Indiranagar, Bangalore',
    phone: '+91 90080 44556', email: 'sahana@glowstudio.example', stage: 'interested', interestScore: 54,
    momentum: 'cooling', tags: ['Premium', 'Instagram-driven'], notes: 'Runs a premium studio; protective of her brand image.',
    createdAt: d(-30), lastContactAt: d(-9), nextFollowUpAt: d(-1),
    latestSentiment: sahanaSentiment,
    latestStrategy: {
      headline: 'Protect and elevate her premium positioning',
      approach: 'Reassure her that Scuts curates and showcases quality. Position reviews as proof of premium, and emphasize control over how she’s listed.',
      talkingPoints: ['Show premium salons already on Scuts', 'Explain listing controls', 'Frame reviews as premium proof'],
      valueProps: ['Premium discovery, not discount-hunting', 'Reputation reinforcement'],
      objectionHandlers: [{ objection: 'It’ll bring discount-seekers', response: 'Scuts surfaces you to customers who filter for quality and reviews — your rating becomes the filter, attracting the right clientele.' }],
      nextBestAction: 'Share 2–3 premium salon examples and re-open the conversation gently.', createdAt: d(-9),
    },
    latestFollowUp: { nextFollowUpAt: d(-1), cadenceDays: 7, channel: 'WhatsApp', focusPoints: ['Send premium salon examples', 'Reassure on brand control'], rationale: 'She’s cooling — a low-pressure WhatsApp with proof points re-warms without pushing.', createdAt: d(-9) },
  };
  partners.push(sahana);
  interactions.push({
    id: newId(), partnerId: sahana.id, createdAt: d(-9), source: 'text',
    rawText: 'Sahana hasn’t replied to my last two messages. Last time she said she’s worried Scuts will bring discount customers and hurt her premium image.',
    summary: 'Sahana has gone quiet after raising concerns that Scuts would attract discount-seeking customers and dilute her premium brand.',
    keyPoints: ['Unresponsive recently', 'Premium brand protection is key'], commitments: [], objections: ['Brand dilution', 'Discount-seeking customers'],
    sentiment: sahanaSentiment, processingState: 'completed',
  });
  reminders.push({ id: newId(), partnerId: sahana.id, partnerName: 'Glow Studio', title: 'Re-warm Sahana on WhatsApp', detail: 'Send 2–3 premium salon examples and reassure on brand control.', dueDate: d(-1), priority: 'high', type: 'objection', isDone: false, isAuto: true, createdAt: nowISO() });

  // 3 — Fresh prospect
  const imranSentiment: SentimentAnalysis = {
    interestScore: 45, momentum: 'steady', suggestedStage: 'contacted',
    headline: 'Curious but uncommitted — needs a proper first pitch.',
    buyingSignals: ['Agreed to a follow-up meeting'], concerns: ['Doesn’t fully understand the model yet'], createdAt: d(-4),
  };
  const imran: Partner = {
    id: newId(), name: 'Imran Khan', salonName: 'Sharp Cuts', location: 'Banjara Hills, Hyderabad',
    phone: '+91 99490 77889', email: '', stage: 'contacted', interestScore: 45, momentum: 'steady',
    tags: ['New lead'], notes: 'Introduced by Rohit. Haven’t pitched fully yet.',
    createdAt: d(-4), lastContactAt: d(-4), nextFollowUpAt: d(3), latestSentiment: imranSentiment,
  };
  partners.push(imran);
  interactions.push({
    id: newId(), partnerId: imran.id, createdAt: d(-4), source: 'voice',
    rawText: 'Quick intro call with Imran, referred by Rohit. He was friendly, agreed to meet next week but doesn’t really get what Scuts does yet.',
    summary: 'Friendly intro call with Imran (referred by Rohit). Agreed to a meeting next week but doesn’t yet understand the Scuts model.',
    keyPoints: ['Referred by Rohit', 'Agreed to a follow-up meeting', 'Needs the core pitch'], commitments: ['Meet next week'], objections: [],
    sentiment: imranSentiment, processingState: 'completed',
  });
  reminders.push({ id: newId(), partnerId: imran.id, partnerName: 'Sharp Cuts', title: 'Pitch Scuts properly to Imran', detail: 'Lead with the customer-discovery and reviews story; he’s a warm referral.', dueDate: d(3), priority: 'medium', type: 'prepare', isDone: false, isAuto: true, createdAt: nowISO() });

  // 4 — Signed partner
  const meena: Partner = {
    id: newId(), name: 'Meena Joshi', salonName: 'Style Hub', location: 'Kothrud, Pune',
    phone: '+91 70123 99887', email: '', stage: 'partner', interestScore: 92, momentum: 'steady',
    tags: ['Signed', 'Advocate'], notes: 'Live on Scuts. Happy — could give a testimonial.',
    createdAt: d(-60), lastContactAt: d(-12), nextFollowUpAt: d(6),
    latestSentiment: { interestScore: 92, momentum: 'steady', suggestedStage: 'partner', headline: 'Active, happy partner — strong candidate for a referral and testimonial.', buyingSignals: ['Already seeing repeat customers', 'Offered to refer other owners'], concerns: [], createdAt: d(-12) },
  };
  partners.push(meena);
  reminders.push({ id: newId(), partnerId: meena.id, partnerName: 'Style Hub', title: 'Ask Meena for a testimonial + referrals', detail: 'She’s happy and offered to introduce other owners — capitalize on it.', dueDate: d(6), priority: 'medium', type: 'milestone', isDone: false, isAuto: true, createdAt: nowISO() });

  // A manual focus point
  reminders.push({ id: newId(), partnerName: '', title: 'Draft a one-page Scuts value sheet', detail: 'A leave-behind that explains transparency, reviews and pricing in 60 seconds.', dueDate: d(0), priority: 'medium', type: 'nudge', isDone: false, isAuto: false, createdAt: nowISO() });

  return { partners, interactions, reminders, chat: [] };
}
