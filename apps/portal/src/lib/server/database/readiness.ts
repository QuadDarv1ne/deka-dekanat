import { query } from './postgres';
export async function databaseReady() {
  await query('SELECT 1');
}
