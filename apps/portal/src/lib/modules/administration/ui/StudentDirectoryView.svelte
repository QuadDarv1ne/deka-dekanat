<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  let {
    data
  }: {
    data: {
      search: string;
      students: {
        id: string;
        full_name: string;
        email: string;
        group_name: string;
        program: string;
        course: number;
        card_number: string | null;
      }[];
    };
  } = $props();
</script>

<svelte:head><title>Студенты · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Студенты</h1>
    <p>Учётные записи доступных вам групп.</p>
  </div>
</div>
<section class="panel">
  <form method="GET" class="search-form">
    <label
      ><span class="sr-only">Имя, группа или почта</span><input
        name="q"
        type="search"
        value={data.search}
        placeholder="Имя, группа или почта"
        maxlength="100"
      /></label
    ><button class="btn secondary"><Icon name="search" size={16} />Найти</button>
  </form>
  <div class="table-wrap">
    <table class="data-table">
      <thead
        ><tr><th>Студент</th><th>Группа</th><th>Направление</th><th>Студенческий</th></tr></thead
      ><tbody
        >{#each data.students as s}<tr
            ><td><strong>{s.full_name}</strong><small>{s.email}</small></td><td
              >{s.group_name}<small>{s.course} курс</small></td
            ><td>{s.program}</td><td
              >{s.card_number ? 'ДК-' + s.card_number.padStart(7, '0') : 'Не выпущен'}</td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
  {#if !data.students.length}<div class="empty">
      <h3>Студенты не найдены</h3>
      <p>
        {data.search.trim()
          ? 'Попробуйте другое имя, группу, почту или номер студенческого.'
          : 'В доступных группах пока нет студентов.'}
      </p>
    </div>{/if}
</section>

<style>
  .search-form {
    display: flex;
    gap: 12px;
    max-width: 650px;
    margin-bottom: 24px;
  }
  .search-form label {
    flex: 1;
  }
  @media (max-width: 600px) {
    .search-form {
      display: grid;
    }
  }
</style>
