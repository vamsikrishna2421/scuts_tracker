const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | unknown[];
}

export class ClaudeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeError';
  }
}

interface CompleteOptions {
  apiKey: string;
  model: string;
  system?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
}

export async function complete(opts: CompleteOptions): Promise<string> {
  const { apiKey, model, system, messages, maxTokens = 1500 } = opts;
  if (!apiKey.trim()) {
    throw new ClaudeError('No Claude API key set. Add it in Settings → Claude API.');
  }

  const body: Record<string, unknown> = { model, max_tokens: maxTokens, messages };
  if (system) body.system = system;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    throw new ClaudeError(`Network problem: ${e?.message ?? 'request failed'}`);
  }

  if (!res.ok) {
    throw new ClaudeError(await friendlyError(res));
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new ClaudeError("Couldn't read Claude's response.");
  }

  const text: string = (json?.content ?? [])
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b?.text ?? '')
    .join('')
    .trim();

  if (!text) throw new ClaudeError('Claude returned an empty response.');
  return text;
}

async function friendlyError(res: Response): Promise<string> {
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.error?.message ?? '';
  } catch {
    /* ignore */
  }
  switch (res.status) {
    case 401: return 'Your Claude API key was rejected (401). Double-check it in Settings.';
    case 403: return "This key isn't permitted to use Claude (403).";
    case 429: return 'Claude is rate-limiting requests (429). Wait a moment and try again.';
    case 400: return `Claude rejected the request (400): ${detail}`;
    case 500:
    case 529: return `Claude is temporarily unavailable (${res.status}). Try again shortly.`;
    default: return `Claude returned an error (${res.status}). ${detail}`.trim();
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof ClaudeError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

/** Uses Claude's native PDF / vision support to pull text out of a document or image. */
export async function extractText(opts: {
  apiKey: string;
  model: string;
  kind: 'pdf' | 'image';
  mediaType: string;
  base64: string;
}): Promise<string> {
  const block =
    opts.kind === 'pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: opts.base64 } }
      : { type: 'image', source: { type: 'base64', media_type: opts.mediaType, data: opts.base64 } };
  const instruction =
    opts.kind === 'pdf'
      ? 'Extract ALL readable text from this document. Return only the extracted content as clean plain text, preserving headings and structure where possible. No commentary.'
      : 'Extract ALL readable text from this image. If there is little or no text, briefly describe what it shows and any business-relevant details. Return only the content, no commentary.';
  return complete({
    apiKey: opts.apiKey,
    model: opts.model,
    messages: [{ role: 'user', content: [block, { type: 'text', text: instruction }] }],
    maxTokens: 6000,
  });
}
