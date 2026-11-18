import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { query, transaction } from '#server/database/postgres.ts';
import { isUuid } from '#shared/validation.ts';

import type { ChatInput, ChatMessage, ChatSource, ChatThread } from '../assistant.types';

export async function threads(userId: string) {
  return (
    await query<ChatThread>(
      'SELECT id,title,updated_at FROM assistant_threads WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 30',
      [userId]
    )
  ).rows;
}
export async function messages(userId: string, threadId: string) {
  if (!isUuid(threadId)) error(404, 'Чат не найден.');
  const owned = await query('SELECT 1 FROM assistant_threads WHERE id=$1 AND user_id=$2', [
    threadId,
    userId
  ]);
  if (!owned.rowCount) error(404, 'Чат не найден.');
  return (
    await query<ChatMessage>(
      'SELECT id,role,content,status,sources,created_at FROM assistant_messages WHERE thread_id=$1 ORDER BY created_at,id LIMIT 100',
      [threadId]
    )
  ).rows;
}
export async function beginTurn(userId: string, input: ChatInput) {
  return transaction(async (db) => {
    await db.query('SELECT pg_advisory_xact_lock(882705110)');
    await db.query('DELETE FROM assistant_leases WHERE expires_at<now()');
    if ((await db.query('SELECT 1 FROM assistant_leases WHERE user_id=$1', [userId])).rowCount)
      error(429, 'Дождитесь ответа на предыдущий вопрос.');
    if (Number((await db.query('SELECT count(*) count FROM assistant_leases')).rows[0].count) >= 2)
      error(503, 'Помощник занят. Попробуйте через минуту.');
    const duplicate = await db.query(
      `SELECT m.content,t.user_id FROM assistant_messages m JOIN assistant_threads t ON t.id=m.thread_id WHERE m.id=$1`,
      [input.messageId]
    );
    if (duplicate.rowCount) error(409, 'Этот вопрос уже отправлен. Обновите чат.');
    const rate = await db.query(
      `INSERT INTO assistant_rate_limits(user_id,count,window_start) VALUES($1,1,now())
    ON CONFLICT(user_id) DO UPDATE SET count=CASE WHEN assistant_rate_limits.window_start<now()-interval '1 minute' THEN 1 ELSE assistant_rate_limits.count+1 END,
    window_start=CASE WHEN assistant_rate_limits.window_start<now()-interval '1 minute' THEN now() ELSE assistant_rate_limits.window_start END RETURNING count`,
      [userId]
    );
    if (rate.rows[0].count > 8) error(429, 'Слишком много вопросов. Попробуйте через минуту.');
    const threadId = input.threadId ?? randomUUID();
    if (input.threadId) {
      if (
        !(
          await db.query('SELECT 1 FROM assistant_threads WHERE id=$1 AND user_id=$2', [
            threadId,
            userId
          ])
        ).rowCount
      )
        error(404, 'Чат не найден.');
    } else
      await db.query('INSERT INTO assistant_threads(id,user_id,title) VALUES($1,$2,$3)', [
        threadId,
        userId,
        input.message.slice(0, 80)
      ]);
    const count = await db.query(
      'SELECT count(*) count FROM assistant_messages WHERE thread_id=$1',
      [threadId]
    );
    if (Number(count.rows[0].count) >= 100) error(400, 'Чат заполнен. Создайте новый.');
    const token = randomUUID(),
      answerId = randomUUID();
    await db.query(
      `INSERT INTO assistant_leases(user_id,token,expires_at) VALUES($1,$2,now()+interval '120 seconds')`,
      [userId, token]
    );
    // An expired generation may have been interrupted by a server restart.
    await db.query(
      `UPDATE assistant_messages SET status='failed' WHERE thread_id=$1 AND status='pending'`,
      [threadId]
    );
    await db.query(
      `INSERT INTO assistant_messages(id,thread_id,role,content,status,created_at) VALUES($1,$2,'user',$3,'complete',clock_timestamp())`,
      [input.messageId, threadId, input.message]
    );
    await db.query(
      `INSERT INTO assistant_messages(id,thread_id,role,status,created_at) VALUES($1,$2,'assistant','pending',clock_timestamp())`,
      [answerId, threadId]
    );
    await db.query('UPDATE assistant_threads SET updated_at=now() WHERE id=$1', [threadId]);
    return { threadId, answerId, token };
  });
}
export async function completeTurn(answerId: string, content: string, sources: ChatSource[]) {
  await query(`UPDATE assistant_messages SET content=$2,sources=$3,status='complete' WHERE id=$1`, [
    answerId,
    content,
    JSON.stringify(sources)
  ]);
}
export async function failTurn(answerId: string) {
  await query(`UPDATE assistant_messages SET status='failed' WHERE id=$1 AND status='pending'`, [
    answerId
  ]);
}
export async function releaseTurn(token: string) {
  await query('DELETE FROM assistant_leases WHERE token=$1', [token]);
}
