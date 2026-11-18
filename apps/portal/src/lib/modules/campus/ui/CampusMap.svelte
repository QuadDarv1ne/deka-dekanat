<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import Icon from '#shared/ui/Icon.svelte';
  import { mapRouteHref, campusPath, mainEntrance } from '../campus-links.ts';
  import type { PageData } from '../../../../routes/(app)/campus/$types';
  import PlaceField from './PlaceField.svelte';
  import CampusFloor from './CampusFloor.svelte';

  let { data }: { data: PageData } = $props();
  let fromText = $state(untrack(() => data.fromText)),
    toText = $state(untrack(() => data.toText));
  let copied = $state('');
  const buildings = $derived([...new Set(data.plans.map((p) => p.building))]);
  const levels = $derived(data.plans.filter((p) => p.building === data.plan.building));
  function showPlan(id: string) {
    return mapRouteHref(data.from?.id, data.to?.id, data.mode, id);
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(page.url.href);
      copied = 'Ссылка скопирована';
    } catch {
      copied = 'Скопируйте адрес страницы из браузера';
    }
  }
</script>

<svelte:head><title>Карта МГИМО · Дека</title></svelte:head>
<div class="page-head"><h1>Карта МГИМО</h1></div>
<details class="panel editor" class:empty={!data.to && !data.from} open={!data.to || !!data.issue}>
  <summary
    ><Icon name="route" size={18} /><strong
      >{data.from?.label ?? ''}{data.from && data.to ? ' → ' : ''}{data.to?.label ??
        'Найти аудиторию'}</strong
    ><span>Изменить</span><Icon name="down" size={15} /></summary
  >
  <form method="GET" action={campusPath} class="planner">
    <input type="hidden" name="search" value="1" />
    <PlaceField
      name="from"
      label="Откуда"
      letter="А"
      placeholder="Аудитория или вход"
      bind:value={fromText}
    />
    <PlaceField
      name="to"
      label="Куда"
      letter="Б"
      placeholder="Номер или название"
      bind:value={toText}
    />
    <button class="btn build" type="submit"><Icon name="route" size={17} />Показать</button>
    <div class="options">
      <label class="mode"
        ><input type="checkbox" name="mode" value="lift" checked={data.mode === 'lift'} />Между
        этажами на лифте</label
      >
      {#if data.from && data.to}<a href={mapRouteHref(data.to.id, data.from.id, data.mode)}
          ><Icon name="swap" size={15} />Поменять местами</a
        >{/if}
      {#if !data.from && data.to}<a href={mapRouteHref(mainEntrance, data.to.id, data.mode)}
          ><Icon name="route" size={15} />От главного входа</a
        >{/if}
    </div>
    {#if data.issue}<p role="status" class="issue">{data.issue}</p>{/if}
  </form>
</details>

<div class="map-layout" class:routing={!!data.route}>
  <section class="panel plan-card" aria-label="Поэтажный план">
    <div class="plan-head">
      <label class="building"
        ><Icon name="building" size={17} /><select
          aria-label="Корпус"
          onchange={(e) => {
            const target =
              data.plans.find(
                (p) => p.building === e.currentTarget.value && p.floor === data.plan.floor
              ) ?? data.plans.find((p) => p.building === e.currentTarget.value);
            if (target) void goto(showPlan(target.id), { reset: false });
          }}
        >
          {#each buildings as b}<option selected={b === data.plan.building} value={b}>{b}</option
            >{/each}
        </select></label
      >
      <nav class="floors" aria-label="Этаж">
        {#each levels as p}
          <a
            href={showPlan(p.id)}
            data-sveltekit-noscroll
            aria-label={p.floor === '0' ? 'Цокольный этаж' : p.floor + ' этаж'}
            aria-current={data.plan.id === p.id ? 'page' : undefined}
            title={p.label}>{p.floor === '0' ? 'Ц' : p.floor}</a
          >
        {/each}
      </nav>
    </div>
    <CampusFloor
      plan={data.plan}
      markers={data.markers}
      from={data.from}
      to={data.to}
      mode={data.mode}
      step={data.step}
      line={data.line}
    />
    {#if data.to && !data.route}<p class="selection">
        <Icon name="pin" size={16} />{data.toText}
        {#if !data.from && data.to.id !== mainEntrance}<a
            class="link"
            href={mapRouteHref(mainEntrance, data.to.id, data.mode)}>От главного входа</a
          >{/if}
      </p>{/if}
  </section>
  {#if data.route}<section class="panel directions" aria-labelledby="steps-heading">
      <div class="panel-head">
        <h2 id="steps-heading">Как пройти</h2>
        <button
          type="button"
          class="icon-btn"
          onclick={share}
          aria-label="Скопировать ссылку на маршрут"><Icon name="copy" size={17} /></button
        >
      </div>
      <ol>
        {#each data.route as step, i}
          {@const current = data.plans.find((p) => p.id === step.plan)!}
          {@const next = data.plans.find((p) => p.id === step.next)}
          <li>
            <a
              href={showPlan(step.plan)}
              data-sveltekit-noscroll
              aria-current={data.plan.id === step.plan ? 'step' : undefined}
            >
              <span class="number">{i + 1}</span><span
                ><strong>{current.label}</strong>
                {#if i === 0}<small>{step.start.label}</small>{/if}
                <small
                  >{step.transfer === 'lift'
                    ? 'Лифт'
                    : step.transfer === 'stairs'
                      ? 'Лестница'
                      : step.transfer === 'passage'
                        ? 'Переход'
                        : step.end.label}{next ? ' → ' + next.label : ''}</small
                ></span
              >
            </a>
          </li>
        {/each}
      </ol>
      {#if copied}<p role="status" class="small">{copied}</p>{/if}
    </section>{/if}
</div>

<style>
  .editor {
    padding: 0;
    margin-bottom: 16px;
  }
  .editor summary {
    list-style: none;
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 54px;
    padding: 10px 18px;
    cursor: pointer;
    color: var(--primary);
    font-size: 13px;
  }
  .editor summary::-webkit-details-marker {
    display: none;
  }
  .editor summary strong {
    color: var(--ink);
    font-size: 14px;
    font-weight: 550;
    overflow-wrap: anywhere;
  }
  .editor summary span {
    margin-left: auto;
  }
  .editor.empty summary {
    display: none;
  }
  .editor[open]:not(.empty) summary {
    border-bottom: 1px solid var(--border);
  }
  .planner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: end;
    gap: 12px 16px;
    padding: 18px 22px;
    margin: 0;
  }
  .options {
    grid-column: 1/-1;
    display: flex;
    align-items: center;
    gap: 4px 20px;
    flex-wrap: wrap;
  }
  .options a,
  .mode {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    font-size: 13px;
  }
  .options a {
    color: var(--primary);
  }
  .mode {
    color: var(--muted);
    cursor: pointer;
  }
  .mode input {
    width: 17px;
    min-height: 17px;
    height: 17px;
    margin: 0;
    accent-color: var(--primary);
  }
  .build {
    min-height: 46px;
    justify-content: center;
  }
  .issue {
    grid-column: 1/-1;
    color: #775226;
    font-size: 14px;
  }
  .map-layout {
    display: grid;
    gap: 16px;
    align-items: start;
  }
  .routing {
    grid-template-columns: minmax(0, 1fr) minmax(230px, 28%);
  }
  .plan-card,
  .directions {
    padding: 18px;
    min-width: 0;
  }
  .plan-head,
  .building {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .plan-head {
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-bottom: 12px;
  }
  .building {
    color: var(--primary);
    max-width: 100%;
  }
  .building select {
    max-width: 100%;
    width: auto;
    min-height: 44px;
    font-size: 15px;
    font-weight: 600;
  }
  .floors {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .floors a {
    display: grid;
    place-items: center;
    min-width: 36px;
    min-height: 44px;
    color: var(--muted);
    border-radius: 9px;
    font-size: 14px;
  }
  .floors a[aria-current],
  .floors a:hover {
    background: var(--accent);
    color: var(--primary);
  }
  .selection {
    flex-wrap: wrap;
    font-size: 13px;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0 0;
  }
  .directions .panel-head {
    margin: 0 0 8px;
  }
  .directions h2 {
    font-size: 17px;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li + li {
    border-top: 1px solid var(--border);
  }
  li a {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 12px 2px;
    min-height: 48px;
  }
  .number {
    display: grid;
    place-items: center;
    flex: 0 0 23px;
    height: 23px;
    border-radius: 50%;
    background: #f1eff7;
    color: #62597a;
    font-size: 12px;
  }
  [aria-current='step'] .number {
    background: #6552af;
    color: white;
  }
  li strong,
  li small {
    display: block;
  }
  li strong {
    font-size: 13px;
  }
  li small,
  .small {
    margin-top: 3px;
    color: var(--muted);
    font-size: 12px;
  }
  @media (max-width: 1100px) {
    .routing {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 640px) {
    .planner {
      grid-template-columns: 1fr;
      align-items: stretch;
      gap: 12px;
      padding: 16px;
    }
    .options {
      grid-row: 3;
    }
    .plan-card,
    .directions {
      padding: 14px;
    }
    .floors a {
      min-width: 36px;
    }
    .building select {
      font-size: 16px;
    }
    .mode,
    .options a {
      min-height: 44px;
    }
  }
</style>
