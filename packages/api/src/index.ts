import 'express-async-errors' // patches Express 4 to forward async errors to the error handler
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import '@/lib/passport' // registers the Google OAuth strategy
import { errorHandler } from '@/middleware/error'
import { globalRateLimiter } from '@/middleware/rate-limit'
import { logger } from '@/lib/logger'
import { authRouter } from '@/modules/auth'
import { clipsRouter } from '@/modules/clips'
import { highlightsRouter } from '@/modules/highlights'
import { followsRouter } from '@/modules/follows'
import { feedRouter } from '@/modules/feed'
import { usersRouter } from '@/modules/users'
import { searchRouter } from '@/modules/search'
import { tagsRouter } from '@/modules/tags'

const app = express()
const PORT = process.env.PORT ?? 3000

// Behind nginx (packages/nginx/proxy.conf sets X-Forwarded-For). Trust exactly one
// proxy hop so express-rate-limit keys on the real client IP, not the proxy's.
app.set('trust proxy', 1)

// Security + parsing middlewares
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Health check — outside /api/v1/ so load balancers can reach it without auth or versioning
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } })
})

// API v1 router — global rate limiter guards the whole surface as a baseline
const v1Router = express.Router()
v1Router.use(globalRateLimiter)
v1Router.use('/auth', authRouter)
v1Router.use('/clips', clipsRouter)
v1Router.use('/highlights', highlightsRouter)
v1Router.use('/follows', followsRouter)
v1Router.use('/feed', feedRouter)
v1Router.use('/users', usersRouter)
v1Router.use('/search', searchRouter)
v1Router.use('/tags', tagsRouter)
app.use('/api/v1', v1Router)

// Global error handler must be mounted last
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV ?? 'development' })
})

export default app
