import { z } from 'zod'
import { LimitQuerySchema, PageQuerySchema } from '@/lib/pagination'

export const UserIdParamSchema = z.object({
  userId: z.string().min(1),
})

export const FollowsQuerySchema = z.object({
  page: PageQuerySchema,
  limit: LimitQuerySchema,
})
