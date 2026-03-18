export interface CreateUserData {
  googleId: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface UpdateUserData {
  displayName: string
  avatarUrl: string | null
}

export interface JwtPayload {
  userId: string
}
