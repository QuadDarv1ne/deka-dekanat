<script lang="ts">
  import { page } from '$app/state';
  import Icon from '#shared/ui/Icon.svelte';
  import { initials } from '#shared/formatting.ts';
  import { roleNames } from '#modules/auth/auth.labels.ts';
  import type { ApplicationData } from './application.types';
  let {
    data,
    current,
    open,
    ontoggle
  }: { data: ApplicationData; current: string; open: boolean; ontoggle: () => void } = $props();
</script>

<header class="topbar">
  <div class="row">
    <button
      class="icon-btn mobile-menu"
      id="mobile-menu-toggle"
      aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
      aria-controls="app-sidebar"
      aria-expanded={open}
      onclick={ontoggle}><Icon name="menu" /></button
    ><span class="breadcrumb"
      ><span class="crumb-root">Личный кабинет</span> <span class="crumb-separator">/</span>
      <strong>{current}</strong></span
    >
  </div>
  <div class="row topbar-right">
    <a
      href="/notifications"
      class="icon-btn notification-icon"
      aria-label={`Уведомления: ${data.unread} непрочитанных`}
      ><Icon name="bell" />{#if data.unread}<i></i>{/if}</a
    >
    <div class="topbar-divider"></div>
    <a
      href="/profile"
      class="account"
      aria-label={(data.user.role === 'student' ? 'Личный кабинет студента' : 'Мой профиль') +
        ': ' +
        data.user.full_name}
      aria-current={page.url.pathname === '/profile' ? 'page' : undefined}
      ><span class="avatar">{initials(data.user.full_name)}</span><span class="account-info"
        ><strong>{data.user.full_name}</strong><small>{roleNames[data.user.role]}</small></span
      ><Icon name="down" size={14} /></a
    >
  </div>
</header>

<style>
  .topbar {
    height: 88px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 34px;
    background: #fff;
    border-bottom: 1px solid #e9ebf1;
    gap: 16px;
  }
  .breadcrumb {
    font-size: 13px;
    color: #686b73;
  }
  .breadcrumb .crumb-separator {
    margin: 0 12px;
    color: #6b6c72;
  }
  .breadcrumb strong {
    font-weight: 400;
    color: #5c6272;
  }
  .account {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    border-radius: 8px;
  }
  .account:hover .account-info strong,
  .account[aria-current='page'] .account-info strong {
    color: var(--primary);
  }
  .account-info {
    display: flex;
    flex-direction: column;
    margin-right: 10px;
  }
  .account-info strong {
    font-size: 12px;
    font-weight: 500;
  }
  .account-info small {
    font-size: 11px;
    color: #6b6d75;
    margin-top: 2px;
  }
  .account > :global(svg) {
    color: #999;
  }
  .topbar-divider {
    height: 28px;
    width: 1px;
    background: #f0f1f5;
    margin: 0 6px;
  }
  .notification-icon {
    position: relative;
  }
  .notification-icon i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #afa5ec;
    position: absolute;
    right: 10px;
    top: 8px;
    border: 1px solid white;
  }
  .mobile-menu {
    display: none;
  }
  @media (min-width: 1600px) {
    .topbar {
      padding: 0 42px;
    }
    .account-info strong {
      font-size: 13px;
    }
  }
  @media (max-width: 1150px) {
    .topbar {
      padding: 0 24px;
    }

    .account-info {
      display: none;
    }
    .topbar-right {
      gap: 7px;
    }
    .breadcrumb {
      font-size: 12px;
    }
  }
  @media (max-width: 800px) {
    .topbar {
      height: 72px;
      padding: 0 18px;
    }
    .mobile-menu {
      display: flex;
    }
    .breadcrumb {
      font-size: 13px;
    }
    .breadcrumb > span {
      display: none;
    }
    .topbar > .row:first-child {
      min-width: 0;
    }
    .breadcrumb {
      min-width: 0;
    }
    .breadcrumb > strong {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .topbar-divider {
      margin: 0 2px;
    }
    .account {
      gap: 6px;
    }
    .account > :global(svg) {
      display: none;
    }
    .account .avatar {
      width: 34px;
      height: 34px;
    }
  }
</style>
