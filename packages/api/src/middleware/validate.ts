import { RequestHandler } from 'express'
import { ZodSchema } from 'zod'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'

type ValidateTarget = 'body' | 'query' | 'params'

export function validate(
  schema: ZodSchema,
  target: ValidateTarget = 'body',
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[target])

    if (!result.success) {
      const message = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')

      throw new AppError(ErrorCode.VALIDATION_ERROR, message, 400)
    }

    // Replace target with coerced/defaulted values from Zod
    req[target] = result.data
    next()
  }
}
