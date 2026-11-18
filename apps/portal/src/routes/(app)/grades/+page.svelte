<script lang="ts">
  import GradesView from '#modules/academics/ui/GradesView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<GradesView {data} />
