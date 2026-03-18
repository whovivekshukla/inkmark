import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import { errorHandler } from '@/middleware/error'
import { logger } from '@/lib/logger'

const app = express()
const PORT = process.env.PORT ?? 3000

// Security + parsing middlewares
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Health check — intentionally outside /api/v1 so load balancers can reach it without auth
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

// API v1 router — empty for now, populated in later phases
const v1Router = express.Router()
app.use('/api/v1', v1Router)

// Global error handler must be mounted last
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV ?? 'development' })
})

export default app
