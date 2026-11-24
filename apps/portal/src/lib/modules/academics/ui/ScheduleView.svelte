<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { time } from '#shared/formatting.ts';
  import { lessonKinds } from '#modules/academics/academic.labels.ts';
  import { roomMapHref } from '#modules/campus/campus-links.ts';
  type PageProps = {
    data: {
      lessons: import('../academic.types').Lesson[];
      today: string;
    } & import('#application/application.types.ts').ApplicationData;
  };
  let { data }: PageProps = $props();
  const dayKey = (date: string) =>
    new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
  const days = $derived([...new Set(data.lessons.map((l) => dayKey(l.starts_at)))]);
  let selected = $state('');
  const selectedDay = $derived(
    days.includes(selected)
      ? selected
      : (days.find((day) => day >= data.today) ?? days.at(-1) ?? '')
  );
  const displayed = $derived(data.lessons.filter((l) => dayKey(l.starts_at) === selectedDay));
  const pairNumbers = $derived.by(() => {
    const numbers = new Map<string, number>();
    let pair = 0;
    for (const lesson of displayed) if (!lesson.cancelled_at) numbers.set(lesson.id, ++pair);
    return numbers;
  });
  const activeCount = $derived(displayed.filter((lesson) => !lesson.cancelled_at).length);
  const dayName = (value: string) =>
    new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'Europe/Moscow' }).format(
      new Date(value + 'T12:00:00+03:00')
    );
  function revealDay(node: HTMLButtonElement, active: boolean) {
    const place = (chosen: boolean) => {
      if (!chosen) return;
      const scroller = node.parentElement;
      if (!scroller) return;
      const left = node.offsetLeft - (scroller.clientWidth - node.offsetWidth) / 2;
      scroller.scrollLeft = Math.max(0, left);
    };
    place(active);
    return { update: place };
  }
  const dateName = (value: string) =>
    new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Moscow'
    }).format(new Date(value + 'T12:00:00+03:00'));
</script>

