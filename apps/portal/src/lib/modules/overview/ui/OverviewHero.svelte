<script lang="ts">
  import Icon from '#shared/ui/Icon.svelte';
  import Campus from '#shared/ui/CampusIllustration.svelte';
  import type { OverviewData } from '../overview.types';
  import type { User } from '#modules/auth/auth.types.ts';
  let { data }: { data: OverviewData & { user: User } } = $props();
  const student = $derived(data.user.role === 'student'),
    dean = $derived(data.user.role === 'dean'),
    teacher = $derived(data.user.role === 'teacher');
</script>

<section class="hero">
  <div class="hero-copy">
    <h2>
      {student
        ? 'Заявления и справки'
        : dean
          ? 'Обращения студентов'
          : teacher
            ? 'Занятия и группы'
            : 'Управление системой'}
    </h2>
    <p>
      {student
        ? 'Закажите справку или напишите в деканат.'
        : dean
          ? 'Новые заявления, текущие статусы\nи история обработки.'
          : teacher
            ? 'Расписание и результаты\nпо вашим дисциплинам.'
            : 'Учётные записи, права доступа\nи журнал действий.'}
    </p>
    <a
      class="btn hero-btn"
      href={student ? '/requests/new' : dean ? '/requests' : teacher ? '/schedule' : '/people'}
      >{student
        ? 'Подать заявление'
        : dean
          ? 'Открыть заявления'
          : teacher
            ? 'Мои занятия'
            : 'Пользователи'}<Icon name="arrow" size={15} /></a
    >
  </div>
  <Campus />
</section>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    background: #eeebfa;
    min-height: 296px;
    padding: 29px 32px;
    display: flex;
    align-items: center;
  }
  .hero-copy {
    position: relative;
    z-index: 1;
  }
  .hero h2 {
    font-size: 27px;
    line-height: 1.4;
    white-space: pre-line;
    color: #51436f;
    letter-spacing: -0.045em;
    margin-top: 13px;
  }
  .hero p {
    font-size: 12px;
    color: #6f677f;
    line-height: 1.9;
    white-space: pre-line;
    margin-top: 13px;
  }
  .hero-btn {
    font-size: 12px;
    min-height: 37px;
    padding: 10px 14px;
    margin-top: 21px;
    gap: 13px;
    background: #7b6ac3;
  }
  .hero-btn:hover {
    background: #6655af;
  }
  .hero :global(.campus) {
    position: absolute;
    width: 300px;
    right: -6px;
    bottom: 6px;
    opacity: 0.9;
  }
  @media (min-width: 1600px) {
    .hero {
      min-height: 310px;
      padding: 34px 38px;
    }
    .hero h2 {
      font-size: 31px;
    }
    .hero p {
      font-size: 13px;
    }
    .hero :global(.campus) {
      width: 330px;
      right: 4px;
    }
  }
  @media (max-width: 1300px) {
    .hero :global(.campus) {
      width: 245px;
      right: -30px;
      opacity: 0.75;
    }
    .hero h2 {
      font-size: 24px;
    }
    .hero p {
      font-size: 11px;
    }
    .hero {
      padding: 25px;
    }
  }
  @media (max-width: 1000px) {
    .hero :global(.campus) {
      width: 290px;
      right: 20px;
    }
    .hero h2 {
      font-size: 28px;
    }
    .hero p {
      font-size: 13px;
    }
  }
  @media (max-width: 600px) {
    .hero {
      min-height: 218px;
      padding: 24px;
    }
    .hero h2 {
      font-size: 24px;
    }
    .hero p {
      font-size: 12px;
    }
    .hero :global(.campus) {
      width: 210px;
      right: -34px;
      bottom: -6px;
      opacity: 0.45;
    }
    .hero-btn {
      font-size: 11px;
    }
  }
  @media (max-width: 380px) {
    .hero :global(.campus) {
      width: 160px;
      right: -30px;
    }
  }
</style>
