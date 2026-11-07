import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/api-helpers";
import { getDaySlots, findNextClass } from "@/lib/schedule";
import { summarizeGrades, type SubjectSummary } from "@/lib/grades";
import { mskNow, humanDate, addDaysIso, minutesToHHMM } from "@/lib/time";

/**
 * ИИ-ассистент "Дека". Отвечает на вопросы студента, опираясь ТОЛЬКО на его данные:
 * расписание его группы, его оценки, его заявки и объявления, которые ему видны.
 * Ключи SDK лежат в окружении сервера и в браузер не попадают.
 */

const DEANERY_HOURS = "Пн–Чт: 9:00–18:00, Пт: 9:00–16:45, обед 13:00–13:45. Электронные заявки — 1–2 рабочих дня.";

type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * Уровень 1 (опционально): любой OpenAI-совместимый провайдер — OpenAI, OpenRouter,
 * локальная Ollama, vLLM и т.д. Настраивается тремя переменными окружения:
 * LLM_API_KEY + LLM_BASE_URL (по умолчанию https://api.openai.com/v1) + LLM_MODEL.
 * Благодаря этому прототип не привязан к инфраструктуре одного вендора:
 * университет может поднять модель у себя и указать её адрес.
 */
async function callOpenAICompatible(systemPrompt: string, msgs: ChatMsg[]): Promise<string> {
  const base = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const key = process.env.LLM_API_KEY as string;
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...msgs, ],
      temperature: 0.4,
      max_tokens: 700,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("LLM API: пустой ответ");
  return content;
}

async function buildContext(userId: string, groupName: string, faculty: string): Promise<string> {
  const { date: todayIso, human } = { date: mskNow().date, human: humanDate(mskNow().date, { withWeekday: true }) };
  const tomorrowIso = addDaysIso(todayIso, 1);

  const [user, todaySlots, tomorrowSlots, nextClass, grades, exams, requests, deadlines] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { student: true } }),
    getDaySlots(groupName, todayIso),
    getDaySlots(groupName, tomorrowIso),
    findNextClass(groupName),
    db.grade.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    db.examItem.findMany({ where: { groupName, date: { gte: todayIso } }, orderBy: { date: "asc" }, take: 6 }),
    db.serviceRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.announcement.findMany({
      where: { deadline: { gte: new Date() }, OR: [{ audience: "ALL" }, { audience: `GROUP:${groupName}` }, { audience: `FACULTY:${faculty}` }] },
      orderBy: { deadline: "asc" },
      take: 3,
    }),
  ]);

  if (!user?.student) return "Данные профиля недоступны.";

  const sl = (list: Awaited<ReturnType<typeof getDaySlots>>) =>
    list.length
      ? list.map((s) => `${minutesToHHMM(s.startMin)}–${minutesToHHMM(s.endMin)} ${s.subjectName} (${s.kind}, ауд. ${s.room}${s.building ? `, ${s.building}` : ""}, ${s.teacherName})${s.status === "cancelled" ? " — ОТМЕНЕНА" : s.status === "moved" ? " — перенесённая пара" : ""}`).join("; ")
      : "пар нет";

  const subjects: SubjectSummary[] = summarizeGrades(grades);
  const subjLine = subjects
    .map((s) => `${s.subjectName}: ${s.percent}% (${s.projected === "otl" ? "отлично" : s.projected === "hor" ? "хорошо" : s.projected === "udov" ? "удовлетворительно" : "риск неаттестации"})`)
    .join("; ");

  const statusRu: Record<string, string> = { NEW: "принята", IN_PROGRESS: "в работе", READY: "готова к выдаче", DONE: "выдана", REJECTED: "отклонена", CANCELLED: "отменена студентом" };

  return [
    `Сегодня ${human}. Учебный год студента: ${user.student.entryYear}/${user.student.entryYear + 1}.`,
    `Профиль: ${user.name}, ${user.student.faculty}, ${user.student.program}, ${user.student.course} курс, группа ${user.student.groupName}, зачётка ${user.student.recordBook}.`,
    `Пары сегодня: ${sl(todaySlots)}.`,
    `Пары завтра: ${sl(tomorrowSlots)}.`,
    nextClass ? `Ближайшая пара: ${nextClass.dateIso === todayIso ? "сегодня" : humanDate(nextClass.dateIso, { withWeekday: true })}, ${minutesToHHMM(nextClass.slot.startMin)}, ${nextClass.slot.subjectName}, ауд. ${nextClass.slot.room}${nextClass.slot.building ? ` (${nextClass.slot.building})` : ""}, ${nextClass.slot.teacherName}.` : "Ближайших пар в ближайшие 10 дней нет.",
    subjects.length ? `Успеваемость семестра: ${subjLine}.` : "Оценок в этом семестре пока нет.",
    exams.length ? `Расписание сессии: ${exams.map((e) => `${e.subjectName} — ${e.kind} ${humanDate(e.date)} в ${minutesToHHMM(e.startMin)}, ауд. ${e.room}`).join("; ")}.` : "Расписание сессии пока не опубликовано.",
    requests.length ? `Заявки: ${requests.map((r) => `${r.typeTitle} (${r.number}) — ${statusRu[r.status] ?? r.status}`).join("; ")}.` : "Заявок нет.",
    deadlines.length ? `Дедлайны: ${deadlines
      .filter((a) => a.deadline)
      .map((a) => `${a.title} — до ${humanDate(a.deadline!.toISOString().slice(0, 10))}`)
      .join("; ")}.` : "Ближайших дедлайнов нет.",
    `Часы работы деканата: ${DEANERY_HOURS}`,
    `Справки заказываются в разделе "Заявки": справка об обучении, справка для налогового вычета, о стипендии, для визы, академический отпуск, перезачёт дисциплин.`,
  ].join("\n");
}

