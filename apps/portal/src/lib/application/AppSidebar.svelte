<script lang="ts">
  import { page } from '$app/state';
  import Icon from '#shared/ui/Icon.svelte';
  import Brand from '#shared/ui/Brand.svelte';
  import CabinetNavigation from './CabinetNavigation.svelte';
  import { navigationFor } from './navigation';
  import type { ApplicationData } from './application.types';
  let {
    data,
    cabinet,
    open,
    mobile,
    onclose
  }: {
    data: ApplicationData;
    cabinet: boolean;
    open: boolean;
    mobile: boolean;
    onclose: () => void;
  } = $props();
  const navigation = $derived(navigationFor(data.user.role));
  const path = $derived(page.url.pathname);
</script>

<aside id="app-sidebar" class:open class="sidebar" inert={mobile && !open}>
  <a href="/overview" class="brand" onclick={onclose}><Brand /></a>
  <div class="nav-caption">{cabinet ? 'Кабинет студента' : 'Личный кабинет'}</div>
  {#if cabinet}
    <CabinetNavigation unread={data.unread} {onclose} />
  {:else}
    <nav aria-label="Главная навигация">
      {#each navigation as item (item.href)}
        <a
          href={item.href}
          class:active={path === item.href || path.startsWith(item.href + '/')}
          aria-current={path === item.href ? 'page' : undefined}
          onclick={onclose}
        >
          <Icon name={item.icon} size={19} /><span>{item.name}</span>
          {#if item.href === '/notifications' && data.unread}<span class="nav-count"
              >{data.unread}</span
            >{/if}
        </a>
      {/each}
    </nav>
  {/if}
  <div class="sidebar-bottom">
    <a
      class="profile-link"
      href={data.user.role === 'student' ? '/profile/support' : '/announcements'}
      onclick={onclose}
      ><Icon name="help" size={18} />{data.user.role === 'student'
        ? 'Поддержка'
        : 'Контакты деканата'}</a
    >
    <a
      class="profile-link"
      class:active={!cabinet && path === '/profile'}
      href={cabinet ? '/overview' : '/profile'}
      onclick={onclose}
      ><Icon name={cabinet ? 'left' : 'settings'} size={18} />{cabinet
        ? 'К обзору Деки'
        : 'Мой профиль'}</a
    >
    <form method="POST" action="/logout">
      <button class="profile-link"><Icon name="logout" size={18} />Выйти из аккаунта</button>
    </form>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: 238px;
    background: white;
    border-right: 1px solid #e9ebf1;
    z-index: 40;
    display: flex;
    flex-direction: column;
    padding: 33px 18px 17px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .sidebar > * {
    flex-shrink: 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: Manrope, sans-serif;
    font-weight: 800;
    letter-spacing: -0.05em;
    font-size: 32px;
    margin: 0 14px 33px;
    line-height: 1;
  }

  .nav-caption {
    text-transform: uppercase;
    color: #6b6d75;
    font-size: 11px;
    letter-spacing: 0.11em;
    padding-left: 17px;
    margin-bottom: 13px;
  }
  nav {
    display: grid;
    gap: 6px;
  }
  nav a {
    display: flex;
    gap: 12px;
    align-items: center;
    min-height: 47px;
    padding: 13px 16px;
    border-radius: 10px;
    color: #676c79;
    font-size: 13px;
    transition: background 0.15s;
  }
  nav a:hover {
    background: #f7f6fc;
  }
  nav a.active {
    color: #6255c5;
    background: #efedfc;
    font-weight: 500;
  }
  .nav-count {
    margin-left: auto;
    font-size: 12px;
    background: #e8e4fb;
    color: #6d60b3;
    padding: 1px 6px;
    border-radius: 5px;
  }
  .sidebar-bottom {
    margin-top: auto;
    padding-top: 30px;
  }
  .profile-link {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    font-size: 13px;
    color: #686c79;
    padding: 11px 16px;
    background: transparent;
    border-radius: 9px;
    text-align: left;
  }
  .profile-link:hover,
  .profile-link.active {
    background: #f5f4fc;
    color: #6e60b8;
  }
  @media (min-width: 1600px) {
    .sidebar {
      width: 258px;
      padding-left: 22px;
      padding-right: 22px;
    }
    nav a {
      font-size: 13px;
    }
  }
  @media (max-height: 850px) {
    .sidebar {
      padding-top: 24px;
    }
    .brand {
      margin-bottom: 23px;
    }
    .sidebar-bottom {
      padding-top: 18px;
    }
  }
  @media (max-width: 1150px) {
    .sidebar {
      width: 210px;
      padding-left: 12px;
      padding-right: 12px;
    }
  }
  @media (max-width: 800px) {
    .sidebar {
      transform: translateX(-100%);
      visibility: hidden;
      transition:
        transform 0.2s,
        visibility 0.2s;
      width: min(270px, 85vw);
      padding: 26px 18px;
    }
    .sidebar.open {
      transform: translateX(0);
      visibility: visible;
    }
  }
</style>
