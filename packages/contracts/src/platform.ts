import { z } from 'zod';

export const platformSchema = z.enum([
  'x',
  'instagram',
  'youtube',
  'tiktok',
  'threads',
  'facebook',
  'note',
  'website',
]);

export type Platform = z.infer<typeof platformSchema>;

export const growthFeatureDimensionSchema = z.enum([
  'topic',
  'angle',
  'hook',
  'emotion',
  'format',
  'cta',
  'mediaDecision',
  'postingHour',
]);

export type GrowthFeatureDimension = z.infer<typeof growthFeatureDimensionSchema>;
