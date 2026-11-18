<script lang="ts">
  import LoginView from '#modules/auth/ui/LoginView.svelte';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
</script>

<LoginView {data} {form} />
