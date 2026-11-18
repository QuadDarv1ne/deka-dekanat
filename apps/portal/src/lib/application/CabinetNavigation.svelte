<script lang="ts">
  import { page } from '$app/state';
  import Icon from '#shared/ui/Icon.svelte';
  import { cabinetGroups, cabinetPath, cabinetSections } from './cabinet-navigation';

  let { unread, onclose }: { unread: number; onclose: () => void } = $props();
  const path = $derived(page.url.pathname);
  const entries = [
    { href: '/profile', label: 'Профиль', icon: 'home' },
    { href: cabinetPath('news'), label: cabinetSections.news, icon: 'news' },
    { href: '/student-card', label: 'Студенческий билет', icon: 'cap' }
  ] as const;
</script>

<nav aria-label="Разделы кабинета">
  {#each entries as item (item.href)}
    <a
      class="nav-row"
      href={item.href}
      aria-current={path === item.href ? 'page' : undefined}
      onclick={onclose}
    >
      <Icon name={item.icon} size={19} />
      <span>{item.label}</span>
      {#if item.href === cabinetPath('news') && unread}
        <span class="count" aria-label={unread + ' непрочитанных'}>{unread}</span>
      {/if}
    </a>
  {/each}
  {#each cabinetGroups as group (group.label)}
    {#key path}
      <details open={group.sections.some((section) => cabinetPath(section) === path)}>
        <summary class="nav-row">
          <Icon name={group.icon} size={19} />
          <span>{group.label}</span>
          <span class="chevron"><Icon name="down" size={14} /></span>
        </summary>
        <div class="subnav">
          {#each group.sections as section (section)}
            <a
              class="nav-row"
              href={cabinetPath(section)}
              aria-current={path === cabinetPath(section) ? 'page' : undefined}
              onclick={onclose}>{cabinetSections[section]}</a
            >
          {/each}
        </div>
      </details>
    {/key}
  {/each}
</nav>

<style>
  nav {
    display: grid;
    gap: 6px;
  }
  .nav-row {
    display: flex;
    align-items: center;
    gap: 11px;
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 10px;
    color: #676c79;
    font-size: 13px;
  }
  .nav-row :global(svg) {
    flex-shrink: 0;
  }
  .nav-row:hover {
    background: #f7f6fc;
  }
  .nav-row[aria-current='page'] {
    color: var(--primary);
    background: var(--accent);
    font-weight: 550;
  }
  summary {
    list-style: none;
    cursor: pointer;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .chevron,
  .count {
    margin-left: auto;
    display: inline-flex;
  }
  details[open] .chevron {
    transform: rotate(180deg);
  }
  .count {
    padding: 1px 6px;
    border-radius: 5px;
    background: var(--accent);
    color: var(--primary);
    font-size: 12px;
  }
  .subnav {
    margin: 2px 0 2px 20px;
    padding-left: 5px;
    border-left: 1px solid var(--border);
  }
  .subnav .nav-row {
    min-height: 40px;
    font-size: 12px;
  }
  @media (max-width: 800px) {
    .subnav .nav-row {
      min-height: 44px;
    }
  }
</style>
