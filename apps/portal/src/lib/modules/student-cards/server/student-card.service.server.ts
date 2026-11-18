import { error } from '@sveltejs/kit';
import { transaction, query } from '#server/database/postgres.ts';
import type { User } from '#modules/auth/auth.types.ts';
import type { StudentCard } from '../student-card.types.ts';
import { isUuid } from '#shared/validation.ts';
import QRCode from 'qrcode';

const select = `SELECT c.student_id,c.number::text,c.verification_code,c.issued_at,u.full_name,f.name faculty_name,g.name group_name,g.program,g.course FROM student_cards c JOIN users u ON u.id=c.student_id JOIN study_groups g ON g.id=u.group_id JOIN faculties f ON f.id=g.faculty_id`;

export async function studentCard(user: User) {
  if (user.role !== 'student' || !user.group_id) error(403, 'Студенческий доступен студентам.');
  return transaction(async (db) => {
    const created = await db.query(
      'INSERT INTO student_cards(student_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING number',
      [user.id]
    );
    if (created.rowCount)
      await db.query(
        "INSERT INTO audit_log(actor_id,action,entity_id,metadata) VALUES($1,'student_card.issue',$2,$3)",
        [user.id, user.id, JSON.stringify({ number: created.rows[0].number })]
      );
    return (await db.query<StudentCard>(`${select} WHERE c.student_id=$1 AND u.active`, [user.id]))
      .rows[0];
  });
}

export async function verifyStudentCard(user: User, code: string) {
  if (!['dean', 'teacher', 'admin'].includes(user.role))
    error(403, 'Проверка доступна сотрудникам университета.');
  if (!isUuid(code)) error(404, 'Студенческий не найден.');
  const result = await query<StudentCard>(
    `${select} WHERE c.verification_code=$1 AND u.active AND ($2='admin' OR g.faculty_id=$3) AND ($2<>'teacher' OR EXISTS (SELECT 1 FROM teaching_assignments a WHERE a.teacher_id=$4 AND a.group_id=g.id))`,
    [code, user.role, user.faculty_id, user.id]
  );
  if (!result.rowCount) error(404, 'Студенческий не найден или недоступен.');
  await query(
    "INSERT INTO audit_log(actor_id,action,entity_id,metadata) VALUES($1,'student_card.verify',$2,'{}')",
    [user.id, result.rows[0].student_id]
  );
  return result.rows[0];
}

export function cardNumber(number: string) {
  return `ДК-${number.padStart(7, '0')}`;
}
export async function cardPresentation(card: StudentCard, origin: string) {
  const verificationUrl = `${origin}/student-card/verify/${card.verification_code}`;
  return {
    card,
    number: cardNumber(card.number),
    verificationUrl,
    qr: await QRCode.toDataURL(verificationUrl, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#24203f', light: '#ffffff' }
    })
  };
}
