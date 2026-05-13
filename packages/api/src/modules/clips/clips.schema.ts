import { z } from 'zod'
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@/constants/pagination'

export const CreateClipSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(1000).optional(),
  ogImage: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  isPublic: z.boolean().optional().default(true),
  tags: z.array(z.string().min(1).max(50)).optional(),
})

export const UpdateClipSchema = z.object({
  title: z.string().min(1).optional(),
  isPublic: z.boolean().optional(),
})

export const GetClipsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  url: z.string().url().optional(),
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
