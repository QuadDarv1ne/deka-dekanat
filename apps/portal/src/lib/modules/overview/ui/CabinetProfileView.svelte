<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { initials, shortDate, time } from '#shared/formatting.ts';
  import { installation } from '#shared/installation.svelte.ts';
  import type { User } from '#modules/auth/auth.types.ts';
  import { lessonKinds } from '#modules/academics/academic.labels.ts';
  import { PASSING_SCORE } from '#modules/study-plan/study-plan.policy.ts';
  import type { CabinetProfileData } from '../cabinet.types.ts';
  import { cabinetPath } from '#application/cabinet-navigation.ts';
  import { campusPath } from '#modules/campus/campus-links.ts';

  let { user, summary }: { user: User; summary: CabinetProfileData } = $props();
  const identity = $derived([['Университетская почта', user.email]]);
  const education = $derived([
    ['Факультет', user.faculty_name],
    ['Образовательная программа', user.program],
    ['Учебная группа', user.group_name],
    ['Курс', user.course]
  ]);
  const services = [
    { href: cabinetPath('applications'), label: 'Заявления', icon: 'files' },
    { href: campusPath, label: 'Карта МГИМО', icon: 'pin' },
    { href: cabinetPath('resources'), label: 'Ресурсы', icon: 'book' },
    { href: cabinetPath('support'), label: 'Техническая поддержка', icon: 'help' }
  ] as const;
</script>

<svelte:head><title>Мой профиль · Дека</title></svelte:head>

