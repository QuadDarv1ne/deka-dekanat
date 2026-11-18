<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import Brand from '#shared/ui/Brand.svelte';
  import { requestKinds } from '#modules/requests/request.labels.ts';
  import { fullDate } from '#shared/formatting.ts';
  type PageProps = { data: { document: import('../request.types').DocumentVerification } };
  let { data }: PageProps = $props();
</script>

<svelte:head
  ><title>Проверка документа · Дека</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<main class="verification">
  <a href="/" class="wordmark" aria-label="Дека"><Brand /></a>
  <section class="panel">
    <span class="verified"><Icon name="shield" size={34} /></span><span class="eyebrow"
      >Проверка по реестру</span
    >
    <h1>Документ найден</h1>
    <p>Система подтверждает, что документ с этим кодом выдан в цифровом деканате.</p>
    <dl>
      <div>
        <dt>Документ</dt>
        <dd>{requestKinds[data.document.kind]}</dd>
      </div>
      <div>
        <dt>Номер</dt>
        <dd>№ {String(data.document.number).padStart(4, '0')}</dd>
      </div>
      <div>
        <dt>Обновлён</dt>
        <dd>{fullDate(data.document.updated_at)}</dd>
      </div>
    </dl>
    <div class="note">
      Запись в реестре найдена. Для официального использования документа требуется подпись вуза.
    </div>
  </section>
</main>

<style>
  .verification {
    max-width: 600px;
    margin: 60px auto;
    padding: 0 22px;
  }
  .wordmark {
    font-family: Manrope, sans-serif;
    font-size: 32px;
    font-weight: 800;
    color: #554be0;
    display: block;
    margin-bottom: 28px;
  }
  .verification .panel {
    padding: 35px;
  }
  .verified {
    display: grid;
    place-items: center;
    background: #eaf6ef;
    color: #51705f;
    width: 70px;
    height: 70px;
    border-radius: 20px;
    margin-bottom: 24px;
  }
  .verification h1 {
    font-size: 27px;
    margin: 12px 0;
  }
  .verification p {
    font-size: 13px;
    color: #686d79;
    line-height: 1.9;
  }
  dl {
    font-size: 13px;
    display: grid;
    gap: 15px;
    margin: 28px 0;
  }
  dl > div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  dt {
    color: #676c75;
  }
  dd {
    margin: 0;
    text-align: right;
  }
</style>
