<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { fullDate } from '#shared/formatting.ts';
  import { enhance } from '$app/forms';
  type PageProps = {
    data: {
      announcements: import('../announcement.types').Announcement[];
      publicationId: string;
    } & import('#application/application.types.ts').ApplicationData;
    form?: { message?: string } | null;
  };
  let { data, form }: PageProps = $props();
  let publishing = $state(false);
  let removeId = $state<string | null>(null);
</script>

<svelte:head><title>Объявления · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Объявления</h1>
    <p>Учёба, возможности и всё, что важно знать.</p>
  </div>
  <span class="pill"><Icon name="news" size={14} />Ваш факультет</span>
</div>
<div class="announcements">
  {#if data.user.role === 'dean'}<section class="panel">
      <h2>Опубликовать объявление</h2>
      {#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
      <form
        method="POST"
        action="?/publish"
        class="form-grid publish-form"
        use:enhance={() => {
          publishing = true;
          return async ({ result, update }) => {
            await update({ reset: result.type !== 'failure' });
            publishing = false;
          };
        }}
      >
        <input type="hidden" name="id" value={data.publicationId} /><label
          >Заголовок<input name="title" minlength="3" maxlength="160" required /></label
        ><label
          >Категория<select name="tag"
            ><option>Учёба</option><option>События</option><option>Важно</option></select
          ></label
        ><label
          >Текст<textarea name="body" minlength="3" maxlength="3000" required rows="4"
          ></textarea></label
        >
        <div class="row wrap">
          <button class="btn" disabled={publishing}
            >{publishing ? 'Публикуем…' : 'Опубликовать'}</button
          ><span class="muted small">Студенты и преподаватели получат уведомление.</span>
        </div>
      </form>
    </section>{/if}
  {#each data.announcements as item}<article class="panel" id={item.id}>
      <div class="row between">
        <span class="pill violet">{item.tag}</span><span class="muted small"
          >{fullDate(item.created_at)}</span
        >
      </div>
      <h2>{item.title}</h2>
      <p>{item.body}</p>
      <div class="author">
        <span class="avatar"><Icon name="building" size={17} /></span><span
          >Деканат<span class="muted small">{data.user.faculty_name}</span></span
        >
      </div>
      {#if data.user.role === 'dean'}<form
          class="remove-form"
          method="POST"
          action="?/remove"
          use:enhance
        >
          <input type="hidden" name="id" value={item.id} /><button
            class="text-link"
            onclick={(event) => {
              if (removeId !== item.id) {
                event.preventDefault();
                removeId = item.id;
              }
            }}>{removeId === item.id ? 'Подтвердить удаление' : 'Удалить объявление'}</button
          >
        </form>{/if}
    </article>{:else}<div class="panel empty">
      <Icon name="news" size={30} />
      <h3>Пока нет объявлений</h3>
    </div>{/each}
</div>

<style>
  .publish-form {
    margin-top: 22px;
  }
  .remove-form {
    margin-top: 18px;
  }
  .announcements {
    display: grid;
    gap: 22px;
    max-width: 900px;
  }
  .announcements article {
    scroll-margin-top: 25px;
  }
  .announcements h2 {
    font-size: 21px;
    margin: 23px 0 14px;
    max-width: 580px;
  }
  .announcements article > p {
    font-size: 13px;
    color: #646b77;
    line-height: 1.9;
    max-width: 650px;
  }
  .author {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid #f1f2f6;
    font-size: 13px;
  }
  .author .avatar {
    width: 30px;
    height: 30px;
    border-radius: 9px;
  }
  .author .muted {
    display: block;
    margin-top: 2px;
    font-size: 11px;
  }
</style>
