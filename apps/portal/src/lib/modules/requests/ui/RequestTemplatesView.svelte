<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '#shared/ui/Icon.svelte';
  import type { User } from '#modules/auth/auth.types.ts';
  import { requestTemplates } from '../request-templates.labels.ts';
  import { requestKinds } from '../request.labels.ts';

  let {
    data,
    form
  }: {
    data: { user: User; id: string; selected: keyof typeof requestTemplates | null };
    form: { message?: string; id?: string; details?: string } | null;
  } = $props();
  let pending = $state(false);
</script>

<div class="page-head">
  <div>
    <h1>Подать заявление</h1>
    <p>Выберите справку и проверьте текст перед отправкой.</p>
  </div>
  <a class="btn outline" href="/requests">Мои заявления</a>
</div>

<nav class="templates" aria-label="Шаблоны справок">
  {#each Object.entries(requestTemplates) as [id, item] (id)}
    <a
      class="panel template"
      href={'?type=' + id}
      class:current={id === data.selected}
      aria-current={id === data.selected ? 'page' : undefined}
    >
      <span class="glyph"><Icon name="file" size={20} /></span>
      <span><strong>{item.label}</strong><small>{item.description}</small></span>
      <Icon name="arrow" size={16} />
    </a>
  {/each}
</nav>

{#if data.selected}
  {@const selection = data.selected}
  {@const template = requestTemplates[selection]}
  {#key selection}
    <section class="panel fields" aria-labelledby="selected-template">
      <h2 id="selected-template">{requestKinds[template.kind]}</h2>
      <p class="applicant">
        <strong>{data.user.full_name}</strong>{data.user.group_name
          ? ' · ' + data.user.group_name
          : ''}
      </p>
      <form
        method="POST"
        class="form-grid"
        use:enhance={() => {
          pending = true;
          return async ({ update }) => {
            try {
              await update({ reset: false });
            } finally {
              pending = false;
            }
          };
        }}
      >
        <input type="hidden" name="id" value={form?.id ?? data.id} />
        <input type="hidden" name="template" value={selection} />
        <label
          >Цель обращения
          <textarea
            name="details"
            required
            minlength="3"
            maxlength="2000"
            aria-describedby="template-hint"
            value={form?.details ?? template.text}></textarea>
        </label>
        <p id="template-hint" class="muted">{template.hint}</p>
        {#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
        <div>
          <button class="btn" disabled={pending}
            >{pending ? 'Отправляем…' : 'Отправить заявление'}</button
          >
        </div>
      </form>
    </section>
  {/key}
{/if}
<a class="link other" href="/requests/new">Другой тип заявления <Icon name="arrow" size={15} /></a>

<style>
  .templates {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .template {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px;
    border-radius: 11px;
    min-height: 62px;
  }
  .template > span:nth-child(2) {
    flex: 1;
  }
  .template small {
    display: block;
    font-size: 11px;
    color: #555d6d;
  }
  .template.current,
  .template:hover {
    border-color: #c6b7ee;
    background: #f5f1ff;
  }
  .glyph {
    display: grid;
    place-items: center;
    width: 35px;
    height: 35px;
    border-radius: 8px;
    background: #ece6fc;
    color: #51408f;
    flex-shrink: 0;
  }
  .template > :global(svg) {
    flex-shrink: 0;
    color: #59489a;
  }
  .fields {
    margin-top: 14px;
    max-width: 740px;
  }
  .applicant {
    margin: 8px 0 13px;
    color: #555d6d;
    font-size: 13px;
  }
  .form-grid {
    gap: 13px;
  }
  .fields textarea {
    min-height: 105px;
  }
  .other {
    min-height: 44px;
    margin-top: 5px;
  }
  @media (max-width: 960px) {
    .templates {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
