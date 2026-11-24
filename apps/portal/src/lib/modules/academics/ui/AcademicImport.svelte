<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '#shared/ui/Icon.svelte';
  import type { ImportKind, ImportPreview } from '../academic-management.types.ts';
  let { kind, draft }: { kind: ImportKind; draft: ImportPreview | null } = $props();
  let pending = $state(false);
</script>

<section class="panel">
  <div class="panel-head">
    <div>
      <h2>Импорт из файла</h2>
      <p>CSV или XLSX, до 200 строк и 1 МБ.</p>
    </div>
    <a class="text-link" href={`/academics/manage/template?kind=${kind}`}
      ><Icon name="download" size={15} />Шаблон CSV</a
    >
  </div>
  <form
    method="POST"
    action="?/preview"
    enctype="multipart/form-data"
    class="import-form"
    use:enhance={() => {
      pending = true;
      return async ({ update }) => {
        await update();
        pending = false;
      };
    }}
  >
    <input type="hidden" name="kind" value={kind} /><label
      >Файл<input name="file" type="file" accept=".csv,.xlsx" required /></label
    ><button class="btn secondary" disabled={pending}
      >{pending ? 'Проверяем…' : 'Проверить файл'}</button
    >
  </form>
  <p class="help">
    В XLSX используется первый лист. Для CSV подходят разделители ";", запятая и табуляция. Дата:
    ГГГГ-ММ-ДД или ДД.ММ.ГГГГ. Время: ЧЧ:ММ, московское.
  </p>
  {#if draft && draft.kind === kind}<div class="preview">
      <div class="row between wrap">
        <h3>Готово к загрузке: {draft.count} записей</h3>
        <span class="muted small">Подтверждение доступно 15 минут</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead
            ><tr
              >{#each draft.headers as header}<th>{header}</th>{/each}</tr
            ></thead
          ><tbody
            >{#each draft.rows as row}<tr
                >{#each row as value}<td>{value}</td>{/each}</tr
              >{/each}</tbody
          >
        </table>
      </div>
      {#if draft.count > 20}<p class="help">Показаны первые 20 записей.</p>{/if}
      <p class="help">
        {kind === 'grades'
          ? 'Существующие результаты будут обновлены.'
          : 'Будут добавлены новые занятия. Пересечения по времени блокируют импорт.'} При ошибке весь
        файл отклоняется.
      </p>
      <form
        method="POST"
        action="?/confirm"
        use:enhance={() => {
          pending = true;
          return async ({ update }) => {
            await update();
            pending = false;
          };
        }}
      >
        <input type="hidden" name="id" value={draft.id} /><button class="btn" disabled={pending}
          >{pending ? 'Загружаем…' : 'Загрузить записи'}</button
        >
      </form>
    </div>{/if}
</section>

<style>
  .import-form {
    display: flex;
    align-items: flex-end;
    gap: 15px;
  }
  .import-form label {
    flex: 1;
  }
  .help {
    font-size: 12px;
    color: #737582;
    line-height: 1.8;
    margin-top: 16px;
  }
  .preview {
    border-top: 1px solid #ebeaf1;
    margin-top: 25px;
    padding-top: 25px;
  }
  .preview h3 {
    font-size: 14px;
  }
  .preview .table-wrap {
    margin-top: 15px;
  }
  @media (max-width: 600px) {
    .import-form {
      display: grid;
    }
  }
</style>
