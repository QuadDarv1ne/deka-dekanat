"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, SendHorizonal, Sparkles, TriangleAlert } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; degraded?: boolean };

/** Минимальный контракт Web Speech API (распознавание речи в браузере). */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const QUICK_PROMPTS = [
  "Что у меня сегодня?",
  "Как мои дела с учёбой?",
  "Когда начинается сессия?",
  "Как получить справку?",
];

export function AssistantPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Привет! Я Дека — ассистент цифрового деканата. Знаю ваше расписание, оценки, заявки и объявления. Спросите, например: \"Что у меня завтра?\" или \"Как заказать справку?\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Голосовой ввод: Web Speech API (Chrome/Safari, ru-RU). Не поддерживается — кнопки просто нет.
  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    setSpeechSupported(true);
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0]?.transcript ?? "";
      setInput(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      recRef.current = null;
    };
  }, []);

  function toggleListening() {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setSending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось получить ответ");
      setMessages((m) => [...m, { role: "assistant", content: data.reply, degraded: Boolean(data.degraded) }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Что-то пошло не так. Попробуйте ещё раз.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b px-4 py-3.5">
          <SheetTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            Ассистент Дека
          </SheetTitle>
          <SheetDescription className="text-xs">
            Отвечает по вашим данным: расписание, оценки, заявки, объявления.
          </SheetDescription>
        </SheetHeader>

        <div ref={listRef} className="flex-1 overflow-y-auto thin-scrollbar px-3 py-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                {m.degraded && (
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    <TriangleAlert className="h-3 w-3" />
                    Упрощённый режим
                  </span>
                )}
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 px-3 pb-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void send(p)}
                className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (listening) recRef.current?.stop();
            void send();
          }}
          className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Слушаю вас…" : "Спросите Деку…"}
            maxLength={1000}
            aria-label="Сообщение ассистенту"
          />
          {speechSupported && (
            <Button
              type="button"
              size="icon"
              variant={listening ? "default" : "outline"}
              className={cn("h-10 w-10 shrink-0", listening && "animate-pulse bg-amber-500 text-white hover:bg-amber-500")}
              onClick={toggleListening}
              disabled={sending}
              aria-label={listening ? "Остановить запись" : "Продиктовать сообщение голосом"}
            >
              {listening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
              <span className="sr-only">Голосовой ввод</span>
            </Button>
          )}
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={sending || !input.trim()}>
            <SendHorizonal className="h-4.5 w-4.5" />
            <span className="sr-only">Отправить</span>
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
