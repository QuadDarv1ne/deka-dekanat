<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { tick, type Snippet } from 'svelte';
  import type { ApplicationData } from './application.types';
  import AppSidebar from './AppSidebar.svelte';
  import AppHeader from './AppHeader.svelte';
  import MobileStudentNav from './MobileStudentNav.svelte';
  import { navigationFor } from './navigation';
  import { cabinetSections, isCabinetSection } from './cabinet-navigation';
  import { campusPath } from '#modules/campus/campus-links.ts';
  let { data, children }: { data: ApplicationData; children: Snippet } = $props();
  let menuOpen = $state(false),
    windowWidth = $state(1280);
  const path = $derived(page.url.pathname);
  const profile = $derived(path === '/profile' || path.startsWith('/profile/'));
  const cabinet = $derived(data.user.role === 'student' && profile);
  const section = $derived(path.split('/')[2] ?? '');
  const current = $derived(
    cabinet && isCabinetSection(section)
      ? cabinetSections[section]
      : profile
        ? cabinet
          ? 'Профиль студента'
          : 'Мой профиль'
        : (navigationFor(data.user.role).find(
            ({ href }) => path === href || path.startsWith(href + '/')
          )?.name ??
          (path === campusPath
            ? 'Карта МГИМО'
            : path.startsWith('/student-card')
              ? 'Студенческий билет'
              : 'Личный кабинет'))
  );
  const mobileMenuOpen = $derived(windowWidth <= 800 && menuOpen);
  function closeMenu(restoreFocus = false) {
    if (!menuOpen) return;
    menuOpen = false;
    if (restoreFocus) document.getElementById('mobile-menu-toggle')?.focus();
  }
  async function toggleMenu() {
    if (menuOpen) {
      closeMenu(true);
      return;
    }
    menuOpen = true;
    await tick();
    document.querySelector<HTMLElement>('#app-sidebar .brand')?.focus();
  }
  afterNavigate(() => closeMenu());
</script>

<svelte:window
  bind:innerWidth={windowWidth}
  onkeydown={(event) => {
    if (event.key === 'Escape' && mobileMenuOpen) closeMenu(true);
  }}
  onresize={() => {
    if (windowWidth > 800) closeMenu();
  }}
/>
<a class="skip" href="#main">Перейти к содержимому</a>
{#if mobileMenuOpen}
  <button class="overlay" aria-label="Закрыть меню" onclick={() => closeMenu(true)}></button>
{/if}
<AppSidebar
  {data}
  {cabinet}
  open={mobileMenuOpen}
  mobile={windowWidth <= 800}
  onclose={() => closeMenu()}
/>
<div class="workspace" class:student={data.user.role === 'student'}>
  <AppHeader {data} {current} open={mobileMenuOpen} ontoggle={toggleMenu} />
  <main class="content" id="main" tabindex="-1" inert={mobileMenuOpen}>
    {#if cabinet}<div id="deka-cabinet">{@render children()}</div>{:else}{@render children()}{/if}
  </main>
</div>
{#if data.user.role === 'student' && !mobileMenuOpen}<MobileStudentNav />{/if}

<style>
  .workspace {
    margin-left: 238px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .content {
    width: 100%;
    max-width: 1530px;
    padding: 32px 34px 25px;
    margin: 0 auto;
    flex: 1;
  }
  #deka-cabinet {
    --cabinet-blue: var(--primary);
    --cabinet-light: var(--accent);
    --cabinet-muted: var(--muted);
    --cabinet-line: var(--border);
    --cabinet-radius: 18px;
    min-width: 0;
  }
  .overlay {
    display: none;
  }
  @media (min-width: 1600px) {
    .workspace {
      margin-left: 258px;
    }
    .content {
      padding: 38px 42px;
    }
  }
  @media (max-width: 1150px) {
    .workspace {
      margin-left: 210px;
    }
    .content {
      padding: 28px 24px;
    }
  }
  @media (max-width: 800px) {
    .workspace {
      margin-left: 0;
    }
    .workspace.student {
      padding-bottom: calc(61px + env(safe-area-inset-bottom));
    }
    .overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: #24203855;
      z-index: 35;
    }
    .content {
      padding: 24px 18px;
    }
  }
</style>
