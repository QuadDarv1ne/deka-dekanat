<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import { fullDate } from '#shared/formatting.ts';
  import { requestKinds } from '#modules/requests/request.labels.ts';
  type PageProps = {
    data: { request: import('../request.types').StudyRequest; verificationUrl: string; qr: string };
  };
  let { data }: PageProps = $props();
</script>

<svelte:head
  ><title>Документ №{data.request.number} · Дека</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<div class="page-head">
  <div>
    <h1>Готовый документ</h1>
    <p>Электронный экземпляр</p>
  </div>
  <div class="row">
    <a href={`/requests/${data.request.id}`} class="btn secondary">К заявлению</a><button
      class="btn"
      onclick={() => window.print()}><Icon name="download" size={16} />Печать / PDF</button
    >
  </div>
</div>
<article class="document panel">
  <header>
    <strong>Дека</strong><span>Цифровой деканат<br />Учебный портал</span>
  </header>
  <div class="document-meta">
    <span>№ {String(data.request.number).padStart(4, '0')}</span><span
      >{fullDate(data.request.updated_at)}</span
    >
  </div>
  <h2>{requestKinds[data.request.kind]}</h2>
  <p>
    Выдано студенту <strong>{data.request.student_name}</strong>, группа
    <strong>{data.request.group_name}</strong>.
  </p>
  <p>{data.request.details}</p>
  {#if data.request.staff_note}<p>{data.request.staff_note}</p>{/if}
  <div class="document-sign">
    <span>Подготовлено деканатом</span><span>Электронный реестр "Дека"</span>
  </div>
  <footer>
    <img
      class="document-qr"
      src={data.qr}
      width="100"
      height="100"
      alt="QR-код для проверки документа"
    />
    <p>Проверка записи в реестре</p>
    <a href={data.verificationUrl} target="_blank" rel="noreferrer">{data.verificationUrl}</a><span
      >Образец документа. Для официального использования требуется подпись вуза.</span
    >
  </footer>
</article>

<style>
  .document {
    max-width: 850px;
    margin: 0 auto;
    padding: 55px 65px;
    min-height: 770px;
    font-size: 14px;
    line-height: 2;
  }
  .document-qr {
    float: right;
    margin: 0 0 15px 20px;
  }
  .document header {
    display: flex;
    align-items: center;
    gap: 25px;
    padding-bottom: 30px;
    border-bottom: 1px solid #e9e9ed;
  }
  .document header strong {
    font-family: Manrope, sans-serif;
    font-size: 31px;
    letter-spacing: 0.04em;
    color: #71648c;
  }
  .document header span {
    font-size: 13px;
    line-height: 1.8;
    color: #6c6877;
  }
  .document-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #6f6c77;
    margin: 22px 0 60px;
  }
  .document h2 {
    font-size: 25px;
    text-align: center;
    margin-bottom: 43px;
  }
  .document > p {
    margin-bottom: 25px;
    color: #6c6877;
    white-space: pre-wrap;
  }
  .document-sign {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #706b7a;
    border-top: 1px solid #eeebf4;
    padding-top: 20px;
    margin-top: 60px;
  }
  .document footer {
    margin-top: 45px;
    font-size: 12px;
    color: #6c6875;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  .document footer a {
    color: #75678e;
    text-decoration: underline;
  }
  .document footer > span {
    display: block;
    margin-top: 25px;
    font-size: 11px;
    letter-spacing: 0.05em;
    color: #6c6873;
  }
  @media (max-width: 600px) {
    .document {
      padding: 30px 25px;
      min-height: 0;
    }
    .document h2 {
      font-size: 20px;
    }
    .document-meta {
      margin-bottom: 40px;
    }
    .page-head {
      flex-wrap: wrap;
    }
    .document-sign {
      gap: 20px;
    }
  }
  @media print {
    .document {
      max-width: none;
      min-height: 0;
      padding: 25mm 20mm;
    }
    .document footer {
      font-size: 11px;
    }
  }
</style>
