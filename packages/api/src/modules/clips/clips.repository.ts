import { ClipModel, ClipTagModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { CreateClipData, UpdateClipData, UpdateClipMetadataData, GetClipsFilters } from './clips.types'

export const clipRepository = {
  async getAll(
    userId: string,
    filters: GetClipsFilters,
  ): Promise<{ clips: ClipModel[]; total: number }> {
    const where = {
      userId,
      deletedAt: null,
      ...(filters.url ? { url: filters.url } : {}),
      ...(filters.tag ? { tags: { some: { tag: { name: filters.tag.toLowerCase() } } } } : {}),
      ...(filters.domain ? { domain: filters.domain } : {}),
      ...(filters.from || filters.to
        ? {
            savedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    }

    const [clips, total] = await Promise.all([
      prisma.clip.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: { savedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.clip.count({ where }),
    ])

    return { clips, total }
  },

  async findById(clipId: string): Promise<ClipModel | null> {
    return prisma.clip.findFirst({
      where: { id: clipId, deletedAt: null },
      include: { tags: { include: { tag: true } } },
    })
  },

  async create(data: CreateClipData): Promise<ClipModel> {
    const { userId, url, domain, ...rest } = data
    return prisma.clip.create({
      data: { userId, url, domain, ...rest },
      include: { tags: { include: { tag: true } } },
    })
  },

  async update(clipId: string, data: UpdateClipData): Promise<ClipModel> {
    return prisma.clip.update({
      where: { id: clipId },
      data,
      include: { tags: { include: { tag: true } } },
    })
  },

  async delete(clipId: string): Promise<void> {
    await prisma.clip.update({
      where: { id: clipId },
      data: { deletedAt: new Date() },
    })
  },

  async updateMetadata(clipId: string, data: UpdateClipMetadataData): Promise<void> {
    await prisma.clip.update({
      where: { id: clipId },
      data,
    })
  },

  async setTags(userId: string, clipId: string, tagNames: string[]): Promise<ClipTagModel[]> {
    const normalized = tagNames.map((n) => n.toLowerCase().trim()).filter(Boolean)
    if (normalized.length === 0) return []

    return prisma.$transaction(async (tx) => {
      await tx.tag.createMany({
        data: normalized.map((name) => ({ userId, name })),
        skipDuplicates: true,
      })
      const tags = await tx.tag.findMany({
        where: { userId, name: { in: normalized } },
      })
      await tx.clipTag.createMany({
        data: tags.map((tag) => ({ clipId, tagId: tag.id })),
        skipDuplicates: true,
      })
      return tx.clipTag.findMany({
        where: { clipId, tagId: { in: tags.map((t) => t.id) } },
        include: { tag: true },
      })
    })
  },

  async addTag(userId: string, clipId: string, tagName: string): Promise<ClipTagModel> {
    const name = tagName.toLowerCase().trim()
    return prisma.$transaction(async (tx) => {
      const tag = await tx.tag.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name },
      })
      return tx.clipTag.upsert({
        where: { clipId_tagId: { clipId, tagId: tag.id } },
        update: {},
        create: { clipId, tagId: tag.id },
        include: { tag: true },
      })
    })
  },

  async removeTag(clipId: string, tagId: string): Promise<void> {
    await prisma.clipTag.delete({
      where: { clipId_tagId: { clipId, tagId } },
    })
  },
}
