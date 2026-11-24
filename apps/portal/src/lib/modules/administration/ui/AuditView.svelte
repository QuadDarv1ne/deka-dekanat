<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { shortDate, time } from '#shared/formatting.ts';
  import { auditDetail, auditTitle } from '../audit-detail.policy.ts';
  type PageProps = { data: { events: import('../administration.types').AuditEvent[] } };
  let { data }: PageProps = $props();
</script>

<svelte:head><title>Журнал действий · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Журнал действий</h1>
    <p>Кто, когда и что изменил в системе.</p>
  </div>
  <span class="pill violet"><Icon name="shield" size={14} />Последние 100 событий</span>
</div>
<section class="panel">
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Подробности</th></tr></thead
      ><tbody
        >{#each data.events as event}<tr
            ><td>{shortDate(event.created_at)}<small>{time(event.created_at)}</small></td><td
              >{event.actor ?? 'Система'}</td
            ><td>{auditTitle(event.action)}</td><td
              >{auditDetail(event.action, event.metadata)}<small title={event.entity_id}
                >{event.entity_id.slice(0, 8)}…</small
              ></td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
  {#if !data.events.length}<div class="empty">
      <Icon name="shield" size={30} />
      <h3>История ещё пуста</h3>
      <p>Изменения заявлений сохраняются здесь автоматически.</p>
    </div>{/if}
</section>
