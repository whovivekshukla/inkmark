import { UserModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { CreateUserData, UpdateUserData } from './auth.types'

// Columns returned for every user query — never select *
const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
} as const

export const authRepository = {
  async findByGoogleId(googleId: string): Promise<UserModel | null> {
    try {
      return await prisma.user.findFirst({
        where: { googleId, deletedAt: null },
        select: USER_SELECT,
      })
    } catch (err) {
      logger.error('authRepository.findByGoogleId failed', { googleId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to find user', 500)
    }
  },

  async findById(id: string): Promise<UserModel | null> {
    try {
      return await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: USER_SELECT,
      })
    } catch (err) {
      logger.error('authRepository.findById failed', { id, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to find user', 500)
    }
  },

  async createUser(data: CreateUserData): Promise<UserModel> {
    try {
      return await prisma.user.create({
        data: {
          googleId: data.googleId,
          email: data.email,
          username: data.username,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        },
        select: USER_SELECT,
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('authRepository.createUser failed', { email: data.email, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create user', 500)
    }
  },

  async updateUser(id: string, data: UpdateUserData): Promise<UserModel> {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        },
        select: USER_SELECT,
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('authRepository.updateUser failed', { id, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update user', 500)
    }
  },
}
