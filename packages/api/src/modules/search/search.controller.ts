import { Request, Response } from 'express'
import { searchService } from './search.service'

export const searchController = {
  async search(req: Request, res: Response): Promise<void> {
    const result = await searchService.search(req.user!.userId, req.query as never)
    res.status(200).json({ success: true, ...result })
  },
}
