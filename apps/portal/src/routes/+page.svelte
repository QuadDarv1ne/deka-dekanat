<script lang="ts">
  // Root page renders the same login form as /login, so that "/" answers with
  // 200 for platform health probes (see +page.server.ts). Signed-in visitors
  // are moved to /overview on the client instead of with a 303 response.
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import LoginView from '#modules/auth/ui/LoginView.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();

  onMount(() => {
    if (data.redirect) void goto(data.redirect, { replaceState: true });
  });
</script>

{#if data.redirect}
  <div class="redirecting">Входим в личный кабинет…</div>
{:else}
  <LoginView data={{ demo: data.demo, accounts: data.accounts }} form={form ?? null} />
{/if}

<style>
  .redirecting {
    display: flex;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
    color: var(--muted, #555);
  }
</style>