<svelte:head><title>Расписание · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Расписание</h1>
    <p>
      {data.user.role === 'student'
        ? [data.user.group_name, data.user.program].filter(Boolean).join(' · ')
        : data.user.role === 'teacher'
          ? 'Ваши занятия и закреплённые группы'
          : 'Занятия вашего факультета'}
    </p>
  </div>
  <div class="row wrap">
    <a class="btn secondary" href="/schedule/calendar"
      ><Icon name="download" size={16} />В календарь</a
    >{#if data.user.role === 'dean'}<a class="btn" href="/academics/manage?tab=schedule"
        ><Icon name="settings" size={16} />Управление</a
      >{/if}
  </div>
</div>
<div class="stack">
  <section class="panel day-picker">
    <div class="panel-head">
      <h2>Учебные дни</h2>
      <span class="muted small"
        >{days[0] && days[0] < data.today ? 'С начала недели' : 'Ближайшие 30 дней'}</span
      >
    </div>
    <div class="days">
      {#each days as day (day)}<button
          type="button"
          use:revealDay={selectedDay === day}
          class:chosen={selectedDay === day}
          aria-pressed={selectedDay === day}
          aria-label={dateName(day)}
          onclick={() => (selected = day)}
          ><span>{dayName(day)}</span><strong>{Number(day.slice(-2))}</strong><small
            >{dateName(day).split(' ').slice(1).join(' ')}</small
          ></button
        >{/each}
    </div>
    {#if !days.length}<div class="empty">
        <Icon name="calendar" size={30} />
        <h3>Расписание ещё не опубликовано</h3>
      </div>{/if}
  </section>
  {#if selectedDay}<section class="panel">
      <div class="panel-head">
        <h2 class="day-heading">{dayName(selectedDay)}, {dateName(selectedDay)}</h2>
        <span class="pill">Занятий: {activeCount}</span>
        {#if displayed.length > activeCount}<span class="pill"
            >Отменено: {displayed.length - activeCount}</span
          >{/if}
      </div>
      <div class="lessons">
        {#each displayed as lesson, i (lesson.id)}
          {@const cancelled = !!lesson.cancelled_at}
          {@const previousRoom = displayed.slice(0, i).findLast((item) => !item.cancelled_at)?.room}
          {@const route = cancelled ? null : roomMapHref(lesson.room, previousRoom)}
          <article class="lesson" class:cancelled>
            <div class="times">
              <strong>{time(lesson.starts_at)}</strong><span>{time(lesson.ends_at)}</span><small
                >{cancelled ? 'Отменено' : `${pairNumbers.get(lesson.id)} пара`}</small
              >
            </div>
            <div class="lesson-card {lesson.color}">
              <div class="row between wrap">
                <span class="pill">{lessonKinds[lesson.kind]}</span>
                {#if route}<a
                    class="room room-link"
                    href={route}
                    aria-label={'Маршрут до ' + lesson.room}
                    ><Icon name="pin" size={15} />{lesson.room}</a
                  >
                {:else}<span class="room"><Icon name="building" size={15} />{lesson.room}</span
                  >{/if}
              </div>
              <h3>{lesson.subject}</h3>
              <p>{lesson.teacher}</p>
              <div class="row between wrap">
                <span class="group"><Icon name="users" size={14} />{lesson.group_name}</span
                >{#if lesson.note}<span class="lesson-note">{lesson.note}</span>{/if}
              </div>
            </div>
          </article>{/each}
      </div>
    </section>{/if}
</div>

<style>
  .days {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 3px 3px 8px;
  }
  .days button {
    min-width: 85px;
    display: grid;
    gap: 4px;
    text-align: center;
    justify-items: center;
    background: #f7f8fb;
    padding: 13px 18px;
    border-radius: 12px;
    color: #686c77;
    border: 1px solid transparent;
  }
  .days button.chosen {
    background: #f0ecfc;
    border-color: #d9d0f2;
    color: #7b6bb2;
  }
  .days button span {
    text-transform: uppercase;
    font-size: 12px;
  }
  .days button strong {
    font-family: Manrope, sans-serif;
    font-size: 23px;
    font-weight: 600;
    color: #65657c;
  }
  .days button small {
    font-size: 12px;
  }
  .day-heading::first-letter {
    text-transform: uppercase;
  }
  .lessons {
    display: grid;
    gap: 20px;
  }
  .lesson {
    display: flex;
    gap: 26px;
  }
  .times {
    width: 52px;
    flex-shrink: 0;
    display: grid;
    align-content: start;
    gap: 5px;
    padding-top: 20px;
  }
  .times strong {
    font-size: 15px;
    font-weight: 500;
  }
  .times span {
    font-size: 13px;
    color: #676c76;
  }
  .times small {
    font-size: 12px;
    color: #6a6c73;
    margin-top: 10px;
  }
  .lesson-card {
    border: 1px solid #e7e2f3;
    border-left: 3px solid #b4a4dd;
    background: #fcfbff;
    border-radius: 12px;
    flex: 1;
    padding: 19px 23px;
    min-width: 0;
  }
  .lesson-card.blue {
    border-color: #e1e9f5;
    border-left-color: #a1badf;
    background: #fbfdff;
  }
  .lesson-card.orange {
    border-color: #f1e5d8;
    border-left-color: #dcb793;
    background: #fffdfa;
  }
  .lesson-card.green {
    border-color: #e1ece5;
    border-left-color: #9cbfa9;
    background: #fbfefc;
  }
  .lesson.cancelled .lesson-card {
    background: #f6f6f8;
    border-color: #e4e4e8;
    border-left-color: #b5b5bd;
  }
  .lesson.cancelled h3 {
    color: #6c7078;
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }
  .lesson.cancelled .times strong,
  .lesson.cancelled .times span,
  .lesson.cancelled .lesson-card p,
  .lesson.cancelled .room,
  .lesson.cancelled .group {
    color: #7a7e86;
  }
  .lesson-card h3 {
    font-size: 16px;
    margin: 16px 0 6px;
  }
  .lesson-card p {
    font-size: 13px;
    color: #656a75;
    margin-bottom: 18px;
  }
  .lesson-card .pill {
    font-size: 12px;
    background: #eeebf6;
    color: #6e677d;
  }
  .room,
  .group {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: #686a75;
  }
  .lesson-note {
    font-size: 12px;
    color: #786851;
  }
  .room-link {
    color: var(--primary);
    min-height: 28px;
  }
  .room-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .day-picker {
    padding-bottom: 16px;
  }
  @media (max-width: 600px) {
    .lesson {
      gap: 13px;
    }
    .lesson-card {
      padding: 15px;
    }
    .lesson-card h3 {
      font-size: 14px;
    }
    .times {
      width: 43px;
    }
    .times strong {
      font-size: 13px;
    }
    .room {
      font-size: 12px;
    }
    .room-link {
      min-height: 44px;
    }
    .days button {
      min-width: 70px;
      padding: 12px;
    }
    .page-head .pill {
      display: none;
    }
  }
</style>
