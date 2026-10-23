import { Request, Response, NextFunction } from 'express';
import { UserSessionData } from '../services/auth.service';

declare module 'express-session' {
  interface SessionData {
    user?: UserSessionData;
    guestCart?: Array<{ productId: string; quantity: number }>;
  }
}

/**
 * Middleware that attaches currentUser to res.locals for templates
 */
export function populateUser(req: Request, res: Response, next: NextFunction) {
  const user = req.session?.user || (req.user as UserSessionData) || null;
  res.locals.currentUser = user;
  next();
}

/**
 * Middleware that protects routes requiring an authenticated user (T-074)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = req.session?.user || (req.user as UserSessionData) || null;

  if (!user) {
    const returnUrl = encodeURIComponent(req.originalUrl || '/account');
    return res.redirect(`/login?redirect=${returnUrl}`);
  }

  next();
}
