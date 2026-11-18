export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function baseUrl() {
  const raw = process.env.AI_BASE_URL;
  if (!raw) throw new Error('AI_NOT_CONFIGURED');
  const url = new URL(raw);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', 'ai'].includes(url.hostname)
  )
    throw new Error('AI_ENDPOINT_NOT_LOCAL');
  return raw.replace(/\/$/, '');
}
export async function modelAvailable() {
  try {
    return (
      await fetch(new URL('../health', baseUrl() + '/'), {
        signal: AbortSignal.timeout(1500),
        redirect: 'error'
      })
    ).ok;
  } catch {
    return false;
  }
}
export async function* generate(
  messages: ModelMessage[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const response = await fetch(baseUrl() + '/chat/completions', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.AI_API_KEY ? { Authorization: `Bearer ${process.env.AI_API_KEY}` } : {})
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? 'deka-assistant',
      messages,
      stream: true,
      temperature: 0.3,
      top_p: 0.95,
      min_p: 0,
      max_tokens: 600,
      reasoning_effort: 'none',
      chat_template_kwargs: { enable_thinking: false }
    })
  });
  if (!response.ok || !response.body) throw new Error('MODEL_UNAVAILABLE');
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (done && buffer) buffer += '\n';
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error('MODEL_ERROR');
        const content = parsed.choices?.[0]?.delta?.content;
        if (typeof content === 'string' && content) yield content;
      }
      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
