<script lang="ts">
  import AcademicManagementView from '#modules/academics/ui/AcademicManagementView.svelte';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
</script>

<AcademicManagementView {data} {form} />
