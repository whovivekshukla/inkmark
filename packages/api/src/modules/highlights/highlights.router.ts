import { Router } from 'express'
import { highlightController } from './highlights.controller'
import { requireAuth } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import { CreateHighlightSchema, UpdateHighlightSchema, HighlightIdParamSchema } from './highlights.schema'

const router = Router()

router.post('/', requireAuth, validate(CreateHighlightSchema), highlightController.create)
router.patch('/:id', requireAuth, validate(HighlightIdParamSchema, 'params'), validate(UpdateHighlightSchema), highlightController.update)
router.delete('/:id', requireAuth, validate(HighlightIdParamSchema, 'params'), highlightController.delete)

export default router
