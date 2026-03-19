import { Router } from 'express'
import { searchController } from './search.controller'
import { requireAuth } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import { SearchQuerySchema } from './search.schema'

const router = Router()

router.get('/', requireAuth, validate(SearchQuerySchema, 'query'), searchController.search)

export default router
