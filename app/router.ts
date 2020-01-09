import {Router} from 'express';
import {
  getParkingSpots, postParkingSpot,
  putUpdatedParkingSpot, deleteParkingspot,
  getParkingSpot
} from './controllers/parking-spot.controller';
import {asyncWrapper} from './middlewares/async-wrapper.middleware';
import {User} from './entities/user';
import {passport, passwordLogin} from './middlewares/passport';
import {adminRoleRequired, loginRequired} from './middlewares/auth.middleware';
import {
  getUsers, getUser, putUpdatedUser, deleteDeleteUser,
  postClearSessions, putUserPassword, postUser, putMyUserPassword
} from './controllers/user.controller';
import {
  getReservationsCalendar, postReservations,
  getMyReservations, deleteReservations, getUserReservations,
  getReservations
} from './controllers/parking-reservation.controller';

export function createRouter(): Router {
  const router = Router();

  router.use('/auth', createAuthRouter());
  router.post('/users', asyncWrapper(postUser));

  // All routes after this require login
  router.use(loginRequired);

  router.get('/parking-spots', asyncWrapper(getParkingSpots));
  router.post('/parking-spots', adminRoleRequired, asyncWrapper(postParkingSpot));

  router.get('/parking-spots/:spotId', asyncWrapper(getParkingSpot));
  router.put('/parking-spots/:spotId', adminRoleRequired, asyncWrapper(putUpdatedParkingSpot));
  router.delete('/parking-spots/:spotId', adminRoleRequired, asyncWrapper(deleteParkingspot));

  router.get('/users', adminRoleRequired, asyncWrapper(getUsers));
  router.put('/users/my-user/password', asyncWrapper(putMyUserPassword));
  router.put('/users/:userId/password', adminRoleRequired, asyncWrapper(putUserPassword));
  router.get('/users/:userId', adminRoleRequired, asyncWrapper(getUser));
  router.put('/users/:userId', adminRoleRequired, asyncWrapper(putUpdatedUser));
  router.delete('/users/:userId', adminRoleRequired, asyncWrapper(deleteDeleteUser));
  router.post('/users/:userId/clearSessions', adminRoleRequired, asyncWrapper(postClearSessions));
  router.get('/users/:userId/reservations', adminRoleRequired, asyncWrapper(getUserReservations));

  router.get('/parking-reservations', adminRoleRequired, asyncWrapper(getReservations));
  router.post('/parking-reservations', asyncWrapper(postReservations));
  router.get('/parking-reservations/calendar', asyncWrapper(getReservationsCalendar));
  router.get('/parking-reservations/parking-spot/:parkingSpotId/calendar', asyncWrapper(getReservationsCalendar));
  router.delete('/parking-reservations/parking-spot/:parkingSpotId', asyncWrapper(deleteReservations));
  router.get('/parking-reservations/my-reservations', asyncWrapper(getMyReservations));

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
    passport.authenticate('google-web', {
      scope: ['profile', 'email'],
      prompt: 'select_account'
    })
  );

  router.get(
    '/google/mobile',
    passport.authenticate('google-mobile', {
      scope: ['profile', 'email'],
      prompt: 'select_account'
    })
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
      const sessionId = encodeURIComponent(req.cookies.sessionId);
      if (req.session!.redirectUrl) {
        // Note: RedirectUrl param must be disabled or removed as this will otherwise cause serious security issues
        res.redirect(req.session!.redirectUrl + `?sessionId=${sessionId}`);
        req.session!.redirectUrl = undefined;
      } else {
        res.redirect(process.env.MOBILE_LOGIN_SUCCESS_REDIRECT! + `?sessionId=${sessionId}`);
      }
    }
  );

  router.post('/login', passwordLogin);

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
