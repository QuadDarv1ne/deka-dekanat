<script lang="ts">
  import AuditView from '#modules/administration/ui/AuditView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<AuditView {data} />
