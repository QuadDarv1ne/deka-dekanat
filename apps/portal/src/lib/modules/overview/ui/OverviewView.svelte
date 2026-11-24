<script lang="ts">
  import OverviewHero from './OverviewHero.svelte';
  import OverviewMetrics from './OverviewMetrics.svelte';
  import UpcomingLessons from './UpcomingLessons.svelte';
  import OverviewAnnouncements from './OverviewAnnouncements.svelte';
  import RecentRequests from './RecentRequests.svelte';
  import OverviewStudentDetails from './OverviewStudentDetails.svelte';
  import type { StudentHome } from '../student-home.types';
  import Icon from '#shared/ui/Icon.svelte';
  import { academicTerm } from '#shared/formatting.ts';
  type PageProps = {
    data: import('../overview.types').OverviewData &
      import('#application/application.types.ts').ApplicationData & {
        studentHome: StudentHome | null;
      };
  };
  let { data }: PageProps = $props();
  const nameParts = $derived(data.user.full_name.trim().split(/\s+/));
  const firstName = $derived(nameParts[nameParts.length >= 3 ? 1 : 0]);
  const student = $derived(data.user.role === 'student');
  const dean = $derived(data.user.role === 'dean');
  const term = academicTerm();
  const date = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow'
  }).format(new Date());
</script>

<svelte:head><title>Обзор · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Здравствуйте, {firstName}</h1>
    <p class="today">
      {date}<span>·</span>{data.user.group_name ?? data.user.faculty_name ?? 'Управление системой'}
    </p>
  </div>
  <span class="semester"
    ><Icon name="calendar" size={14} />{term.season} <strong>{term.years}</strong></span
  >
</div>
<div class="stack">
  <div class="hero-grid">
    <OverviewHero {data} />
    <OverviewMetrics {data} />
  </div>
  <div class="details-grid">
    {#if data.user.role !== 'admin'}<UpcomingLessons {data} />{:else}<section class="panel">
        <div class="panel-head">
          <h2>Рабочее пространство администратора</h2>
          <Icon name="shield" />
        </div>
        <p class="prose">
          Проверяйте состав пользователей и журнал изменений. Права на учебные данные и обработку
          заявлений определяются назначенной ролью.
        </p>
        <div class="admin-shortcuts">
          <a href="/people"
            ><Icon name="users" /><strong>Учётные записи</strong><span>Состав и роли</span><Icon
              name="arrow"
              size={16}
            /></a
          ><a href="/audit"
            ><Icon name="shield" /><strong>Журнал действий</strong><span>Прозрачная история</span
            ><Icon name="arrow" size={16} /></a
          >
        </div>
      </section>{/if}
    <OverviewAnnouncements {data} />
  </div>
  {#if data.studentHome}<OverviewStudentDetails home={data.studentHome} grades={data.grades} />{/if}
  {#if student || dean}<RecentRequests {data} />{/if}
</div>

<style>
  .today {
    text-transform: none;
  }
  .today::first-letter {
    text-transform: uppercase;
  }
  .today > span {
    margin: 0 10px;
    color: #696c70;
  }
  .semester {
    display: flex;
    gap: 7px;
    align-items: center;
    font-size: 12px;
    color: #686c78;
    border: 1px solid #e3e6ee;
    padding: 9px 12px;
    border-radius: 9px;
  }
  .semester strong {
    font-weight: 400;
    color: #666c7c;
  }
  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 2.2fr) minmax(235px, 1fr);
    gap: 22px;
  }
  .details-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(270px, 1fr);
    gap: 22px;
  }
  .admin-shortcuts {
    display: grid;
    gap: 12px;
    margin-top: 25px;
  }
  .admin-shortcuts a {
    display: flex;
    align-items: center;
    gap: 15px;
    border: 1px solid #eeedf6;
    padding: 20px;
    border-radius: 12px;
    color: #71649b;
  }
  .admin-shortcuts strong {
    font-size: 13px;
    font-weight: 500;
    color: #585769;
  }
  .admin-shortcuts span {
    font-size: 12px;
    color: #6a6c75;
  }
  .admin-shortcuts a > :global(svg:last-child) {
    margin-left: auto;
  }
  @media (max-width: 1300px) {
    .details-grid {
      grid-template-columns: minmax(0, 1.5fr) minmax(230px, 1fr);
    }
  }
  @media (max-width: 1000px) {
    .hero-grid {
      grid-template-columns: 1fr;
    }
    .details-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 600px) {
    .hero-grid,
    .details-grid {
      gap: 18px;
    }
    .today {
      max-width: 280px;
      font-size: 12px !important;
    }
    .semester {
      display: none;
    }
  }
</style>
