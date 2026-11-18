<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import type { OverviewData } from '../overview.types';
  import type { User } from '#modules/auth/auth.types.ts';
  let { data }: { data: OverviewData & { user: User } } = $props();
  const dean = $derived(data.user.role === 'dean'),
    teacher = $derived(data.user.role === 'teacher'),
    active = $derived(Number(data.requestStats.active));
  const average = $derived(
    data.grades.length
      ? Math.round(data.grades.reduce((n, g) => n + g.points, 0) / data.grades.length)
      : null
  );
</script>

<div class="metrics">
  <a href={data.admin ? '/people' : teacher ? '/grades' : '/requests'} class="metric panel"
    ><div class="row between">
      <span class="metric-icon"
        ><Icon name={data.admin ? 'users' : teacher ? 'book' : 'files'} size={19} /></span
      ><Icon name="up" size={15} />
    </div>
    <div class="metric-bottom">
      <div>
        <strong
          >{data.admin?.users ??
            (teacher ? new Set(data.grades.map((g) => g.subject)).size : active)}</strong
        >
        <p>{data.admin ? 'Пользователи' : teacher ? 'Дисциплины' : 'Активные заявления'}</p>
      </div>
    </div></a
  >
  <a href={data.admin ? '/audit' : dean ? '/requests' : '/grades'} class="metric panel"
    ><div class="row between">
      <span class="metric-icon green"
        ><Icon name={data.admin ? 'shield' : dean ? 'inbox' : 'chart'} size={19} /></span
      ><Icon name="up" size={15} />
    </div>
    <div class="metric-bottom">
      <div>
        <strong
          >{data.admin?.events ??
            (dean ? Number(data.requestStats.new) : (average ?? 'Нет данных'))}<small
            >{!dean && !data.admin && average !== null ? '/ 100' : ''}</small
          ></strong
        >
        <p>
          {data.admin ? 'Записи журнала' : dean ? 'Новые заявления' : 'Средний результат'}
        </p>
      </div>
    </div></a
  >
</div>

<style>
  .metrics {
    display: grid;
    gap: 18px;
  }
  .metric {
    padding: 19px 21px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: border-color 0.15s;
  }
  .metric:hover {
    border-color: #d4ccef;
  }
  .metric > .row > :global(svg) {
    color: #686b70;
  }
  .metric-icon {
    width: 33px;
    height: 33px;
    background: #f1eefa;
    color: #706888;
    border-radius: 9px;
    display: grid;
    place-items: center;
  }
  .metric-icon.green {
    background: #eef6f2;
    color: #5c6f64;
  }
  .metric-bottom {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 8px;
    margin-top: 11px;
  }
  .metric strong {
    font-family: Manrope, sans-serif;
    letter-spacing: -0.04em;
    font-size: 29px;
    font-weight: 600;
    line-height: 1;
  }
  .metric strong small {
    font-family: 'Golos Text', sans-serif;
    font-size: 12px;
    color: #686b70;
    margin-left: 5px;
    letter-spacing: 0;
  }
  .metric p {
    font-size: 12px;
    color: #676a72;
    margin-top: 7px;
  }
  @media (max-width: 1300px) {
    .metric {
      padding: 18px;
    }
  }
  @media (max-width: 1000px) {
    .metrics {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 600px) {
    .metrics {
      gap: 12px;
    }
    .metric {
      padding: 16px;
    }
    .metric strong {
      font-size: 26px;
    }
  }
</style>
