import { TagModel, TagWithCountModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'

export const tagsRepository = {
  async findManyByUserId(userId: string): Promise<TagWithCountModel[]> {
    try {
      return await prisma.tag.findMany({
        where: { userId },
        include: { _count: { select: { clips: { where: { clip: { deletedAt: null } } } } } },
        orderBy: { name: 'asc' },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async create(userId: string, name: string): Promise<TagModel> {
    try {
      return await prisma.tag.create({
        data: { userId, name },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async delete(tagId: string, userId: string): Promise<void> {
    try {
      // userId in where ensures users can only delete their own tags — P2025 if not found or not owner
      await prisma.tag.delete({
        where: { id: tagId, userId },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
