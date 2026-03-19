import { UserModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'
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
      throw handlePrismaError(err)
    }
  },

  async findById(id: string): Promise<UserModel | null> {
    try {
      return await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: USER_SELECT,
      })
    } catch (err) {
      throw handlePrismaError(err)
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
      throw handlePrismaError(err)
    }
  },

  async updateUser(id: string, data: UpdateUserData): Promise<UserModel> {
    try {
      return await prisma.user.update({
        where: { id },
        // Only include fields that were provided — undefined keys are stripped by Prisma
        data,
        select: USER_SELECT,
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
