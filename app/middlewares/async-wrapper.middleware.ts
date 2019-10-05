import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps async functions so that execution is properly forwarded back to Express (e.g. errors are caught)
 * @param fn Async function to wrap
 */
export const asyncWrapper = (fn: RequestHandler) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
