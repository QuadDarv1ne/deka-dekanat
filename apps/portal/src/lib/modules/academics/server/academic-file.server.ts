import { parse } from 'csv-parse/sync';
import { Worker } from 'node:worker_threads';
import { error } from '@sveltejs/kit';

async function excelRows(buffer: Buffer): Promise<unknown[][]> {
  // Parse uploaded archives outside the HTTP worker, with bounded memory and execution time.
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `const {parentPort,workerData}=require('node:worker_threads'); import('read-excel-file/node').then(async({readSheet})=>parentPort.postMessage(await readSheet(Buffer.from(workerData)))).catch(e=>{throw e;});`,
      {
        eval: true,
        workerData: buffer,
        resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 }
      }
    );
    const timeout = setTimeout(() => {
      void worker.terminate();
      reject(new Error('FILE_TIMEOUT'));
    }, 4000);
    worker.once('message', (rows) => {
      clearTimeout(timeout);
      void worker.terminate();
      resolve(rows);
    });
    worker.once('error', (cause) => {
      clearTimeout(timeout);
      reject(cause);
    });
    worker.once('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error('FILE_WORKER'));
      }
    });
  });
}
export async function readAcademicFile(file: File) {
  if (!file.size || file.size > 1024 * 1024) error(400, 'Выберите CSV или XLSX размером до 1 МБ.');
  let matrix: unknown[][] | undefined;
  try {
    if (/\.xlsx$/i.test(file.name)) matrix = await excelRows(Buffer.from(await file.arrayBuffer()));
    else if (/\.csv$/i.test(file.name)) {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      const header = text.split(/\r?\n/, 1)[0];
      const delimiter = header.includes(';') ? ';' : header.includes('\t') ? '\t' : ',';
      matrix = parse(text, {
        delimiter,
        bom: true,
        skip_empty_lines: true,
        max_record_size: 8000,
        relax_column_count: false
      });
    } else error(400, 'Поддерживаются файлы CSV и XLSX.');
  } catch {
    error(400, 'Не удалось прочитать файл. Проверьте формат и размер таблицы.');
  }
  if (
    !matrix ||
    !Array.isArray(matrix) ||
    matrix.length < 2 ||
    matrix.length > 201 ||
    matrix.some((row) => !Array.isArray(row) || row.length > 16)
  )
    error(400, 'Таблица должна содержать заголовок и от 1 до 200 строк.');
  const columnNames = matrix[0].map((value) => String(value ?? '').trim());
  const rows = matrix.map((row, rowIndex) =>
    row.map((value, column) => {
      const timeColumn = rowIndex > 0 && ['Начало', 'Окончание'].includes(columnNames[column]);
      if (
        timeColumn &&
        (value instanceof Date || (typeof value === 'number' && value >= 0 && value < 1))
      ) {
        const minutes =
          value instanceof Date
            ? value.getUTCHours() * 60 + value.getUTCMinutes()
            : Math.round(value * 1440) % 1440;
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      }
      return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').trim();
    })
  );
  const headers = rows.shift()!;
  if (new Set(headers).size !== headers.length || headers.some((h) => !h))
    error(400, 'Названия столбцов должны быть заполнены и не повторяться.');
  return rows
    .filter((row) => row.some(Boolean))
    .map((row, index) => ({
      index: index + 2,
      values: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
    }));
}
