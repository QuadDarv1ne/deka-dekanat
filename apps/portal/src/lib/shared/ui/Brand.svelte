<script lang="ts">
  let { compact = false }: { compact?: boolean } = $props();
</script>

<span class="brand-lockup" aria-label="Дека"
  ><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"
    ><path
      fill="currentColor"
      fill-rule="evenodd"
      d="M24 9h19a6 6 0 0 1 6 6v28h2a5 5 0 0 1 5 5v7h-8v-4H16v4H8v-7a5 5 0 0 1 5-5h2c4-8 6-18 7-32a2 2 0 0 1 2-2Zm6 10c-1 10-3 18-6 24h16V19H30Z"
      clip-rule="evenodd"
    /></svg
  >{#if !compact}<span>Дека</span>{/if}</span
>

<style>
  .brand-lockup {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    font-family: Manrope, 'Golos Text', sans-serif;
    font-size: 29px;
    font-weight: 750;
    letter-spacing: -0.055em;
    line-height: 1.2;
    color: #242532;
  }
  .brand-lockup svg {
    width: 40px;
    height: 40px;
    color: #554be0;
    flex-shrink: 0;
  }
  .brand-lockup > span {
    padding-bottom: 2px;
  }
</style>
