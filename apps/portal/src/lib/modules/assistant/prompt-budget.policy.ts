export interface PromptTurn {
  role: 'user' | 'assistant';
  content: string;
}

function dropLastArrayItem(node: unknown): boolean {
  if (Array.isArray(node)) {
    if (node.length && dropLastArrayItem(node[node.length - 1])) return true;
    if (node.length) {
      node.pop();
      return true;
    }
    return false;
  }
  if (!node || typeof node !== 'object') return false;
  const keys = Object.keys(node);
  for (let index = keys.length - 1; index >= 0; index -= 1) {
    if (dropLastArrayItem((node as Record<string, unknown>)[keys[index]])) return true;
  }
  return false;
}

function dropLastKey(node: unknown): boolean {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const record = node as Record<string, unknown>;
  const keys = Object.keys(record);
  if (!keys.length) return false;
  delete record[keys[keys.length - 1]];
  return true;
}

function shrinkJson(raw: string, max: number) {
  if (raw.length <= max) return raw;
  if (max < 2) return '';
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return raw.slice(0, max);
  }
  if (!value || typeof value !== 'object') return raw.slice(0, max);
  while (JSON.stringify(value).length > max) {
    if (dropLastArrayItem(value)) continue;
    if (dropLastKey(value)) continue;
    return '';
  }
  return JSON.stringify(value);
}

// The system text can be longer than the whole prompt window once cabinet
// records are attached. Dropping history from the newest message then removes
// the question itself, and the model answers without it.
export function fitChatPrompt(
  preface: string,
  context: string,
  reminder: string,
  history: PromptTurn[],
  budget = 4200,
  questionReserve = 1200
) {
  const newest = history.at(-1)?.content.length ?? 0;
  const reserve = Math.min(questionReserve, newest);
  const fixedRoom = Math.max(0, budget - reserve - reminder.length);
  const prefaceUsed = preface.length > fixedRoom ? preface.slice(0, fixedRoom) : preface;
  const contextRoom = Math.max(0, fixedRoom - prefaceUsed.length);
  const system = prefaceUsed + shrinkJson(context, contextRoom) + reminder;
  let remaining = Math.max(0, budget - system.length);
  const messages: PromptTurn[] = [];
  for (const message of history.toReversed()) {
    const content = message.content.slice(0, Math.min(1200, remaining));
    if (!content) break;
    messages.unshift({ role: message.role, content });
    remaining -= content.length;
  }
  return { system, messages };
}
