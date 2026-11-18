<script lang="ts">
  import '#application/styles/global.css';
  import InstallationPrompt from '#application/InstallationPrompt.svelte';
  let { children } = $props();
</script>

<svelte:head
  ><title>Дека · Цифровой деканат</title><meta
    name="description"
    content="Расписание, оценки и обращения в деканат."
  /><link rel="manifest" href="/manifest.webmanifest" /><link
    rel="apple-touch-icon"
    href="/brand/app-192.png"
  /></svelte:head
>
{@render children()}
<InstallationPrompt />
