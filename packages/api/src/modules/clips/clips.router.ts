import { Router } from 'express'
import { clipController } from './clips.controller'
import { highlightController } from '@/modules/highlights/highlights.controller'
import { requireAuth } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import {
  CreateClipSchema,
  UpdateClipSchema,
  GetClipsQuerySchema,
  GetDomainsQuerySchema,
  AddTagSchema,
  ClipIdParamSchema,
  TagIdParamSchema,
} from './clips.schema'

const router = Router()

router.post('/', requireAuth, validate(CreateClipSchema), clipController.create)
router.get('/', requireAuth, validate(GetClipsQuerySchema, 'query'), clipController.getAll)
router.get('/domains', requireAuth, validate(GetDomainsQuerySchema, 'query'), clipController.getDomains)
router.get('/:id', requireAuth, validate(ClipIdParamSchema, 'params'), clipController.getById)
router.patch('/:id', requireAuth, validate(ClipIdParamSchema, 'params'), validate(UpdateClipSchema), clipController.update)
router.delete('/:id', requireAuth, validate(ClipIdParamSchema, 'params'), clipController.delete)

router.post('/:id/tags', requireAuth, validate(ClipIdParamSchema, 'params'), validate(AddTagSchema), clipController.addTag)
router.delete('/:id/tags/:tagId', requireAuth, validate(TagIdParamSchema, 'params'), clipController.removeTag)

// Nested highlights — GET /clips/:id/highlights
router.get('/:id/highlights', requireAuth, validate(ClipIdParamSchema, 'params'), highlightController.getByClip)

export default router
