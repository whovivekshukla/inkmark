import { Router } from 'express'
import { feedController } from './feed.controller'
import { requireAuth } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import { FeedQuerySchema } from './feed.schema'

const router = Router()

router.get('/', requireAuth, validate(FeedQuerySchema, 'query'), feedController.getFeed)
router.get('/highlights', requireAuth, validate(FeedQuerySchema, 'query'), feedController.getFeedHighlights)

export default router
