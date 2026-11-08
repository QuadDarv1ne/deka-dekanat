"use client";

import { useEffect, useState } from "react";
import { MapPin, Clock3, User2, CalendarDays, ArrowRight } from "lucide-react";
import { minutesToHHMM, mskNow, relativeDay } from "@/lib/time";

export type NextClassData = {
  dateIso: string;
  startMin?: number;
  endMin?: number;
  start?: string;
  end?: string;
  subjectName: string;
  kind: string;
  room: string;
  building: string | null;
  teacherName: string;
  human?: string;
};

function countdownText(minutesUntilStart: number): string {
  if (minutesUntilStart <= 0 && minutesUntilStart > -90) return "Идёт сейчас";
  if (minutesUntilStart <= -90) return "Завершилась";
  if (minutesUntilStart < 60) return `через ${minutesUntilStart} мин`;
  const h = Math.floor(minutesUntilStart / 60);
  const m = minutesUntilStart % 60;
  return `через ${h} ч${m ? ` ${m} мин` : ""}`;
}

export function NextClassCard({ data, onOpenSchedule }: { data: NextClassData | null; onOpenSchedule: () => void }) {
  const [state, setState] = useState<{
    label: string;
    progress: number | null;
    isToday: boolean;
  } | null>(null);

  useEffect(() => {
    function tick() {
      if (!data) return;
      const { date, minutes } = mskNow();
      const startMin = data.startMin ?? -1;
      const endMin = data.endMin ?? -1;
      const hasTime = startMin >= 0 && endMin >= 0;
      const minutesToStart = hasTime && data.dateIso === date ? startMin - minutes : 24 * 60;
      const inClass = hasTime && data.dateIso === date && minutes >= startMin && minutes < endMin;
      const elapsed = inClass ? (minutes - startMin) / (endMin - startMin) : 0;
      const label =
        data.dateIso !== date || !hasTime
          ? data.human ?? relativeDay(data.dateIso)
          : minutes >= endMin
            ? "Завершилась"
            : minutes >= startMin
              ? "Идёт сейчас"
              : countdownText(minutesToStart);
      setState({
        label,
        progress: inClass ? elapsed : null,
        isToday: data.dateIso === date,
      });
    }
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [data]);

  if (!data) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 p-5 text-white">
        <p className="text-sm font-medium text-teal-100">Ближайшая пара</p>
        <p className="mt-2 text-lg font-semibold">Впереди свободные дни</p>
        <p className="mt-1 text-sm text-teal-100/85">
          Пар в ближайшие 10 дней не найдено — загляните в расписание на будущее.
        </p>
        <button
          type="button"
          onClick={onOpenSchedule}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
        >
          Открыть расписание <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-5 text-white shadow-lg shadow-teal-900/15">
      <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-teal-100">
            <Clock3 className="h-3.5 w-3.5" />
            {state ? state.label : "Ближайшая пара"}
          </p>
          <h2 className="mt-1.5 text-xl font-bold leading-snug text-balance">{data.subjectName}</h2>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-teal-50/95">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 opacity-80" />
              {data.room}
              {data.building ? ` · ${data.building}` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <User2 className="h-4 w-4 opacity-80" />
              {data.teacherName}
            </span>
            {(data.start || data.startMin !== undefined) && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 opacity-80" />
                {data.start ?? minutesToHHMM(data.startMin ?? 0)}–{data.end ?? minutesToHHMM(data.endMin ?? 0)}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{data.kind}</span>
      </div>

      {state?.progress != null && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${Math.round(state.progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
