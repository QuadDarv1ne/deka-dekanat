<script lang="ts">
  import { page } from '$app/state';
  import RequestProgress from '#modules/requests/ui/RequestProgress.svelte';
  import type { LayoutProps, PageData } from './$types';
  let { data, children }: LayoutProps = $props();
  const details = $derived(page.data as PageData);
</script>

{#if data.user.role === 'student' && page.status === 200 && page.route.id === '/(app)/requests/[id]' && details.request}
  <RequestProgress status={details.request.status} />
{/if}
{@render children()}
