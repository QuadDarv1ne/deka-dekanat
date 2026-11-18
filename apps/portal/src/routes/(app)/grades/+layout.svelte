<script lang="ts">
  import { page } from '$app/state';
  import SectionShortcut from '#application/SectionShortcut.svelte';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();
</script>

{@render children()}
{#if data.user.role === 'student' && page.route.id === '/(app)/grades'}
  <SectionShortcut
    href="/assistant/study-plan"
    label="План подготовки"
    description="Что повторить и к каким датам подготовиться"
  />
{/if}
