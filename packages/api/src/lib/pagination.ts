import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/constants/pagination'

export const PageQuerySchema = z.coerce.number().int().finite().min(1).default(1)

export const LimitQuerySchema = z.coerce
  .number()
  .int()
  .finite()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE)

export function boundedLimit(max: number) {
  return z.coerce.number().int().finite().min(1).max(max)
}
