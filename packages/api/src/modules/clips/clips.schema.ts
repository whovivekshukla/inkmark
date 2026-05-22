import { z } from 'zod'
import { ClipSource } from '@inkmark/shared'
import { LimitQuerySchema, PageQuerySchema } from '@/lib/pagination'
import { SafeHttpUrlSchema } from '@/lib/url'

export const CreateClipSchema = z
  .object({
    url: SafeHttpUrlSchema.optional(),
    source: z.nativeEnum(ClipSource),
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(1000).optional(),
    ogImage: SafeHttpUrlSchema.optional(),
    faviconUrl: SafeHttpUrlSchema.optional(),
    isPublic: z.boolean().optional().default(true),
    tags: z.array(z.string().min(1).max(50)).optional(),
  })
  .refine((d) => d.url !== undefined || (d.title && d.title.trim().length > 0), {
    message: 'Either url or title is required',
    path: ['url'],
  })

export const UpdateClipSchema = z.object({
  title: z.string().min(1).optional(),
  isPublic: z.boolean().optional(),
})

export const GetClipsQuerySchema = z.object({
  page: PageQuerySchema,
  limit: LimitQuerySchema,
  url: SafeHttpUrlSchema.optional(),
  tag: z.string().optional(),
  domain: z.string().optional(),
  q: z.string().optional(),
  highlighted: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sort: z.enum(['recent', 'oldest', 'most_highlights']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export const AddTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
})

export const ClipIdParamSchema = z.object({
  id: z.string().min(1),
})

export const TagIdParamSchema = z.object({
  id: z.string().min(1),
  tagId: z.string().min(1),
})
