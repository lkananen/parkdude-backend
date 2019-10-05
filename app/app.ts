import * as express from "express";
import { createRouter } from "./routes";

export async function createApp() {
  const app = express();
  app.use("/api", createRouter());

  // 404 handler (none of the routes match)
  app.use(function(req, res, next) {
    res.status(404).json({
      message: "Content not found"
    });
  });
  return app;
}
