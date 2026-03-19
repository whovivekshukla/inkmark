export interface CreateUserData {
  googleId: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface UpdateUserData {
  username?: string
  displayName?: string
  bio?: string
}

export interface JwtPayload {
  userId: string
}
