import { readFile, stat } from 'node:fs/promises';

import { isPositiveInt } from './limits.js';
import { TransportReason, type TransportResult } from './types.js';

export async function readJsonlObjects(
  filePath: string,
  limits: { maxBytes: number; maxRows: number },
  label: string,
): Promise<TransportResult<Record<string, unknown>[]>> {
  if (!isPositiveInt(limits.maxBytes)) {
    return { status: 'blocked', reason: TransportReason.invalidMaxBytesPerFile };
  }
  if (!isPositiveInt(limits.maxRows)) {
    return { status: 'blocked', reason: TransportReason.invalidMaxRowsPerFile };
  }
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'ENOENT') {
      return { status: 'blocked', reason: `${TransportReason.fileNotFound}: ${label}` };
    }
    throw error;
  }
  if (size > limits.maxBytes) {
    return { status: 'blocked', reason: `${TransportReason.fileTooLarge}: ${label}` };
  }
  const text = await readFile(filePath, 'utf8');
  if (Buffer.byteLength(text, 'utf8') > limits.maxBytes) {
    return { status: 'blocked', reason: `${TransportReason.fileTooLarge}: ${label}` };
  }
  const rows: Record<string, unknown>[] = [];
  const lines = text.split('\n');
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      return { status: 'blocked', reason: `${TransportReason.malformedJsonl}: ${label}:line ${String(index + 1)}` };
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { status: 'blocked', reason: `${TransportReason.nonObjectRow}: ${label}:line ${String(index + 1)}` };
    }
    rows.push(parsed as Record<string, unknown>);
    if (rows.length > limits.maxRows) {
      return { status: 'blocked', reason: `${TransportReason.rowLimitExceeded}: ${label}` };
    }
  }
  return { status: 'mapped', value: rows };
}
