function withoutReasoning(raw: string) {
  const closed = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const open = closed.search(/<think>/i);
  const cut = open === -1 ? closed : closed.slice(0, open);
  // Hold a trailing "<think" prefix. Emitting it and then deleting it would
  // leave the start of the tag on screen, because the client only appends.
  const partial = cut.match(/<(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/i);
  return partial ? cut.slice(0, -partial[0].length) : cut;
}

// The client only appends deltas. A later em dash can swallow whitespace that
// was already sent, so trailing spaces stay uncommitted until the next chunk
// shows they are not part of a dash.
export function visibleAnswer(raw: string): string {
  return withoutReasoning(raw)
    .replace(/[«»]/g, '"')
    .replace(/\s*—\s*/g, ': ')
    .replace(/^\s+/, '')
    .replace(/\s+$/, '');
}
