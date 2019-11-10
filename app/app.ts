import * as express from 'express';
import * as cors from 'cors';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import {passport} from './middlewares/passport';
import {createRouter } from './router';
import {StatusError} from './utils/errors';
import {Request, Response, NextFunction, Express} from 'express';
import {createConnection, getConnectionManager, getConnection} from 'typeorm';
import {ValidationError} from 'class-validator';
import {Session} from './entities/session';
import {TypeormStore} from 'connect-typeorm';

export async function createApp(): Promise<Express> {
  if (getConnectionManager().connections.length === 0) {
    await createConnection();
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
