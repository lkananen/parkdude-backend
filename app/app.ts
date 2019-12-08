import * as express from 'express';
import * as cors from 'cors';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import {passport} from './middlewares/passport';
import {createRouter} from './router';
import {StatusError} from './utils/errors';
import {Request, Response, NextFunction, Express} from 'express';
import {createConnection, getConnectionManager, getConnection} from 'typeorm';
import {EntityNotFoundError} from 'typeorm/error/EntityNotFoundError';
import {ValidationError} from 'class-validator';
import {Session} from './entities/session';
import {TypeormStore} from 'connect-typeorm';
import {DayRelease} from './entities/day-release';
import {DayReservation} from './entities/day-reservation';
import {ParkingSpot} from './entities/parking-spot';
import {User} from './entities/user';
import {ParkingSpot1570894017831} from './migrations/1570894017831-ParkingSpot';
import {ParkingSpot1570897770911} from './migrations/1570897770911-ParkingSpot';
import {Session1571167364513} from './migrations/1571167364513-Session';
import {User1571321641906} from './migrations/1571321641906-User';
import {User1571777191899} from './migrations/1571777191899-User';
import {ReservationEntities1572691615415} from './migrations/1572691615415-ReservationEntities';
import {RemoveDayReleaseUser1573387029106} from './migrations/1573387029106-RemoveDayReleaseUser';
import {AddSpotId1573390075029} from './migrations/1573390075029-AddSpotId';

export async function createApp(): Promise<Express> {
  if (getConnectionManager().connections.length === 0) {
    await createConnection({
      type: 'postgres',
      host: process.env.TYPEORM_HOST,
      username: process.env.TYPEORM_USERNAME,
      password: process.env.TYPEORM_PASSWORD,
      database: process.env.TYPEORM_DATABASE,
      port: process.env.TYPEORM_PORT ? +process.env.TYPEORM_PORT : 5432,
      migrationsRun: process.env.TYPEORM_MIGRATIONS_RUN == 'true',
      synchronize: process.env.TYPEORM_SYNCHRONIZE == 'true',
      logging: process.env.TYPEORM_LOGGING == 'true',
      entities: [DayRelease, DayReservation, ParkingSpot, Session, User],
      migrations: [
        ParkingSpot1570894017831, ParkingSpot1570897770911, Session1571167364513,
        User1571321641906, User1571777191899, ReservationEntities1572691615415,
        RemoveDayReleaseUser1573387029106, AddSpotId1573390075029]
    });
  }

  const app = express();

  const repository = getConnection().getRepository(Session);

  app.use(express.json());
  app.use(cookieParser());

  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret === undefined || sessionSecret === 'CHANGE_THIS') {
    throw new Error('Failed to read SESSION_SECRET environment variable. Make sure it is set and changed.');
  }

  app.use(session({
    secret: sessionSecret,
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    store: new TypeormStore({
      cleanupLimit: 2,
      limitSubquery: true,
      ttl: 86400
    }).connect(repository),
  }));

  // Initialize passport and connect it to sessions so that it can add user property etc. to requests
  app.use(passport.initialize());
  app.use(passport.session());

  if (process.env.NODE_ENV === 'development') {
    app.use(cors({
      origin: true,
      credentials: true
    }));
  }

  app.use('/api', createRouter());

  // 404 handler (none of the routes match)
  app.use(function(req, res, next) {
    res.status(404).json({
      message: 'Content not found'
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
      res.status(error.statusCode).json({message: error.message});
      return;
    }

    if (error instanceof EntityNotFoundError) {
      res.status(404).json({message: 'Entity not found.'});
      return;
    }

    if (Array.isArray(error) && error[0] instanceof ValidationError) {
      // Error comes from class-validator
      const errorMessages = flatten(
        error.map((validationError: ValidationError) => Object.values(validationError.constraints))
      );
      res.status(400).json({
        message: 'Validation failed:\n' + errorMessages.join('\n'),
        errorMessages
      });
      return;
    }
    res.status(500).json({message: 'Internal server error'});
  });

  return app;
}

function flatten<T>(arrays: T[][]): T[] {
  return ([] as T[]).concat(...arrays);
}
