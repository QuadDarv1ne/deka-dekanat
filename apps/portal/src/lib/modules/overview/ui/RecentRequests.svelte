<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import type { OverviewData } from '../overview.types';
  import type { User } from '#modules/auth/auth.types.ts';
  let { data }: { data: OverviewData & { user: User } } = $props();
  import Status from '#modules/requests/ui/RequestStatusBadge.svelte';
  import { shortDate } from '#shared/formatting.ts';
  import { requestKinds, requestNumber } from '#modules/requests/request.labels.ts';
  const dean = $derived(data.user.role === 'dean');
  const student = $derived(data.user.role === 'student');
</script>

<section class="panel request-panel">
  <div class="panel-head">
    <div>
      <h2>{student ? 'Мои заявления' : 'Последние заявления'}</h2>
      <p>
        {student ? 'Статусы и ответы деканата' : 'Обращения студентов вашего факультета'}
      </p>
    </div>
    <a class="link" href="/requests">Все заявления <Icon name="arrow" size={14} /></a>
  </div>
  {#if data.requests.length}<div class="table-wrap">
      <table class="data-table">
        <thead
          ><tr
            ><th>Заявление</th>{#if dean}<th>Студент</th>{/if}<th>Дата подачи</th><th>Статус</th><th
            ></th></tr
          ></thead
        ><tbody
          >{#each data.requests as request}<tr
              ><td
                ><a href={`/requests/${request.id}`}
                  ><div class="row">
                    <span class="file-icon"><Icon name="file" size={17} /></span><span
                      ><strong>{requestKinds[request.kind]}</strong><small
                        >№ {requestNumber(request.number)}</small
                      ></span
                    >
                  </div></a
                ></td
              >{#if dean}<td>{request.student_name}<small>{request.group_name}</small></td>{/if}<td
                class="muted">{shortDate(request.created_at)}</td
              ><td><Status status={request.status} /></td><td
                ><a
                  class="icon-btn"
                  href={`/requests/${request.id}`}
                  aria-label={`Открыть заявление №${requestNumber(request.number)}`}
                  ><Icon name="arrow" size={16} /></a
                ></td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>{:else}<div class="empty">
      <Icon name="inbox" size={26} />
      <h3>Заявлений пока нет</h3>
      <p>
        {student
          ? 'Когда понадобится справка или помощь, создайте обращение.'
          : 'Новые заявления студентов появятся здесь.'}
      </p>
      {#if student}<a class="link" href="/requests/new"
          >Создать заявление <Icon name="plus" size={14} /></a
        >{/if}
    </div>{/if}
</section>

<style>
  .file-icon {
    display: grid;
    place-items: center;
    width: 31px;
    height: 36px;
    background: #f6f5fa;
    border-radius: 7px;
    color: #6e687f;
  }
  .request-panel .data-table td {
    padding-top: 16px;
    padding-bottom: 16px;
  }
</style>
