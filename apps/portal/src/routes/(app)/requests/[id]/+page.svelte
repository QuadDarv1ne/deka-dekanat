<script lang="ts">
  import RequestDetailsView from '#modules/requests/ui/RequestDetailsView.svelte';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
</script>

<RequestDetailsView {data} {form} />
