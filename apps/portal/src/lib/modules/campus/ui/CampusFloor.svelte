<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { mapRouteHref } from '../campus-links.ts';
  import type { CampusPlace, CampusPlan, CampusMode, PlanStep } from '../campus.types.ts';
  let {
    plan,
    markers,
    from,
    to,
    mode,
    step,
    line
  }: {
    plan: CampusPlan;
    markers: CampusPlace[];
    from: CampusPlace | null;
    to: CampusPlace | null;
    mode: CampusMode;
    step?: PlanStep;
    line: string;
  } = $props();
  let zoom = $state(100);
  let viewport: HTMLDivElement;
  let drawing: HTMLDivElement;
  const pins = $derived(
    (step ? [step.start, step.end] : [from, to]).filter(
      (p, i, list): p is CampusPlace =>
        !!p && p.plan === plan.id && list.findIndex((v) => v?.id === p.id) === i
    )
  );
  function letter(p: CampusPlace) {
    return p.id === to?.id ? 'Б' : p.id === from?.id ? 'А' : '↗';
  }
  onMount(() => {
    if (!pins.length || viewport.clientWidth > 580) return;
    const spread = Math.max(...pins.map((p) => p.x)) - Math.min(...pins.map((p) => p.x));
    const fit = Math.max(1, Math.floor(80 / Math.max(spread, 1)));
    const scale = Math.min(3, Math.ceil(740 / viewport.clientWidth), fit);
    if (scale > 1) void resize((scale - 1) * 100);
  });
  async function resize(delta: number) {
    const old = drawing.getBoundingClientRect(),
      frame = viewport.getBoundingClientRect();
    const points = pins.length
      ? pins
      : [
          {
            x: (100 * (frame.left + viewport.clientWidth / 2 - old.left)) / old.width,
            y: (100 * (frame.top + viewport.clientHeight / 2 - old.top)) / old.height
          }
        ];
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    zoom = Math.min(400, Math.max(100, zoom + delta));
    await tick();
    if (!viewport?.isConnected) return;
    const area = drawing.getBoundingClientRect(),
      view = viewport.getBoundingClientRect();
    viewport.scrollBy({
      left: area.left - view.left + (area.width * x) / 100 - viewport.clientWidth / 2,
      top: area.top - view.top + (area.height * y) / 100 - viewport.clientHeight / 2
    });
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (The scrollable floor plan supports keyboard panning.) -->
<div
  class="viewport"
  bind:this={viewport}
  role="region"
  aria-label={'План: ' + plan.label}
  tabindex="0"
>
  <div class="canvas" style:width={zoom + '%'}>
    <div class="drawing" bind:this={drawing} style:aspect-ratio={plan.width + ' / ' + plan.height}>
      <img src={'/campus/mgimo/' + plan.id + '.svg'} alt={plan.label} draggable="false" />
      {#if line}<svg
          class="trace"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-label="Участок маршрута вдоль коридора"
          role="img"
        >
          <polyline points={line} class="halo" /><polyline points={line} class="route-line" />
        </svg>{/if}
      {#each markers as place (place.id)}
        <a
          class="hotspot"
          href={mapRouteHref(from?.id, place.id, mode, plan.id)}
          aria-label={place.label + ' на карте'}
          title={place.label}
          tabindex="-1"
          style:left={place.x + '%'}
          style:top={place.y + '%'}
        ></a>
      {/each}
      {#each pins as pin (pin.id)}
        <span
          class="pin"
          class:destination={pin.id === to?.id}
          style:left={pin.x + '%'}
          style:top={pin.y + '%'}
          title={pin.label}
          aria-label={letter(pin) + ': ' + pin.label}>{letter(pin)}</span
        >
      {/each}
    </div>
  </div>
</div>
<div class="toolbar">
  <a
    href={'https://mgimo.ru/territory/map/?building=' +
      plan.id.split('-')[0] +
      '&floor=' +
      plan.floor}
    target="_blank"
    rel="noreferrer">План МГИМО ↗</a
  >
  <div class="zoom">
    <button
      type="button"
      aria-label="Уменьшить масштаб"
      disabled={zoom === 100}
      onclick={() => resize(-100)}>−</button
    ><span>{zoom}%</span><button
      type="button"
      aria-label="Увеличить масштаб"
      disabled={zoom === 400}
      onclick={() => resize(100)}>+</button
    >
  </div>
</div>

<style>
  .viewport {
    overflow: auto;
    overscroll-behavior: contain;
    max-height: min(61vh, 620px);
    min-height: 210px;
    border: 1px solid #e8e7f0;
    border-radius: 12px;
    background-color: #fbfbfd;
    background-image: radial-gradient(#e0deea 1px, transparent 1px);
    background-size: 16px 16px;
  }
  .canvas {
    padding: 5% 4%;
    min-height: 210px;
    display: grid;
    align-items: center;
  }
  .drawing {
    position: relative;
    width: 100%;
  }
  img,
  .trace {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .trace {
    pointer-events: none;
  }
  polyline {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  .halo {
    stroke: white;
    stroke-width: 7;
  }
  .route-line {
    stroke: #6850b4;
    stroke-width: 3.5;
  }
  .hotspot {
    position: absolute;
    width: 2.8%;
    height: 9%;
    min-width: 5px;
    transform: translate(-50%, -50%);
    border-radius: 3px;
  }
  .hotspot:hover,
  .hotspot:focus-visible {
    background: #7964ca40;
    outline: 1px solid #7058bd;
  }
  .pin {
    position: absolute;
    transform: translate(-50%, -100%);
    min-width: 23px;
    height: 25px;
    padding: 2px 6px;
    border-radius: 9px 9px 9px 2px;
    color: white;
    background: #54419d;
    border: 2px solid white;
    box-shadow: 0 2px 8px #25213640;
    font:
      650 12px/17px Manrope,
      sans-serif;
    text-align: center;
    pointer-events: none;
  }
  .destination {
    background: #292240;
  }
  .toolbar,
  .zoom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .toolbar {
    margin-top: 8px;
  }
  .toolbar a,
  .zoom span {
    font-size: 12px;
    color: var(--muted);
  }
  .toolbar a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .zoom button {
    background: var(--accent);
    color: var(--primary);
    border-radius: 9px;
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
  .zoom button:disabled {
    opacity: 0.45;
  }
  .zoom span {
    width: 34px;
    text-align: center;
  }
</style>
