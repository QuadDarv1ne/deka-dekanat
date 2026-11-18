<script lang="ts">
  import RequestFormView from '#modules/requests/ui/RequestFormView.svelte';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
</script>

<RequestFormView {data} {form} />
