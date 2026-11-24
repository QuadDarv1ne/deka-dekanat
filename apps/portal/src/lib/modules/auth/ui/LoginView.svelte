<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '#shared/ui/Icon.svelte';
  import Brand from '#shared/ui/Brand.svelte';
  type PageProps = {
    data: {
      demo: boolean;
      unavailable?: boolean;
      accounts: ReadonlyArray<(typeof import('../preview-accounts.ts').previewAccounts)[number]>;
    };
    form?: { message?: string } | null;
  };
  let { data, form }: PageProps = $props();
  let pending = $state(false);
  const accountGroups = $derived([
    { label: 'Студенты', accounts: data.accounts.filter((account) => account.role === 'student') },
    { label: 'Сотрудники', accounts: data.accounts.filter((account) => account.role !== 'student') }
  ]);
</script>

<svelte:head><title>Вход · Дека</title></svelte:head>
<div class="login-page">
  <section class="welcome">
    <a class="brand" href="/" aria-label="Дека"><Brand /></a>
    <div class="welcome-body">
      <h2>Ваш личный кабинет</h2>
      <p>Расписание, оценки и обращения в деканат.</p>
      <img src="/img/v2.0/login.jpg" alt="Дека" class="login-illustration" />
    </div>
  </section>
  <main class="login-main">
    <div class="login-form">
      <h1>Вход в Деку</h1>
      {#if form?.message}<p class="form-error" role="alert">
          {form.message}
        </p>{:else if data.unavailable}<p class="form-error" role="alert">
          Сервис временно недоступен. Попробуйте ещё раз через минуту.
        </p>{/if}
      <form
        method="POST"
        use:enhance={() => {
          pending = true;
          return async ({ update }) => {
            await update();
            pending = false;
          };
        }}
        class="form-grid"
      >
        <label
          >Университетская почта<input
            name="email"
            type="email"
            autocomplete="username"
            placeholder="name@mgimo.ru"
            required
            maxlength="254"
          /></label
        >
        <label
          >Пароль<input
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="Введите пароль"
            required
            maxlength="128"
          /></label
        >
        <button class="btn" disabled={pending}
          >{pending ? 'Входим…' : 'Войти в кабинет'}<Icon name="arrow" size={16} /></button
        >
      </form>
      {#if data.demo}<div class="demo">
          <h3 class="demo-heading">Быстрый вход</h3>
          {#each accountGroups as group (group.label)}
            <details class="account-group" open={group.label === 'Студенты'}>
              <summary>{group.label}</summary>
              <div class="demo-grid">
                {#each group.accounts as account (account.code)}<form method="POST" use:enhance>
                    <input type="hidden" name="account" value={account.code} /><button type="submit"
                      ><Icon name={account.icon} size={17} /><span>{account.name}</span><Icon
                        name="up"
                        size={13}
                      /></button
                    >
                  </form>{/each}
              </div>
            </details>{/each}
        </div>{/if}
      <div class="login-help">
        <Icon name="shield" size={16} /><span>Если не получается войти, обратитесь в деканат.</span>
      </div>
    </div>
  </main>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1.06fr 1fr;
    background: #fff;
  }
  .welcome {
    background: #eeebfa;
    display: flex;
    flex-direction: column;
    padding: 46px 60px;
    min-height: 100vh;
    overflow: hidden;
  }
  .brand {
    font-family: Manrope, sans-serif;
    font-weight: 800;
    font-size: 38px;
    letter-spacing: -0.055em;
    align-self: flex-start;
  }

  .welcome-body {
    margin: auto 0;
    padding: 45px 0 24px;
    position: relative;
  }
  .welcome h2 {
    font-size: 35px;
    line-height: 1.45;
    margin-top: 21px;
    color: #3b325c;
    letter-spacing: -0.045em;
  }
  .welcome-body > p {
    color: #706886;
    font-size: 13px;
    line-height: 1.9;
    margin-top: 20px;
  }
  .welcome-body :global(.campus) {
    display: block;
    width: min(360px, 80%);
    margin: 27px auto 23px;
  }
  .login-illustration {
    display: block;
    width: min(360px, 80%);
    height: auto;
    margin: 27px auto 23px;
  }
  .login-main {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 36px 40px;
  }
  .login-form {
    width: 100%;
    max-width: 350px;
  }
  .login-form h1 {
    font-size: 28px;
    margin: 0 0 24px;
  }
  .login-form label {
    font-size: 13px;
  }
  .login-form input {
    font-size: 13px;
  }
  .login-form .btn {
    width: 100%;
    margin-top: 3px;
    justify-content: space-between;
  }
  .form-error {
    margin-bottom: 20px;
  }
  .demo {
    margin-top: 33px;
  }
  .demo-heading {
    color: var(--ink);
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .account-group + .account-group {
    border-top: 1px solid var(--border);
    margin-top: 8px;
  }
  .account-group summary {
    color: var(--muted);
    cursor: pointer;
    padding: 12px 0;
    font-size: 13px;
    min-height: 44px;
  }
  .demo-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .demo-grid button {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) 14px;
    align-items: center;
    gap: 10px;
    min-height: 46px;
    height: 100%;
    padding: 11px 13px;
    text-align: left;
    font-size: 12px;
    color: #736882;
    border: 1px solid #eeedf5;
    border-radius: 9px;
    width: 100%;
    background: #faf9fd;
  }
  .demo-grid button:hover {
    border-color: #c6b9ef;
    background: #f3f0fb;
  }
  .demo-grid button :global(svg:last-child) {
    justify-self: end;
    color: #706b7c;
  }
  .demo-grid button :global(svg) {
    flex-shrink: 0;
  }
  .demo-grid button:focus-visible {
    outline: 2px solid #554be0;
    outline-offset: 3px;
  }
  .account-group {
    min-width: 0;
  }
  .login-help {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 11px;
    color: #6b6d75;
    line-height: 1.8;
    margin-top: 30px;
  }
  .login-help :global(svg) {
    margin-top: 2px;
  }
  @media (max-width: 1050px) {
    .welcome {
      padding: 40px;
    }
    .welcome h2 {
      font-size: 29px;
    }
  }
  @media (max-width: 800px) {
    .login-page {
      grid-template-columns: 1fr;
    }
    .welcome {
      min-height: 0;
      padding: 23px 28px;
    }
    .brand {
      font-size: 30px;
    }
    .welcome-body {
      display: none;
    }
    .login-main {
      padding: 40px 24px 55px;
      align-items: flex-start;
    }
    .login-form h1 {
      font-size: 26px;
    }
    .login-form input {
      font-size: 16px;
    }
  }
</style>
