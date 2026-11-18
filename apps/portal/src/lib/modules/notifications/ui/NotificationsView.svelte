<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '#shared/ui/Icon.svelte';
  import { shortDate, time } from '#shared/formatting.ts';
  type PageProps = { data: { notifications: import('../notification.types').Notification[] } };
  let { data }: PageProps = $props();
</script>

<svelte:head><title>Уведомления · Дека</title></svelte:head>
<div class="page-head">
  <div>
    <h1>Уведомления</h1>
    <p>Следите за обновлениями и ответами деканата.</p>
  </div>
  {#if data.notifications.some((n) => !n.read_at)}<form action="?/read" method="POST" use:enhance>
      <button class="btn outline"><Icon name="check" size={16} />Прочитать все</button>
    </form>{/if}
</div>
<section class="panel">
  <div class="notification-list">
    {#each data.notifications as item}<form method="POST" action={`/notifications/${item.id}`}>
        <button class="notification" class:unread={!item.read_at} type="submit"
          ><span class="subject-icon"><Icon name="bell" size={19} /></span>
          <div>
            <h2>
              {item.title}{#if !item.read_at}<span class="unread-dot"></span>{/if}
            </h2>
            <p>{item.body}</p>
            <small>{shortDate(item.created_at)}, {time(item.created_at)}</small>
          </div>
          <Icon name="arrow" size={17} /></button
        >
      </form>{:else}<div class="empty">
        <Icon name="bell" size={30} />
        <h3>Вы всё знаете</h3>
        <p>Новые уведомления появятся здесь.</p>
      </div>{/each}
  </div>
</section>

<style>
  .notification-list {
    display: grid;
  }
  .notification {
    width: 100%;
    text-align: left;
    background: transparent;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    padding: 23px 9px;
    border-bottom: 1px solid #f0f1f5;
  }
  .notification:last-child {
    border-bottom: 0;
  }
  .notification > div {
    flex: 1;
  }
  .notification h2 {
    display: flex;
    align-items: center;
    gap: 9px;
    font-family: 'Golos Text', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0;
  }
  .notification p {
    font-size: 13px;
    color: #656c78;
    line-height: 1.8;
    margin-top: 7px;
  }
  .notification small {
    font-size: 12px;
    color: #686c74;
    display: block;
    margin-top: 9px;
  }
  .notification > :global(svg) {
    margin-top: 10px;
    color: #6f697d;
  }
  .notification:hover h2 {
    color: var(--primary);
  }
  .unread-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #ac9ddd;
  }
  .notification:not(.unread) .subject-icon {
    background: #f4f5f8;
    color: #686a72;
  }
  @media (max-width: 600px) {
    .notification {
      gap: 12px;
      padding: 19px 0;
    }
    .notification h2 {
      font-size: 13px;
    }
    .notification p {
      font-size: 13px;
    }
    .notification .subject-icon {
      width: 31px;
      height: 33px;
    }
    .page-head {
      flex-wrap: wrap;
    }
  }
</style>
