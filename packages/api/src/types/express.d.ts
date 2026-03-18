// Augment Express.User so req.user is typed throughout the app.
// Passport sets this after OAuth; requireAuth middleware sets it from JWT.
declare global {
  namespace Express {
    interface User {
      userId: string
    }
  }
}

export {}
