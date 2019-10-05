import { Router } from "express";
import { getParkingSpots } from "./controllers/parking-spot.controller";
import { asyncWrapper } from "./middlewares/async-wrapper.middleware";

export function createRouter(): Router {
  const router = Router();

  router.get("/parking-spots", asyncWrapper(getParkingSpots));

  return router;
}
