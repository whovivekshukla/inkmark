# Database & Prisma Rules

## Schema location
`packages/api/prisma/schema.prisma` — only package that owns DB schema and runs migrations.
MCP server has no direct DB access — it calls the REST API only.

## Prisma client
Use singleton from `packages/api/src/lib/prisma.ts`. Never instantiate `PrismaClient` directly elsewhere.

## Column selection
Never implicit `select *`. Always specify fields:
```typescript
// ✓
prisma.clip.findMany({
  select: { id: true, url: true, title: true, savedAt: true }
})

// ✗
prisma.clip.findMany()
```

## N+1 prevention
Never call DB inside a loop. Use `include`, `Promise.all`, or batch queries:
```typescript
// ✓ single query with include
prisma.clip.findMany({
  where: { userId },
  include: { highlights: { where: { deletedAt: null } }, tags: true }
})

// ✗ N+1
const clips = await prisma.clip.findMany(...)
for (const clip of clips) {
  clip.highlights = await prisma.highlight.findMany(...)
}
```

## Transactions
Use `prisma.$transaction()` for any multi-step mutation that must be atomic:
```typescript
// e.g. create clip + create tags + write audit log = one transaction
await prisma.$transaction([
  prisma.clip.create(...),
  prisma.clipTag.createMany(...),
  prisma.auditLog.create(...),
])
```

## Soft deletes
`User`, `Clip`, `Highlight` have `deletedAt DateTime?`.
- Soft delete: `update({ data: { deletedAt: new Date() } })`
- All queries must filter `where: { deletedAt: null }` unless explicitly fetching deleted records
- Never hard delete these models

## AuditLog
Write an `AuditLog` row on every data mutation. Format:
```typescript
prisma.auditLog.create({
  data: {
    userId,                          // null for system actions
    action: 'clip.created',          // format: entity.verb
    entity: 'clips',                 // table name
    entityId: clip.id,
    metadata: { url: clip.url },     // relevant diff or context
  }
})
```
AuditLog rows are immutable — never update or delete them.

## Indexes
- Index all foreign keys and frequently filtered columns
- Use composite indexes for multi-column filters
- Use partial indexes for filtered queries (e.g. `WHERE deleted_at IS NULL`)
- After adding a complex query, note that `EXPLAIN ANALYZE` should be run in staging

## Raw queries
Avoid `prisma.$queryRaw` unless Prisma ORM cannot express the query (e.g. full-text search with `tsvector`).
When used, add a comment explaining why raw SQL is necessary:
```typescript
// Raw query required: Prisma does not support tsvector @@ plainto_tsquery operator
const results = await prisma.$queryRaw`...`
```

## Migrations
- Run `prisma migrate dev --name <descriptive-name>` for schema changes
- Custom SQL (triggers, partial indexes, functions) go in separate migration files
- Add a comment in `schema.prisma` for any column managed outside Prisma (e.g. `searchVector`)