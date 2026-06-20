import type { CompanyProfile, KnowledgeDoc } from './types';

/** Builds the "what you know about Scuts" block injected into every agent prompt. */
export function buildKnowledge(company: CompanyProfile, docs: KnowledgeDoc[]): string {
  const lines: string[] = [];
  lines.push(`COMPANY: ${company.name}`);
  if (company.tagline) lines.push(`Tagline: ${company.tagline}`);
  if (company.about) lines.push(`About: ${company.about}`);
  if (company.valueProps.length) lines.push('Value to the salon: ' + company.valueProps.map((v) => `• ${v}`).join(' '));
  if (company.differentiators.length) lines.push('Differentiators: ' + company.differentiators.map((v) => `• ${v}`).join(' '));
  if (company.pricingNotes) lines.push(`Pricing stance: ${company.pricingNotes}`);
  if (company.targetCustomer) lines.push(`Target salon owner: ${company.targetCustomer}`);
  if (company.founders.length) {
    lines.push('Founders: ' + company.founders.map((f) => `${f.name} (${f.role})`).join(', '));
  }

  if (docs.length) {
    lines.push('');
    lines.push('ADDITIONAL COMPANY KNOWLEDGE (uploaded by the founders):');
    let budget = 4000;
    for (const d of docs) {
      if (budget <= 0) break;
      const slice = d.content.slice(0, budget);
      lines.push(`— ${d.title} —`);
      lines.push(slice);
      budget -= slice.length;
    }
  }
  return lines.join('\n');
}
