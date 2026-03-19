import { Request, Response } from 'express'
import { highlightService } from './highlights.service'

export const highlightController = {
  async create(req: Request, res: Response): Promise<void> {
    const highlight = await highlightService.createHighlight(req.user!.userId, req.body)
    res.status(201).json({ success: true, data: highlight })
  },

  async getByClip(req: Request, res: Response): Promise<void> {
    const highlights = await highlightService.getHighlightsByClip(req.user!.userId, req.params.id)
    res.status(200).json({ success: true, data: highlights })
  },

  async update(req: Request, res: Response): Promise<void> {
    const highlight = await highlightService.updateHighlight(req.user!.userId, req.params.id, req.body)
    res.status(200).json({ success: true, data: highlight })
  },

  async delete(req: Request, res: Response): Promise<void> {
    await highlightService.deleteHighlight(req.user!.userId, req.params.id)
    res.status(204).send()
  },
}
