<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { shortDate } from '#shared/formatting.ts';
  import type { Grade } from '#modules/academics/academic.types.ts';
  import type { StudentHome } from '../student-home.types.ts';
  import { DAY_MS, PASSING_SCORE } from '#modules/study-plan/study-plan.policy.ts';
  let { home, grades }: { home: StudentHome; grades: Grade[] } = $props();
  const urgent = $derived(
    home.assessments.find(
      (a) => !a.marked_ready && Date.parse(a.starts_at) - home.now <= 7 * DAY_MS
    )
  );
  const below = $derived(grades.filter((g) => g.points < PASSING_SCORE));
  const question =
    'Что у меня важного на ближайшую неделю? Помоги составить короткий план подготовки по моим оценкам, аттестациям и посещаемости.';
</script>

<section class="panel focus" aria-labelledby="home-study">
  <div class="focus-heading">
    <h2 id="home-study">Сейчас важно</h2>
    <Icon name="check" size={18} />
  </div>
  <ul>
    {#if urgent}<li>
        <span class="marker warm"><Icon name="calendar" size={17} /></span><a
          href={'/assistant/study-plan#assessment-' + urgent.id}
          ><strong>{urgent.subject}</strong><span
            >Аттестация {shortDate(urgent.starts_at)}. Откройте план подготовки.</span
          ></a
        >
      </li>{/if}
    {#if below.length}<li>
        <span class="marker warm"><Icon name="chart" size={17} /></span><a href="/grades/progress"
          ><strong>Проверить результаты</strong><span
            >{below.map((g) => g.subject + ': ' + g.points).join('; ')}. Порог в кабинете: {PASSING_SCORE}.</span
          ></a
        >
      </li>{/if}
    {#if home.attendance.absent}<li>
        <span class="marker"><Icon name="book" size={17} /></span><a href="/schedule/attendance"
          ><strong>Отмечены пропуски: {home.attendance.absent}</strong><span
            >Проверьте записи посещаемости и уточните пропущенный материал.</span
          ></a
        >
      </li>{/if}
    {#if home.ready.count}<li>
        <span class="marker ready"><Icon name="file" size={17} /></span><a
          href={'/requests/' + home.ready.items[0].id}
          ><strong>{home.ready.count === 1 ? 'Документ готов' : 'Документы готовы'}</strong><span
            >Откройте заявление и сохраните документ.</span
          ></a
        >
      </li>{/if}
  </ul>
  {#if !urgent && !below.length && !home.attendance.absent && !home.ready.count}<p class="quiet">
      Новых срочных задач по данным кабинета нет. План подготовки остаётся доступен.
    </p>{/if}
  <div class="actions">
    <a class="btn secondary" href={'/assistant?question=' + encodeURIComponent(question)}
      ><Icon name="chat" size={16} />Обсудить с помощником</a
    ><a class="plan-link" href="/assistant/study-plan#focus-title"
      >Шаги подготовки с ИИ <Icon name="arrow" size={14} /></a
    >
  </div>
</section>

<style>
  .focus {
    padding: 20px;
    border-color: var(--border);
  }
  .focus-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--primary);
  }
  h2 {
    font-size: 17px;
    color: #25334c;
  }
  ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
  }
  li {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid #eef1f7;
  }
  li:last-child {
    border-bottom: 0;
  }
  .marker {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--accent);
    color: var(--primary);
  }
  .marker.warm {
    background: #fff4e5;
    color: #976123;
  }
  .marker.ready {
    background: #edf8f1;
    color: #327753;
  }
  li a {
    display: grid;
    gap: 3px;
    min-width: 0;
    min-height: 36px;
  }
  strong {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
  }
  li a > span,
  .quiet {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.6;
  }
  a:hover strong,
  .plan-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 14px;
  }
  .btn {
    font-size: 12px;
    min-height: 42px;
  }
  .plan-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 40px;
    font-size: 12px;
    color: var(--primary);
  }
  .quiet {
    padding-top: 14px;
  }
  @media (max-width: 600px) {
    .focus {
      padding: 16px;
    }
    .actions {
      align-items: stretch;
    }
    .btn {
      justify-content: center;
      width: 100%;
      min-height: 44px;
    }
  }
</style>
