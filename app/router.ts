import {Router} from 'express';
import {passport} from './middlewares/passport';
import {getParkingSpots, postParkingSpot} from './controllers/parking-spot.controller';
import {asyncWrapper} from './middlewares/async-wrapper.middleware';

export function createRouter(): Router {
  const router = Router();

  router.get('/parking-spots', asyncWrapper(getParkingSpots));
  router.post('/parking-spots', asyncWrapper(postParkingSpot));

  return router;
}

export function createAuthRouter(): Router {
  const router = Router();

  router.get(
    '/google',
    passport.authenticate('google', {scope: ['profile', 'email']})
  );

  router.get(
    '/google/callback',
    // Authenticate with passport. Jump back to Google strategy where user is fetched/created.
    passport.authenticate('google', {failureRedirect: 'auth/', session: false}),
    function(req: any, res) {
      console.log('Authentication successful');
      req.session.token = req.user.token;
      res.redirect('/');
    });

  return router;
}
