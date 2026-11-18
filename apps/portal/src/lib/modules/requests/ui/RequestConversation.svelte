<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '#shared/ui/Icon.svelte';
  import { shortDate, time } from '#shared/formatting.ts';
  import type { RequestMessage } from '../request.types.ts';

  let {
    messages,
    submissionId,
    open,
    student,
    form
  }: {
    messages: RequestMessage[];
    submissionId: string;
    open: boolean;
    student: boolean;
    form?: { message?: string; success?: boolean; body?: string } | null;
  } = $props();
  let pending = $state(false);
</script>

<section class="panel" id="request-conversation" aria-labelledby="conversation-heading">
  <div class="panel-head">
    <h2 id="conversation-heading">
      {student ? 'Переписка с деканатом' : 'Переписка со студентом'}
    </h2>
    <Icon name="chat" size={19} />
  </div>
  {#if messages.length}
    <ol>
      {#each messages as message}
        <li class:mine={message.mine}>
          <div class="message-meta">
            <strong>{message.mine ? 'Вы' : student ? 'Деканат' : message.sender_name}</strong>
            <time datetime={message.created_at}
              >{shortDate(message.created_at)}, {time(message.created_at)}</time
            >
          </div>
          <p>{message.body}</p>
        </li>
      {/each}
    </ol>
  {:else if open}
    <p class="muted small">
      {student
        ? 'Здесь можно уточнить детали заявления или задать вопрос о нём.'
        : 'Здесь можно запросить у студента уточнения.'}
    </p>
  {/if}
  {#if open}
    <form
      method="POST"
      action="#request-conversation"
      use:enhance={() => {
        pending = true;
        return async ({ update }) => {
          try {
            await update();
          } finally {
            pending = false;
          }
        };
      }}
    >
      <input type="hidden" name="intent" value="message" />
      <input type="hidden" name="submissionId" value={submissionId} />
      <label for="request-message">Сообщение</label>
      <textarea
        id="request-message"
        name="body"
        minlength="2"
        maxlength="1200"
        rows="3"
        required
        value={form?.body ?? ''}></textarea>
      <button class="btn" disabled={pending}
        >{pending ? 'Отправляем…' : 'Отправить'} <Icon name="arrow" size={16} /></button
      >
    </form>
  {:else}
    <p class="muted small">Переписка закрыта.</p>
  {/if}
  {#if form?.message}
    <p class:form-success={form.success} class:form-error={!form.success} role="status">
      {form.message}
    </p>
  {/if}
</section>

<style>
  section {
    scroll-margin-top: 18px;
  }
  .panel-head {
    margin-bottom: 14px;
  }
  .panel-head > :global(svg) {
    color: var(--primary);
    flex-shrink: 0;
  }
  ol {
    display: grid;
    gap: 12px;
    max-height: 540px;
    overflow-y: auto;
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }
  li {
    max-width: min(95%, 580px);
    justify-self: start;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 12px 12px 12px 4px;
    background: #f7f7fb;
    overflow-wrap: anywhere;
  }
  li.mine {
    justify-self: end;
    border-radius: 12px 12px 4px 12px;
    border-color: #e6dff7;
    background: var(--accent);
  }
  .message-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 12px;
  }
  strong {
    font-size: 12px;
    font-weight: 650;
  }
  time {
    color: var(--muted);
    font-size: 11px;
  }
  li p {
    white-space: pre-wrap;
    font-size: 13px;
    margin-top: 4px;
  }
  form {
    display: grid;
    gap: 8px;
    margin-top: 14px;
  }
  label {
    font-size: 13px;
    font-weight: 550;
  }
  textarea {
    resize: vertical;
    min-height: 88px;
  }
  .btn {
    justify-self: start;
    min-height: 44px;
  }
  .form-success,
  .form-error {
    margin-top: 12px;
  }
</style>
