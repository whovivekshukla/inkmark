import { HighlightModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { CreateHighlightData, UpdateHighlightData } from './highlights.types'

export const highlightRepository = {
  async findById(highlightId: string): Promise<HighlightModel | null> {
    return prisma.highlight.findFirst({
      where: { id: highlightId, deletedAt: null },
    })
  },

  async findManyByClipId(clipId: string): Promise<HighlightModel[]> {
    return prisma.highlight.findMany({
      where: { clipId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
  },

  async create(data: CreateHighlightData): Promise<HighlightModel> {
    return prisma.highlight.create({ data })
  },

  async update(highlightId: string, data: UpdateHighlightData): Promise<HighlightModel> {
    return prisma.highlight.update({
      where: { id: highlightId },
      data,
    })
  },

  async delete(highlightId: string): Promise<void> {
    await prisma.highlight.update({
      where: { id: highlightId },
      data: { deletedAt: new Date() },
    })
  },
}
