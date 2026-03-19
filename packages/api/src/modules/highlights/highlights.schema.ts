import { z } from 'zod'
import { HighlightColor } from '@inkmark/shared'

export const CreateHighlightSchema = z.object({
  clipId: z.string().min(1),
  text: z.string().min(1).max(5000),
  contextBefore: z.string().max(200).optional(),
  contextAfter: z.string().max(200).optional(),
  color: z.nativeEnum(HighlightColor).default(HighlightColor.Yellow),
})

export const UpdateHighlightSchema = z.object({
  color: z.nativeEnum(HighlightColor).optional(),
  text: z.string().min(1).max(5000).optional(),
})

export const HighlightIdParamSchema = z.object({
  id: z.string().min(1),
})
