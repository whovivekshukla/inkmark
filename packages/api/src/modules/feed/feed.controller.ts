import { Request, Response } from 'express'
import { feedService } from './feed.service'

export const feedController = {
  async getFeed(req: Request, res: Response): Promise<void> {
    const { clips, meta } = await feedService.getFeed(req.user!.userId, req.query as never)
    res.status(200).json({ success: true, data: clips, meta })
  },

  async getFeedHighlights(req: Request, res: Response): Promise<void> {
    const { highlights, meta } = await feedService.getFeedHighlights(
      req.user!.userId,
      req.query as never,
    )
    res.status(200).json({ success: true, data: highlights, meta })
  },
}
