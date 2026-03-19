import { z } from 'zod'

export const CreateTokenSchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.coerce.date().optional(),
})

export const TokenIdParamSchema = z.object({
  id: z.string().min(1),
})

export type CreateTokenDTO = z.infer<typeof CreateTokenSchema>
