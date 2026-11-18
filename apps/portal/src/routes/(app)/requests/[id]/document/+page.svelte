<script lang="ts">
  import RequestDocumentView from '#modules/requests/ui/RequestDocumentView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<RequestDocumentView {data} />
