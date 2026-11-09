import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { auditEntry, AUDIT } from "@/lib/audit";
import type { GradeImportRow, ImportIssue, ImportKind, ImportRow, ScheduleImportRow } from "@/lib/academic-import";

/**
 * Серверная часть импорта: проверка строк по базе и атомарная запись.
 * Проверки повторяются перед подтверждением: клиент не может обойти правила,
 * подменив предпросмотр.
 */

export type ImportActor = { id: string; name: string; role: string };

const MAX_ROWS = 200;

function gradeKey(row: GradeImportRow): string {
  return [row.login, row.subjectName, row.kind, row.title, row.dateIso].join("\u0001").toLocaleLowerCase("ru-RU");
}

function scheduleKey(row: ScheduleImportRow): string {
  return `${row.groupName.toLocaleLowerCase("ru-RU")}\u0001${row.weekday}\u0001${row.startMin}`;
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("ru-RU") === b.trim().toLocaleLowerCase("ru-RU");
}

/** Проверка строк по данным БД и внутри файла. Возвращает ошибки, не меняя базу. */
export async function validateImportRows(kind: ImportKind, rows: ImportRow[]): Promise<ImportIssue[]> {
  const issues: ImportIssue[] = [];
  if (rows.length === 0) return [{ row: 0, message: "Нет строк для импорта." }];
  if (rows.length > MAX_ROWS) return [{ row: 0, message: `За один раз можно импортировать не более ${MAX_ROWS} строк.` }];

  if (kind === "grades") {
    const gradeRows = rows as GradeImportRow[];
    const logins = [...new Set(gradeRows.map((row) => row.login))];
    const users = await db.user.findMany({
      where: { login: { in: logins }, role: "STUDENT" },
      select: { login: true },
    });
    const known = new Set(users.map((user) => user.login));
    const seen = new Map<string, number>();
    for (const row of gradeRows) {
      if (!known.has(row.login)) {
        issues.push({ row: row.row, message: `Логин «${row.login}» не найден среди студентов.` });
        continue;
      }
      const key = gradeKey(row);
      const previous = seen.get(key);
      if (previous) {
        issues.push({ row: row.row, message: `Такая запись уже есть в файле (строка ${previous}).` });
      } else {
        seen.set(key, row.row);
      }
    }
    return issues;
  }

  const scheduleRows = rows as ScheduleImportRow[];
  const [groups, slots] = await Promise.all([
    db.studentProfile.findMany({ distinct: ["groupName"], select: { groupName: true } }),
    db.scheduleSlot.findMany({
      select: { id: true, groupName: true, weekday: true, startMin: true, endMin: true, room: true, teacherName: true },
    }),
  ]);
  const knownGroups = new Set(groups.map((group) => group.groupName));
  const seen = new Map<string, number>();

  for (const row of scheduleRows) {
    if (!knownGroups.has(row.groupName)) {
      issues.push({ row: row.row, message: `Группа «${row.groupName}» не найдена в реестре студентов.` });
      continue;
    }
    const key = scheduleKey(row);
    const previous = seen.get(key);
    if (previous) {
      issues.push({ row: row.row, message: `Пара этой группы в это время уже есть в файле (строка ${previous}).` });
      continue;
    }
    seen.set(key, row.row);

    for (const slot of slots) {
      if (slot.weekday !== row.weekday) continue;
      // Та же пара (группа + день + начало) будет обновлена, а не добавлена.
      if (sameText(slot.groupName, row.groupName) && slot.startMin === row.startMin) continue;
      if (row.startMin >= slot.endMin || row.endMin <= slot.startMin) continue;
      const conflict =
        sameText(slot.groupName, row.groupName) ||
        sameText(slot.teacherName, row.teacherName) ||
        sameText(slot.room, row.room);
      if (conflict) {
        issues.push({
          row: row.row,
          message: `В это время заняты группа, преподаватель или аудитория (конфликт с парой «${slot.groupName}», ${slot.room}).`,
        });
        break;
      }
    }
  }

  // Конфликты внутри самого файла: разные группы/преподаватели/аудитории в одно время.
  for (let i = 0; i < scheduleRows.length; i++) {
    const a = scheduleRows[i];
    if (issues.some((issue) => issue.row === a.row)) continue;
    for (let j = 0; j < i; j++) {
      const b = scheduleRows[j];
      if (a.weekday !== b.weekday) continue;
      if (a.startMin >= b.endMin || a.endMin <= b.startMin) continue;
      if (scheduleKey(a) === scheduleKey(b)) continue;
      if (sameText(a.groupName, b.groupName) || sameText(a.teacherName, b.teacherName) || sameText(a.room, b.room)) {
        issues.push({ row: a.row, message: `В это время уже есть пара в файле (строка ${b.row}).` });
        break;
      }
    }
  }
  return issues;
}

