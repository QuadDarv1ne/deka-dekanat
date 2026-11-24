<script lang="ts">
  import { enhance, type SubmitFunction } from '$app/forms';
  import { lessonKinds, scoreName } from '#modules/academics/academic.labels.ts';
  import { shortDate, time } from '#shared/formatting.ts';
  import { fallbackAdvice, MINUTE_MS, PASSING_SCORE } from '../study-plan.policy.ts';
  import type { Assessment, FocusItem, StudyAdvice, StudyGrade } from '../study-plan.types.ts';
  import AssessmentCard from './AssessmentCard.svelte';

  let {
    data,
    form
  }: {
    data: { grades: StudyGrade[]; assessments: Assessment[]; now: number; focus: FocusItem[] };
    form: { message?: string; advice?: StudyAdvice; adviceFocus?: string; saved?: boolean } | null;
  } = $props();

  let pending = $state(false);
  const advice = $derived(form?.adviceFocus === JSON.stringify(data.focus) ? form?.advice : null);
  const ready = $derived(data.assessments.filter((item) => item.marked_ready).length);
  const below = $derived(data.grades.filter((item) => item.points < PASSING_SCORE).length);
  const due = $derived(
    data.assessments.filter(
      (item) =>
        !item.marked_ready &&
        item.reminder_minutes !== null &&
        Date.parse(item.starts_at) - item.reminder_minutes * MINUTE_MS <= data.now
    )
  );

  const ask: SubmitFunction = () => {
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

<div class="page-head">
  <div>
    <h1>План подготовки</h1>
    <p>Экзамены и зачёты на 30 дней, текущие баллы и шаги подготовки.</p>
  </div>
  <a class="btn outline" href="/assistant">К помощнику</a>
</div>

<div class="stack">
  <div class="metrics">
    <div class="metric">
      <strong>{data.assessments.length}</strong><span>Аттестаций впереди</span>
    </div>
    <div class="metric">
      <strong>{ready} из {data.assessments.length}</strong><span>Отмечено "Готов"</span>
    </div>
    <div class="metric">
      <strong>{below} из {data.grades.length}</strong><span>Дисциплин ниже {PASSING_SCORE}</span>
    </div>
  </div>

  {#if form?.message}<p class="notice" role="alert">{form.message}</p>{/if}
  {#if form?.saved}<p class="notice" role="status">План обновлён.</p>{/if}
  {#if due.length}
    <section class="notice" aria-labelledby="reminder-title">
      <h2 id="reminder-title">Пора повторить</h2>
      <ul>
        {#each due as item (item.id)}
          <li>
            <a class="link" href={'#assessment-' + item.id}
              >{item.subject} · {shortDate(item.starts_at)}, {time(item.starts_at)}</a
            >
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="plan-grid">
    <section class="panel" aria-labelledby="focus-title">
      <div class="panel-head">
        <div>
          <h2 id="focus-title">Что сделать в первую очередь</h2>
          <p>
            Сначала аттестации на ближайшие 7 дней, затем дисциплины с баллом ниже {PASSING_SCORE}.
          </p>
        </div>
      </div>

      {#if data.focus.length}
        <form method="POST" action="?/advice" use:enhance={ask}>
          <button class="btn" disabled={pending}
            >{pending ? 'Готовим рекомендации…' : 'Подобрать шаги с ИИ'}</button
          >
        </form>
        <p class="caption" role="status">
          {#if pending}Помощник подбирает шаги по вашим дисциплинам.
          {:else if advice}Рекомендации ИИ. Темы и требования уточняйте у преподавателя.
          {:else}Базовый план подготовки.{/if}
        </p>
        <ol class="focus">
          {#each data.focus as item (item.key)}
            <li>
              <strong>{item.subject}</strong>
              <p class="caption">
                {item.points === null ? 'Баллов пока нет' : item.points + ' из 100'}
                {#if item.assessment}
                  · <a class="link" href={'#assessment-' + item.assessment.id}>
                    {lessonKinds[item.assessment.kind]}, {shortDate(item.assessment.starts_at)}
                  </a>{/if}
              </p>
              <p>{advice?.[item.key] ?? fallbackAdvice(item)}</p>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="muted">
          Шаги появятся, когда преподаватель добавит баллы или назначит аттестацию.
        </p>
      {/if}
    </section>

    <section class="panel" aria-labelledby="scores-title">
      <div class="panel-head">
        <div>
          <h2 id="scores-title">Текущие баллы</h2>
          <p>
            По данным раздела "Успеваемость". Порог пересдачи в шкале Деки составляет {PASSING_SCORE}
            баллов.
          </p>
        </div>
      </div>
      {#if data.grades.length}
        <div class="score-list">
          {#each data.grades as grade (grade.subject_id)}
            <div class="score">
              <h3 id={'score-' + grade.subject_id}>{grade.subject}</h3>
              <progress aria-labelledby={'score-' + grade.subject_id} max="100" value={grade.points}
              ></progress>
              <p class="caption">
                <strong>{grade.points} из 100</strong> · {scoreName(grade.points)}
              </p>
            </div>
          {/each}
        </div>
        <a class="link all-grades" href="/grades">Вся успеваемость</a>
      {:else}
        <p class="muted">Преподаватели ещё не добавили результаты.</p>
      {/if}
    </section>
  </div>

  <section class="panel" aria-labelledby="assessments-title">
    <div class="panel-head">
      <div>
        <h2 id="assessments-title">Аттестации</h2>
        <p>
          Отметки видны только вам. Для сигнала на устройстве скачайте событие и добавьте в
          календарь.
        </p>
      </div>
    </div>
    {#if data.assessments.length}
      <div class="assessment-grid">
        {#each data.assessments as item (item.id)}
          <AssessmentCard {item} now={data.now} />
        {/each}
      </div>
    {:else}
      <p class="muted">На ближайшие 30 дней экзамены и зачёты не назначены.</p>
      <a class="link all-grades" href="/schedule">Открыть расписание</a>
    {/if}
  </section>
</div>

<style>
  .metrics,
  .assessment-grid,
  .plan-grid {
    display: grid;
    gap: 14px;
  }
  .metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .assessment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .plan-grid {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }
  .metric {
    display: grid;
    gap: 3px;
    align-content: start;
    padding: 14px 16px;
    background: #f0edfe;
    color: #45338f;
    border: 1px solid #e2dcfa;
    border-radius: 14px;
  }
  .metric strong {
    font-size: 23px;
    line-height: 1.3;
  }
  .metric span,
  .caption {
    font-size: 13px;
  }
  .caption {
    color: #5b6273;
  }
  form + .caption {
    margin-top: 9px;
  }
  .notice {
    background: #fff5de;
    border: 1px solid #efdfb8;
    border-radius: 12px;
    padding: 11px 15px;
    color: #553d0c;
  }
  .notice h2 {
    font-size: 16px;
  }
  .notice ul {
    margin: 4px 0 0;
    padding-left: 20px;
  }
  .focus {
    margin: 8px 0 0;
    padding-left: 23px;
  }
  .focus li {
    padding: 10px 0;
  }
  .focus li + li {
    border-top: 1px solid var(--border);
  }
  .focus li p:last-child {
    margin-top: 4px;
    overflow-wrap: anywhere;
  }
  .score-list {
    display: grid;
    gap: 13px;
  }
  .score {
    display: grid;
    gap: 4px;
    overflow-wrap: anywhere;
  }
  progress {
    width: 100%;
    height: 9px;
    accent-color: var(--primary);
  }
  .all-grades {
    margin-top: 12px;
  }
  @media (max-width: 1000px) {
    .plan-grid,
    .assessment-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 480px) {
    .metrics {
      gap: 7px;
    }
    .metric {
      padding: 9px 8px;
    }
    .metric strong {
      font-size: 18px;
    }
    .metric span {
      font-size: 11px;
    }
  }
</style>
