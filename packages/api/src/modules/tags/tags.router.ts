import { Router } from 'express'
import { tagsController } from './tags.controller'
import { requireAuth } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import { CreateTagSchema, TagIdParamSchema } from './tags.schema'

const router = Router()

router.get('/', requireAuth, tagsController.getAll)
router.post('/', requireAuth, validate(CreateTagSchema), tagsController.create)
router.delete('/:id', requireAuth, validate(TagIdParamSchema, 'params'), tagsController.delete)

export default router
