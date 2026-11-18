<script lang="ts">
  import AssistantView from '#modules/assistant/ui/AssistantView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<AssistantView {data} />
