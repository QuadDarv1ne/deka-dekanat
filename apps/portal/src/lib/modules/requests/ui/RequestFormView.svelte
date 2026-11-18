<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '#shared/ui/Icon.svelte';
  import { requestKinds } from '#modules/requests/request.labels.ts';
  type PageProps = {
    data: { id: string } & import('#application/application.types.ts').ApplicationData;
    form?: { message?: string } | null;
  };
  let { data, form }: PageProps = $props();
  let pending = $state(false);
  let kind = $state('study');
</script>

<svelte:head><title>Новое заявление · Дека</title></svelte:head>
<a class="back" href="/requests"><Icon name="left" size={15} />Все заявления</a>
<div class="page-head">
  <div>
    <h1>Новое заявление</h1>
    <p>Выберите тип заявления и укажите цель обращения.</p>
  </div>
</div>
<div class="new-request-grid">
  <section class="panel">
    <form
      method="POST"
      class="form-grid"
      use:enhance={() => {
        pending = true;
        return async ({ update }) => {
          await update({ reset: false });
          pending = false;
        };
      }}
    >
      <input type="hidden" name="id" value={data.id} /><label
        >Тип заявления<select name="kind" bind:value={kind}
          >{#each Object.entries(requestKinds) as [value, label]}<option {value}>{label}</option
            >{/each}</select
        ></label
      ><label
        >Цель обращения<textarea
          name="details"
          placeholder="Например: справка для предоставления по месту работы. Один экземпляр."
          minlength="3"
          maxlength="2000"
          required></textarea><small
          >Укажите цель, нужное количество экземпляров и другие важные детали.</small
        ></label
      >
      <div class="applicant">
        <span class="eyebrow">Заявитель</span><strong>{data.user.full_name}</strong>
        <p>{data.user.group_name} · {data.user.faculty_name}</p>
      </div>
      {#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
      <div class="row">
        <button class="btn" disabled={pending}
          >{pending ? 'Отправляем…' : 'Отправить заявление'}<Icon name="arrow" size={16} /></button
        ><a class="btn secondary" href="/requests">Отмена</a>
      </div>
    </form>
  </section>
  <aside class="stack-sm">
    <section class="panel guidance">
      <span class="subject-icon"><Icon name="file" size={22} /></span>
      <h2>Порядок получения</h2>
      <p>
        Заявление сразу попадёт сотруднику вашего факультета. Вы увидите каждый этап обработки в
        личном кабинете.
      </p>
      <div class="steps">
        <span><i>1</i>Отправьте заявление</span><span><i>2</i>Дождитесь ответа деканата</span><span
          ><i>3</i>Получите готовый документ</span
        >
      </div>
    </section>
    <div class="note">
      Когда заявление будет готово, вы получите уведомление. Если сотруднику понадобятся
      подробности, его комментарий появится в карточке заявления.
    </div>
  </aside>
</div>

<style>
  .new-request-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(250px, 1fr);
    gap: 24px;
    align-items: start;
  }
  .form-grid label {
    font-size: 13px;
  }
  .form-grid label small {
    font-size: 12px;
  }
  .applicant {
    padding: 18px;
    border-radius: 10px;
    background: #f7f8fb;
    display: grid;
    gap: 6px;
  }
  .applicant strong {
    font-size: 13px;
    font-weight: 500;
  }
  .applicant p {
    font-size: 12px;
    color: #686c76;
  }
  .guidance h2 {
    font-size: 17px;
    margin-top: 20px;
  }
  .guidance p {
    font-size: 13px;
    color: #666a75;
    line-height: 1.9;
    margin-top: 12px;
  }
  .steps {
    display: grid;
    gap: 15px;
    margin-top: 24px;
  }
  .steps > span {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #6c677c;
  }
  .steps i {
    font-size: 11px;
    font-style: normal;
    width: 23px;
    height: 23px;
    background: #f0ecfa;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: #75648e;
  }
  @media (max-width: 900px) {
    .new-request-grid {
      grid-template-columns: 1fr;
    }
    .guidance {
      display: none;
    }
  }
</style>
