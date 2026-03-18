import { ErrorCode } from '@/constants/error-codes'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
    // Capture stack trace for internal logging — never exposed in API responses
    Error.captureStackTrace(this, this.constructor)
  }
}
