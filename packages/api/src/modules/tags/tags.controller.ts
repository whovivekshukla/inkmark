import { Request, Response } from 'express'
import { tagsService } from './tags.service'

export const tagsController = {
  async getAll(req: Request, res: Response): Promise<void> {
    const tags = await tagsService.getTags(req.user!.userId, req.query as never)
    res.status(200).json({ success: true, data: tags })
  },

  async create(req: Request, res: Response): Promise<void> {
    const tag = await tagsService.createTag(req.user!.userId, req.body.name)
    res.status(201).json({ success: true, data: tag })
  },

  async delete(req: Request, res: Response): Promise<void> {
    await tagsService.deleteTag(req.user!.userId, req.params.id)
    res.status(204).send()
  },
}
