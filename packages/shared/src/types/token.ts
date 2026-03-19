// List view — raw token never returned after creation
export interface PersonalAccessTokenModel {
  id: string
  name: string
  prefix: string       // e.g. "ink_a1b2c3d4" — helps user identify the token
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

// Returned once on creation — includes the raw token
export interface PersonalAccessTokenCreatedModel {
  id: string
  name: string
  prefix: string
  token: string        // full raw token — display once, prompt user to copy
  expiresAt: Date | null
  createdAt: Date
}
