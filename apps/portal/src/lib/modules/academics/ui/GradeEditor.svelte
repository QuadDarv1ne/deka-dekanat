<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import GradeHistory from './GradeHistory.svelte';
  import {
    assignmentKey,
    type TeachingAssignment,
    type AcademicStudent,
    type ManagedGrade,
    type GradeEvent
  } from '../academic-management.types.ts';
  let {
    assignments,
    students,
    grades,
    history,
    selection
  }: {
    assignments: TeachingAssignment[];
    students: AcademicStudent[];
    grades: ManagedGrade[];
    history: GradeEvent[];
    selection: { assignment: string; student: string };
  } = $props();
  let pending = $state(false),
    loading = $state(false);
  const group = $derived(
    assignments.find((a) => assignmentKey(a) === selection.assignment)?.group_id
  );
  const available = $derived(students.filter((s) => s.group_id === group));
  const current = $derived(grades.find((g) => g.student_id === selection.student));
  const valid = $derived(Boolean(selection.assignment && selection.student));
  function refresh(event: Event) {
    (event.currentTarget as HTMLSelectElement).form?.requestSubmit();
  }
  async function select(event: SubmitEvent) {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const params = new URLSearchParams({
      tab: 'grades',
      assignment: String(form.get('assignment') ?? ''),
      student: String(form.get('student') ?? '')
    });
    loading = true;
    try {
      await goto('/academics/manage?' + params, { reset: false, refreshAll: true });
    } finally {
      loading = false;
    }
  }
</script>

<section class="panel" aria-busy={loading || pending}>
  <div class="panel-head">
    <div>
      <h2>Внести результат</h2>
      <p>Выберите дисциплину и студента.</p>
    </div>
  </div>
  <form method="GET" action="/academics/manage" class="selection" onsubmit={select}>
    <input type="hidden" name="tab" value="grades" />
    <label
      >Дисциплина, группа и преподаватель<select
        name="assignment"
        required
        value={selection.assignment}
        onchange={refresh}
        disabled={pending}
        >{#each assignments as a}<option value={assignmentKey(a)}
            >{a.group_name} · {a.subject} · {a.teacher}</option
          >{/each}</select
      ></label
    >
    <div class="student-selection">
      <label
        >Студент<select
          name="student"
          required
          value={selection.student}
          onchange={refresh}
          disabled={!available.length || pending}
          >{#each available as s}<option value={s.id}>{s.full_name}</option>{/each}</select
        ></label
      >
      <button class="btn secondary" disabled={loading || pending || !valid}
        >{loading ? 'Обновляем…' : 'Обновить данные'}</button
      >
    </div>
  </form>
  {#if valid}
    <form
      method="POST"
      action="?/grade"
      class="result-form"
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
      <input type="hidden" name="assignment" value={selection.assignment} />
      <input type="hidden" name="student" value={selection.student} />
      <input type="hidden" name="version" value={current?.version ?? 0} />
      <div class="current-result">
        <span>Опубликованный результат</span><strong
          >{current ? current.points + ' / 100' : 'Не опубликован'}</strong
        >
      </div>
      <label
        >Баллы<input
          name="points"
          type="number"
          min="0"
          max="100"
          step="1"
          required
          value={current?.points ?? ''}
          placeholder="От 0 до 100"
          disabled={pending || loading}
        /></label
      >
      <div class="row wrap">
        <button class="btn" disabled={pending || loading}
          >{pending ? 'Сохраняем…' : 'Сохранить результат'}</button
        ><span class="muted small"
          >Изменение сохранится в истории. Студент получит уведомление.</span
        >
      </div>
    </form>
    <GradeHistory entries={history} />
  {:else}<p class="empty">Нет доступных студентов или назначенных дисциплин.</p>{/if}
</section>

<style>
  .selection {
    display: grid;
    gap: 16px;
  }
  .student-selection {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: end;
  }
  .result-form {
    display: grid;
    gap: 16px;
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
  .result-form > label {
    max-width: 220px;
  }
  .current-result {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    align-items: baseline;
    font-size: 13px;
    color: var(--muted);
  }
  .current-result strong {
    color: #26344d;
    font-weight: 600;
  }
  @media (max-width: 600px) {
    .student-selection {
      grid-template-columns: minmax(0, 1fr);
    }
    .result-form > label {
      max-width: none;
    }
    input,
    select {
      font-size: 16px;
    }
  }
</style>
