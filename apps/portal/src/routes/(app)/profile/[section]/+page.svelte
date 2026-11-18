<script lang="ts">
  import { cabinetSections } from '#application/cabinet-navigation.ts';
  import CabinetSectionView from '#modules/overview/ui/CabinetSectionView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head><title>{cabinetSections[data.section]} · Дека</title></svelte:head>
<CabinetSectionView section={data.section} content={data.content} />
