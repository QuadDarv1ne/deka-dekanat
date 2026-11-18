<script lang="ts">
  import StudyPlanView from '#modules/study-plan/ui/StudyPlanView.svelte';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
</script>

<svelte:head><title>План подготовки · Дека</title></svelte:head>
<StudyPlanView {data} {form} />
