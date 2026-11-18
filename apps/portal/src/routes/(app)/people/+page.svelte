<script lang="ts">
  import UsersView from '#modules/administration/ui/UsersView.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<UsersView {data} />
