<script lang="ts">
  import SectionShortcut from '#application/SectionShortcut.svelte';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();
</script>

{#if data.user.role === 'student'}
  <SectionShortcut
    href="/requests/templates"
    label="Выбрать шаблон"
    description="Справка об обучении, о стипендии или для налоговой"
  />
{/if}
{@render children()}
