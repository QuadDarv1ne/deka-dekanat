<script lang="ts">
  import { page } from '$app/state';
  import Icon from '#shared/ui/Icon.svelte';

  const links = [
    { href: '/overview', label: 'Обзор', icon: 'home' },
    { href: '/schedule', label: 'Расписание', icon: 'calendar' },
    { href: '/requests', label: 'Заявления', icon: 'files' },
    { href: '/profile', label: 'Профиль', icon: 'cap' }
  ] as const;
  const path = $derived(page.url.pathname);
</script>

<nav aria-label="Быстрый доступ" class="mobile-student-nav">
  {#each links as link (link.href)}
    <a
      href={link.href}
      aria-current={path === link.href ? 'page' : undefined}
      class:active={path === link.href ||
        path.startsWith(link.href + '/') ||
        (link.href === '/profile' && path === '/student-card')}
    >
      <span><Icon name={link.icon} size={19} /></span>
      {link.label}
    </a>
  {/each}
</nav>

<style>
  nav {
    display: none;
  }
  @media (max-width: 800px) {
    nav {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      position: fixed;
      inset: auto 0 0;
      z-index: 25;
      padding: 5px 7px max(5px, env(safe-area-inset-bottom));
      border-top: 1px solid var(--border);
      background: white;
      box-shadow: 0 -7px 20px #29204608;
    }
    a {
      display: grid;
      justify-items: center;
      align-content: center;
      gap: 2px;
      min-height: 51px;
      border-radius: 8px;
      color: #605d6d;
      font-size: 11px;
      line-height: 1.2;
    }
    a.active {
      color: var(--primary);
      font-weight: 650;
    }
    a > span {
      display: grid;
      place-items: center;
      height: 26px;
      width: 42px;
      border-radius: 12px;
    }
    a.active > span {
      background: var(--accent);
    }
  }
  @media print {
    nav {
      display: none;
    }
  }
</style>
