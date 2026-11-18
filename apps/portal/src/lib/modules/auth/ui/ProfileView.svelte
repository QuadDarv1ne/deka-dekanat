<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { initials } from '#shared/formatting.ts';
  import { roleNames } from '#modules/auth/auth.labels.ts';
  import { installation } from '#shared/installation.svelte.ts';
  type PageProps = { data: { profile: import('../auth.types').User } };
  let { data }: PageProps = $props();
</script>

<svelte:head><title>Мой профиль · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Мой профиль</h1>
    <p>Ваши данные в университетской системе.</p>
  </div>
</div>
<section class="panel profile">
  <div class="row">
    <span class="avatar large">{initials(data.profile.full_name)}</span>
    <div>
      <h2>{data.profile.full_name}</h2>
      <span class="pill violet">{roleNames[data.profile.role]}</span>
    </div>
  </div>
  <dl>
    {#each [['Почта', data.profile.email], ['Факультет', data.profile.faculty_name], ['Группа', data.profile.group_name], ['Направление', data.profile.program], ['Курс', data.profile.course]] as [label, value]}{#if value}<div
        >
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>{/if}{/each}
  </dl>
  <div class="note">
    <Icon name="shield" size={18} /><span
      >Данные предоставлены университетом. Если нашли ошибку, обратитесь к администратору.</span
    >
  </div>
  {#if data.profile.role === 'student'}<a class="btn student-link" href="/student-card"
      ><Icon name="cap" size={18} />Студенческий билет<Icon name="arrow" size={16} /></a
    >{/if}
  {#if installation.event}<button
      class="btn secondary student-link"
      onclick={async () => {
        const event = installation.event;
        if (event) {
          await event.prompt();
          await event.userChoice;
          installation.event = null;
        }
      }}>Установить приложение</button
    >{/if}
</section>

<style>
  .profile {
    max-width: 800px;
  }
  .student-link {
    margin-top: 24px;
  }
  .profile .pill {
    margin-top: 9px;
  }
  .profile h2 {
    font-size: 21px;
  }
  dl {
    display: grid;
    margin: 30px 0;
    gap: 18px;
  }
  dl > div {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 20px;
    border-bottom: 1px solid #f2f3f7;
    padding-bottom: 18px;
    font-size: 13px;
  }
  dt {
    color: #676c75;
  }
  dd {
    margin: 0;
    color: #626b7e;
  }
  .note {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  @media (max-width: 600px) {
    dl > div {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .profile h2 {
      font-size: 17px;
    }
  }
</style>
