<script lang="ts">
  import StudentCard from './StudentCard.svelte';
  import Icon from '#shared/ui/Icon.svelte';
  import type { CardPresentation } from '../student-card.types.ts';
  let { data }: { data: { presentation: CardPresentation; verification?: boolean } } = $props();
</script>

<svelte:head><title>Студенческий билет · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>{data.verification ? 'Проверка студенческого' : 'Студенческий билет'}</h1>
    <p>
      {data.verification
        ? 'Запись найдена в реестре университета.'
        : 'Ваш электронный студенческий.'}
    </p>
  </div>
</div>
<div class="card-view stack">
  <StudentCard presentation={data.presentation} />
  {#if !data.verification}<div class="row wrap card-actions">
      <a class="btn" href="/student-card/download"
        ><Icon name="download" size={16} />Скачать билет</a
      >
      <a
        class="btn secondary"
        href={data.presentation.qr}
        download={`deka-${data.presentation.card.number}-qr.png`}>Скачать QR-код</a
      >
      <button class="btn secondary" onclick={() => window.print()}>Печать</button>
    </div>{/if}
  <p class="card-note">
    QR-код проверяется в системе Дека. Данные доступны сотрудникам университета с соответствующими
    правами.
  </p>
</div>

<style>
  .card-view {
    max-width: 680px;
  }
  .card-note {
    max-width: 560px;
    color: #777180;
    font-size: 12px;
    line-height: 1.8;
  }
  @media print {
    :global(body *) {
      visibility: hidden;
    }
    .card-view :global(.student-card),
    .card-view :global(.student-card *) {
      visibility: visible;
    }
    .card-view :global(.student-card) {
      position: absolute;
      top: 20mm;
      left: 20mm;
    }
    .card-actions,
    .card-note {
      display: none;
    }
  }
</style>
