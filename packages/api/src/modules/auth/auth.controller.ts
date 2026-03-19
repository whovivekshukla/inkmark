import { Request, Response } from 'express'
import { authService } from './auth.service'
import { tokensService } from './tokens.service'

export const authController = {
  // GET /api/v1/auth/google — redirect handled entirely by passport middleware in router

  // GET /api/v1/auth/google/callback
  // Passport has already verified OAuth and set req.user = { userId }
  async googleCallback(req: Request, res: Response): Promise<void> {
    const token = authService.generateJwt(req.user!.userId)
    const base = process.env.CLIENT_REDIRECT_URL ?? 'http://localhost:5173'
    res.redirect(`${base}?token=${token}`)
  },

  // GET /api/v1/auth/me — protected by requireAuth
  async getMe(req: Request, res: Response): Promise<void> {
    const user = await authService.getMe(req.user!.userId)
    res.status(200).json({ success: true, data: user })
  },

  // PATCH /api/v1/auth/me — update authenticated user's profile
  async updateMe(req: Request, res: Response): Promise<void> {
    const user = await authService.updateMe(req.user!.userId, req.body)
    res.status(200).json({ success: true, data: user })
  },

  // POST /api/v1/auth/logout — stateless; client is responsible for dropping the token
  logout(_req: Request, res: Response): void {
    res.status(204).send()
  },

  // POST /api/v1/auth/tokens — JWT only; creates a new PAT
  async createToken(req: Request, res: Response): Promise<void> {
    const token = await tokensService.createToken(req.user!.userId, req.body)
    res.status(201).json({ success: true, data: token })
  },

  // GET /api/v1/auth/tokens — JWT only; lists all PATs for the authenticated user
  async listTokens(req: Request, res: Response): Promise<void> {
    const tokens = await tokensService.listTokens(req.user!.userId)
    res.status(200).json({ success: true, data: tokens })
  },

  // DELETE /api/v1/auth/tokens/:id — JWT only; revokes a PAT
  async revokeToken(req: Request, res: Response): Promise<void> {
    await tokensService.revokeToken(req.user!.userId, req.params.id)
    res.status(204).send()
  },
}
