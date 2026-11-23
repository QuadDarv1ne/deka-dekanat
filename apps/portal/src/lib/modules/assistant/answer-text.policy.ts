// The client only appends deltas. A later em dash can swallow whitespace that
// was already sent, so trailing spaces stay uncommitted until the next chunk
// shows they are not part of a dash.
export function visibleAnswer(raw: string): string {
  return raw
    .replace(/\s*—\s*/g, ': ')
    .replace(/^\s+/, '')
    .replace(/\s+$/, '');
}
