<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { shortDate, time } from '#shared/formatting.ts';
  import { lessonKinds, scoreName } from '#modules/academics/academic.labels.ts';
  import { attendanceLabels } from '#modules/academics/attendance.labels.ts';
  import { requestKinds } from '#modules/requests/request.labels.ts';
  import RequestStatusBadge from '#modules/requests/ui/RequestStatusBadge.svelte';
  import { PASSING_SCORE, fallbackAdvice } from '#modules/study-plan/study-plan.policy.ts';
  import { cabinetSections, type CabinetSection } from '#application/cabinet-navigation.ts';
  import type { CabinetSectionData } from '../cabinet.types.ts';

  let { section, content }: { section: CabinetSection; content: CabinetSectionData } = $props();
  const gradeDescriptions: Partial<Record<CabinetSection, string>> = {
    gradebook: 'Опубликованные результаты по дисциплинам.',
    portfolio:
      'Опубликованные учебные результаты. Проекты и сертификаты в кабинете пока недоступны.',
    brs: 'Текущие баллы по дисциплинам. Разбивка на работы и веса БРС пока недоступна.'
  };
</script>

<div class="section-head">
  <div>
    <a class="back-link" href="/profile"><Icon name="left" size={14} /> Профиль</a>
    <h1>{cabinetSections[section]}</h1>
  </div>
</div>

