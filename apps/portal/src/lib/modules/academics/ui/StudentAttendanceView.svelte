<script lang="ts">
  import type { AttendanceEntry } from '../attendance.types.ts';
  import { attendanceLabels } from '../attendance.labels.ts';
  import { countAttendance } from '../student-progress.policy.ts';
  import { shortDate, time } from '#shared/formatting.ts';
  import { lessonKinds } from '../academic.labels.ts';
  let { entries }: { entries: AttendanceEntry[] } = $props();
  const counts = $derived(countAttendance(entries));
</script>

<div class="page-head">
  <div>
    <h1>Посещаемость</h1>
    <p>Прошедшие занятия группы за последние 30 дней.</p>
  </div>
  <a class="btn outline" href="/grades/progress">К прогрессу</a>
</div>
<section class="panel journal" aria-label="Журнал посещаемости">
  {#if entries.length}
    <dl class="summary">
      <div>
        <dt>Присутствие</dt>
        <dd>{counts.present}</dd>
      </div>
      <div>
        <dt>Пропуски</dt>
        <dd>{counts.absent}</dd>
      </div>
      <div>
        <dt>Уважительная причина</dt>
        <dd>{counts.excused}</dd>
      </div>
      <div>
        <dt>Без отметки</dt>
        <dd>{counts.unmarked}</dd>
      </div>
    </dl>
    <ul>
      {#each entries as item (item.id)}
        <li>
          <div>
            <strong>{item.subject}</strong>
            <p>{shortDate(item.starts_at)}, {time(item.starts_at)} · {lessonKinds[item.kind]}</p>
          </div>
          <span class:absent={item.status === 'absent'}
            >{attendanceLabels[item.status ?? 'unmarked']}</span
          >
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">Прошедших занятий пока нет.</p>
    <a class="link" href="/schedule">Открыть расписание</a>
  {/if}
</section>

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin: 0 0 16px;
  }
  .summary div {
    background: #f5f3fe;
    border-radius: 10px;
    padding: 9px 12px;
  }
  dt {
    color: #49415f;
    font-size: 12px;
  }
  dd {
    font-size: 20px;
    font-weight: 650;
    margin: 0;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    gap: 10px;
    justify-content: space-between;
    align-items: center;
    padding: 9px 0;
    border-top: 1px solid var(--border);
    overflow-wrap: anywhere;
  }
  li p {
    font-size: 12px;
    color: #555d6d;
  }
  li span {
    text-align: right;
    font-size: 12px;
    color: #555d6d;
  }
  li span.absent {
    color: #9a360d;
    font-weight: 650;
  }
  .journal > .link {
    min-height: 44px;
  }
  @media (max-width: 520px) {
    .summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
