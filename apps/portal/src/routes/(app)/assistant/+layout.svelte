<script lang="ts">
  import { page } from '$app/state';
  import SectionShortcut from '#application/SectionShortcut.svelte';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();
</script>

{#if page.route.id === '/(app)/assistant' && data.user.role === 'student'}
  <SectionShortcut
    href="/assistant/study-plan"
    label="План подготовки"
    description="Оценки, аттестации и персональные шаги"
  />
{/if}
{@render children()}
