<script lang="ts">
  import StudentCardView from '#modules/student-cards/ui/StudentCardView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<StudentCardView {data} />
