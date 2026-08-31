import { z } from 'zod';

export const nonEmptyString = z.string().trim().min(1);

export const isoDateTime = z.iso.datetime();

export const confidence = z.number().min(0).max(1);

export const nonNegativeInt = z.number().int().min(0);

export const nonNegativeFinite = z.number().min(0);

export const positiveInt = z.number().int().positive();
