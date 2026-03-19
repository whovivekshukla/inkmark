import { Router } from 'express'
import { clipController } from './clips.controller'
import { requireAuth } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import {
  CreateClipSchema,
  UpdateClipSchema,
  GetClipsQuerySchema,
  AddTagSchema,
  ClipIdParamSchema,
  TagIdParamSchema,
} from './clips.schema'

const router = Router()

router.post('/', requireAuth, validate(CreateClipSchema), clipController.create)
router.get('/', requireAuth, validate(GetClipsQuerySchema, 'query'), clipController.getAll)
router.get('/:id', requireAuth, validate(ClipIdParamSchema, 'params'), clipController.getById)
router.patch('/:id', requireAuth, validate(ClipIdParamSchema, 'params'), validate(UpdateClipSchema), clipController.update)
router.delete('/:id', requireAuth, validate(ClipIdParamSchema, 'params'), clipController.delete)

router.post('/:id/tags', requireAuth, validate(ClipIdParamSchema, 'params'), validate(AddTagSchema), clipController.addTag)
router.delete('/:id/tags/:tagId', requireAuth, validate(TagIdParamSchema, 'params'), clipController.removeTag)

export default router
