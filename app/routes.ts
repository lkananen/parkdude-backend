import {Router} from 'express';
import {getParkingSpots, postParkingSpot} from './controllers/parking-spot.controller';
import {asyncWrapper} from './middlewares/async-wrapper.middleware';

export function createRouter(): Router {
  const router = Router();

  router.get('/parking-spots', asyncWrapper(getParkingSpots));
  router.post('/parking-spots', asyncWrapper(postParkingSpot));

  return router;
}
