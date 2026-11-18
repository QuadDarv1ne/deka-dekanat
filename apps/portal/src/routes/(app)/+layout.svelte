<script lang="ts">
  import AppShell from '#application/AppShell.svelte';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();
</script>

<AppShell {data}>{@render children()}</AppShell>