function fallbackAnswer(message: string, context: string): string {
  const m = message.toLowerCase();
  const line = (needle: string) => context.split("\n").find((l) => l.toLowerCase().includes(needle));
  if (m.includes("сегодня") || m.includes("расписан") || m.includes("пары") || m.includes("пара")) {
    return line("пары сегодня") ?? "Загляните в раздел \"Расписание\" — там всегда актуальные пары и переносы.";
  }
  if (m.includes("оценк") || m.includes("успева") || m.includes("балл")) {
    return line("Успеваемость") ?? "Ваши оценки собраны в разделе \"Успеваемость\".";
  }
  if (m.includes("сесси") || m.includes("экзамен")) {
    return line("Расписание сессии") ?? "Расписание сессии появится в разделе \"Успеваемость\".";
  }
  if (m.includes("справк") || m.includes("заявк") || m.includes("документ")) {
    return line("Заявки") ?? "Заказать справку можно в разделе \"Заявки\" — статус придёт уведомлением.";
  }
  if (m.includes("дедлайн") || m.includes("срок")) {
    return line("Дедлайны") ?? "Ближайшие дедлайны показаны на главном экране.";
  }
  if (m.includes("деканат") && (m.includes("час") || m.includes("работ"))) {
    return line("Часы работы") ?? "Деканат: Пн–Чт 9:00–18:00, Пт 9:00–16:45.";
  }
  return "Ассистент сейчас работает в упрощённом режиме. Посмотрите разделы \"Расписание\", \"Успеваемость\" и \"Заявки\" — или попробуйте спросить чуть позже.";
}

export async function POST(req: NextRequest) {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const message = String(body.message ?? "").trim().slice(0, 1000);
  if (!message) return NextResponse.json({ error: "Введите вопрос" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.uid }, include: { student: true } });
  if (!user?.student) return NextResponse.json({ error: "Профиль студента не найден" }, { status: 404 });

  const context = await buildContext(user.id, user.student.groupName, user.student.faculty);

  const systemPrompt = [
    "Ты — Дека, дружелюбный ИИ-ассистент цифрового деканата внутри личного кабинета студента.",
    "Отвечай на русском, кратко (2–5 предложений), по делу и тёпло, без канцелярита.",
    "Используй ТОЛЬКО факты из блока \"Данные студента\" — не выдумывай расписание, оценки и номера.",
    "Если данных не хватает — честно скажи и подскажи, в каком разделе кабинета искать.",
    "Ты не выдаёшь официальных документов и не принимаешь решения деканата — для этого есть раздел \"Заявки\" и живые сотрудники.",
    "",
    "Данные студента:",
    context,
  ].join("\n");

  const history = await db.assistantMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  history.reverse();

  await db.assistantMessage.create({ data: { userId: user.id, role: "user", content: message } });

  let reply = "";
  let degraded = false;
  let provider = "local";
  try {
    if (process.env.LLM_API_KEY?.trim()) {
      // свой провайдер (OpenAI-совместимый) — путь для самостоятельного хостинга
      reply = await callOpenAICompatible(
        systemPrompt,
        [...history.slice(-6).map<ChatMsg>((h) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })), { role: "user", content: message }],
      );
      provider = "custom-llm";
    } else {
      // платформенный SDK (например, в среде разработки)
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          ...history.slice(-6).map<ChatMsg>((h) => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
          { role: "user", content: message },
        ],
        thinking: { type: "disabled" },
      });
      reply = (completion.choices[0]?.message?.content ?? "").trim();
      provider = "platform-sdk";
    }
    if (!reply) throw new Error("Пустой ответ модели");
  } catch (e) {
    // уровень 3: офлайн-движок, отвечающий по данным из базы без внешних сервисов
    degraded = true;
    provider = "local";
    reply = fallbackAnswer(message, context);
    console.error("Assistant provider error:", e instanceof Error ? e.message : e);
  }

  await db.assistantMessage.create({ data: { userId: user.id, role: "assistant", content: reply } });

  return NextResponse.json({ ok: true, reply, degraded, provider });
}
