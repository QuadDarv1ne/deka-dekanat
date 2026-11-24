<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { numericScore, scoreName } from '#modules/academics/academic.labels.ts';
  import { shortDate } from '#shared/formatting.ts';
  type PageProps = {
    data: {
      grades: import('../academic.types').Grade[];
      rank: { position: string; total: string } | null;
    } & import('#application/application.types.ts').ApplicationData;
  };
  let { data }: PageProps = $props();
  let search = $state('');
  const filtered = $derived(
    data.grades.filter((g) =>
      `${g.subject} ${g.student} ${g.teacher}`
        .toLocaleLowerCase('ru-RU')
        .replaceAll('ё', 'е')
        .includes(search.trim().toLocaleLowerCase('ru-RU').replaceAll('ё', 'е'))
    )
  );
  const average = $derived(
    data.grades.length
      ? (
          data.grades.reduce((sum, g) => sum + numericScore(g.points), 0) / data.grades.length
        ).toFixed(2)
      : null
  );
  const points = $derived(
    data.grades.length
      ? Math.round(data.grades.reduce((sum, g) => sum + g.points, 0) / data.grades.length)
      : null
  );
</script>

<svelte:head><title>Успеваемость · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>{data.user.role === 'student' ? 'Успеваемость' : 'Учебные результаты'}</h1>
    <p>
      {data.user.role === 'student'
        ? 'Ваш прогресс по дисциплинам текущего семестра.'
        : 'Текущие баллы по доступным вам дисциплинам и группам.'}
    </p>
  </div>
  {#if data.user.role !== 'student'}<a class="btn" href="/academics/manage?tab=grades"
      ><Icon name="settings" size={16} />Внести результаты</a
    >{:else if data.rank}<span class="pill violet"
      >Место в группе: {data.rank.position} из {data.rank.total}</span
    >{/if}
</div>
<div class="stack">
  <div class="grade-stats">
    <div class="panel grade-stat">
      <span class="subject-icon"><Icon name="chart" /></span>
      <div>
        <span>Средняя оценка</span><strong
          >{average ?? 'Нет данных'}{#if average !== null}<small> / 5</small>{/if}</strong
        >
      </div>
    </div>
    <div class="panel grade-stat">
      <span class="subject-icon blue"><Icon name="book" /></span>
      <div>
        <span>Средний балл</span><strong
          >{points ?? 'Нет данных'}{#if points !== null}<small> / 100</small>{/if}</strong
        >
      </div>
    </div>
    <div class="panel grade-stat">
      <span class="subject-icon green"><Icon name="check" /></span>
      <div><span>Результатов в журнале</span><strong>{data.grades.length}</strong></div>
    </div>
  </div>
  <section class="panel">
    <div class="panel-head">
      <div>
        <h2>Текущие результаты</h2>
        <p>Баллы по шкале от 0 до 100</p>
      </div>
      <label
        ><span class="sr-only">Поиск по предмету или студенту</span><input
          class="grade-search"
          type="search"
          placeholder="Найти дисциплину"
          bind:value={search}
        /></label
      >
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead
          ><tr
            ><th>Дисциплина</th>{#if data.user.role !== 'student'}<th>Студент / группа</th>{/if}<th
              >Баллы</th
            ><th>Оценка</th><th>Обновлено</th></tr
          ></thead
        ><tbody
          >{#each filtered as grade}<tr
              ><td
                ><div class="row">
                  <span class="subject-icon {grade.color}"><Icon name="book" size={17} /></span
                  ><span><strong>{grade.subject}</strong><small>{grade.teacher}</small></span>
                </div></td
              >{#if data.user.role !== 'student'}<td
                  >{grade.student}<small>{grade.group_name}</small></td
                >{/if}<td
                ><div class="points">
                  <strong>{grade.points}<small>/ 100</small></strong><span class="progress"
                    ><i style={`width:${grade.points}%`}></i></span
                  >
                </div></td
              ><td
                ><span
                  class="score"
                  class:excellent={grade.points >= 85}
                  class:low={grade.points < 55}>{numericScore(grade.points)}</span
                ><span class="score-label">{scoreName(grade.points)}</span></td
              ><td class="muted">{shortDate(grade.updated_at)}</td></tr
            >{/each}</tbody
        >
      </table>
    </div>
    {#if !filtered.length}<div class="empty">
        <Icon name="chart" size={28} />
        <h3>Результатов пока нет</h3>
        <p>Попробуйте другой запрос или дождитесь публикации оценок.</p>
      </div>{/if}
  </section>
  <div class="note">
    Шкала оценивания: 85–100 баллов: "отлично", 70–84: "хорошо", 55–69: "удовлетворительно".
  </div>
</div>

<style>
  .grade-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 22px;
  }
  .grade-stat {
    display: flex;
    gap: 18px;
    align-items: center;
  }
  .grade-stat > div > span {
    font-size: 13px;
    color: #686c75;
    display: block;
  }
  .grade-stat strong {
    font-family: Manrope, sans-serif;
    font-size: 28px;
    display: block;
    margin-top: 7px;
    letter-spacing: -0.03em;
  }
  .grade-stat small {
    font-size: 13px;
    font-weight: 400;
    color: #686b71;
  }
  .grade-search {
    font-size: 13px;
    width: 210px;
    min-height: 38px;
  }
  .points strong {
    display: flex;
    gap: 5px;
    align-items: center;
    font-weight: 500;
  }
  .points small {
    display: inline;
    margin: 0;
    color: #686c73;
  }
  .progress {
    display: block;
    width: 84px;
    height: 4px;
    background: #eeeaf8;
    border-radius: 4px;
    margin-top: 8px;
    overflow: hidden;
  }
  .progress i {
    display: block;
    height: 4px;
    background: #ac9ad9;
    border-radius: 4px;
  }
  .score {
    display: inline-grid;
    place-items: center;
    width: 25px;
    height: 27px;
    border-radius: 7px;
    background: #edf1fa;
    color: #5e6c8e;
    font-size: 13px;
  }
  .score.excellent {
    background: #eaf5ee;
    color: #567061;
  }
  .score.low {
    background: #fbecef;
    color: #856067;
  }
  .score-label {
    font-size: 12px;
    color: #686c75;
    margin-left: 8px;
  }
  @media (max-width: 1000px) {
    .grade-stats {
      gap: 12px;
    }
    .grade-stat {
      gap: 12px;
      padding: 20px;
    }
    .grade-stat > div > span {
      font-size: 11px;
    }
    .grade-stat strong {
      font-size: 24px;
    }
    .grade-stat > .subject-icon {
      display: none;
    }
    .score-label {
      display: none;
    }
  }
  @media (max-width: 600px) {
    .grade-stat {
      padding: 14px;
    }
    .grade-stat strong {
      font-size: 22px;
    }
    .grade-stat small {
      font-size: 12px;
    }
    .grade-stats {
      gap: 8px;
    }
    .panel-head {
      flex-wrap: wrap;
    }
    .grade-search {
      width: 100%;
    }
    .panel-head label {
      width: 100%;
    }
    .page-head > .pill {
      display: none;
    }
    .data-table .subject-icon {
      display: none;
    }
  }
  @media (max-width: 420px) {
    .grade-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .grade-stat:last-child {
      grid-column: 1 / -1;
    }
  }
</style>
