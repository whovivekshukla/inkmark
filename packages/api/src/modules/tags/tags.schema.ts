import { z } from 'zod'
import { boundedLimit } from '@/lib/pagination'

export const CreateTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
})

export const GetTagsQuerySchema = z.object({
  limit: boundedLimit(20).optional(),
  sort: z.enum(['name', 'clips', 'highlights']).default('name'),
})

export const TagIdParamSchema = z.object({
  id: z.string().min(1),
})
