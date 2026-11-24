<script lang="ts">
  import { enhance } from '$app/forms';
  import { attendanceLabels } from '../attendance.labels.ts';
  import type { AttendanceLesson, AttendanceStudent } from '../attendance.types.ts';
  import { shortDate, time } from '#shared/formatting.ts';

  let {
    journal,
    form
  }: {
    journal: {
      lessons: AttendanceLesson[];
      selected: AttendanceLesson | null;
      roster: AttendanceStudent[];
    };
    form: { saved?: boolean; message?: string } | null;
  } = $props();
  let saving = $state<string[]>([]);
</script>

<div class="page-head">
  <div>
    <h1>Журнал посещаемости</h1>
    <p>Ваши завершённые занятия за последние 30 дней.</p>
  </div>
  <a class="btn outline" href="/schedule">Расписание</a>
</div>
<section class="panel">
  {#if journal.selected}
    <form method="GET" class="lesson-picker">
      <label
        >Занятие
        <select
          name="lesson"
          value={journal.selected.id}
          onchange={(event) => (event.currentTarget as HTMLSelectElement).form?.requestSubmit()}
        >
          {#each journal.lessons as lesson (lesson.id)}
            <option value={lesson.id}
              >{shortDate(lesson.starts_at)}, {time(lesson.starts_at)} · {lesson.subject} · {lesson.group_name}</option
            >
          {/each}
        </select>
      </label>
      <button class="btn outline">Открыть журнал</button>
    </form>
    {#if form?.message}<p class="feedback" role="alert">{form.message}</p>{/if}
    {#if form?.saved}<p class="feedback" role="status">Отметка сохранена.</p>{/if}
    <h2>{journal.selected.group_name} · {journal.selected.subject}</h2>
    {#if journal.roster.length}
      <ul>
        {#each journal.roster as student (student.id)}
          <li>
            <form
              method="POST"
              use:enhance={({ cancel }) => {
                if (saving.includes(student.id)) {
                  cancel();
                  return;
                }
                saving = [...saving, student.id];
                return async ({ update }) => {
                  try {
                    await update({ reset: false });
                  } finally {
                    saving = saving.filter((id) => id !== student.id);
                  }
                };
              }}
            >
              <input type="hidden" name="lesson" value={journal.selected.id} />
              <input type="hidden" name="student" value={student.id} />
              <input type="hidden" name="version" value={student.version} />
              <label id={'attendance-' + student.id} for={'status-' + student.id}
                >{student.name}</label
              >
              <select
                id={'status-' + student.id}
                name="status"
                value={student.status ?? 'unmarked'}
              >
                {#each Object.entries(attendanceLabels) as [value, label]}
                  <option {value}>{label}</option>
                {/each}
              </select>
              <button
                class="btn secondary"
                aria-describedby={'attendance-' + student.id}
                disabled={saving.includes(student.id)}
                >{saving.includes(student.id) ? 'Сохраняем…' : 'Сохранить'}</button
              >
            </form>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="muted">В группе пока нет активных студентов.</p>
    {/if}
  {:else}
    <p class="muted">Нет завершённых занятий за последние 30 дней.</p>
  {/if}
</section>

<style>
  .lesson-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    align-items: end;
    margin-bottom: 18px;
  }
  .lesson-picker label {
    flex: 1 1 240px;
    min-width: 0;
  }
  select {
    min-width: 0;
    min-height: 44px;
  }
  .btn {
    min-height: 44px;
  }
  .feedback {
    color: #51428a;
    margin-bottom: 9px;
  }
  ul {
    padding: 0;
    margin: 10px 0 0;
    list-style: none;
  }
  li {
    border-top: 1px solid var(--border);
    padding: 9px 0;
  }
  li form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 210px) auto;
    align-items: center;
    gap: 9px;
  }
  li label {
    overflow-wrap: anywhere;
  }
  @media (max-width: 650px) {
    li form {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    li label {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 380px) {
    li form {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
