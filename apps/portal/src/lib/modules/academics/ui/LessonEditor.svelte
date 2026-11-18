<script lang="ts">
  import { enhance } from '$app/forms';
  import type { TeachingAssignment, ManagedLesson } from '../academic-management.types.ts';
  import { assignmentKey } from '../academic-management.types.ts';
  let {
    assignments,
    selected = null,
    onreset
  }: {
    assignments: TeachingAssignment[];
    selected: ManagedLesson | null;
    onreset: () => void;
  } = $props();
  const date = (value: string) =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date(value));
  const time = (value: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(new Date(value));
  let pending = $state(false);
</script>

<section class="panel">
  <div class="panel-head">
    <h2>{selected ? 'Изменить занятие' : 'Новое занятие'}</h2>
    {#if selected}<button class="text-link" onclick={onreset}>Отменить редактирование</button>{/if}
  </div>
  {#key selected?.id ?? 'new'}<form
      method="POST"
      action="?/lesson"
      class="form-grid"
      use:enhance={() => {
        pending = true;
        return async ({ update, result }) => {
          await update();
          pending = false;
          if (result.type === 'redirect') onreset();
        };
      }}
    >
      {#if selected}<input type="hidden" name="lessonId" value={selected.id} /><input
          type="hidden"
          name="version"
          value={selected.version}
        />{/if}
      <label
        >Дисциплина, группа и преподаватель<select
          name="assignment"
          required
          value={selected ? assignmentKey(selected) : ''}
          ><option value="" disabled>Выберите дисциплину</option>{#each assignments as a}<option
              value={assignmentKey(a)}>{a.group_name} · {a.subject} · {a.teacher}</option
            >{/each}</select
        ></label
      >
      <div class="fields">
        <label
          >Дата<input
            name="date"
            type="date"
            required
            value={selected ? date(selected.starts_at) : ''}
          /></label
        ><label
          >Начало, МСК<input
            type="time"
            name="start"
            required
            value={selected ? time(selected.starts_at) : '09:00'}
          /></label
        ><label
          >Окончание, МСК<input
            type="time"
            name="end"
            required
            value={selected ? time(selected.ends_at) : '10:30'}
          /></label
        >
      </div>
      <div class="fields two">
        <label
          >Аудитория<input
            name="room"
            required
            maxlength="100"
            value={selected?.room ?? ''}
            placeholder="Например, ауд. 402"
          /></label
        ><label
          >Тип занятия<select name="kind" value={selected?.kind ?? 'lecture'}
            ><option value="lecture">Лекция</option><option value="practice">Практика</option
            ><option value="lab">Лабораторная</option><option value="exam">Экзамен</option><option
              value="credit">Зачёт</option
            ></select
          ></label
        >
      </div>
      <label
        >Комментарий<textarea name="note" rows="2" maxlength="500" value={selected?.note ?? ''}
        ></textarea></label
      >
      <div class="row wrap">
        <button class="btn" disabled={pending}
          >{pending ? 'Сохраняем…' : 'Сохранить занятие'}</button
        ><span class="muted small">Студенты группы получат уведомление.</span>
      </div>
    </form>{/key}
</section>

<style>
  .fields {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 15px;
  }
  .two {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 600px) {
    .fields {
      grid-template-columns: 1fr;
    }
  }
</style>
