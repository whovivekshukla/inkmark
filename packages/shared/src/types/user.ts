export interface UserModel {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  createdAt: Date
}

// Public profile — shown on profile pages (no email)
export interface UserProfileModel {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  createdAt: Date
}

// Minimal public user info for social contexts (follower lists, feed, etc.)
export interface UserSummaryModel {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}
