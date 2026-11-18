<script lang="ts">
  import { page } from '$app/state';
  import Icon from '#shared/ui/Icon.svelte';
</script>

<svelte:head><title>{page.status} · Дека</title></svelte:head>
<main class="error-page">
  <span>{page.status}</span>
  <h1>{page.error?.message ?? 'Что-то пошло не так'}</h1>
  <p>Вернитесь в личный кабинет или попробуйте обновить страницу.</p>
  <a href="/" class="btn">В личный кабинет<Icon name="arrow" size={16} /></a>
</main>

<style>
  .error-page {
    max-width: 600px;
    margin: 15vh auto;
    padding: 30px;
    display: grid;
    justify-items: start;
    gap: 20px;
  }
  .error-page > span {
    color: #716984;
    font-family: Manrope, sans-serif;
    font-size: 60px;
  }
  .error-page h1 {
    font-size: 26px;
  }
  .error-page p {
    color: #646c78;
    font-size: 13px;
  }
</style>