{#if content.view === 'news'}
  <div class="split">
    <section class="card" aria-labelledby="cabinet-notices">
      <h2 id="cabinet-notices">Уведомления</h2>
      <ul>
        {#each content.alerts as item (item.id)}
          <li>
            <form method="POST" action={'/notifications/' + item.id}>
              <button class="row-button" type="submit">
                <span
                  ><strong>{item.title}</strong><small
                    >{shortDate(item.created_at)}, {time(item.created_at)}{item.read_at
                      ? ''
                      : ' · Новое'}</small
                  ><span>{item.body}</span></span
                >
                <Icon name="arrow" size={16} />
              </button>
            </form>
          </li>
        {:else}
          <li class="empty">Уведомлений пока нет.</li>
        {/each}
      </ul>
    </section>
    <section class="card" aria-labelledby="cabinet-news">
      <h2 id="cabinet-news">Новости факультета</h2>
      <ul>
        {#each content.news as item (item.id)}
          <li>
            <div class="record">
              <strong>{item.title}</strong><small>{item.tag} · {shortDate(item.created_at)}</small>
              <p>{item.body}</p>
            </div>
          </li>
        {:else}
          <li class="empty">Объявлений пока нет.</li>
        {/each}
      </ul>
    </section>
  </div>
{:else if content.view === 'schedule'}
  <section class="card" aria-label="Ближайшие занятия">
    <div class="toolbar">
      <h2>Ближайшие занятия группы</h2>
      <a class="action" href="/schedule">Календарь расписания</a>
    </div>
    <ul>
      {#each content.lessons as item (item.id)}
        <li class="field">
          <span
            ><strong>{item.subject}</strong><small
              >{lessonKinds[item.kind]} · {item.room} · {item.teacher}</small
            ></span
          >
          <span class="value">{shortDate(item.starts_at)}, {time(item.starts_at)} МСК</span>
        </li>
      {:else}
        <li class="empty">
          {section === 'sport'
            ? 'Занятий по физкультуре в ближайшем расписании пока нет.'
            : 'Ближайших занятий пока нет.'}
        </li>
      {/each}
    </ul>
  </section>
{:else if content.view === 'attendance'}
  <section class="card" aria-label="Личные отметки">
    <div class="toolbar">
      <h2>Отметки за 30 дней</h2>
      <a class="action" href="/schedule/attendance">Сводка посещаемости</a>
    </div>
    <ul>
      {#each content.entries as item (item.id)}
        <li class="field">
          <span
            ><strong>{item.subject}</strong><small
              >{shortDate(item.starts_at)}, {time(item.starts_at)}</small
            ></span
          ><span class="value">{attendanceLabels[item.status ?? 'unmarked']}</span>
        </li>
      {:else}
        <li class="empty">Прошедших занятий пока нет.</li>
      {/each}
    </ul>
  </section>
{:else if content.view === 'curriculum'}
  <section class="card" aria-label="Дисциплины и преподаватели">
    <h2>{section === 'teachers' ? 'Преподаватели группы' : 'Дисциплины группы'}</h2>
    <p class="explanation">Сведения по опубликованным назначениям группы.</p>
    <ul>
      {#each content.entries as item (item.subject_id + item.teacher)}
        <li class="field">
          <span
            ><strong>{section === 'teachers' ? item.teacher : item.subject}</strong><small
              >{section === 'teachers' ? item.subject : item.teacher}</small
            ></span
          >
        </li>
      {:else}
        <li class="empty">Назначения для вашей группы пока не опубликованы.</li>
      {/each}
    </ul>
  </section>
{:else if content.view === 'grades' || content.view === 'debts'}
  <section class="card" aria-label="Результаты по дисциплинам">
    <div class="toolbar">
      <h2>
        {content.view === 'debts'
          ? 'Дисциплины ниже ' + PASSING_SCORE + ' баллов'
          : 'Учебные результаты'}
      </h2>
      <a class="action" href="/grades/progress">Прогресс</a>
    </div>
    {#if content.view === 'debts'}
      <p class="explanation">
        Ориентир по текущим баллам в «Деке». Официальные задолженности уточняйте в деканате.
      </p>
    {:else}
      <p class="explanation">{gradeDescriptions[section]}</p>
    {/if}
    <ul>
      {#each content.grades as item (item.subject_id)}
        <li class="field">
          <span
            ><strong>{item.subject}</strong>
            <small
              >{content.view === 'debts'
                ? 'До порога: ' + (PASSING_SCORE - item.points) + ' б.'
                : scoreName(item.points)}</small
            >
          </span>
          <span class="value">{item.points} / 100</span>
        </li>
      {:else}
        <li class="empty">
          {content.view === 'debts' && content.scored
            ? 'Среди опубликованных баллов нет результатов ниже порога.'
            : 'Баллы пока не опубликованы.'}
        </li>
      {/each}
    </ul>
  </section>
{:else if content.view === 'journal'}
  <section class="card" aria-label="Учебный журнал">
    <div class="toolbar">
      <h2>Результаты и посещаемость</h2>
      <a class="action" href="/grades/progress">Карточки дисциплин</a>
    </div>
    <ul>
      {#each content.courses as item (item.id)}
        <li class="field">
          <span
            ><strong>{item.subject}</strong><small
              >Был: {item.attendance.present} · пропуски: {item.attendance.absent} · уваж.: {item
                .attendance.excused} · без отметки: {item.attendance.unmarked}</small
            ></span
          >
          <span class="value">{item.points === null ? 'Баллов нет' : item.points + ' / 100'}</span>
        </li>
      {:else}
        <li class="empty">Учебные результаты и отметки ещё не опубликованы.</li>
      {/each}
    </ul>
  </section>
{:else if content.view === 'trajectory'}
  <section class="card" aria-label="Личная траектория">
    <div class="toolbar">
      <h2>Ближайшие шаги подготовки</h2>
      <a class="action" href="/assistant/study-plan#focus-title">План с ИИ</a>
    </div>
    <ul>
      {#each content.tasks as item (item.key)}
        <li class="record">
          <strong>{item.subject}</strong>
          <p>{fallbackAdvice(item)}</p>
          {#if item.assessment}<a
              class="action"
              href={'/assistant/study-plan#assessment-' + item.assessment.id}
              >{lessonKinds[item.assessment.kind]} · {shortDate(item.assessment.starts_at)}</a
            >{/if}
        </li>
      {:else}
        <li class="empty">Шаги появятся после публикации баллов или аттестаций.</li>
      {/each}
    </ul>
  </section>
{:else if content.view === 'applications'}
  <section class="card" aria-label="Мои заявления">
    <div class="toolbar">
      <h2>Мои заявления</h2>
      <a class="action" href="/requests/templates">Подать заявление</a>
    </div>
    <ul>
      {#each content.requests as item (item.id)}
        <li>
          <a class="field" href={'/requests/' + item.id}>
            <span
              ><strong>{requestKinds[item.kind]}</strong><small
                >№ {item.number} · {shortDate(item.updated_at)}</small
              ></span
            >
            <RequestStatusBadge status={item.status} />
          </a>
        </li>
      {:else}
        <li class="empty">Заявлений пока нет.</li>
      {/each}
    </ul>
  </section>
{:else}
  <section class="card resource" aria-label={cabinetSections[section]}>
    <p>{content.description}</p>
    <div>
      {#each content.links as item (item.href)}
        <a class="action" href={item.href}>{item.label} <Icon name="arrow" size={16} /></a>
      {/each}
    </div>
  </section>
{/if}

<style>
  .section-head {
    display: flex;
    gap: 8px;
    align-items: end;
    margin-bottom: 12px;
  }
  .back-link,
  .action {
    color: var(--cabinet-blue);
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    min-height: 36px;
  }
  .back-link:hover,
  .action:hover,
  .field:hover strong {
    text-decoration: underline;
  }
  .section-head h1 {
    font-size: 23px;
  }
  h2 {
    font-size: 15px;
  }
  .split {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-items: start;
  }
  .card {
    min-width: 0;
    background: white;
    border: 1px solid var(--cabinet-line);
    border-radius: var(--cabinet-radius);
    box-shadow: 0 2px 6px #19254d0a;
    padding: 18px 20px;
    overflow-wrap: anywhere;
  }
  .toolbar,
  .field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }
  .toolbar .action {
    padding-left: 0;
  }
  ul {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  li {
    border-top: 1px solid #eef0f4;
  }
  .field,
  .record,
  .empty,
  .row-button {
    padding: 8px 0;
    font-size: 13px;
  }
  .field small,
  .record small,
  .row-button small {
    display: block;
    color: var(--cabinet-muted);
    font-size: 12px;
  }
  .record p,
  .row-button span span {
    display: block;
    margin-top: 3px;
  }
  .value {
    color: var(--cabinet-blue);
    font-weight: 650;
  }
  .row-button {
    background: none;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    text-align: left;
    color: inherit;
    min-height: 44px;
  }
  .row-button:hover strong {
    text-decoration: underline;
  }
  .row-button :global(svg) {
    flex-shrink: 0;
    color: var(--cabinet-blue);
  }
  .explanation,
  .empty {
    color: var(--cabinet-muted);
    font-size: 12px;
    margin-top: 3px;
  }
  .resource div {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 17px;
    margin-top: 6px;
  }
  @media (max-width: 880px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 790px) {
    .section-head h1 {
      font-size: 20px;
    }
    .action,
    a.field {
      min-height: 44px;
    }
  }
</style>
