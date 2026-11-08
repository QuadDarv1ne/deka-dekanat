"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  CheckCheck,
  ChevronRight,
  FileCheck,
  FileDown,
  FileText,
  Loader2,
  PauseCircle,
  Plane,
  Plus,
  QrCode,
  Receipt,
  Wallet,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StatusBadge, REQUEST_STATUS } from "@/components/shared";
import { useApi, apiSend } from "@/components/cabinet/use-api";
import { QRCodeSVG } from "@/components/cabinet/qr-code";
import { CertificateDialog, type CertificateProfile } from "@/components/cabinet/certificate-view";
import { docVerifyUrl } from "@/lib/doc-verify";
import { formatDateTimeSafe, formatDateSafe } from "@/lib/time";
import { cn } from "@/lib/utils";

type RequestType = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  processingDays: number;
  needsComment: boolean;
};

type Req = {
  id: string;
  number: string;
  typeCode: string;
  typeTitle: string;
  status: string;
  comment: string | null;
  staffComment: string | null;
  dueDate: string | null;
  readyAt: string | null;
  docCode: string | null;
  createdAt: string;
  history: { id: string; status: string; comment: string | null; authorName: string; createdAt: string }[];
};

type RequestsData = { types: RequestType[]; requests: Req[]; profile: CertificateProfile | null };

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-check": FileCheck,
  receipt: Receipt,
  wallet: Wallet,
  plane: Plane,
  "pause-circle": PauseCircle,
  "arrow-left-right": ArrowLeftRight,
};

const STEPS = ["NEW", "IN_PROGRESS", "READY", "DONE"];
const STEP_LABELS = ["Принята", "В работе", "Готова", "Выдана"];

