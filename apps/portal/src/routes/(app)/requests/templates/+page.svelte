<script lang="ts">
  import RequestTemplatesView from '#modules/requests/ui/RequestTemplatesView.svelte';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Подать заявление · Дека</title></svelte:head>
<RequestTemplatesView {data} {form} />
