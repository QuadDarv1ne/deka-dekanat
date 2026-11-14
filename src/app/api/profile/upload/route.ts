import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent, jsonError } from "@/lib/api-helpers";
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join, sep } from "path";
import { randomUUID } from "crypto";

/**
 * Загрузка документов студента: студенческий билет и согласие на зачисление.
 * Файлы сохраняются в public/uploads/students/<uuid>.<ext> и раздаются статикой.
 * Доступен только STUDENT — через requireStudent.
 */

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "students");

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ

// Whitelist MIME ↔ расширение: доверяем только согласованным парам.
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_FIELDS = ["studentDoc", "admissionConsent"] as const;
type DocField = (typeof ALLOWED_FIELDS)[number];

function isAllowedField(field: string | null): field is DocField {
  return !!field && (ALLOWED_FIELDS as readonly string[]).includes(field);
}

/** Удаление файла с защитой от path traversal. */
function safeUnlink(url: string | null | undefined) {
  if (!url) return;
  if (!url.startsWith("/uploads/students/")) return;
  const fileName = url.slice("/uploads/students/".length);
  if (!fileName || fileName.includes("/") || fileName.includes("..") || fileName.includes(sep)) return;
  const filePath = join(UPLOAD_DIR, fileName);
  if (!filePath.startsWith(UPLOAD_DIR + sep) && filePath !== UPLOAD_DIR) return;
  if (existsSync(filePath)) unlinkSync(filePath);
}

export async function POST(request: NextRequest) {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  try {
    const formData = await request.formData();
    const fieldRaw = formData.get("field");
    const file = formData.get("file");

    if (typeof fieldRaw !== "string" || !isAllowedField(fieldRaw)) {
      return jsonError("Некорректное поле", 400);
    }
    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Файл не выбран", 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return jsonError("Файл слишком большой (макс. 10 МБ)", 413);
    }
    const safeExt = ALLOWED_TYPES[file.type];
    if (!safeExt) {
      return jsonError("Неподдерживаемый тип файла. Разрешены: PDF, JPG, PNG, WEBP", 400);
    }

    const prev = await db.studentProfile.findUnique({
      where: { userId: session.uid },
      select: { id: true, studentDocUrl: true, admissionConsentUrl: true },
    });
    if (!prev) return jsonError("Профиль студента не найден", 404);

    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      return jsonError("Файл слишком большой (макс. 10 МБ)", 413);
    }
    // Расширение берём из MIME, а не из имени файла — защита от обмана типа.
    const fileName = `${randomUUID()}.${safeExt}`;
    const filePath = join(UPLOAD_DIR, fileName);
    writeFileSync(filePath, Buffer.from(arrayBuffer));

    // Старый файл этого же поля больше не нужен.
    safeUnlink(fieldRaw === "studentDoc" ? prev.studentDocUrl : prev.admissionConsentUrl);

    const fileUrl = `/uploads/students/${fileName}`;
    const now = new Date();

    const updated = await db.studentProfile.update({
      where: { userId: session.uid },
      data:
        fieldRaw === "studentDoc"
          ? { studentDocUrl: fileUrl, studentDocUploadedAt: now }
          : { admissionConsentUrl: fileUrl, admissionConsentUploadedAt: now },
      select: {
        studentDocUrl: true,
        studentDocUploadedAt: true,
        admissionConsentUrl: true,
        admissionConsentUploadedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      url: fileUrl,
      uploadedAt: now.toISOString(),
      docs: {
        studentDocUrl: updated.studentDocUrl || null,
        studentDocUploadedAt: updated.studentDocUploadedAt?.toISOString() ?? null,
        admissionConsentUrl: updated.admissionConsentUrl || null,
        admissionConsentUploadedAt: updated.admissionConsentUploadedAt?.toISOString() ?? null,
      },
    });
  } catch {
    return jsonError("Ошибка загрузки", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireStudent();
  if (!auth.ok) return auth.res;
  const { session } = auth;

  try {
    const fieldRaw = request.nextUrl.searchParams.get("field");
    if (!isAllowedField(fieldRaw)) return jsonError("Некорректное поле", 400);

    const profile = await db.studentProfile.findUnique({
      where: { userId: session.uid },
      select: { studentDocUrl: true, admissionConsentUrl: true },
    });
    if (!profile) return jsonError("Профиль студента не найден", 404);

    safeUnlink(fieldRaw === "studentDoc" ? profile.studentDocUrl : profile.admissionConsentUrl);

    const updated = await db.studentProfile.update({
      where: { userId: session.uid },
      data:
        fieldRaw === "studentDoc"
          ? { studentDocUrl: null, studentDocUploadedAt: null }
          : { admissionConsentUrl: null, admissionConsentUploadedAt: null },
      select: {
        studentDocUrl: true,
        studentDocUploadedAt: true,
        admissionConsentUrl: true,
        admissionConsentUploadedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      docs: {
        studentDocUrl: updated.studentDocUrl || null,
        studentDocUploadedAt: updated.studentDocUploadedAt?.toISOString() ?? null,
        admissionConsentUrl: updated.admissionConsentUrl || null,
        admissionConsentUploadedAt: updated.admissionConsentUploadedAt?.toISOString() ?? null,
      },
    });
  } catch {
    return jsonError("Ошибка удаления", 500);
  }
}
