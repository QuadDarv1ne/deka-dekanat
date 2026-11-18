<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { shortDate, time } from '#shared/formatting.ts';
  import { lessonKinds } from '#modules/academics/academic.labels.ts';
  import type { Grade } from '#modules/academics/academic.types.ts';
  import { MINUTE_MS } from '#modules/study-plan/study-plan.policy.ts';
  import type { StudentHome } from '../student-home.types.ts';
  import StudentFocusView from './StudentFocusView.svelte';

  let { home, grades }: { home: StudentHome; grades: Grade[] } = $props();
</script>

<StudentFocusView {home} {grades} />
<details class="study-details">
  <summary>Аттестации и учебные сервисы <Icon name="down" size={16} /></summary>
  <div class="study">
    <section class="panel" aria-labelledby="overview-assessments">
      <div class="panel-head">
        <h2 id="overview-assessments">Аттестации</h2>
        <a class="link" href="/assistant/study-plan"
          >План подготовки <Icon name="arrow" size={14} /></a
        >
      </div>
      <ul>
        {#each home.assessments as item (item.id)}
          <li>
            <a class="record" href={'/assistant/study-plan#assessment-' + item.id}>
              <span>
                <strong>{item.subject}</strong>
                <small
                  >{lessonKinds[item.kind]} · {shortDate(item.starts_at)}, {time(item.starts_at)} МСК</small
                >
              </span>
              {#if item.marked_ready}
                <span class="pill green">Готов</span>
              {:else if item.reminder_minutes !== null && Date.parse(item.starts_at) - item.reminder_minutes * MINUTE_MS <= home.now}
                <span class="pill violet">Пора повторить</span>
              {/if}
            </a>
          </li>
        {:else}
          <li class="muted small">На ближайшие 30 дней экзамены и зачёты не назначены.</li>
        {/each}
      </ul>
    </section>
  </div>

  <nav class="overview-links" aria-label="Учёба и заявления">
    <a class="link" href="/schedule/attendance">Посещаемость <Icon name="arrow" size={14} /></a>
    <a class="link" href="/grades/progress">Динамика результатов <Icon name="arrow" size={14} /></a>
    <a class="link" href="/requests/templates">Виды заявлений <Icon name="arrow" size={14} /></a>
  </nav>
</details>

{#if home.alerts.length}
  <section class="panel" aria-labelledby="overview-alerts">
    <div class="panel-head">
      <h2 id="overview-alerts">Уведомления</h2>
      <a class="link" href="/notifications">Все уведомления <Icon name="arrow" size={14} /></a>
    </div>
    <ul>
      {#each home.alerts as item (item.id)}
        <li>
          <form method="POST" action={'/notifications/' + item.id}>
            <button class="record" type="submit">
              <span>
                <strong>{item.title}</strong>
                <small>{shortDate(item.created_at)}, {time(item.created_at)}</small>
              </span>
              <Icon name="arrow" size={16} />
            </button>
          </form>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .study-details {
    border-top: 1px solid var(--border);
  }
  .study-details summary {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    color: var(--primary);
    font-size: 14px;
    font-weight: 550;
    cursor: pointer;
    list-style: none;
  }
  .study-details summary::-webkit-details-marker {
    display: none;
  }
  .study-details[open] summary :global(svg) {
    transform: rotate(180deg);
  }
  .study {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
    align-items: start;
  }
  .panel-head {
    flex-wrap: wrap;
  }
  .overview-links {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
  }
  .overview-links a {
    min-height: 44px;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li + li {
    border-top: 1px solid var(--border);
  }
  .record {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 0;
    min-height: 50px;
    width: 100%;
    background: none;
    color: inherit;
    text-align: left;
    overflow-wrap: anywhere;
  }
  .record strong {
    font-size: 13px;
    font-weight: 550;
  }
  .record small {
    display: block;
    color: var(--muted);
  }
  .record .pill,
  .record :global(svg) {
    flex-shrink: 0;
  }
  .record:hover strong {
    color: var(--primary);
  }
  @media (max-width: 1050px) {
    .study {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
