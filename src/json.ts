/** Tolerantly pulls a JSON object out of a model response (handles code fences and surrounding prose). */
export function extractJSON<T>(text: string): T | null {
  for (const candidate of candidates(text)) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function candidates(text: string): string[] {
  const out: string[] = [];
  const fenced = fencedBlock(text);
  if (fenced) out.push(fenced);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) out.push(text.slice(start, end + 1));
  out.push(text.trim());
  return out;
}

function fencedBlock(text: string): string | null {
  const open = text.indexOf('```');
  if (open < 0) return null;
  const afterOpen = text.slice(open + 3);
  const close = afterOpen.indexOf('```');
  if (close < 0) return null;
  let inner = afterOpen.slice(0, close).trim();
  if (inner.toLowerCase().startsWith('json')) inner = inner.slice(4).trim();
  return inner;
}
