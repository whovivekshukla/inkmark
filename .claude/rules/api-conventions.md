# API Conventions

## Routing
- All routes under `/api/v1/`
- Resource names: plural nouns, kebab-case (`/clips`, `/clip-tags`)
- Nested only one level deep: `/clips/:id/highlights` ✓, `/clips/:id/highlights/:id/notes` ✗

## HTTP methods + status codes
| Operation | Method | Success code |
|---|---|---|
| Create | POST | 201 |
| Read (list) | GET | 200 |
| Read (single) | GET | 200 |
| Update (partial) | PATCH | 200 |
| Delete (soft) | DELETE | 204 |
| Auth actions | POST | 200 |

Error codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 500 internal.

## Response envelope
Every endpoint returns `ApiResponse<T>` from `packages/shared/src/types/api.ts`:
```typescript
// success
{ data: T, meta?: PaginationMeta }

// error
{ error: { code: string, message: string } }
```
Never return raw data outside this envelope.

## Pagination
All list endpoints accept `?page=1&limit=20`. Max limit: 100.
Always return `meta: { page, limit, total, hasMore }`.
Use constants from `packages/api/src/constants/pagination.ts`.

## Validation
- Zod schemas live in `*.schema.ts` inside each module
- Use `validate(schema)` middleware — never validate manually in controllers
- Validate `req.body`, `req.query`, and `req.params` separately
- Coerce query string types explicitly (`z.coerce.number()`)

## Auth
- Protected routes use `requireAuth` middleware from `src/middleware/auth.ts`
- `requireAuth` attaches `{ userId: string }` to `req.user`
- Never trust userId from req.body — always use `req.user.userId`

## Swagger
Every endpoint must have OpenAPI annotations:
- Summary, description
- Request body / query params schema
- Response examples (success + error cases)
- Auth requirement noted

## Controller shape
```typescript
// ✓ correct — thin controller
async createClip(req: Request, res: Response) {
  const dto = req.body as CreateClipDTO  // already validated by middleware
  const clip = await clipService.createClip(req.user.userId, dto)
  res.status(201).json({ data: clip })
}

// ✗ wrong — business logic in controller
async createClip(req: Request, res: Response) {
  const existing = await prisma.clip.findFirst(...)  // no Prisma in controllers
  if (existing) { ... }
}
```