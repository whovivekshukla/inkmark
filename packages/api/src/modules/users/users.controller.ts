import { Request, Response } from 'express'
import { usersService } from './users.service'

export const usersController = {
  async getProfile(req: Request, res: Response): Promise<void> {
    const user = await usersService.getPublicProfile(req.params.username)
    res.status(200).json({ success: true, data: user })
  },

  async getPublicClips(req: Request, res: Response): Promise<void> {
    const { clips, meta } = await usersService.getUserPublicClips(
      req.params.username,
      req.query as never,
    )
    res.status(200).json({ success: true, data: clips, meta })
  },

  async getPublicHighlights(req: Request, res: Response): Promise<void> {
    const { highlights, meta } = await usersService.getUserPublicHighlights(
      req.params.username,
      req.query as never,
    )
    res.status(200).json({ success: true, data: highlights, meta })
  },

  async searchUsers(req: Request, res: Response): Promise<void> {
    const users = await usersService.searchUsers(req.query.q as string)
    res.status(200).json({ success: true, data: users })
  },
}
