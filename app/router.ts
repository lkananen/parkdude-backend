import {Router} from 'express';
import {passport} from './middlewares/passport';
import {getParkingSpots, postParkingSpot} from './controllers/parking-spot.controller';
import {asyncWrapper} from './middlewares/async-wrapper.middleware';

export function createRouter(): Router {
  const router = Router();

  router.get('/parking-spots', asyncWrapper(getParkingSpots));
  router.post('/parking-spots', asyncWrapper(postParkingSpot));

  router.use('/auth', createAuthRouter());

  // test route -- to be removed
  router.get('/test', (req, res) => {
    if (req.isAuthenticated()) {
      res.send(req.user);
    } else {
      res.send('You need to login first');
    }
  });

  return router;
}

function createAuthRouter(): Router {
  const router = Router();

  router.get(
    '/google/web',
    passport.authenticate('google-web', {scope: ['profile', 'email']})
  );

  router.get(
    '/google/mobile',
    passport.authenticate('google-mobile', {scope: ['profile', 'email']})
  );

  router.get(
    '/google/callback',
    // Authenticate with passport. Jump back to Google strategy where user is fetched/created.
    passport.authenticate('google-web', {
      successRedirect: process.env.WEB_LOGIN_SUCCESS_REDIRECT,
      failureRedirect: process.env.WEB_LOGIN_FAILURE_REDIRECT
    })
  );

  router.get(
    '/google/callback/mobile',
    // Authenticate with passport. Jump back to Google strategy where user is fetched/created.
    passport.authenticate('google-mobile', {
      successRedirect: process.env.MOBILE_LOGIN_SUCCESS_REDIRECT,
      failureRedirect: process.env.MOBILE_LOGIN_FAILURE_REDIRECT
    })
  );

  router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  return router;
}
