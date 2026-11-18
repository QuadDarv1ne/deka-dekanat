<script lang="ts">
  import ProfileView from '#modules/auth/ui/ProfileView.svelte';
  import CabinetProfileView from '#modules/overview/ui/CabinetProfileView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

{#if data.summary}
  <CabinetProfileView user={data.profile} summary={data.summary} />
{:else}
  <ProfileView {data} />
{/if}
