<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { initials } from '#shared/formatting.ts';
  import { roleNames } from '#modules/auth/auth.labels.ts';
  type PageProps = { data: { users: import('../administration.types').AccountSummary[] } };
  let { data }: PageProps = $props();
  let search = $state('');
  const users = $derived(
    data.users.filter((u) =>
      `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    )
  );
</script>

<svelte:head><title>Пользователи · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Пользователи</h1>
    <p>Состав пользователей и назначенные роли.</p>
  </div>
  <span class="pill violet"><Icon name="users" size={14} />{data.users.length} учётных записей</span
  >
</div>
<section class="panel">
  <div class="panel-head">
    <h2>Учётные записи</h2>
    <label
      ><span class="sr-only">Найти пользователя</span><input
        type="search"
        bind:value={search}
        placeholder="Имя или почта"
      /></label
    >
  </div>
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Пользователь</th><th>Роль</th><th>Группа</th><th>Статус</th></tr></thead><tbody
        >{#each users as user}<tr
            ><td
              ><div class="row">
                <span class="avatar">{initials(user.full_name)}</span><span
                  ><strong>{user.full_name}</strong><small>{user.email}</small></span
                >
              </div></td
            ><td>{roleNames[user.role]}</td><td class="muted">{user.group_name ?? 'Нет данных'}</td
            ><td
              ><span class="pill" class:green={user.active}
                >{user.active ? 'Активен' : 'Отключён'}</span
              ></td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
  {#if !users.length}<div class="empty">Пользователей не найдено.</div>{/if}
</section>

<style>
  label input {
    width: 220px;
    font-size: 13px;
    min-height: 38px;
  }
  @media (max-width: 600px) {
    .page-head {
      flex-wrap: wrap;
    }
    .panel-head {
      flex-wrap: wrap;
    }
  }
</style>
