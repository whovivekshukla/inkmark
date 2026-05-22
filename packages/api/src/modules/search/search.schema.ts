import { z } from 'zod'
import { LimitQuerySchema, PageQuerySchema } from '@/lib/pagination'

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1),
  type: z.enum(['clips', 'highlights', 'all']).default('all'),
  page: PageQuerySchema,
  limit: LimitQuerySchema,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})
