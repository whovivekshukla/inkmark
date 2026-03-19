import { z } from 'zod'
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@/constants/pagination'

export const FeedQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})
