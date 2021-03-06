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
import {BadRequestError} from './utils/errors';
import {
  getUsers, getUser, putUpdatedUser, deleteDeleteUser,
  postClearSessions, putUserPassword, postUser, putMyUserPassword, getInitialiseAdmin
} from './controllers/user.controller';
import {
  getReservationsCalendar, postReservations,
  getMyReservations, deleteReservations, getUserReservations,
  getReservations, getReservationsForSpot
} from './controllers/parking-reservation.controller';

export function createRouter(): Router {
  const router = Router();

  router.use('/auth', createAuthRouter());
  router.get('/auth/initialise-admin', asyncWrapper(getInitialiseAdmin));
  router.post('/users', asyncWrapper(postUser));

  // All routes after this require login
  router.use(loginRequired);

  router.get('/parking-spots', asyncWrapper(getParkingSpots));
  router.post('/parking-spots', adminRoleRequired, asyncWrapper(postParkingSpot));

  router.get('/parking-spots/:spotId', asyncWrapper(getParkingSpot));
  router.put('/parking-spots/:spotId', adminRoleRequired, asyncWrapper(putUpdatedParkingSpot));
  router.delete('/parking-spots/:spotId', adminRoleRequired, asyncWrapper(deleteParkingspot));
  router.get('/parking-spots/:spotId/reservations', adminRoleRequired, asyncWrapper(getReservationsForSpot));

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
    if (req.query.redirectUrl) {
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
    '/google/callback', function(req, res, next) {
      // Authenticate with passport. Jump back to Google strategy where user is fetched/created.
      passport.authenticate('google-web',
        function(err, user, info) {
          const host = process.env.FRONTEND_HOST;
          if (err) {
            res.redirect(
              host + process.env.WEB_LOGIN_FAILURE_REDIRECT_PATH!! +
              `?error=${encodeURIComponent(err.message)}`
            );
            return;
          }
          req.logIn(user, function(err) {
            if (err) {
              next(err);
              return;
            }
            res.redirect(host + process.env.WEB_LOGIN_SUCCESS_REDIRECT_PATH!!);
          });
        }
      )(req, res, next);
    }
  );

  router.get(
    '/google/callback/mobile', function(req, res, next) {
      // Authenticate with passport. Jump back to Google strategy where user is fetched/created.
      passport.authenticate('google-mobile', function(err, user, info) {
        const redirectUrl = req.session?.redirectUrl;
        if (!redirectUrl) {
          next(new BadRequestError('Redirect url required.'));
          return;
        }
        if (!(req.session!.redirectUrl.startsWith('parkdude://') ||
          (process.env.NODE_ENV === 'development' && req.session!.redirectUrl.startsWith('exp://')))) {
          next(new BadRequestError(`Invalid, potentially unsafe redirectUrl (${redirectUrl}) supplied.`));
          return;
        }
        if (err) {
          res.redirect(redirectUrl + `?error=${encodeURIComponent(err.message)}`);
          return;
        }

        req.logIn(user, function(err) {
          if (err) {
            next(err);
            return;
          }
          const sessionId = encodeURIComponent(req.cookies.sessionId);
          req.session!.cookie.maxAge = 1000 * 60 * 60 * 24 * 90; // 90 days
          const maxAge = req.session!.cookie.maxAge;
          req.session!.redirectUrl = undefined;
          res.redirect(redirectUrl + `?sessionId=${sessionId}&maxAge=${maxAge}`);
        });
      })(req, res, next);
    });

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
      name: user.name,
      email: user.email
    });
  });

  return router;
}
