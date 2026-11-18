<script lang="ts">
  import { page } from '$app/state';
  import SectionShortcut from '#application/SectionShortcut.svelte';
  import type { LayoutProps } from './$types';
  let { data, children }: LayoutProps = $props();
</script>

{@render children()}
{#if page.route.id === '/(app)/schedule' && (data.user.role === 'student' || data.user.role === 'teacher')}
  <SectionShortcut
    href="/schedule/attendance"
    label="Посещаемость"
    description={data.user.role === 'teacher'
      ? 'Журнал прошедших занятий'
      : 'Отметки по занятиям за 30 дней'}
  />
{/if}
