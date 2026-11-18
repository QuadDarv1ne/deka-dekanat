<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '#shared/ui/Icon.svelte';
  import Status from '#modules/requests/ui/RequestStatusBadge.svelte';
  import {
    canTransition,
    canIssueDocument,
    conversationOpen
  } from '#modules/requests/request.policy.ts';
  import RequestConversation from './RequestConversation.svelte';
  import { requestKinds, statusNames } from '#modules/requests/request.labels.ts';
  import { fullDate, shortDate, time } from '#shared/formatting.ts';
  import type { RequestStatus } from '#modules/requests/request.types.ts';
  type PageProps = {
    data: {
      request: import('../request.types').StudyRequest;
      events: import('../request.types').RequestEvent[];
      conversation: import('../request.types').RequestMessage[];
      submissionId: string;
    } & import('#application/application.types.ts').ApplicationData;
    form?: { message?: string; success?: boolean; operation?: 'message'; body?: string } | null;
  };
  let { data, form }: PageProps = $props();
  let pending = $state(false);
  const transitions: RequestStatus[] = ['in_progress', 'ready', 'done', 'rejected', 'cancelled'];
  const allowed = $derived(
    transitions.filter((s) => canTransition(data.user.role, data.request.status, s))
  );
  const actionNames = {
    in_progress: 'Принять в работу',
    ready: 'Подтвердить готовность',
    done: 'Завершить обращение',
    rejected: 'Отклонить',
    cancelled: 'Отменить заявление',
    new: ''
  };
</script>

<svelte:head><title>Заявление №{data.request.number} · Дека</title></svelte:head>
<a class="back" href="/requests"><Icon name="left" size={15} />Все заявления</a>
<div class="page-head">
  <div>
    <div class="row">
      <span class="eyebrow">Заявление № {String(data.request.number).padStart(4, '0')}</span><Status
        status={data.request.status}
      />
    </div>
    <h1 style="margin-top:14px">{requestKinds[data.request.kind]}</h1>
    <p>Подано {fullDate(data.request.created_at)}</p>
  </div>
  {#if canIssueDocument(data.request.kind) && ['ready', 'done'].includes(data.request.status)}<a
      href={`/requests/${data.request.id}/document`}
      class="btn"><Icon name="file" size={17} />Открыть документ</a
    >{/if}
</div>
<div class="grid-2">
  <div class="stack">
    <section class="panel">
      <div class="panel-head">
        <h2>Обращение</h2>
        <Icon name="file" size={19} />
      </div>
      <p class="prose">{data.request.details}</p>
      <dl class="request-info">
        <div>
          <dt>Студент</dt>
          <dd>{data.request.student_name}</dd>
        </div>
        <div>
          <dt>Группа</dt>
          <dd>{data.request.group_name}</dd>
        </div>
        <div>
          <dt>Дата обновления</dt>
          <dd>{shortDate(data.request.updated_at)}, {time(data.request.updated_at)}</dd>
        </div>
      </dl>
    </section>
    {#if data.request.staff_note}<section class="panel">
        <div class="panel-head">
          <h2>Комментарий деканата</h2>
          <Icon name="news" size={18} />
        </div>
        <p class="prose">{data.request.staff_note}</p>
      </section>{/if}
    {#if allowed.length}<section class="panel">
        <div class="panel-head">
          <h2>{data.user.role === 'dean' ? 'Обработка заявления' : 'Управление заявлением'}</h2>
        </div>
        <form
          method="POST"
          class="form-grid"
          use:enhance={() => {
            pending = true;
            return async ({ update }) => {
              await update();
              pending = false;
            };
          }}
        >
          <input
            type="hidden"
            name="version"
            value={data.request.version}
          />{#if data.user.role === 'dean'}<label
              >Комментарий студенту<textarea
                name="note"
                placeholder="Укажите срок, место получения или причину отклонения."
                maxlength="2000"></textarea></label
            >{/if}{#if form?.message && form.operation !== 'message'}<p
              class:form-success={form.success}
              class:form-error={!form.success}
              role="status"
            >
              {form.message}
            </p>{/if}
          <div class="row wrap">
            {#each allowed as status}<button
                class="btn"
                class:danger={['rejected', 'cancelled'].includes(status)}
                name="status"
                value={status}
                disabled={pending}
                >{actionNames[status]}<Icon
                  name={['rejected', 'cancelled'].includes(status) ? 'x' : 'check'}
                  size={15}
                /></button
              >{/each}
          </div>
        </form>
      </section>{:else if form?.message && form.operation !== 'message'}<p
        class="form-success"
        role="status"
      >
        {form.message}
      </p>{/if}
    <RequestConversation
      messages={data.conversation}
      submissionId={data.submissionId}
      open={conversationOpen(data.request.status)}
      student={data.user.role === 'student'}
      form={form?.operation === 'message' ? form : null}
    />
  </div>
  <section class="panel history">
    <div class="panel-head">
      <h2>История заявления</h2>
      <Icon name="clock" size={18} />
    </div>
    <div class="timeline">
      {#each data.events as event, i}<div class="event">
          <span class="event-dot" class:latest={i === data.events.length - 1}
            ><Icon name="check" size={11} /></span
          >
          <div>
            <strong>{statusNames[event.status]}</strong>
            <p>{event.note || 'Статус заявления обновлён'}</p>
            <small>{event.actor} · {shortDate(event.created_at)}, {time(event.created_at)}</small>
          </div>
        </div>{/each}
    </div>
    <div class="note">
      Все изменения сохраняются в истории. Обновления от деканата также приходят в раздел
      «Уведомления».
    </div>
  </section>
</div>

<style>
  .request-info {
    margin: 25px 0 0;
    border-top: 1px solid #eff0f5;
    padding-top: 18px;
    display: grid;
    gap: 13px;
  }
  .request-info > div {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    font-size: 13px;
  }
  dt {
    color: #676b74;
  }
  dd {
    margin: 0;
    text-align: right;
    color: #666c7b;
  }
  .history {
    align-self: start;
  }
  .timeline {
    display: grid;
    margin-bottom: 24px;
  }
  .event {
    display: flex;
    gap: 16px;
    position: relative;
    padding-bottom: 28px;
  }
  .event:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 23px;
    bottom: 0;
    width: 1px;
    background: #e9e5f6;
  }
  .event-dot {
    width: 23px;
    height: 23px;
    background: #f1eefb;
    border-radius: 50%;
    color: #726987;
    display: grid;
    place-items: center;
    z-index: 1;
    flex-shrink: 0;
  }
  .event-dot.latest {
    background: #e8f4ed;
    color: #547461;
  }
  .event strong {
    font-size: 13px;
    font-weight: 500;
  }
  .event p {
    font-size: 13px;
    color: #676b76;
    margin-top: 6px;
    white-space: pre-wrap;
  }
  .event small {
    display: block;
    color: #686b72;
    font-size: 11px;
    margin-top: 8px;
  }
  label {
    font-size: 13px;
  }
  .event:last-child {
    padding-bottom: 10px;
  }
</style>
