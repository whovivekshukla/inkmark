import { UserProfileModel, ClipModel, HighlightModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'

const USER_PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
} as const

export const usersRepository = {
  async findByUsername(username: string): Promise<UserProfileModel | null> {
    try {
      return await prisma.user.findFirst({
        where: { username, deletedAt: null },
        select: USER_PROFILE_SELECT,
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async getUserPublicClips(
    username: string,
    page: number,
    limit: number,
  ): Promise<{ clips: ClipModel[]; total: number }> {
    try {
      const where = { user: { username, deletedAt: null }, isPublic: true, deletedAt: null }

      const [clips, total] = await Promise.all([
        prisma.clip.findMany({
          where,
          include: { tags: { include: { tag: true } } },
          orderBy: { savedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.clip.count({ where }),
      ])

      return { clips, total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async getUserPublicHighlights(
    username: string,
    page: number,
    limit: number,
  ): Promise<{ highlights: HighlightModel[]; total: number }> {
    try {
      const where = {
        user: { username, deletedAt: null },
        deletedAt: null,
        clip: { isPublic: true, deletedAt: null },
      }

      const [highlights, total] = await Promise.all([
        prisma.highlight.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.highlight.count({ where }),
      ])

      return { highlights, total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async searchUsers(query: string): Promise<UserProfileModel[]> {
    try {
      return await prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: USER_PROFILE_SELECT,
        take: 20,
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
