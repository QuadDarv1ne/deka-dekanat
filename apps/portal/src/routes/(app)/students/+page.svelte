<script lang="ts">
  import StudentDirectoryView from '#modules/administration/ui/StudentDirectoryView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<StudentDirectoryView {data} />
