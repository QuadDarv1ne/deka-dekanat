import { connections } from './campus-data.ts';
import type { CampusMode, CampusPlace, PlanStep, TransferKind } from './campus.types.ts';

type Hop = { exit: CampusPlace; arrival: CampusPlace; kind: TransferKind };
const neighbours = new Map<string, Hop[]>();
for (const { a, b, kind } of connections) {
  for (const hop of [
    { exit: a, arrival: b, kind },
    { exit: b, arrival: a, kind }
  ]) {
    const list = neighbours.get(hop.exit.plan) ?? [];
    list.push(hop);
    neighbours.set(hop.exit.plan, list);
  }
}

// Each edge represents one published change of plan. The source gives no distances.
export function campusRoute(
  from: CampusPlace,
  to: CampusPlace,
  mode: CampusMode
): PlanStep[] | null {
  const queue = [from.plan];
  const previous = new Map<string, Hop | null>([[from.plan, null]]);
  for (let i = 0; i < queue.length && !previous.has(to.plan); i++) {
    for (const hop of neighbours.get(queue[i]) ?? []) {
      if (mode === 'lift' && hop.kind === 'stairs') continue;
      if (previous.has(hop.arrival.plan)) continue;
      previous.set(hop.arrival.plan, hop);
      queue.push(hop.arrival.plan);
    }
  }
  if (!previous.has(to.plan)) return null;
  const hops: Hop[] = [];
  for (let hop = previous.get(to.plan); hop; hop = previous.get(hop.exit.plan)) hops.push(hop);
  let start = from;
  const steps: PlanStep[] = [];
  for (const hop of hops.reverse()) {
    steps.push({
      plan: start.plan,
      start,
      end: hop.exit,
      transfer: hop.kind,
      next: hop.arrival.plan
    });
    start = hop.arrival;
  }
  steps.push({ plan: start.plan, start, end: to, transfer: null, next: null });
  return steps;
}
