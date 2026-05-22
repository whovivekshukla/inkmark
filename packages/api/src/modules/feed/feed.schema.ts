import { z } from 'zod'
import { LimitQuerySchema, PageQuerySchema } from '@/lib/pagination'

export const FeedQuerySchema = z.object({
  page: PageQuerySchema,
  limit: LimitQuerySchema,
})
