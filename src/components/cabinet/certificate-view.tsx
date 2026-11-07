"use client";

import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "@/components/cabinet/qr-code";
import { formatDateSafe } from "@/lib/time";

/** Данные студента, нужные для печатной формы (приходят из GET /api/requests). */
export type CertificateProfile = {
  fullName: string;
  faculty: string;
  program: string;
  course: number;
  groupName: string;
  recordBook: string;
  studyForm: string;
  status: string;
};

export type CertificateRequest = {
  number: string;
  typeTitle: string;
  docCode: string | null;
  readyAt: string | null;
  createdAt: string;
};

const STUDY_FORM_INFLECT: Record<string, string> = {
  "Очная": "очной",
  "Заочная": "заочной",
  "Очно-заочная": "очно-заочной",
};

const COURSE_INFLECT = ["", "1-го", "2-го", "3-го", "4-го", "5-го", "6-го"];

/**
 * Ссылка для QR на справке: публичная проверка подлинности /verify?doc=НОМЕР.КОД.
 * Справка рендерится только в браузере (диалог по клику), поэтому window доступен.
 * Если docCode ещё не выдан — фолбэк на старый текстовый формат payload.
 */
function verifyUrl(request: CertificateRequest): string {
  if (!request.docCode) return `DEKA-DOC|${request.number}|${request.docCode ?? ""}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/verify?doc=${encodeURIComponent(`${request.number}.${request.docCode}`)}`;
}

/** Печатная форма справки: белая A4-страница с официальной вёрсткой. */
export function CertificateSheet({ request, profile }: { request: CertificateRequest; profile: CertificateProfile }) {
  const issuedAt = request.readyAt ?? request.createdAt;
  const issued = formatDateSafe(issuedAt);
  // срок действия — 30 дней от даты выдачи
  const validUntil = formatDateSafe(new Date(new Date(issuedAt).getTime() + 30 * 86400000).toISOString());
  const studyForm = STUDY_FORM_INFLECT[profile.studyForm] ?? profile.studyForm.toLowerCase();
  const course = COURSE_INFLECT[profile.course] ?? `${profile.course}-го`;

  return (
    <div className="certificate-sheet mx-auto w-full max-w-[760px] bg-white px-8 py-10 font-serif text-[15px] leading-relaxed text-neutral-900 sm:px-12 sm:py-14 [print-color-adjust:exact]">
      {/* Шапка университета */}
      <div className="border-b-4 border-double border-teal-700 pb-4 text-center">
        <p className="text-[19px] font-bold uppercase tracking-[0.18em] text-teal-700">Университет Дека</p>
        <p className="mt-1 text-[13px] text-neutral-600">{profile.faculty}</p>
        <p className="text-[11.5px] text-neutral-500">Лицензия № 77ЛЗ-0001234 (вымышленная, для прототипа)</p>
      </div>

      {/* Заголовок документа */}
      <div className="mt-8 text-center">
        <h1 className="text-[24px] font-bold uppercase tracking-[0.3em]">Справка</h1>
        <p className="mt-1 text-[13.5px] text-neutral-600">{request.typeTitle}</p>
        <p className="mt-3 font-mono text-[12.5px] text-neutral-600">
          № {request.number} · дата выдачи: {issued}
        </p>
      </div>

      {/* Текст справки */}
      <div className="mt-8 space-y-4 text-[15.5px]">
        <p>
          Настоящая справка подтверждает, что{" "}
          <b>{profile.fullName}</b> является студентом {course} курса {studyForm} формы обучения по
          направлению подготовки "{profile.program}", учебная группа <b>{profile.groupName}</b>{" "}
          (зачётная книжка № {profile.recordBook}).
        </p>
        <p>Справка дана для предъявления по месту требования.</p>
        <p>
          Срок действия справки — до <b>{validUntil}</b> включительно.
        </p>
      </div>

      {/* Подпись и QR */}
      <div className="mt-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[14px]">Декан факультета</p>
          <p className="mt-6 flex items-end gap-2 text-[14px]">
            <span className="inline-block w-44 border-b border-neutral-500" />
            <span className="text-neutral-700">/ О. В. Смирнова /</span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="bg-white p-1.5">
            <QRCodeSVG value={verifyUrl(request)} size={92} />
          </div>
          <p className="max-w-[150px] text-center font-mono text-[10px] leading-snug text-neutral-500">
            Код проверки подлинности: {request.docCode ?? request.number}
          </p>
          <p className="max-w-[150px] text-center text-[9px] leading-snug text-neutral-400">
            QR — проверка подлинности по коду
          </p>
        </div>
      </div>

      <p className="mt-10 border-t border-neutral-200 pt-3 text-center text-[10.5px] text-neutral-400">
        Документ сформирован в прототипе "Дека — цифровой деканат будущего". Все данные вымышленные.
      </p>
    </div>
  );
}

/**
 * Диалог предпросмотра + печатный портал. При печати через window.print()
 * на странице остаётся только .certificate-sheet (правило в globals.css).
 */
export function CertificateDialog({
  request,
  profile,
  open,
  onOpenChange,
}: {
  request: CertificateRequest;
  profile: CertificateProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Электронная версия справки</DialogTitle>
            <DialogDescription>
              Можно распечатать или сохранить в PDF: в окне печати выберите "Сохранить как PDF".
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <CertificateSheet request={request} profile={profile} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Печать / Сохранить PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {open &&
        createPortal(
          <div className="certificate-portal hidden bg-white print:block">
            <CertificateSheet request={request} profile={profile} />
          </div>,
          document.body
        )}
    </>
  );
}
