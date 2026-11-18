<script lang="ts">
  let {
    name,
    label,
    letter,
    value = $bindable(''),
    placeholder
  }: { name: string; label: string; letter: string; value: string; placeholder: string } = $props();
  let options = $state<string[]>([]);
  let active = $state(false);
  $effect(() => {
    const q = value.trim();
    options = [];
    if (!active || !q || q.length > 100) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/campus/places?q=' + encodeURIComponent(q), {
          signal: controller.signal
        });
        if (response.ok) {
          const result: string[] = await response.json();
          if (!controller.signal.aborted) options = result;
        }
      } catch {
        /* A typed room number can also be submitted without suggestions. */
      }
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  });
</script>

<label>
  <span><b>{letter}</b>{label}</span>
  <input
    type="search"
    {name}
    {placeholder}
    bind:value
    list={'places-' + name}
    autocomplete="off"
    onfocus={() => (active = true)}
    onblur={() => (active = false)}
  />
</label>
<datalist id={'places-' + name}
  >{#each options as option}<option value={option}></option>{/each}</datalist
>

<style>
  label {
    display: grid;
    gap: 7px;
    min-width: 0;
  }
  span {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 550;
  }
  b {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    color: #534397;
    background: #efecfa;
    font-size: 11px;
  }
  input {
    width: 100%;
    min-height: 46px;
    font-size: 14px;
  }
  @media (max-width: 600px) {
    input {
      font-size: 16px;
    }
  }
</style>
