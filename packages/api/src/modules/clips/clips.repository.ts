import { ClipModel, ClipTagModel } from '@inkmark/shared'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'
import { CreateClipData, UpdateClipData, UpdateClipMetadataData, GetClipsFilters } from './clips.types'

function orderByForLibrary(sort: 'recent' | 'oldest' | 'most_highlights' | undefined): Prisma.ClipOrderByWithRelationInput[] {
  const s = sort ?? 'recent'
  if (s === 'oldest') return [{ savedAt: 'asc' }]
  if (s === 'most_highlights') return [{ highlights: { _count: 'desc' } }, { savedAt: 'desc' }]
  return [{ savedAt: 'desc' }]
}

function containsInsensitive(q: string) {
  return { contains: q, mode: 'insensitive' as const }
}

export const clipRepository = {
  async getAll(
    userId: string,
    filters: GetClipsFilters,
  ): Promise<{ clips: ClipModel[]; total: number }> {
    try {
      const q = filters.q?.trim() ?? ''
      const sort = filters.sort ?? 'recent'
      const text = q ? containsInsensitive(q) : undefined
      const where: Prisma.ClipWhereInput = {
        userId,
        deletedAt: null,
        ...(filters.url ? { url: filters.url } : {}),
        ...(filters.tag
          ? { tags: { some: { tag: { userId, name: filters.tag.toLowerCase() } } } }
          : {}),
        ...(filters.domain ? { domain: filters.domain } : {}),
        ...(filters.highlighted ? { highlights: { some: { deletedAt: null } } } : {}),
        ...(filters.from || filters.to
          ? {
              savedAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
        ...(text
          ? {
              OR: [
                { title: text },
                { description: text },
                { url: text },
                { domain: text },
                { tags: { some: { tag: { userId, name: text } } } },
                { highlights: { some: { userId, deletedAt: null, text } } },
              ],
            }
          : {}),
      }

      const orderBy = orderByForLibrary(sort)

      const [clips, total] = await Promise.all([
        prisma.clip.findMany({
          where,
          include: { tags: { include: { tag: true } } },
          orderBy,
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        prisma.clip.count({ where }),
      ])

      return { clips, total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async findById(clipId: string): Promise<ClipModel | null> {
    try {
      return await prisma.clip.findFirst({
        where: { id: clipId, deletedAt: null },
        include: { tags: { include: { tag: true } } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async findByUserIdAndUrl(userId: string, url: string): Promise<ClipModel | null> {
    try {
      return await prisma.clip.findFirst({
        where: { userId, url, deletedAt: null },
        include: { tags: { include: { tag: true } } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async create(data: CreateClipData): Promise<ClipModel> {
    try {
      const { userId, url, domain, ...rest } = data
      return await prisma.clip.create({
        data: { userId, url, domain, ...rest },
        include: { tags: { include: { tag: true } } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async update(clipId: string, data: UpdateClipData): Promise<ClipModel> {
    try {
      return await prisma.clip.update({
        where: { id: clipId },
        data,
        include: { tags: { include: { tag: true } } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async delete(clipId: string): Promise<void> {
    try {
      await prisma.clip.update({
        where: { id: clipId },
        data: { deletedAt: new Date() },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async updateMetadata(clipId: string, data: UpdateClipMetadataData): Promise<void> {
    try {
      await prisma.clip.update({
        where: { id: clipId },
        data,
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async setTags(userId: string, clipId: string, tagNames: string[]): Promise<ClipTagModel[]> {
    try {
      const normalized = tagNames.map((n) => n.toLowerCase().trim()).filter(Boolean)
      if (normalized.length === 0) return []

      return await prisma.$transaction(async (tx) => {
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
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async addTag(userId: string, clipId: string, tagName: string): Promise<ClipTagModel> {
    try {
      const name = tagName.toLowerCase().trim()
      return await prisma.$transaction(async (tx) => {
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
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async removeTag(clipId: string, tagId: string): Promise<void> {
    try {
      await prisma.clipTag.delete({
        where: { clipId_tagId: { clipId, tagId } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
