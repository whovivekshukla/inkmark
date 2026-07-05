import { UserSummaryModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'

const USER_SUMMARY_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

export const followRepository = {
  async create(followerId: string, followingId: string) {
    try {
      return await prisma.follow.create({
        data: { followerId, followingId },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async delete(followerId: string, followingId: string) {
    try {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async getFollowers(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ users: UserSummaryModel[]; total: number }> {
    try {
      const [follows, total] = await Promise.all([
        prisma.follow.findMany({
          where: { followingId: userId },
          include: { follower: { select: USER_SUMMARY_SELECT } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.follow.count({ where: { followingId: userId } }),
      ])
      return { users: follows.map((f) => f.follower), total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async getFollowing(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ users: UserSummaryModel[]; total: number }> {
    try {
      const [follows, total] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: userId },
          include: { following: { select: USER_SUMMARY_SELECT } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.follow.count({ where: { followerId: userId } }),
      ])
      return { users: follows.map((f) => f.following), total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const row = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
        select: { followerId: true },
      })
      return row !== null
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async getFollowingIds(userId: string): Promise<string[]> {
    try {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })
      return follows.map((f) => f.followingId)
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
