<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import Icon from '#shared/ui/Icon.svelte';
  import Brand from '#shared/ui/Brand.svelte';
  import type { ChatEvent, ChatMessage, ChatThread } from '../assistant.types';
  let {
    data
  }: {
    data: {
      threads: ChatThread[];
      messages: ChatMessage[];
      threadId: string | null;
      available: boolean;
      question?: string;
    };
  } = $props();
  let items: ChatMessage[] = $state(
    untrack(() => data.messages.map((message) => ({ ...message })))
  );
  let threadId: string | null = $state(untrack(() => data.threadId));
  let draft = $state(untrack(() => data.question ?? '')),
    pending = $state(false),
    error = $state('');
  let transcript: HTMLDivElement;
  let controller: AbortController | undefined;
  $effect(() => {
    const serverMessages = data.messages,
      selectedThread = data.threadId;
    if (!untrack(() => pending)) {
      items = serverMessages.map((m) => ({ ...m }));
      threadId = selectedThread;
    }
  });
  $effect(() => () => controller?.abort());
  const suggestions = [
    'Как получить справку об обучении?',
    'Какие у меня ближайшие занятия?',
    'Сколько сейчас времени в Москве?'
  ];
  async function scroll() {
    await tick();
    transcript?.scrollTo({ top: transcript.scrollHeight, behavior: 'instant' });
  }
  async function send(question = draft) {
    const text = question.trim();
    if (!text || pending) return;
    error = '';
    pending = true;
    draft = '';
    controller = new AbortController();
    const messageId = crypto.randomUUID(),
      temporaryId = crypto.randomUUID();
    items = [
      ...items,
      {
        id: messageId,
        role: 'user',
        content: text,
        status: 'complete',
        sources: [],
        created_at: new Date().toISOString()
      },
      {
        id: temporaryId,
        role: 'assistant',
        content: '',
        status: 'pending',
        sources: [],
        created_at: new Date().toISOString()
      }
    ];
    await scroll();
    let succeeded = false;
    try {
      const response = await fetch('/api/assistant/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, messageId, ...(threadId ? { threadId } : {}) }),
        signal: controller.signal
      });
      if (!response.ok) {
        let body: { message?: string } = {};
        try {
          body = await response.json();
        } catch {}
        throw new Error(body.message ?? 'Не удалось отправить вопрос.');
      }
      if (!response.body) throw new Error('Соединение прервано.');
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const event = JSON.parse(line.slice(6)) as ChatEvent;
            if (event.type === 'meta') threadId = event.threadId;
            if (event.type === 'delta')
              items = items.map((m) =>
                m.id === temporaryId ? { ...m, content: m.content + event.text } : m
              );
            if (event.type === 'done') {
              succeeded = true;
              items = items.map((m) =>
                m.id === temporaryId ? { ...m, status: 'complete', sources: event.sources } : m
              );
            }
            if (event.type === 'error') throw new Error(event.message);
            await scroll();
          }
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      if (!succeeded) throw new Error('Ответ не получен. Попробуйте ещё раз.');
    } catch (err) {
      error =
        err instanceof Error && err.name === 'AbortError'
          ? 'Ответ остановлен.'
          : err instanceof Error
            ? err.message
            : 'Не удалось получить ответ.';
      draft = text;
      items = items.map((m) => (m.id === temporaryId ? { ...m, status: 'failed' } : m));
    } finally {
      pending = false;
      controller = undefined;
    }
    if (succeeded && threadId) {
      await goto(`/assistant?thread=${threadId}`, { replace: true, reset: false });
      await invalidateAll();
      await scroll();
    }
  }
</script>

<svelte:head><title>Помощник · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Помощник</h1>
    <p>Вопросы об учёбе и личном кабинете.</p>
  </div>
  <span class="pill" class:green={data.available}
    ><span class="availability" class:online={data.available}></span>{data.available
      ? 'На связи'
      : 'Нет подключения'}</span
  >
