<script lang="ts">
  import StudentAttendanceView from '#modules/academics/ui/StudentAttendanceView.svelte';
  import TeacherAttendanceView from '#modules/academics/ui/TeacherAttendanceView.svelte';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Посещаемость · Дека</title></svelte:head>
{#if data.journal.role === 'student'}
  <StudentAttendanceView entries={data.journal.entries} />
{:else}
  <TeacherAttendanceView journal={data.journal} {form} />
{/if}
