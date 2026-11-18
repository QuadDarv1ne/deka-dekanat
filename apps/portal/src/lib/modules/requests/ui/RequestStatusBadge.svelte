<script lang="ts">
  import { statusNames } from '#modules/requests/request.labels.ts';
  import type { RequestStatus } from '#modules/requests/request.types.ts';
  let { status }: { status: RequestStatus } = $props();
</script>

<span class="status {status}"><span></span>{statusNames[status]}</span>
