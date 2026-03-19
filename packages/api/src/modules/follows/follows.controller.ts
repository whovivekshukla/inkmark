import { Request, Response } from 'express'
import { followService } from './follows.service'

export const followController = {
  async follow(req: Request, res: Response): Promise<void> {
    await followService.followUser(req.user!.userId, req.params.userId)
    res.status(201).json({ success: true, data: null })
  },

  async unfollow(req: Request, res: Response): Promise<void> {
    await followService.unfollowUser(req.user!.userId, req.params.userId)
    res.status(204).send()
  },

  async getFollowers(req: Request, res: Response): Promise<void> {
    const { users, meta } = await followService.getFollowers(req.params.userId, req.query as never)
    res.status(200).json({ success: true, data: users, meta })
  },

  async getFollowing(req: Request, res: Response): Promise<void> {
    const { users, meta } = await followService.getFollowing(req.params.userId, req.query as never)
    res.status(200).json({ success: true, data: users, meta })
  },
}