/** Атомарно записывает проверенные строки, уведомляет студентов и пишет аудит. */
export async function commitImport(
  kind: ImportKind,
  rows: ImportRow[],
  actor: ImportActor
): Promise<{ created: number; updated: number; notified: number }> {
  return db.$transaction(
    async (tx) => {
      let created = 0;
      let updated = 0;
      let notified = 0;

      if (kind === "grades") {
        const affected = new Map<string, Set<string>>();
        for (const row of rows as GradeImportRow[]) {
          const user = await tx.user.findUnique({ where: { login: row.login }, select: { id: true, role: true } });
          if (!user || user.role !== "STUDENT") throw new Error(`Студент «${row.login}» не найден.`);
          const date = new Date(`${row.dateIso}T12:00:00.000Z`);
          const existing = await tx.grade.findFirst({
            where: { userId: user.id, subjectName: row.subjectName, kind: row.kind, title: row.title, date },
            select: { id: true },
          });
          if (existing) {
            await tx.grade.update({
              where: { id: existing.id },
              data: {
                teacherName: row.teacherName,
                score: row.score,
                maxScore: row.maxScore,
                mark: row.mark,
                comment: row.comment,
              },
            });
            updated++;
          } else {
            await tx.grade.create({
              data: {
                userId: user.id,
                subjectName: row.subjectName,
                teacherName: row.teacherName,
                kind: row.kind,
                title: row.title,
                score: row.score,
                maxScore: row.maxScore,
                mark: row.mark,
                date,
                comment: row.comment,
              },
            });
            created++;
          }
          const subjects = affected.get(user.id) ?? new Set<string>();
          subjects.add(row.subjectName);
          affected.set(user.id, subjects);
        }

        for (const [userId, subjects] of affected) {
          await tx.notification.create({
            data: {
              userId,
              kind: "SYSTEM",
              title: "Обновлены результаты",
              body: `Деканат обновил результаты по дисциплинам: ${[...subjects].join(", ")}.`,
              link: "/grades",
            },
          });
          notified++;
        }
      } else {
        const groups = new Set<string>();
        for (const row of rows as ScheduleImportRow[]) {
          const existing = await tx.scheduleSlot.findFirst({
            where: { groupName: row.groupName, weekday: row.weekday, startMin: row.startMin },
            select: { id: true },
          });
          if (existing) {
            await tx.scheduleSlot.update({
              where: { id: existing.id },
              data: {
                endMin: row.endMin,
                subjectName: row.subjectName,
                kind: row.kind,
                room: row.room,
                building: row.building,
                teacherName: row.teacherName,
              },
            });
            updated++;
          } else {
            await tx.scheduleSlot.create({
              data: {
                groupName: row.groupName,
                weekday: row.weekday,
                startMin: row.startMin,
                endMin: row.endMin,
                subjectName: row.subjectName,
                kind: row.kind,
                room: row.room,
                building: row.building,
                teacherName: row.teacherName,
              },
            });
            created++;
          }
          groups.add(row.groupName);
        }

        for (const groupName of groups) {
          const students = await tx.studentProfile.findMany({
            where: { groupName },
            select: { userId: true },
          });
          if (!students.length) continue;
          await tx.notification.createMany({
            data: students.map((student) => ({
              userId: student.userId,
              kind: "SCHEDULE",
              title: "Расписание обновлено",
              body: `Деканат обновил расписание группы ${groupName}. Проверьте изменения.`,
              link: "/schedule",
            })),
          });
          notified += students.length;
        }
      }

      await tx.auditLog.create({
        data: auditEntry(actor, AUDIT.academicImportComplete, randomUUID(), {
          kind,
          count: rows.length,
          created,
          updated,
        }),
      });

      return { created, updated, notified };
    },
    { timeout: 20_000 }
  );
}
