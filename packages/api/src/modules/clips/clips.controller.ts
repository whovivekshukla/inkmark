import { Request, Response } from 'express'
import { clipService } from './clips.service'

export const clipController = {
  async create(req: Request, res: Response): Promise<void> {
    const clip = await clipService.createClip(req.user!.userId, req.body)
    res.status(201).json({ success: true, data: clip })
  },

  async getAll(req: Request, res: Response): Promise<void> {
    const { clips, meta } = await clipService.getClips(req.user!.userId, req.query as never)
    res.status(200).json({ success: true, data: clips, meta })
  },

  async getById(req: Request, res: Response): Promise<void> {
    const clip = await clipService.getClipById(req.user!.userId, req.params.id)
    res.status(200).json({ success: true, data: clip })
  },

  async update(req: Request, res: Response): Promise<void> {
    const clip = await clipService.updateClip(req.user!.userId, req.params.id, req.body)
    res.status(200).json({ success: true, data: clip })
  },

  async delete(req: Request, res: Response): Promise<void> {
    await clipService.deleteClip(req.user!.userId, req.params.id)
    res.status(204).send()
  },

  async addTag(req: Request, res: Response): Promise<void> {
    const tag = await clipService.addTagToClip(req.user!.userId, req.params.id, req.body.name)
    res.status(201).json({ success: true, data: tag })
  },

  async removeTag(req: Request, res: Response): Promise<void> {
    await clipService.removeTagFromClip(req.user!.userId, req.params.id, req.params.tagId)
    res.status(204).send()
  },
}