</div>
<div class="assistant-workspace">
  <aside class="chat-history panel">
    <a
      href="/assistant"
      class="btn secondary"
      aria-disabled={pending}
      onclick={(event) => {
        if (pending) event.preventDefault();
      }}><Icon name="plus" size={16} />Новый чат</a
    ><span class="section-label">История</span>
    <nav aria-label="История чатов">
      {#each data.threads as thread}<a
          href={`/assistant?thread=${thread.id}`}
          class:active={thread.id === threadId}
          aria-current={thread.id === threadId ? 'page' : undefined}
          onclick={(event) => {
            if (pending) event.preventDefault();
          }}><Icon name="chat" size={16} /><span>{thread.title}</span></a
        >{:else}<p>Ваши чаты появятся здесь.</p>{/each}
    </nav>
  </aside>
  <section class="chat-panel panel" aria-label="Чат с помощником">
    <div class="chat-top">
      <div class="row">
        <span class="assistant-avatar"><Brand compact /></span>
        <div><strong>Помощник Деки</strong><span>Данные вашего личного кабинета</span></div>
      </div>
      <div class="row">
        <a
          href="/assistant"
          class="icon-btn mobile-new-chat"
          aria-label="Новый чат"
          onclick={(event) => {
            if (pending) event.preventDefault();
          }}><Icon name="plus" size={18} /></a
        ><Icon name="shield" size={18} />
      </div>
    </div>
    <details class="context-info">
      <summary>Какие данные получает помощник</summary>
      <p>
        Историю чата и запрошенные разделы вашего кабинета. Их список указан под ответом. Изменять
        записи помощник не может.
      </p>
    </details>
    <div
      class="transcript"
      bind:this={transcript}
      role="log"
      aria-label="Сообщения"
      aria-live="polite"
      aria-busy={pending}
    >
      {#if !items.length}<div class="chat-empty">
          <span class="empty-mark"><Brand compact /></span>
          <h2>Чем помочь?</h2>
          <p>Спросите о расписании, учебной теме или текущем времени.</p>
          <div class="suggestions">
            {#each suggestions as question}<button disabled={pending} onclick={() => send(question)}
                >{question}<Icon name="up" size={15} /></button
              >{/each}
          </div>
        </div>{/if}
      {#each items as message}<article class="message" class:from-user={message.role === 'user'}>
          <span class="message-author">{message.role === 'user' ? 'Вы' : 'Помощник'}</span>
          <div class="bubble">
            {#if message.content}<p>
                {message.content}
              </p>{:else if message.status === 'pending'}<span
                class="typing"
                aria-label="Готовится ответ"><i></i><i></i><i></i></span
              >{:else}<p class="muted">Ответ не получен.</p>{/if}
          </div>
          {#if message.sources.length}<div
              class="sources"
              aria-label="Данные, переданные для ответа"
            >
              <span class="sources-caption">Данные для ответа</span>
              {#each message.sources as source}<a href={source.href}
                  ><Icon name="file" size={12} />{source.title}<Icon name="up" size={11} /></a
                >{/each}
            </div>{/if}{#if message.status === 'failed' && message.content}<span class="small muted"
              >Ответ прерван</span
            >{/if}
        </article>{/each}
    </div>
    <form
      class="composer"
      onsubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      {#if error}<p class="chat-error" role="alert">{error}</p>{/if}{#if !data.available}<p
          class="chat-error"
        >
          Помощник временно недоступен. Вопросы о текущем времени работают.
        </p>{/if}
      <div class="composer-field">
        <label class="sr-only" for="chat-question">Ваш вопрос</label><textarea
          id="chat-question"
          name="message"
          placeholder="Напишите вопрос"
          rows="1"
          maxlength="2000"
          bind:value={draft}
          disabled={pending}
          onkeydown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
              event.preventDefault();
              void send();
            }
          }}></textarea>{#if pending}<button
            type="button"
            class="send-button stop"
            aria-label="Остановить ответ"
            onclick={() => controller?.abort()}><Icon name="stop" size={17} /></button
          >{:else}<button class="send-button" aria-label="Отправить вопрос" disabled={!draft.trim()}
            ><Icon name="send" size={18} /></button
          >{/if}
      </div>
      <div class="composer-hint">
        <span>Enter: отправить · Shift + Enter: новая строка</span><span>{draft.length} / 2000</span
        >
      </div>
    </form>
  </section>
</div>

<style>
  .assistant-workspace {
    display: grid;
    grid-template-columns: 230px minmax(0, 1fr);
    gap: 22px;
    min-height: 620px;
    height: calc(100dvh - 250px);
    max-height: 900px;
  }
  .chat-history {
    padding: 18px;
    overflow-y: auto;
  }
  .chat-history > .btn {
    width: 100%;
    justify-content: flex-start;
    font-size: 12px;
    margin-bottom: 26px;
  }
  .chat-history > .section-label {
    display: block;
    margin-left: 8px;
    font-size: 10px;
  }
  .chat-history nav {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 5px;
  }
  .chat-history nav a {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px 10px;
    font-size: 12px;
    color: #747b8c;
    border-radius: 9px;
    line-height: 1.5;
  }
  .chat-history nav a.active {
    background: #f0edfb;
    color: #6a58b7;
  }
  .chat-history nav a:hover {
    background: #f7f6fb;
  }
  .chat-history nav a span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chat-history nav p {
    font-size: 12px;
    color: #7c8393;
    margin: 0 8px;
  }
  .chat-panel {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    min-height: 0;
  }
  .chat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid #eff0f5;
    color: #827797;
  }
  .mobile-new-chat {
    display: none;
  }
  .chat-top strong {
    display: block;
    font-size: 13px;
    color: #37394b;
    font-weight: 500;
  }
  .chat-top .row > div > span {
    display: block;
    font-size: 11px;
    color: #7b8293;
    margin-top: 3px;
  }
  .assistant-avatar {
    height: 36px;
    width: 36px;
    display: grid;
    place-items: center;
  }
  .assistant-avatar :global(.brand-lockup svg) {
    width: 30px;
    height: 30px;
  }
  .transcript {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    padding: 26px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    scrollbar-width: thin;
    scrollbar-color: #d8d2e8 transparent;
  }
  .chat-empty {
    margin: auto;
    display: grid;
    justify-items: center;
    text-align: center;
    padding: 20px 0;
  }
  .empty-mark {
    display: grid;
    place-items: center;
    width: 74px;
    height: 74px;
    border-radius: 22px;
    background: #f4f1fc;
    margin-bottom: 20px;
  }
  .empty-mark :global(.brand-lockup svg) {
    width: 44px;
    height: 44px;
  }
  .chat-empty h2 {
    font-size: 24px;
  }
  .chat-empty > p {
    font-size: 12px;
    color: #7c8292;
    margin-top: 10px;
  }
  .suggestions {
    display: grid;
    gap: 9px;
    width: 100%;
    margin-top: 27px;
  }
  .suggestions button {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    text-align: left;
    align-items: center;
    border: 1px solid #eeecf4;
    background: white;
    border-radius: 10px;
    padding: 12px 15px;
    font-size: 12px;
    color: #6c667e;
  }
  .suggestions button:hover {
    background: #f8f6fd;
    border-color: #d9d0ef;
  }
  .message {
    max-width: 90%;
    align-self: flex-start;
    display: grid;
    gap: 7px;
    min-width: 90px;
  }
  .message-author {
    font-size: 10px;
    color: #7f8595;
    margin-left: 3px;
  }
  .bubble {
    background: #f6f5fa;
    padding: 15px 18px;
    border-radius: 3px 14px 14px 14px;
    font-size: 13px;
    color: #4f5264;
    line-height: 1.85;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .from-user {
    align-self: flex-end;
    align-items: end;
  }
  .from-user .message-author {
    text-align: right;
    margin-right: 3px;
  }
  .from-user .bubble {
    background: #eeebfb;
    color: #60538f;
    border-radius: 14px 3px 14px 14px;
  }
  .sources {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 3px;
  }
  .sources-caption {
    width: 100%;
    font-size: 11px;
    color: var(--muted);
  }
  .context-info {
    padding: 10px 20px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    color: var(--muted);
  }
  .context-info summary {
    cursor: pointer;
    min-height: 24px;
  }
  .context-info p {
    padding: 6px 0 2px;
    max-width: 650px;
    line-height: 1.6;
  }
  .sources a {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    border: 1px solid #eeebf6;
    padding: 4px 7px;
    border-radius: 6px;
    font-size: 10px;
    color: #7a6c9b;
  }
  .sources a:hover {
    background: #f6f3fb;
  }
  .typing {
    display: flex;
    gap: 4px;
    padding: 7px 0;
  }
  .typing i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #aa9bc9;
    animation: pulse 1s infinite;
  }
  .typing i:nth-child(2) {
    animation-delay: 0.15s;
  }
  .typing i:nth-child(3) {
    animation-delay: 0.3s;
  }
  .composer {
    border-top: 1px solid #f0f1f5;
    padding: 18px 24px;
  }
  .composer-field {
    display: flex;
    align-items: flex-end;
    border: 1px solid #e2deed;
    border-radius: 13px;
    background: #fdfcfe;
    padding: 8px 9px 8px 1px;
    gap: 8px;
  }
  .composer-field:focus-within {
    border-color: #a999d2;
    box-shadow: 0 0 0 3px #f2eefb;
  }
  .composer-field textarea {
    border: 0;
    background: transparent;
    min-height: 40px;
    max-height: 160px;
    resize: vertical;
    padding: 10px 12px;
    line-height: 1.6;
    font-size: 13px;
    outline: none;
  }
  .send-button {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    background: #7864bf;
    color: white;
    border-radius: 9px;
    display: grid;
    place-items: center;
  }
  .send-button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .send-button.stop {
    background: #eeeaf8;
    color: #8d7cab;
  }
  .composer-hint {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #7d8494;
    margin: 8px 3px 0;
    gap: 16px;
  }
  .chat-error {
    font-size: 12px;
    color: #ad5d70;
    margin-bottom: 12px;
  }
  .availability {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #9d9eaa;
  }
  .availability.online {
    background: #78a289;
  }
  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0.35;
    }
    40% {
      opacity: 1;
    }
  }
  @media (max-width: 1150px) {
    .assistant-workspace {
      grid-template-columns: 185px minmax(0, 1fr);
      gap: 16px;
    }
    .chat-history {
      padding: 14px;
    }
    .transcript {
      padding: 22px;
    }
    .composer {
      padding: 17px;
    }
  }
  @media (max-width: 800px) {
    .mobile-new-chat {
      display: inline-flex;
    }
    .assistant-workspace {
      grid-template-columns: 1fr;
      min-height: 590px;
      height: calc(100dvh - 220px);
      max-height: none;
    }
    .chat-history {
      display: none;
    }
    .chat-top {
      padding: 16px 18px;
    }
    .transcript {
      padding: 20px 16px;
      gap: 20px;
    }
    .message {
      max-width: 95%;
    }
    .bubble {
      padding: 13px 15px;
    }
    .composer-hint {
      font-size: 8px;
    }
    .suggestions button {
      font-size: 11px;
    }
    .chat-empty > p {
      font-size: 11px;
    }
    .page-head p {
      font-size: 11px;
    }
    .page-head > .pill {
      font-size: 10px;
    }
  }
</style>
