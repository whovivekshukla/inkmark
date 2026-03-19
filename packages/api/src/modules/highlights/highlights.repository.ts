import { HighlightModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'
import { CreateHighlightData, UpdateHighlightData } from './highlights.types'

export const highlightRepository = {
  async findById(highlightId: string): Promise<HighlightModel | null> {
    try {
      return await prisma.highlight.findFirst({
        where: { id: highlightId, deletedAt: null },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async findManyByClipId(clipId: string): Promise<HighlightModel[]> {
    try {
      return await prisma.highlight.findMany({
        where: { clipId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async create(data: CreateHighlightData): Promise<HighlightModel> {
    try {
      return await prisma.highlight.create({ data })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async update(highlightId: string, data: UpdateHighlightData): Promise<HighlightModel> {
    try {
      return await prisma.highlight.update({
        where: { id: highlightId },
        data,
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async delete(highlightId: string): Promise<void> {
    try {
      await prisma.highlight.update({
        where: { id: highlightId },
        data: { deletedAt: new Date() },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
