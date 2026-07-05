import { Router } from 'express'
import { highlightController } from './highlights.controller'
import { requireAuth } from '@/middleware/auth'
import { strictRateLimiter } from '@/middleware/rate-limit'
import { validate } from '@/middleware/validate'
import { CreateHighlightSchema, UpdateHighlightSchema, HighlightIdParamSchema, HighlightsByUrlQuerySchema } from './highlights.schema'

const router = Router()

// GET /highlights/by-url?url=<encoded> — all highlights for a URL (own + public clips), includes user info
router.get('/by-url', requireAuth, validate(HighlightsByUrlQuerySchema, 'query'), highlightController.getByUrl)

router.post('/', strictRateLimiter, requireAuth, validate(CreateHighlightSchema), highlightController.create)
router.patch('/:id', requireAuth, validate(HighlightIdParamSchema, 'params'), validate(UpdateHighlightSchema), highlightController.update)
router.delete('/:id', requireAuth, validate(HighlightIdParamSchema, 'params'), highlightController.delete)

export default router
