<script lang="ts">
  import RequestListView from '#modules/requests/ui/RequestListView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<RequestListView {data} />
