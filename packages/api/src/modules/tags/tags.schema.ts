import { z } from 'zod'

export const CreateTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
})

export const TagIdParamSchema = z.object({
  id: z.string().min(1),
})
