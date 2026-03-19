import { Prisma } from '@prisma/client'
import { AppError } from './errors'
import { ErrorCode } from '@/constants/error-codes'

/**
 * Maps PrismaClientKnownRequestError codes to AppError with the correct HTTP status.
 * Call this from repository catch blocks so Prisma errors never reach the service layer as raw errors.
 * Always throws — return type is `never`.
 */
export function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        throw new AppError(
          ErrorCode.CONFLICT,
          `Duplicate entry for: ${(err.meta?.target as string[])?.join(', ')}`,
          409,
        )
      case 'P2025':
        throw new AppError(ErrorCode.NOT_FOUND, 'Record not found', 404)
      case 'P2003':
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid relationship reference', 400)
      case 'P2014':
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid query', 400)
      case 'P2016':
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Query interpretation error', 400)
      case 'P2023':
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Inconsistent column data', 400)
      case 'P2024':
        throw new AppError(ErrorCode.INTERNAL_ERROR, 'Service temporarily unavailable', 503)
      default:
        throw new AppError(ErrorCode.INTERNAL_ERROR, 'Something went wrong', 500)
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Database connection error', 500)
  }

  // Not a Prisma error — re-throw as-is so the service catch handles it
  throw err
}
