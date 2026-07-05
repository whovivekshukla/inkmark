import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { ErrorCode } from '@/constants/error-codes'

interface HttpBodyError extends Error {
  status?: number
  statusCode?: number
  type?: string
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known application errors — structured, safe to send to client
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    })
    return
  }

  // Prisma known request errors — map error codes to HTTP responses
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2025':
        res.status(404).json({
          success: false,
          error: { code: ErrorCode.NOT_FOUND, message: 'Record not found' },
        })
        break
      case 'P2002':
        res.status(409).json({
          success: false,
          error: {
            code: ErrorCode.CONFLICT,
            message: `Duplicate entry for: ${(err.meta?.target as string[])?.join(', ')}`,
          },
        })
        break
      case 'P2003':
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid relationship reference' },
        })
        break
      case 'P2014':
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid query' },
        })
        break
      case 'P2016':
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: 'Query interpretation error' },
        })
        break
      case 'P2023':
        res.status(400).json({
          success: false,
          error: { code: ErrorCode.VALIDATION_ERROR, message: 'Inconsistent column data' },
        })
        break
      case 'P2024':
        // Connection pool timeout — infrastructure fault, not a client error
        logger.error('Prisma connection pool timeout', { code: err.code, path: req.path })
        res.status(503).json({
          success: false,
          error: { code: ErrorCode.INTERNAL_ERROR, message: 'Service temporarily unavailable' },
        })
        break
      default:
        // Unknown Prisma error codes are server-side faults — do not misclassify as 400
        logger.error('Unhandled Prisma request error', { code: err.code, meta: err.meta, path: req.path })
        res.status(500).json({
          success: false,
          error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' },
        })
    }
    return
  }

  // Prisma initialization errors — DB unreachable or misconfigured
  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error('Prisma initialization error', { message: err.message, path: req.path })
    res.status(500).json({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'Database connection error' },
    })
    return
  }

  const bodyErr = err && typeof err === 'object' ? (err as HttpBodyError) : null
  if (
    bodyErr &&
    bodyErr instanceof SyntaxError &&
    bodyErr.status === 400 &&
    bodyErr.type === 'entity.parse.failed'
  ) {
    res.status(400).json({
      success: false,
      error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid JSON body' },
    })
    return
  }

  if (
    bodyErr &&
    (bodyErr.type === 'entity.too.large' || bodyErr.status === 413 || bodyErr.statusCode === 413)
  ) {
    res.status(413).json({
      success: false,
      error: { code: ErrorCode.VALIDATION_ERROR, message: 'Request body too large' },
    })
    return
  }

  // Unknown errors — log full details internally, never expose to client
  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })

  res.status(500).json({
    success: false,
    error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' },
  })
}
