import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import '@/lib/passport' // registers the Google OAuth strategy
import { errorHandler } from '@/middleware/error'
import { logger } from '@/lib/logger'
import { authRouter } from '@/modules/auth'
import { clipsRouter } from '@/modules/clips'

const app = express()
const PORT = process.env.PORT ?? 3000

// Security + parsing middlewares
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Health check — outside /api/v1/ so load balancers can reach it without auth or versioning
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } })
})

// API v1 router
const v1Router = express.Router()
v1Router.use('/auth', authRouter)
v1Router.use('/clips', clipsRouter)
app.use('/api/v1', v1Router)

// Global error handler must be mounted last
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV ?? 'development' })
})

export default app
