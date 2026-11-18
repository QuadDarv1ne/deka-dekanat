<script lang="ts">
  import { page } from '$app/state';
  import SectionShortcut from '#application/SectionShortcut.svelte';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();
</script>

{#if page.route.id === '/(app)/requests' && data.user.role === 'dean'}
  <SectionShortcut
    href="/requests/triage"
    label="Очередь деканата"
    description="Новые, ожидающие и готовые к выдаче заявления"
  />
{/if}
{@render children()}
