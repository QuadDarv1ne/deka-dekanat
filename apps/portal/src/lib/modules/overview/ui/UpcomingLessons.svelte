<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import type { OverviewData } from '../overview.types';
  import type { User } from '#modules/auth/auth.types.ts';
  let { data }: { data: OverviewData & { user: User } } = $props();
  import { shortDate, time } from '#shared/formatting.ts';
  import { lessonKinds } from '#modules/academics/academic.labels.ts';
  import { roomMapHref } from '#modules/campus/campus-links.ts';
</script>

<section class="panel upcoming">
  <div class="panel-head">
    <div>
      <h2>Ближайшие занятия</h2>
    </div>
    <a class="link" href="/schedule">Всё расписание <Icon name="arrow" size={14} /></a>
  </div>
  {#if data.schedule.length}<div class="lesson-list">
      {#each data.schedule as lesson, i (lesson.id)}
        {@const route = roomMapHref(lesson.room)}
        <div class="lesson-row">
          <div class="lesson-time">
            <strong>{time(lesson.starts_at)}</strong><small>{time(lesson.ends_at)}</small>
          </div>
          <div class="lesson-line" class:first={i === 0}></div>
          <div class="subject-icon {lesson.color}"><Icon name="book" size={19} /></div>
          <div class="lesson-subject">
            <strong>{lesson.subject}</strong><span
              >{lesson.teacher} <b>·</b>
              {#if route}<a class="room-link" href={route} aria-label={'Маршрут до ' + lesson.room}
                  >{lesson.room}</a
                >
              {:else}{lesson.room}{/if}
            </span>
          </div>
          <div class="lesson-type">
            <span>{shortDate(lesson.starts_at)}</span><small>{lessonKinds[lesson.kind]}</small>
          </div>
        </div>{/each}
    </div>{:else}<div class="empty">
      <Icon name="calendar" size={27} />
      <h3>Ближайших занятий пока нет</h3>
      <p>Они появятся после публикации расписания.</p>
    </div>{/if}
</section>

<style>
  .room-link {
    color: var(--primary);
  }
  .room-link:hover {
    text-decoration: underline;
  }
  .lesson-list {
    display: grid;
    gap: 5px;
  }
  .lesson-row {
    display: flex;
    gap: 13px;
    align-items: center;
    padding: 13px 0;
  }
  .lesson-time {
    width: 42px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .lesson-time strong {
    font-size: 13px;
    font-weight: 500;
  }
  .lesson-time small {
    font-size: 11px;
    color: #686c74;
  }
  .lesson-line {
    height: 37px;
    width: 2px;
    background: #efedf7;
    flex-shrink: 0;
    margin-right: 2px;
    border-radius: 3px;
  }
  .lesson-line.first {
    background: #af9fdc;
  }
  .lesson-subject {
    min-width: 0;
  }
  .lesson-subject strong {
    font-weight: 500;
    font-size: 13px;
    display: block;
    line-height: 1.5;
  }
  .lesson-subject span {
    display: block;
    font-size: 11px;
    color: #6a6c77;
    margin-top: 5px;
  }
  .lesson-subject b {
    font-weight: 400;
    margin: 0 5px;
    color: #686a6e;
  }
  .lesson-type {
    margin-left: auto;
    text-align: right;
    min-width: 65px;
  }
  .lesson-type > span {
    font-size: 12px;
    color: #646a75;
  }
  .lesson-type small {
    font-size: 11px;
    color: #686b71;
    display: block;
    margin-top: 5px;
  }
  @media (min-width: 1600px) {
    .lesson-subject strong {
      font-size: 13px;
    }
  }
  @media (max-width: 1300px) {
    .lesson-row {
      gap: 10px;
    }
    .lesson-type {
      display: none;
    }
  }
  @media (max-width: 600px) {
    .lesson-subject strong {
      font-size: 12px;
    }
    .lesson-subject span {
      font-size: 10px;
    }
    .lesson-row {
      gap: 10px;
    }
    .lesson-row .subject-icon {
      width: 32px;
      height: 34px;
    }
    .lesson-time {
      width: 36px;
    }
  }
</style>
