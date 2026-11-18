<script lang="ts">
  import RequestTriageView from '#modules/requests/ui/RequestTriageView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head><title>Очередь деканата · Дека</title></svelte:head>
<RequestTriageView queue={data.queue} faculty={data.user.faculty_name} />