<section class="card identity" aria-label="Профиль студента">
  <span class="avatar-photo" aria-hidden="true">{initials(user.full_name)}</span>
  <div class="identity-content">
    <h1>{user.full_name}</h1>
    <p class="tags">
      {#if user.group_name}<strong>{user.group_name}</strong>{/if}
      {#if user.course}<span>{user.course} курс</span>{/if}
      <span class="student-status"><span aria-hidden="true"></span>Студент</span>
      <a class="services-jump" href="#profile-services">Сервисы <Icon name="down" size={14} /></a>
    </p>
    <dl class="quick-facts">
      {#each identity as [label, value] (label)}
        {#if value}<div>
            <dt>{label}</dt>
            <dd>
              {#if label === 'Университетская почта'}<a class="email" href={'mailto:' + value}
                  >{value}</a
                >{:else}{value}{/if}
            </dd>
          </div>{/if}
      {/each}
    </dl>
  </div>
</section>

<div class="columns">
  <section class="card education" aria-labelledby="education-heading">
    <h2 id="education-heading">Информация об обучении</h2>
    <dl>
      {#each education as [label, value] (label)}
        {#if value}<div>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>{/if}
      {/each}
    </dl>
    <div class="education-actions">
      <a href="/student-card"><Icon name="cap" size={15} /> Студенческий билет</a>
      {#if installation.event}
        <button
          onclick={async () => {
            const event = installation.event;
            if (event) {
              await event.prompt();
              await event.userChoice;
              installation.event = null;
            }
          }}>Установить приложение</button
        >
      {/if}
    </div>
  </section>

  <div class="right">
    <section class="card academic" aria-labelledby="academic-heading">
      <span class="academic-icon"><Icon name="chart" size={26} /></span>
      <div>
        <h2 id="academic-heading">Баллы по дисциплинам</h2>
        {#if summary.scored}<p>{summary.below} из {summary.scored} ниже {PASSING_SCORE} баллов</p>
        {:else}<p>Баллы пока не опубликованы.</p>{/if}
        <a href="/profile/debts">Открыть результаты <Icon name="arrow" size={14} /></a>
        {#if summary.next}
          <p>
            {lessonKinds[summary.next.kind]} · {summary.next.subject} · {shortDate(
              summary.next.starts_at
            )}
          </p>
        {/if}
      </div>
    </section>
    <section class="card inbox" aria-labelledby="notification-heading">
      <div class="heading">
        <h2 id="notification-heading">Уведомления</h2>
        <a href="/profile/news">Все уведомления</a>
      </div>
      {#each summary.alerts as alert (alert.id)}
        <form method="POST" action={'/notifications/' + alert.id}>
          <button class="notification" type="submit">
            <Icon name="bell" size={17} />
            <span
              ><strong>{alert.title}</strong><small
                >{shortDate(alert.created_at)}, {time(alert.created_at)}</small
              ></span
            >
          </button>
        </form>
      {:else}
        <p class="empty-copy">Непрочитанных уведомлений нет.</p>
      {/each}
    </section>
  </div>
</div>

<section class="panel services" aria-labelledby="profile-services">
  <div class="panel-head"><h2 id="profile-services">Сервисы</h2></div>
  <ul>
    {#each services as service (service.href)}
      <li>
        <a href={service.href}>
          <span class="subject-icon"><Icon name={service.icon} size={18} /></span>
          <strong>{service.label}</strong>
          <Icon name="arrow" size={15} />
        </a>
      </li>
    {/each}
  </ul>
</section>

<style>
  .card {
    min-width: 0;
    background: #fff;
    border: 1px solid var(--cabinet-line);
    border-radius: var(--cabinet-radius);
    box-shadow:
      0 2px 5px #25345b06,
      0 8px 20px #25345b03;
  }
  .identity {
    display: flex;
    align-items: center;
    gap: 28px;
    min-height: 192px;
    padding: 28px;
  }
  .avatar-photo {
    display: grid;
    place-items: center;
    width: 128px;
    height: 128px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--cabinet-light);
    color: var(--cabinet-blue);
    font-family: Manrope, sans-serif;
    font-size: 40px;
    font-weight: 750;
    letter-spacing: -0.04em;
  }
  .identity-content {
    min-width: 0;
    flex: 1;
  }
  h1 {
    font-size: clamp(22px, 2.1vw, 28px);
    letter-spacing: -0.035em;
    line-height: 1.3;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }
  h2 {
    font-size: 17px;
    letter-spacing: -0.025em;
    line-height: 1.4;
  }
  .tags {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 12px;
    color: #46516a;
    font-size: 13px;
  }
  .tags strong {
    padding: 4px 11px;
    border-radius: 16px;
    background: var(--cabinet-blue);
    color: #fff;
    font-size: 12px;
    font-weight: 650;
  }
  .student-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .student-status > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3c8a73;
  }
  .services-jump {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    min-height: 32px;
    color: var(--primary);
    font-size: 12px;
    font-weight: 600;
  }
  .services-jump:hover {
    text-decoration: underline;
  }
  .quick-facts {
    display: grid;
    grid-template-columns: minmax(180px, max-content) minmax(0, 1fr);
    gap: 10px 30px;
    margin: 18px 0 0;
  }
  .quick-facts > div {
    min-width: 0;
  }
  dt,
  .academic p,
  .empty-copy {
    color: var(--cabinet-muted);
    font-size: 12px;
  }
  .quick-facts dt {
    margin-bottom: 3px;
  }
  dd {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  .email {
    color: #344360;
    font-weight: 400;
    font-size: inherit;
  }
  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 16px;
    margin-top: 16px;
  }
  .right {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 16px;
    min-width: 0;
  }
  .education {
    display: flex;
    flex-direction: column;
    min-height: 352px;
    padding: 22px;
  }
  .education dl {
    margin: 16px 0 0;
  }
  .education dl > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 16px;
    padding: 13px 0;
    border-bottom: 1px solid #eef0f5;
  }
  .education dl > div:last-child {
    border-bottom: 0;
  }
  .education dt {
    padding-top: 2px;
  }
  .education-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
    margin-top: auto;
    padding-top: 15px;
    border-top: 1px solid #eef0f5;
  }
  .education-actions button {
    border: 0;
    background: transparent;
    padding: 0;
  }
  a,
  .education-actions button {
    color: var(--cabinet-blue);
    font-size: 12px;
    font-weight: 600;
  }
  a:hover,
  .education-actions button:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--cabinet-blue);
    outline-offset: 3px;
    border-radius: 4px;
  }
  .education-actions > *,
  .academic a,
  .heading a {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
  }
  .academic {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 116px;
    padding: 16px 20px;
    border-left: 3px solid #4258be;
  }
  .academic > div {
    min-width: 0;
  }
  .academic h2 {
    font-size: 15px;
  }
  .academic p {
    margin-top: 3px;
    line-height: 1.5;
  }
  .academic-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    border-radius: 9px;
    background: var(--cabinet-light);
    color: var(--cabinet-blue);
  }
  .academic a {
    margin-top: 2px;
    min-height: 28px;
  }
  .inbox {
    overflow: hidden;
  }
  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px 12px;
    min-height: 60px;
    padding: 10px 20px;
  }
  .heading h2 {
    font-size: 16px;
  }
  .heading a {
    font-size: 11px;
  }
  .notification {
    display: flex;
    align-items: center;
    gap: 13px;
    width: 100%;
    min-height: 72px;
    padding: 13px 20px;
    border: 0;
    border-top: 1px solid #eef0f5;
    background: transparent;
    color: inherit;
    text-align: left;
  }
  .notification:hover {
    background: #f8f7fc;
  }
  .notification > span {
    min-width: 0;
  }
  .notification :global(svg) {
    flex-shrink: 0;
    color: var(--cabinet-blue);
  }
  .notification strong {
    display: block;
    font-size: 13px;
    font-weight: 550;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .notification small {
    display: block;
    margin-top: 3px;
    color: var(--cabinet-muted);
    font-size: 11px;
  }
  .empty-copy {
    padding: 22px 20px;
    border-top: 1px solid #eef0f5;
  }
  .services {
    margin-top: 20px;
    scroll-margin-top: 16px;
  }
  .services ul {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .services a {
    display: flex;
    align-items: center;
    gap: 11px;
    min-height: 58px;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    font-size: 13px;
  }
  .services a:hover {
    color: var(--primary);
    background: #f8f7fc;
    border-color: #dcd5f1;
  }
  .services strong {
    font-weight: 550;
    overflow-wrap: anywhere;
  }
  .services a > :global(svg:last-child) {
    margin-left: auto;
    flex-shrink: 0;
    color: var(--primary);
  }
  @media (max-width: 1050px) {
    .services ul {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
  @media (max-width: 1100px) {
    .identity {
      gap: 20px;
      padding: 24px;
    }
    .avatar-photo {
      width: 112px;
      height: 112px;
      font-size: 35px;
    }
    .quick-facts {
      grid-template-columns: minmax(145px, max-content) minmax(0, 1fr);
      gap: 10px 20px;
    }
    .education {
      padding: 20px;
    }
  }
  @media (max-width: 900px) {
    .identity {
      min-height: 176px;
    }
    h1 {
      font-size: 25px;
    }
  }
  @media (max-width: 680px) {
    .identity {
      align-items: flex-start;
      gap: 16px;
      min-height: 0;
      padding: 20px;
    }
    .avatar-photo {
      width: 64px;
      height: 64px;
      font-size: 23px;
    }
    h1 {
      font-size: 21px;
      text-wrap: initial;
    }
    .tags {
      gap: 7px 10px;
      margin-top: 10px;
      font-size: 12px;
    }
    .services-jump {
      min-height: 44px;
    }
    .quick-facts {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .columns {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      margin-top: 12px;
    }
    .right {
      gap: 12px;
    }
    .education {
      min-height: 0;
      padding: 20px;
    }
    .education dl > div {
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 12px;
    }
    .education-actions {
      margin-top: 12px;
      padding-top: 10px;
    }
    .education-actions > *,
    .academic a,
    .heading a {
      min-height: 44px;
    }
    .academic {
      padding: 16px 18px;
    }
    .heading {
      padding: 8px 18px;
    }
    .notification {
      padding: 14px 18px;
    }
  }
  @media (max-width: 360px) {
    .identity {
      gap: 12px;
      padding: 16px;
    }
    .avatar-photo {
      width: 48px;
      height: 48px;
      font-size: 18px;
    }
    h1 {
      font-size: 19px;
    }
    .education {
      padding: 16px;
    }
  }
</style>
