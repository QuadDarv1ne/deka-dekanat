<script lang="ts">
  import { enhance, type SubmitFunction } from '$app/forms';
  import { lessonKinds } from '#modules/academics/academic.labels.ts';
  import { shortDate, time } from '#shared/formatting.ts';
  import { reminderLabels } from '../study-plan.labels.ts';
  import { MINUTE_MS } from '../study-plan.policy.ts';
  import type { Assessment, ReminderMinutes } from '../study-plan.types.ts';

  let { item, now }: { item: Assessment; now: number } = $props();
  let pending = $state(false);
  let start = $derived(Date.parse(item.starts_at));
  let reminder = $derived(item.reminder_minutes ?? 0);
  const choices: ReminderMinutes[] = [1440, 60];
  const save: SubmitFunction = () => {
    pending = true;
    return async ({ update }) => {
      try {
        await update({ reset: false });
      } finally {
        pending = false;
      }
    };
  };
</script>

<article id={'assessment-' + item.id} aria-labelledby={'name-' + item.id}>
  <div>
    <p class="caption">
      {lessonKinds[item.kind]} · {shortDate(item.starts_at)}, {time(item.starts_at)} МСК
    </p>
    <h3 id={'name-' + item.id}>{item.subject}</h3>
    {#if item.room}<p class="caption">{item.room}</p>{/if}
  </div>
  <form method="POST" action="?/preference" use:enhance={save}>
    <input type="hidden" name="lesson" value={item.id} />
    <button
      class="btn secondary"
      name="ready"
      value={item.marked_ready ? 'no' : 'yes'}
      disabled={pending}
    >
      {item.marked_ready ? 'Готов · Снять отметку' : 'Отметить "Готов"'}
    </button>
  </form>
  <form method="POST" action="?/preference" use:enhance={save} class="reminder">
    <input type="hidden" name="lesson" value={item.id} />
    <label>
      Напоминание
      <select name="reminder" value={reminder} disabled={pending}>
        <option value={0}>Выключено</option>
        {#each choices as delay}
          <option value={delay} disabled={delay !== reminder && start - delay * MINUTE_MS <= now}>
            {reminderLabels[delay]}
          </option>
        {/each}
      </select>
    </label>
    <button class="btn outline" disabled={pending}>Сохранить</button>
  </form>
  {#if reminder && start - reminder * MINUTE_MS > now}
    <a class="link" href={'/assistant/study-plan/calendar/' + item.id} download
      >Скачать событие (.ics)</a
    >
  {/if}
</article>

<style>
  article {
    display: grid;
    gap: 11px;
    align-content: start;
    padding: 15px;
    border: 1px solid var(--border);
    border-radius: 13px;
    scroll-margin-top: 90px;
    overflow-wrap: anywhere;
  }
  article:target {
    border-color: var(--primary);
  }
  h3 {
    margin: 4px 0;
  }
  .caption {
    color: #5b6273;
    font-size: 13px;
  }
  .reminder {
    display: flex;
    gap: 8px;
    align-items: end;
    flex-wrap: wrap;
  }
  .reminder label {
    flex: 1 1 115px;
  }
  select {
    min-height: 43px;
  }
  .link {
    min-height: 36px;
    justify-self: start;
  }
</style>
