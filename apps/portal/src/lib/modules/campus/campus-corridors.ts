import type { CampusPlace, PlanStep } from './campus.types.ts';

// Centre lines digitised from the public SVGs. Coordinates are percentages of each plan.
// The line ends in the corridor alongside each room. Door positions are not in the source.
const lanes = {
  'n-3': { north: 32, south: 62, cross: [21.5, 52, 80] },
  'n-4': { north: 33, south: 62, cross: [20, 51, 78] }
};

function side(place: CampusPlace) {
  const id = place.id.split('.')[1];
  if (/^staircase_n_[34]_1$|^go_n[34]_g[23]$/.test(id)) return 'north';
  const room = /^n(\d{3})[a-z]?$/.exec(id);
  if (!room) return null;
  const n = Number(room[1]);
  if ((n >= 301 && n <= 313) || (n >= 401 && n <= 413)) return 'south';
  if ((n >= 316 && n <= 331) || (n >= 424 && n <= 441)) return 'north';
  return null;
}

export function corridorLine(step: PlanStep) {
  if (step.plan !== 'n-3' && step.plan !== 'n-4') return '';
  const lane = lanes[step.plan],
    a = side(step.start),
    b = side(step.end);
  if (!a || !b || step.start.id === step.end.id) return '';
  const x = step.start.x,
    end = step.end.x;
  const points = [[x, lane[a]]];
  if (a !== b) {
    const cost = (cross: number) => Math.abs(x - cross) + Math.abs(end - cross);
    const cross = lane.cross.reduce((best, next) => (cost(next) < cost(best) ? next : best));
    points.push([cross, lane[a]], [cross, lane[b]]);
  }
  points.push([end, lane[b]]);
  return points.map((p) => p.join(',')).join(' ');
}
