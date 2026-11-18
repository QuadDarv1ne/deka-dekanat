<script lang="ts">
  import StudentProgressView from '#modules/academics/ui/StudentProgressView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head><title>Прогресс по дисциплинам · Дека</title></svelte:head>
<StudentProgressView courses={data.courses} />
