<script lang="ts">
  import { requestKinds, requestNumber } from '../request.labels.ts';
  import { WAITING_DAYS, type RequestTriage } from '../request-triage.types.ts';
  import Status from './RequestStatusBadge.svelte';

  let { queue, faculty }: { queue: RequestTriage; faculty: string | null } = $props();
</script>

<div class="page-head">
  <div>
    <h1>Очередь деканата</h1>
    {#if faculty}<p>{faculty}</p>{/if}
  </div>
  <a class="btn outline" href="/requests">Все заявления</a>
</div>

<div class="stack">
  <dl class="metrics">
    <div class="panel">
      <dt>Новые</dt>
      <dd>{queue.new_count}</dd>
    </div>
    <div class="panel">
      <dt>В работе</dt>
      <dd>{queue.in_progress_count}</dd>
    </div>
    <div class="panel">
      <dt>К выдаче</dt>
      <dd>{queue.ready_count}</dd>
    </div>
    <div class="panel waiting">
      <dt>Ожидают ≥ {WAITING_DAYS} суток</dt>
      <dd>{queue.waiting_count}</dd>
    </div>
  </dl>
  <section class="panel" aria-labelledby="queue-title">
    <div class="panel-head">
      <div>
        <h2 id="queue-title">Сначала самые давние</h2>
        <p>
          Считаем полные сутки с подачи. Порог внимания для новых заявлений и заявлений в работе
          составляет {WAITING_DAYS} суток.
        </p>
      </div>
    </div>
    {#if queue.items.length}
      <ul>
        {#each queue.items as item (item.id)}
          <li>
            <div>
              <a class="link" href={'/requests/' + item.id}>
                № {requestNumber(item.number)} · {requestKinds[item.kind]}
              </a>
              <p>{item.student_name} · {item.group_name}</p>
            </div>
            <div class="row wrap">
              <Status status={item.status} />
              <span class:late={item.age_days >= WAITING_DAYS}>{item.age_days} сут.</span>
            </div>
          </li>
        {/each}
      </ul>
      {#if queue.items.length < queue.new_count + queue.in_progress_count}
        <p class="muted">
          Показаны {queue.items.length} из {queue.new_count + queue.in_progress_count}.
        </p>
      {/if}
    {:else}
      <p class="muted">Новых заявлений и заявлений в работе нет.</p>
    {/if}
  </section>
</div>

<style>
  .metrics {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin: 0;
  }
  .metrics .panel {
    padding: 12px 15px;
  }
  dt {
    font-size: 13px;
    color: #525a6b;
  }
  dd {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
  }
  .waiting {
    background: #fff5de;
    border-color: #efdfb8;
  }
  ul {
    list-style: none;
    display: grid;
    padding: 0;
    margin: 0;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 9px;
    border-top: 1px solid var(--border);
    padding: 10px 0;
    overflow-wrap: anywhere;
  }
  li p {
    color: #5b6273;
    font-size: 13px;
  }
  li .link {
    min-height: 34px;
    font-size: 14px;
  }
  li span {
    white-space: nowrap;
  }
  .late {
    color: #8d440b;
    font-weight: 600;
  }
  @media (max-width: 680px) {
    .metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    li {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
