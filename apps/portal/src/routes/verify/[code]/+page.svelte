<script lang="ts">
  import DocumentVerificationView from '#modules/requests/ui/DocumentVerificationView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<DocumentVerificationView {data} />
