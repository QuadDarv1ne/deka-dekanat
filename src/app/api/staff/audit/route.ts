import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-helpers";

/** Журнал действий деканата: последние 150 записей, только для сотрудников. */
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.res;

  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return NextResponse.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      entityId: entry.entityId,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    })),
  });
}
