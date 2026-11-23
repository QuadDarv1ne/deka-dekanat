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
function authHeader(): Record<string, string> {
  const key = process.env.AI_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}
export async function modelAvailable() {
  try {
    // llama-server answers 503 while it is still loading the model, so a false
    // result here means "not ready yet", not necessarily "broken".
    return (
      await fetch(new URL('../health', baseUrl() + '/'), {
        signal: AbortSignal.timeout(1500),
        redirect: 'error',
        headers: authHeader()
      })
    ).ok;
  } catch {
    return false;
  }
}
const MODEL_LOAD_TIMEOUT = 150000;
async function requestCompletion(messages: ModelMessage[], signal: AbortSignal) {
  const body = JSON.stringify({
    model: process.env.AI_MODEL ?? 'deka-assistant',
    messages,
    stream: true,
    temperature: 0.3,
    top_p: 0.95,
    min_p: 0,
    max_tokens: 600,
    reasoning_effort: 'none',
    chat_template_kwargs: { enable_thinking: false }
  });
  const deadline = Date.now() + MODEL_LOAD_TIMEOUT;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(baseUrl() + '/chat/completions', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body
    });
    // On a cold start llama-server replies 503 until the weights are loaded
    // (about 80 seconds on the 2 GB machine). Waiting here turns a confusing
    // "Не удалось получить ответ" into a slow but successful first answer.
    if (response.status === 503 && attempt < 30 && Date.now() < deadline) {
      await response.body?.cancel().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 4000));
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`MODEL_UNAVAILABLE_${response.status}`);
    }
    return response;
  }
}
export async function* generate(
  messages: ModelMessage[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const response = await requestCompletion(messages, signal);
  if (!response.body) throw new Error('MODEL_UNAVAILABLE');
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
