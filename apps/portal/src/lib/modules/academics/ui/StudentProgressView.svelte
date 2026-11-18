<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { shortDate, time } from '#shared/formatting.ts';
  import { PASSING_SCORE } from '#modules/study-plan/study-plan.policy.ts';
  import { lessonKinds, scoreName } from '../academic.labels.ts';
  import type { CourseProgress } from '../student-progress.types.ts';
  let { courses }: { courses: CourseProgress[] } = $props();
  const below = $derived(courses.filter((course) => (course.gap ?? 0) > 0).length);
</script>

<div class="page-head">
  <div>
    <h1>Прогресс по дисциплинам</h1>
    <p>Текущие баллы, аттестации на 30 дней и отметки за последние 30 дней.</p>
  </div>
  <a class="btn outline" href="/grades">Все оценки</a>
</div>

<div class="summary">
  <div><strong>{courses.length}</strong><span>Дисциплины в сводке</span></div>
  <div><strong>{below}</strong><span>Ниже {PASSING_SCORE} баллов</span></div>
  <a href="/assistant/study-plan#focus-title"
    ><Icon name="chat" size={20} /><span>План подготовки</span></a
  >
</div>

{#if courses.length}
  <div class="courses">
    {#each courses as course (course.id)}
      {@const visits = course.attendance}
      <section class="panel course" aria-labelledby={'course-' + course.id}>
        <div class="course-head">
          <h2 id={'course-' + course.id}>{course.subject}</h2>
          {#if course.points !== null}<strong>{course.points}<small> / 100</small></strong>{/if}
        </div>
        {#if course.points === null}
          <p class="muted">Баллы пока не опубликованы.</p>
        {:else}
          <progress value={course.points} max="100" aria-labelledby={'course-' + course.id}
          ></progress>
          {#if course.gap}
            <p class="gap">Не хватает {course.gap} б. до порога {PASSING_SCORE}.</p>
            <p class="muted">Сверьте работы и уточните у преподавателя, где можно добрать баллы.</p>
          {:else}
            <p class="muted">{scoreName(course.points)}</p>
          {/if}
        {/if}
        {#if visits.present + visits.absent + visits.excused + visits.unmarked}
          <p class="visits">
            <Icon name="check" size={16} /><span
              >Был: {visits.present} · пропуски: {visits.absent} · уваж.: {visits.excused} · без отметки:
              {visits.unmarked}</span
            >
          </p>
        {/if}
        {#if course.assessment}
          <a class="exam" href={'/assistant/study-plan#assessment-' + course.assessment.id}>
            <Icon name="calendar" size={18} />
            <span
              ><strong
                >{lessonKinds[course.assessment.kind]} · {shortDate(course.assessment.starts_at)}, {time(
                  course.assessment.starts_at
                )} МСК</strong
              >
              <small
                >{course.assessment.marked_ready
                  ? 'Вы отметили готовность'
                  : 'Открыть подготовку и напоминание'}</small
              ></span
            >
            <Icon name="arrow" size={16} />
          </a>
        {:else}
          <p class="muted no-exam">Аттестаций на ближайшие 30 дней нет.</p>
        {/if}
      </section>
    {/each}
  </div>
  <a class="link attendance" href="/schedule/attendance"
    >Весь журнал посещаемости <Icon name="arrow" size={15} /></a
  >
{:else}
  <section class="panel">
    <p class="muted">Дисциплины появятся после публикации баллов, занятий или аттестаций.</p>
  </section>
{/if}

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
    margin-bottom: 16px;
  }
  .summary > * {
    display: grid;
    align-content: start;
    justify-items: start;
    gap: 4px;
    padding: 10px 13px;
    background: #f0edfe;
    border: 1px solid #e2dcfa;
    border-radius: 11px;
    color: #43358b;
  }
  .summary strong {
    font-size: 20px;
    line-height: 1.15;
  }
  .summary span {
    font-size: 12px;
    line-height: 1.3;
  }
  .summary a:hover span {
    text-decoration: underline;
  }
  .courses {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .course {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 17px;
    overflow-wrap: anywhere;
  }
  .course-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .course-head h2 {
    font-size: 16px;
  }
  .course-head > strong {
    font-size: 18px;
    white-space: nowrap;
  }
  .course-head small {
    color: #555d6d;
    font-size: 11px;
  }
  progress {
    width: 100%;
    height: 8px;
    accent-color: var(--primary);
  }
  .course p {
    font-size: 12px;
  }
  .gap {
    color: #963d1b;
    font-weight: 650;
  }
  .visits {
    display: flex;
    gap: 6px;
    align-items: start;
    margin: 3px 0;
    color: #555d6d;
  }
  .visits > :global(svg) {
    flex-shrink: 0;
  }
  .exam {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    padding: 6px 9px;
    background: #f3f0fe;
    color: #453489;
    border-radius: 9px;
    font-size: 12px;
    margin-top: auto;
  }
  .exam:hover {
    background: #ebe5ff;
  }
  .exam > span {
    flex: 1;
  }
  .exam > :global(svg) {
    flex-shrink: 0;
  }
  .exam small {
    display: block;
    color: #57516a;
    font-size: 11px;
  }
  .no-exam {
    margin-top: auto;
    padding-top: 4px;
  }
  .attendance {
    min-height: 44px;
    margin-top: 5px;
  }
  @media (max-width: 850px) {
    .courses {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
