<script lang="ts">
  import AnnouncementsView from '#modules/announcements/ui/AnnouncementsView.svelte';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
</script>

<AnnouncementsView {data} {form} />