function RequestTimeline({ status, history }: { status: string; history: Req["history"] }) {
  if (status === "REJECTED") {
    const rej = history.find((h) => h.status === "REJECTED");
    return (
      <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-[12.5px] leading-snug text-destructive">
        Заявка отклонена{rej?.comment ? `: ${rej.comment}` : "."}
      </div>
    );
  }
  if (status === "CANCELLED") {
    const c = history.find((h) => h.status === "CANCELLED");
    return (
      <div className="rounded-xl bg-muted px-3 py-2.5 text-[12.5px] leading-snug text-muted-foreground">
        Заявка отменена студентом{c ? ` ${formatDateTimeSafe(c.createdAt)}` : "."} — деканат её больше не обрабатывает.
      </div>
    );
  }
  const currentStep = REQUEST_STATUS[status]?.step ?? 1;
  return (
    <ol className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done = i + 1 < currentStep;
        const active = i + 1 === currentStep;
        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : done ? "bg-primary" : "bg-border")} />
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <CheckCheck className="h-3 w-3" /> : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === STEPS.length - 1 ? "opacity-0" : i + 1 < currentStep ? "bg-primary" : "bg-border")} />
            </div>
            <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>{STEP_LABELS[i]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function StudentRequests({
  onUnreadChange,
}: {
  onOpenNotifications: () => void;
  onUnreadChange: (n: number) => void;
}) {
  const { data, error, loading, reload } = useApi<RequestsData>("/api/requests");
  const [orderType, setOrderType] = useState<RequestType | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showQrFor, setShowQrFor] = useState<Req | null>(null);
  const [printFor, setPrintFor] = useState<Req | null>(null);
  const [cancelFor, setCancelFor] = useState<Req | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function submitOrder() {
    if (!orderType) return;
    setSubmitting(true);
    setOrderError(null);
    try {
      await apiSend("/api/requests", "POST", { typeCode: orderType.code, comment });
      setOrderType(null);
      setComment("");
      reload();
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Не удалось отправить заявку");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCancel() {
    if (!cancelFor) return;
    setCancelling(true);
    try {
      await apiSend("/api/requests", "PATCH", { id: cancelFor.id });
      toast.success(`Заявка ${cancelFor.number} отменена`);
      setCancelFor(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отменить заявку");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Заявки и справки</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Без очередей: заказ онлайн, статус — как у доставки</p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Каталог */}
      <section aria-labelledby="order-heading">
        <h2 id="order-heading" className="mb-2.5 text-[15px] font-bold tracking-tight">
          Заказать документ
        </h2>
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {data?.types.map((t) => {
              const Icon = TYPE_ICONS[t.icon] ?? FileText;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setOrderType(t);
                    setComment("");
                    setOrderError(null);
                  }}
                  className="group flex min-h-24 flex-col rounded-2xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="flex-1 text-[13px] font-semibold leading-snug">{t.title}</span>
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">{t.description}</p>
                  <p className="mt-auto pt-1.5 text-[11px] font-medium text-muted-foreground/80">
                    Готовность: ~{t.processingDays} {t.processingDays === 1 ? "день" : t.processingDays < 5 ? "дня" : "дней"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Мои заявки */}
      <section aria-labelledby="my-requests-heading">
        <h2 id="my-requests-heading" className="mb-2.5 text-[15px] font-bold tracking-tight">
          Мои заявки
        </h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : data && data.requests.length > 0 ? (
          <div className="space-y-3">
            {data.requests.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-snug">{r.typeTitle}</p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">{r.number}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {r.comment && (
                  <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-[12px] leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground">Ваш комментарий:</span> {r.comment}
                  </p>
                )}

                <div className="mt-3">
                  <RequestTimeline status={r.status} history={r.history} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
                  <span>Подана: {formatDateTimeSafe(r.createdAt)}</span>
                  {r.status !== "DONE" && r.status !== "REJECTED" && r.status !== "CANCELLED" && r.dueDate && (
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      Ожидаемая готовность: {formatDateSafe(r.dueDate)}
                    </span>
                  )}
                </div>

                {(r.status === "NEW" || r.status === "IN_PROGRESS") && (
                  <div className="mt-2.5 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 text-[12px] text-destructive hover:text-destructive"
                      onClick={() => setCancelFor(r)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Отменить заявку
                    </Button>
                  </div>
                )}

                {r.status === "READY" && (
                  <div className="mt-3 space-y-2.5 rounded-xl bg-lime-600/10 p-3">
                    <div className="flex items-center gap-2.5">
                      <QrCode className="h-4.5 w-4.5 shrink-0 text-lime-700 dark:text-lime-400" />
                      <p className="flex-1 text-[12.5px] leading-snug text-lime-800 dark:text-lime-300">
                        Документ готов. Покажите код выдачи в деканате:{" "}
                        <button type="button" onClick={() => setShowQrFor(r)} className="font-bold underline underline-offset-2">
                          {r.docCode ?? r.number}
                        </button>
                      </p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-lime-700 dark:text-lime-400" />
                    </div>
                    {data?.profile && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrintFor(r)}
                        className="w-full border-lime-700/30 bg-white/70 text-lime-900 hover:bg-white hover:text-lime-950 dark:border-lime-400/30 dark:bg-white/10 dark:text-lime-200 dark:hover:bg-white/20"
                      >
                        <FileDown className="h-4 w-4" />
                        Электронная версия (PDF)
                      </Button>
                    )}
                  </div>
                )}

                {r.staffComment && r.status !== "REJECTED" && (
                  <p className="mt-2.5 border-l-2 border-primary/40 pl-2.5 text-[12px] leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground">Деканат:</span> {r.staffComment}
                  </p>
                )}

                {r.history.length > 1 && (
                  <details className="mt-2.5">
                    <summary className="cursor-pointer select-none text-[11.5px] font-medium text-muted-foreground hover:text-foreground">
                      История заявки
                    </summary>
                    <ul className="mt-1.5 space-y-1 border-l-2 border-border pl-3">
                      {r.history.map((h) => (
                        <li key={h.id} className="text-[11.5px] text-muted-foreground">
                          <span className="font-medium text-foreground">{REQUEST_STATUS[h.status]?.label ?? h.status}</span> ·{" "}
                          {formatDateTimeSafe(h.createdAt)} · {h.authorName}
                          {h.comment && <span className="block pl-0.5 italic">"{h.comment}"</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <EmptyState
              icon={FileText}
              title="Заявок пока нет"
              text="Выберите документ в каталоге выше — подача займёт полминуты, а статус придёт уведомлением."
            />
          )
        )}
      </section>

      {/* Диалог заказа */}
      <Dialog open={Boolean(orderType)} onOpenChange={(open) => !open && setOrderType(null)}>
        <DialogContent className="sm:max-w-md">
          {orderType && (
            <>
              <DialogHeader>
                <DialogTitle>{orderType.title}</DialogTitle>
                <DialogDescription>{orderType.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-[12.5px] text-muted-foreground">
                  Заявка уйдёт в деканат сразу после отправки. Готовность — примерно {orderType.processingDays}{" "}
                  {orderType.processingDays < 5 ? "рабочих дня" : "рабочих дней"}, уведомление придёт в кабинет.
                </p>
                <div>
                  <label htmlFor="order-comment" className="mb-1.5 block text-[13px] font-medium">
                    {orderType.needsComment ? "Опишите подробности (обязательно)" : "Комментарий для деканата (необязательно)"}
                  </label>
                  <Textarea
                    id="order-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={orderType.needsComment ? "Например: нужен академический отпуск с 1 марта по 31 августа по состоянию здоровья" : "Например: нужна за сентябрь–ноябрь, для банка"}
                    rows={3}
                    maxLength={500}
                  />
                </div>
                {orderError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">{orderError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOrderType(null)} disabled={submitting}>
                  Отмена
                </Button>
                <Button onClick={submitOrder} disabled={submitting || (orderType.needsComment && comment.trim().length < 5)}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Подать заявку
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог электронной версии справки */}
      <CertificateDialog
        request={printFor ?? { number: "", typeTitle: "", docCode: null, readyAt: null, createdAt: "" }}
        profile={
          data?.profile ?? {
            fullName: "",
            faculty: "",
            program: "",
            course: 1,
            groupName: "",
            recordBook: "",
            studyForm: "Очная",
            status: "Учится",
          }
        }
        open={Boolean(printFor)}
        onOpenChange={(open) => !open && setPrintFor(null)}
      />

      {/* Диалог отмены заявки */}
      <Dialog open={Boolean(cancelFor)} onOpenChange={(open) => !open && setCancelFor(null)}>
        <DialogContent className="sm:max-w-md">
          {cancelFor && (
            <>
              <DialogHeader>
                <DialogTitle>Отменить заявку?</DialogTitle>
                <DialogDescription>
                  {cancelFor.typeTitle} · <span className="font-mono">{cancelFor.number}</span>
                </DialogDescription>
              </DialogHeader>
              <p className="text-[13px] leading-snug text-muted-foreground">
                Заявка уйдёт из очереди деканата. Если документ понадобится снова — придётся подать новую.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelFor(null)} disabled={cancelling}>
                  Оставить заявку
                </Button>
                <Button variant="destructive" onClick={submitCancel} disabled={cancelling}>
                  {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                  Отменить
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог с QR выдачи */}
      <Dialog open={Boolean(showQrFor)} onOpenChange={(open) => !open && setShowQrFor(null)}>
        <DialogContent className="sm:max-w-xs">
          {showQrFor && (
            <>
              <DialogHeader>
                <DialogTitle>Код выдачи документа</DialogTitle>
                <DialogDescription>
                  {showQrFor.typeTitle} · <span className="font-mono">{showQrFor.number}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 pb-2">
                {showQrFor.docCode ? (
                  <>
                    <div className="rounded-2xl border bg-white p-3">
                      <QRCodeSVG
                        value={docVerifyUrl(showQrFor.number, showQrFor.docCode)}
                        size={168}
                        fileName={`deka-doc-${showQrFor.number}.png`}
                      />
                    </div>
                    <p className="text-center text-[12px] leading-snug text-muted-foreground">
                      QR открывает публичную страницу проверки подлинности. Сотруднику деканата назовите код выдачи —
                      он сверяется с базой.
                    </p>
                    <Badge variant="outline" className="font-mono">
                      {showQrFor.docCode}
                    </Badge>
                  </>
                ) : (
                  <p className="text-center text-[12.5px] leading-snug text-muted-foreground">
                    Документ ещё не готов: код выдачи появится, когда деканат подготовит справку.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
