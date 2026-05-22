import { z } from 'zod'
import { LimitQuerySchema, PageQuerySchema } from '@/lib/pagination'

export const UsernameParamSchema = z.object({
  username: z.string().min(1),
})

export const UserContentQuerySchema = z.object({
  page: PageQuerySchema,
  limit: LimitQuerySchema,
})

export const UserSearchQuerySchema = z.object({
  q: z.string().min(1),
})
