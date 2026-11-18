<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';

  let { href, label, description }: { href: string; label: string; description: string } = $props();
</script>

<a class="shortcut" {href}>
  <span><strong>{label}</strong><small>{description}</small></span>
  <Icon name="arrow" size={19} />
</a>

<style>
  .shortcut {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 54px;
    margin-block: 16px;
    padding: 8px 15px;
    border: 1px solid #e0dcf9;
    border-radius: 12px;
    background: #f6f4ff;
    color: #4435b0;
  }
  .shortcut:hover {
    background: #efebff;
  }
  .shortcut small {
    display: block;
    color: #595574;
    font-size: 12px;
  }
</style>
