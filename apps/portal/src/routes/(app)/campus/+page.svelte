<script lang="ts">
  import CampusMap from '#modules/campus/ui/CampusMap.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

{#key data}
  <CampusMap {data} />
{/key}
