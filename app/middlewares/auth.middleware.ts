import {Request, Response, NextFunction} from 'express';
import {UserRole, User} from '../entities/user';

/**
 * User must be logged in and they should have one of the verified roles
 */
export function loginRequired(req: Request, res: Response, next: NextFunction) {
  const user = req.user as User;
  if (user && [UserRole.VERIFIED, UserRole.ADMIN, UserRole.SLACK].includes(user.role)) {
    next();
  } else {
    const status = user ? 403 : 401;
    res.status(status).json({
      message: 'Verified account required.'
    });
  }
}

export function adminRoleRequired(req: Request, res: Response, next: NextFunction) {
  const user = req.user as User;
  if (user && user.role === UserRole.ADMIN) {
    next();
  } else {
    res.status(403).json({
      message: 'Unauthorized: You do not have permission for this action.'
    });
  }
}
