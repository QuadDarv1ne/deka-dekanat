<script lang="ts">
  import NotificationsView from '#modules/notifications/ui/NotificationsView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<NotificationsView {data} />
