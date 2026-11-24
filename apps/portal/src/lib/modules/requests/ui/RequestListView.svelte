<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import Status from '#modules/requests/ui/RequestStatusBadge.svelte';
  import { requestKinds, requestNumber } from '#modules/requests/request.labels.ts';
  import { shortDate } from '#shared/formatting.ts';
  type PageProps = {
    data: {
      requests: import('../request.types').StudyRequest[];
    } & import('#application/application.types.ts').ApplicationData;
  };
  let { data }: PageProps = $props();
  let filter = $state('all');
  let search = $state('');
  const tabs = [
    { id: 'all', name: 'Все заявления' },
    { id: 'active', name: 'Активные' },
    { id: 'ready', name: 'Готовые' },
    { id: 'done', name: 'Завершённые' },
    { id: 'rejected', name: 'Отклонённые' },
    { id: 'cancelled', name: 'Отменённые' }
  ];
  const filtered = $derived(
    data.requests.filter(
      (r) =>
        (filter === 'all' ||
          (filter === 'active' && ['new', 'in_progress', 'ready'].includes(r.status)) ||
          filter === r.status) &&
        `${requestKinds[r.kind]} ${r.number} ${requestNumber(r.number)} ${r.student_name} ${r.group_name}`
          .toLocaleLowerCase('ru-RU')
          .replaceAll('ё', 'е')
          .includes(search.trim().toLocaleLowerCase('ru-RU').replaceAll('ё', 'е'))
    )
  );
</script>

<svelte:head><title>Заявления · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>{data.user.role === 'student' ? 'Мои заявления' : 'Заявления студентов'}</h1>
    <p>
      {data.user.role === 'student'
        ? 'Обращайтесь в деканат и следите за результатом онлайн.'
        : 'Все обращения вашего факультета в одном месте.'}
    </p>
  </div>
  {#if data.user.role === 'student'}<a class="btn" href="/requests/new"
      ><Icon name="plus" size={17} />Новое заявление</a
    >{/if}
</div>
<section class="panel">
  <div class="toolbar">
    <div class="tabs" aria-label="Фильтр заявлений">
      {#each tabs as tab}<button
          type="button"
          class:chosen={filter === tab.id}
          aria-pressed={filter === tab.id}
          onclick={() => (filter = tab.id)}>{tab.name}</button
        >{/each}
    </div>
    <label class="search"
      ><Icon name="search" size={17} /><input
        aria-label="Найти заявление"
        type="search"
        placeholder="Найти заявление"
        bind:value={search}
      /></label
    >
  </div>
  {#if filtered.length}<div class="table-wrap">
      <table class="data-table">
        <thead
          ><tr
            ><th>№ / Тип заявления</th>{#if data.user.role === 'dean'}<th>Студент</th>{/if}<th
              >Подано</th
            ><th>Статус</th><th></th></tr
          ></thead
        ><tbody
          >{#each filtered as request}<tr
              ><td
                ><a href={`/requests/${request.id}`}
                  ><strong>{requestKinds[request.kind]}</strong><small
                    >№ {requestNumber(request.number)}</small
                  ></a
                ></td
              >{#if data.user.role === 'dean'}<td
                  >{request.student_name}<small>{request.group_name}</small></td
                >{/if}<td class="muted">{shortDate(request.created_at)}</td><td
                ><Status status={request.status} /></td
              ><td
                ><a
                  class="icon-btn"
                  aria-label={`Открыть заявление №${requestNumber(request.number)}`}
                  href={`/requests/${request.id}`}><Icon name="arrow" size={17} /></a
                ></td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>{:else}<div class="empty">
      <Icon name="inbox" size={32} />
      <h3>Заявлений не найдено</h3>
      <p>
        {filter === 'all' && data.user.role === 'student'
          ? 'Когда понадобится справка, создайте новое заявление.'
          : 'В этой папке ничего нет. Выберите другой фильтр.'}
      </p>
    </div>{/if}
  <p class="results-count">Показано: {filtered.length} из {data.requests.length}</p>
</section>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 25px;
    flex-wrap: wrap;
  }
  .tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .tabs button {
    background: transparent;
    color: #676c78;
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 13px;
  }
  .tabs button.chosen {
    background: #efedfc;
    color: #6c60a9;
  }
  .search {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    position: relative;
  }
  .search :global(svg) {
    position: absolute;
    left: 12px;
    color: #686c74;
  }
  .search input {
    font-size: 12px;
    padding-left: 37px;
    min-height: 38px;
    width: 205px;
  }
  .results-count {
    border-top: 1px solid #f0f1f5;
    padding-top: 18px;
    color: #686b70;
    font-size: 12px;
    margin-top: 8px;
  }
  @media (max-width: 600px) {
    .search {
      width: 100%;
    }
    .search input {
      width: 100%;
    }
    .tabs button {
      font-size: 11px;
      padding: 8px 10px;
    }
    .toolbar {
      gap: 15px;
    }
    .page-head {
      flex-direction: column;
    }
  }
</style>
