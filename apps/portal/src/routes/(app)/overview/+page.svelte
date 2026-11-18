<script lang="ts">
  import OverviewView from '#modules/overview/ui/OverviewView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<OverviewView {data} />
