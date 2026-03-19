import { Router } from 'express'
import { followController } from './follows.controller'
import { requireAuth } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import { UserIdParamSchema, FollowsQuerySchema } from './follows.schema'

const router = Router()

router.post('/:userId', requireAuth, validate(UserIdParamSchema, 'params'), followController.follow)
router.delete('/:userId', requireAuth, validate(UserIdParamSchema, 'params'), followController.unfollow)
router.get('/:userId/followers', requireAuth, validate(UserIdParamSchema, 'params'), validate(FollowsQuerySchema, 'query'), followController.getFollowers)
router.get('/:userId/following', requireAuth, validate(UserIdParamSchema, 'params'), validate(FollowsQuerySchema, 'query'), followController.getFollowing)

export default router
