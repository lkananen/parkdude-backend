import {Router} from 'express';
import {
  getParkingSpots, postParkingSpot,
  postUpdatedParkingSpot, deleteParkingspot,
  getParkingSpot
} from './controllers/parking-spot.controller';
import {asyncWrapper} from './middlewares/async-wrapper.middleware';
import {User} from './entities/user';
import {passport} from './middlewares/passport';
import {adminRoleRequired, loginRequired} from './middlewares/auth.middleware';
import {getUsers, getUser, postUpdatedUser, deleteUser} from './controllers/user.controller';

export function createRouter(): Router {
  const router = Router();

  router.use('/auth', createAuthRouter());

  // All routes after this require login
  router.use(loginRequired);

  router.get('/parking-spots', asyncWrapper(getParkingSpots));
  router.post('/parking-spots', adminRoleRequired, asyncWrapper(postParkingSpot));

  router.get('/parking-spots/:spotId', asyncWrapper(getParkingSpot));
  router.post('/parking-spots/:spotId', adminRoleRequired, asyncWrapper(postUpdatedParkingSpot));
  router.delete('/parking-spots/:spotId', adminRoleRequired, asyncWrapper(deleteParkingspot));

  router.get('/users', adminRoleRequired, asyncWrapper(getUsers));
  router.get('/users/:userId', adminRoleRequired, asyncWrapper(getUser));
  router.get('/users/:userId', adminRoleRequired, asyncWrapper(postUpdatedUser));
  router.delete('/users/:userId', adminRoleRequired, asyncWrapper(deleteUser));


  router.get('/reserve-test', loginRequired, (req, res) => (res.sendStatus(201)));

  return router;
}

function createAuthRouter(): Router {
  const router = Router();

  router.use((req, res, next) => {
    // Fixed redirect url should be configured for production
    if (process.env.NODE_ENV === 'development' && req.query.redirectUrl) {
      req.session!.redirectUrl = req.query.redirectUrl;
    }
    next();
  });


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
      failureRedirect: process.env.MOBILE_LOGIN_FAILURE_REDIRECT
    }), (req, res) => {
      if (req.session!.redirectUrl) {
        // Note: RedirectUrl param must be disabled or removed as this will otherwise cause serious security issues
        res.redirect(req.session!.redirectUrl + `?sessionId=${req.cookies.sessionId}`);
        req.session!.redirectUrl = undefined;
      } else {
        res.redirect(process.env.MOBILE_LOGIN_SUCCESS_REDIRECT! + `?sessionId=${req.cookies.sessionId}`);
      }
    }
  );

  // GET LOGOUT IS DEPRECATED
  router.get('/logout', (req, res) => {
    req.logout();
    res.json({
      message: 'Successfully logged out'
    });
  });

  router.post('/logout', (req, res) => {
    req.logout();
    res.json({
      message: 'Successfully logged out'
    });
  });

  router.get('/login-state', (req, res) => {
    const user = req.user as User;
    if (!user) {
      res.json({
        isAuthenticated: false
      });
      return;
    }
    res.json({
      isAuthenticated: true,
      userRole: user.role,
      name: user.name
    });
  });

  return router;
}
