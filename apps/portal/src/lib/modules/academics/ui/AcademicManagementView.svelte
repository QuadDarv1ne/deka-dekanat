<script lang="ts">
  import { enhance } from '$app/forms';
  import LessonEditor from './LessonEditor.svelte';
  import GradeEditor from './GradeEditor.svelte';
  import AcademicImport from './AcademicImport.svelte';
  import { fullDate, time } from '#shared/formatting.ts';
  import type {
    TeachingAssignment,
    AcademicStudent,
    ManagedGrade,
    GradeEvent,
    ManagedLesson,
    ImportPreview,
    ImportKind
  } from '../academic-management.types.ts';
  import type { User } from '#modules/auth/auth.types.ts';
  let {
    data,
    form
  }: {
    data: {
      user: User;
      assignments: TeachingAssignment[];
      students: AcademicStudent[];
      grades: ManagedGrade[];
      history: GradeEvent[];
      gradeSelection: { assignment: string; student: string };
      lessons: ManagedLesson[];
      draft: ImportPreview | null;
      tab: ImportKind;
      saved: boolean;
    };
    form?: { message?: string } | null;
  } = $props();
  let selected: ManagedLesson | null = $state(null);
  function edit(lesson: ManagedLesson) {
    selected = lesson;
    document
      .getElementById('academic-editor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<svelte:head><title>Учебные данные · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Учебные данные</h1>
    <p>Ввод вручную и импорт таблиц.</p>
  </div>
  <a class="btn secondary" href={data.tab === 'schedule' ? '/schedule' : '/grades'}>К просмотру</a>
</div>
<nav class="tabs" aria-label="Учебные данные">
  {#if data.user.role === 'dean'}<a class:active={data.tab === 'schedule'} href="?tab=schedule"
      >Расписание</a
    >{/if}<a class:active={data.tab === 'grades'} href="?tab=grades">Успеваемость</a>
</nav>
<div class="stack">
  {#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
  {#if data.saved && !form?.message}<p class="saved" role="status">Изменения сохранены.</p>{/if}
  <div id="academic-editor">
    {#if data.tab === 'schedule'}<LessonEditor
        assignments={data.assignments}
        {selected}
        onreset={() => (selected = null)}
      />{:else}<GradeEditor
        assignments={data.assignments}
        students={data.students}
        grades={data.grades}
        history={data.history}
        selection={data.gradeSelection}
      />{/if}
  </div>
  <AcademicImport kind={data.tab} draft={data.draft} />
  {#if data.tab === 'schedule'}<section class="panel">
      <div class="panel-head">
        <div>
          <h2>Опубликованные занятия</h2>
          <p>Ближайшие 90 дней</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead
            ><tr
              ><th>Дата и время</th><th>Дисциплина / группа</th><th>Аудитория</th><th>Действия</th
              ></tr
            ></thead
          ><tbody
            >{#each data.lessons as lesson}<tr class:cancelled={!!lesson.cancelled_at}
                ><td
                  >{fullDate(lesson.starts_at)}<small
                    >{time(lesson.starts_at)}–{time(lesson.ends_at)}</small
                  ></td
                ><td
                  ><strong>{lesson.subject}</strong><small
                    >{lesson.group_name} · {lesson.teacher}</small
                  ></td
                ><td
                  >{lesson.room}{#if lesson.cancelled_at}<small>Отменено</small>{/if}</td
                ><td
                  ><div class="row wrap">
                    <button class="text-link" onclick={() => edit(lesson)}
                      >{lesson.cancelled_at ? 'Восстановить' : 'Изменить'}</button
                    >{#if !lesson.cancelled_at}<form method="POST" action="?/cancel" use:enhance>
                        <input type="hidden" name="id" value={lesson.id} /><input
                          type="hidden"
                          name="version"
                          value={lesson.version}
                        /><button class="text-link cancel">Отменить</button>
                      </form>{/if}
                  </div></td
                ></tr
              >{/each}</tbody
          >
        </table>
      </div>
      {#if !data.lessons.length}<p class="empty">Занятий пока нет.</p>{/if}
    </section>{/if}
</div>

<style>
  .tabs {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid #e4e5ec;
    margin-bottom: 25px;
  }
  .tabs a {
    padding: 13px 20px;
    font-size: 13px;
    border-bottom: 2px solid transparent;
  }
  .tabs .active {
    border-color: #554be0;
    color: #554be0;
  }
  .stack {
    max-width: 1080px;
  }
  #academic-editor {
    scroll-margin-top: 20px;
  }
  .saved {
    padding: 15px 20px;
    background: #eaf5ef;
    border-radius: 10px;
    color: #347257;
    font-size: 13px;
  }
  .cancel {
    color: #a96776;
  }
  .cancelled {
    opacity: 0.65;
  }
</style>
