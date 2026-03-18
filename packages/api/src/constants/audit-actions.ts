export enum AuditAction {
  // Auth
  AUTH_LOGIN = 'auth.login',
  AUTH_REGISTER = 'auth.register',

  // Clips
  CLIP_CREATED = 'clip.created',
  CLIP_UPDATED = 'clip.updated',
  CLIP_DELETED = 'clip.deleted',

  // Highlights
  HIGHLIGHT_CREATED = 'highlight.created',
  HIGHLIGHT_UPDATED = 'highlight.updated',
  HIGHLIGHT_DELETED = 'highlight.deleted',

  // Follows
  FOLLOW_CREATED = 'follow.created',
  FOLLOW_DELETED = 'follow.deleted',

  // Tags
  TAG_CREATED = 'tag.created',
  TAG_DELETED = 'tag.deleted',
}
