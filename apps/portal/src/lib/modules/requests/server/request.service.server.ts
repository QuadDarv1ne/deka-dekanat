import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { transaction } from '#server/database/postgres.ts';
import { newToken } from '#server/security/credentials.mjs';
import { isUuid } from '#shared/validation.ts';
import { canTransition, canIssueDocument } from '#modules/requests/request.policy.ts';
import { requestKinds, requestNumber, statusNames } from '#modules/requests/request.labels.ts';
import type { RequestKind, RequestStatus } from '#modules/requests/request.types.ts';
import type { User } from '#modules/auth/auth.types.ts';

export async function createRequest(user: User, id: string, kind: string, details: string) {
  if (user.role !== 'student') error(403, 'Создавать заявления могут студенты.');
  if (
    !isUuid(id) ||
    !Object.hasOwn(requestKinds, kind) ||
    details.length < 3 ||
    details.length > 2000
  )
    error(400, 'Выберите тип заявления и укажите цель обращения: от 3 до 2000 символов.');
  return transaction(async (db) => {
    const inserted = await db.query(
      'INSERT INTO requests(id,student_id,faculty_id,kind,details) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING number',
      [id, user.id, user.faculty_id, kind as RequestKind, details]
    );
    if (!inserted.rowCount) {
      const own = await db.query('SELECT 1 FROM requests WHERE id=$1 AND student_id=$2', [
        id,
        user.id
      ]);
      if (!own.rowCount) error(409, 'Обновите страницу и повторите отправку.');
      return id;
    }
    await db.query(
      'INSERT INTO request_events(request_id,actor_id,status,note) VALUES($1,$2,$3,$4)',
      [id, user.id, 'new', 'Заявление отправлено в деканат']
    );
    await db.query(
      'INSERT INTO audit_log(actor_id,action,entity_id,metadata) VALUES($1,$2,$3,$4)',
      [user.id, 'request.created', id, JSON.stringify({ kind })]
    );
    await db.query(
      `INSERT INTO notifications(id,user_id,title,body,href)
      SELECT gen_random_uuid(),id,'Новое заявление',$1,$2 FROM users WHERE role='dean' AND active AND faculty_id=$3`,
      [
        `${user.full_name} · ${requestKinds[kind as RequestKind]}`,
        `/requests/${id}`,
        user.faculty_id
      ]
    );
    return id;
  });
}
export async function transitionRequest(
  user: User,
  id: string,
  target: RequestStatus,
  version: number,
  note: string
) {
  if (!isUuid(id) || note.length > 2000 || !Number.isInteger(version))
    error(400, 'Некорректные данные заявления.');
  await transaction(async (db) => {
    const locked = await db.query('SELECT * FROM requests WHERE id=$1 FOR UPDATE', [id]);
    const request = locked.rows[0];
    if (
      !request ||
      (user.role === 'student'
        ? request.student_id !== user.id
        : user.role !== 'dean' || request.faculty_id !== user.faculty_id)
    )
      error(404, 'Заявление не найдено.');
    if (request.version !== version) error(409, 'Заявление уже изменилось. Обновите страницу.');
    if (!canTransition(user.role, request.status, target))
      error(409, 'Этот переход статуса недоступен.');
    if (target === 'rejected' && note.trim().length < 5)
      error(400, 'Укажите причину отклонения (минимум 5 символов).');
    const code =
      target === 'ready' && canIssueDocument(request.kind) ? newToken() : request.verification_code;
    await db.query(
      `UPDATE requests SET status=$2,
      staff_note=CASE WHEN $5 THEN $3 ELSE staff_note END,
      version=version+1,updated_at=now(),verification_code=$4,
      assigned_to=CASE WHEN $5 THEN $6 ELSE assigned_to END WHERE id=$1`,
      [id, target, note, code, user.role === 'dean', user.id]
    );
    await db.query(
      'INSERT INTO request_events(request_id,actor_id,status,note) VALUES($1,$2,$3,$4)',
      [id, user.id, target, note]
    );
    await db.query(
      'INSERT INTO audit_log(actor_id,action,entity_id,metadata) VALUES($1,$2,$3,$4)',
      [user.id, 'request.status_changed', id, JSON.stringify({ from: request.status, to: target })]
    );
    if (user.role === 'dean')
      await db.query(
        'INSERT INTO notifications(id,user_id,title,body,href) VALUES($1,$2,$3,$4,$5)',
        [
          randomUUID(),
          request.student_id,
          `Заявление №${requestNumber(request.number)}: ${statusNames[target].toLowerCase()}`,
          note || 'Откройте заявление, чтобы посмотреть подробности.',
          `/requests/${id}`
        ]
      );
  });
}
