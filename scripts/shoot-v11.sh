#!/bin/bash
# Скриншоты v1.1: /verify + отмена заявки. Вход демо-кнопкой, навигация по refs.
cd /home/z/my-project

SHOT_DIR="download/скриншоты-прототипа"

bun run dev > /tmp/dev-shots.log 2>&1 &
DEVPID=$!
for i in $(seq 1 45); do curl -s -o /dev/null --max-time 3 http://localhost:3000 && break; sleep 1; done
echo "server up"

agent-browser set viewport 360 760 >/dev/null 2>&1

# ── helper: ждать, пока в snapshot появится паттерн ──
wait_for() {
  local pattern="$1"
  for i in $(seq 1 10); do
    if agent-browser snapshot -i 2>/dev/null | rg -q "$pattern"; then return 0; fi
    sleep 1.5
  done
  return 1
}

# ── helper: взять первый ref строки с паттерном (с ретраями) ──
ref_of() {
  local pattern="$1" r
  for i in $(seq 1 10); do
    r=$(agent-browser snapshot -i 2>/dev/null | rg "$pattern" | rg -o '@e[0-9]+' | head -1)
    if [ -n "$r" ]; then echo "$r"; return 0; fi
    sleep 1.5
  done
  return 1
}

# ── 1. /verify: подлинный документ ──
agent-browser open "http://localhost:3000/verify?doc=%D0%A1%D0%9F-2026-0118.DEKA-7Q2K-11AF" >/dev/null 2>&1
agent-browser wait --text "Документ подлинный" >/dev/null 2>&1 || true
agent-browser screenshot "$SHOT_DIR/27-verify-valid.png"

# ── 2. Вход: native setter + requestSubmit (надёжно для React-формы) ──
agent-browser open "http://localhost:3000/" >/dev/null 2>&1
wait_for 'Ковалёва' || echo "WARN: no login screen"
sleep 3  # даём гидратации догнать SSR-разметку
agent-browser eval "(() => { const f = document.querySelector('form'); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; const lo = document.querySelector('#login'); const pa = document.querySelector('#password'); set.call(lo, 'student1'); lo.dispatchEvent(new Event('input', { bubbles: true })); set.call(pa, 'demo1234'); pa.dispatchEvent(new Event('input', { bubbles: true })); f.requestSubmit(); return 'ok'; })()" 2>&1 | head -1
wait_for 'button "Профиль"' || echo "WARN: no cabinet"
sleep 1

# ── 3. Раздел «Заявки» (нижняя навигация через DOM) ──
agent-browser eval "(() => { const b = [...document.querySelectorAll('nav[aria-label=\"Нижняя навигация\"] button')].find(x => x.textContent.includes('Заявки')); if (b) { b.click(); return 'clicked'; } return 'NOT FOUND'; })()" 2>&1 | head -1
wait_for 'Отменить заявку' || echo "WARN: no requests section"
sleep 1

# ── 4. Отмена заявки (eval-клик по DOM, без refs) ──
CANCELLED="no"
for i in $(seq 1 8); do
  N=$(agent-browser eval "[...document.querySelectorAll('button')].filter(b => b.textContent.includes('Отменить заявку')).length" 2>/dev/null | tr -d '"')
  if [ -n "$N" ] && [ "$N" != "0" ]; then
    agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Отменить заявку')); if (b) { b.click(); return 'ok'; } return 'NOT FOUND'; })()" 2>&1 | head -1
    sleep 2
    agent-browser screenshot "$SHOT_DIR/28-cancel-dialog.png"
    agent-browser eval "(() => { const b = [...document.querySelectorAll('[role=\"dialog\"] button')].find(x => x.textContent.trim() === 'Отменить'); if (b) { b.click(); return 'confirmed'; } return 'NOT FOUND'; })()" 2>&1 | head -1
    sleep 2.5
    agent-browser screenshot "$SHOT_DIR/29-cancelled-card.png"
    CANCELLED="yes"
    break
  fi
  sleep 1.5
done
[ "$CANCELLED" = "no" ] && echo "WARN: cancel button never appeared"

agent-browser close >/dev/null 2>&1 || true
kill $DEVPID 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
bun scripts/seed.ts >/dev/null 2>&1
echo "done"
ls -la "$SHOT_DIR" | rg "27|28|29"
