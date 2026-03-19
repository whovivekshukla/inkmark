import { Router } from 'express'
import { usersController } from './users.controller'
import { requireAuth } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import { UsernameParamSchema, UserContentQuerySchema, UserSearchQuerySchema } from './users.schema'

const router = Router()

// /search must be before /:username to avoid Express matching "search" as a username
router.get('/search', requireAuth, validate(UserSearchQuerySchema, 'query'), usersController.searchUsers)

router.get('/:username', requireAuth, validate(UsernameParamSchema, 'params'), usersController.getProfile)
router.get('/:username/clips', requireAuth, validate(UsernameParamSchema, 'params'), validate(UserContentQuerySchema, 'query'), usersController.getPublicClips)
router.get('/:username/highlights', requireAuth, validate(UsernameParamSchema, 'params'), validate(UserContentQuerySchema, 'query'), usersController.getPublicHighlights)

export default router
