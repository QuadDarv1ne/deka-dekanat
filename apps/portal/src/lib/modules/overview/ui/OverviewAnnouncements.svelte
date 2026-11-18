<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import type { OverviewData } from '../overview.types';
  import type { User } from '#modules/auth/auth.types.ts';
  let { data }: { data: OverviewData & { user: User } } = $props();
  import { shortDate } from '#shared/formatting.ts';
</script>

<section class="panel news-panel">
  <div class="panel-head">
    <h2>На повестке</h2>
    <a class="link" href="/announcements">Все <Icon name="arrow" size={14} /></a>
  </div>
  <div class="news-list">
    {#each data.news as news}<a class="news-item" href={`/announcements#${news.id}`}
        ><div class="row between">
          <span class="news-tag">{news.tag}</span><span class="news-date"
            >{shortDate(news.created_at)}</span
          >
        </div>
        <h3>{news.title}</h3>
        <p>{news.body}</p></a
      >{:else}<p class="muted small">Пока нет объявлений.</p>{/each}
  </div>
</section>

<style>
  .news-list {
    display: grid;
  }
  .news-item {
    padding: 15px 0;
    border-bottom: 1px solid #f0f1f5;
    display: block;
  }
  .news-item:first-child {
    padding-top: 0;
  }
  .news-item:last-child {
    border: 0;
    padding-bottom: 0;
  }
  .news-tag {
    font-size: 10px;
    background: #f2f1f8;
    color: #6e697e;
    padding: 3px 6px;
    border-radius: 4px;
  }
  .news-date {
    font-size: 10px;
    color: #686a70;
  }
  .news-item h3 {
    font-family: 'Golos Text', sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0;
    margin-top: 9px;
    line-height: 1.55;
  }
  .news-item:hover h3 {
    color: var(--primary);
  }
  .news-item p {
    font-size: 11px;
    color: #696c75;
    line-height: 1.7;
    margin-top: 5px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  @media (min-width: 1600px) {
    .news-item h3 {
      font-size: 13px;
    }
    .news-item p {
      font-size: 12px;
    }
  }
  @media (max-width: 1000px) {
    .news-list {
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .news-item {
      padding: 0;
      border-bottom: 0;
    }
    .news-item:not(:last-child) {
      border-right: 1px solid #f0f1f5;
      padding-right: 20px;
    }
  }
  @media (max-width: 600px) {
    .news-list {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .news-item {
      padding: 15px 0 !important;
      border: 0 !important;
      border-bottom: 1px solid #f0f1f5 !important;
    }
    .news-item:first-child {
      padding-top: 0 !important;
    }
    .news-item:last-child {
      border: 0 !important;
      padding-bottom: 0 !important;
    }
    .news-item h3 {
      font-size: 13px;
    }
    .news-item p {
      font-size: 12px;
    }
  }
</style>
