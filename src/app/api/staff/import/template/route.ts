import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/api-helpers";
import { importTemplate, isImportKind } from "@/lib/academic-import";

/** Скачивание CSV-шаблона для импорта оценок или расписания. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  const kind = req.nextUrl.searchParams.get("kind") ?? "";
  if (!isImportKind(kind)) {
    return Response.json({ error: "Неизвестный тип импорта" }, { status: 400 });
  }

  return new Response(importTemplate(kind), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="deka-import-${kind}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
