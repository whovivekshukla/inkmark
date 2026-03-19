import { z } from 'zod'

export const GoogleTokenSchema = z.object({
  accessToken: z.string().min(1),
})

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers, and underscores')
    .optional(),
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
})
