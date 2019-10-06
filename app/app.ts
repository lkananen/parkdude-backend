import * as express from "express";
import { createRouter } from "./routes";
import { StatusError } from "./utils/errors";
import { Request, Response, NextFunction, Express } from "express";

export async function createApp(): Promise<Express> {
  const app = express();
  app.use("/api", createRouter());

  // 404 handler (none of the routes match)
  app.use(function(req, res, next) {
    res.status(404).json({
      message: "Content not found"
    });
  });

  // Error handler
  app.use(function(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    console.error(error);
    if (error instanceof StatusError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
