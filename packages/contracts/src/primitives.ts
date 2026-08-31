import { z } from 'zod';

export const nonEmptyString = z.string().trim().min(1);

export const isoDateTime = z.iso.datetime({ offset: true });

export const confidence = z.number().min(0).max(1);

export const nonNegativeInt = z.number().int().min(0);

export const nonNegativeFinite = z.number().min(0);

export const positiveInt = z.number().int().positive();

/** Known 0..100 score range used by SNS-AI-style overall / average / experiment scores. */
export const score100 = z.number().min(0).max(100);

export function isIsoDateTimeRangeOrdered(from: string, to: string): boolean {
  return Date.parse(from) <= Date.parse(to);
}
