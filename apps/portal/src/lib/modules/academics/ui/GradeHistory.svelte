<script lang="ts">
  import type { GradeEvent } from '../academic-management.types.ts';
  import { shortDate, time } from '#shared/formatting.ts';
  let { entries }: { entries: GradeEvent[] } = $props();
  const source = {
    baseline: 'Первоначальный результат',
    manual: 'Ввод вручную',
    import: 'Импорт из файла'
  };
</script>

<details class="history">
  <summary>История изменений</summary>
  {#if entries.length}<ol>
      {#each entries as event (event.id)}<li>
          <div>
            <strong
              >{#if event.previous_points !== null}{event.previous_points} →
              {/if}{event.points} баллов</strong
            ><span>{shortDate(event.created_at)}, {time(event.created_at)}</span>
          </div>
          <p>{event.actor} · {source[event.source]}</p>
        </li>{/each}
    </ol>{:else}<p class="empty-copy">Сохранённых изменений пока нет.</p>{/if}
</details>

<style>
  .history {
    margin-top: 24px;
    border-top: 1px solid var(--border);
    padding-top: 16px;
  }
  summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: #35456a;
    min-height: 32px;
  }
  summary:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 4px;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
  }
  li {
    padding: 12px 0;
    border-bottom: 1px solid #eef0f5;
    font-size: 12px;
  }
  li:last-child {
    border-bottom: 0;
  }
  li > div {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px 16px;
  }
  strong {
    font-weight: 600;
  }
  span,
  p {
    color: var(--muted);
  }
  p {
    margin-top: 3px;
  }
  .empty-copy {
    font-size: 12px;
  }
</style>
