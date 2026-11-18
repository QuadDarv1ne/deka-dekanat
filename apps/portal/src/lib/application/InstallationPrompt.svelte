<script lang="ts">
  import { onMount } from 'svelte';
  import { installation, type InstallEvent } from '#shared/installation.svelte.ts';
  onMount(() => {
    const prompt = (event: Event) => {
      event.preventDefault();
      installation.event = event as InstallEvent;
    };
    const installed = () => {
      installation.event = null;
      installation.installed = true;
    };
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', installed);
    };
  });
</script>
