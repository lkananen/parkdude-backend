import * as express from 'express';
import * as cors from 'cors';
import * as session from 'express-session';
import {passport} from './middlewares/passport';
import {createRouter, createAuthRouter} from './router';
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
  app.use(passport.initialize());

  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret === undefined || sessionSecret === 'CHANGE_THIS') {
    throw new Error('Failed to read SESSION_SECRET environment variable. Make sure it is set.');
  }

  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new TypeormStore({
      cleanupLimit: 2,
      limitSubquery: false, // If using MariaDB.
      ttl: 86400
    }).connect(repository),
  }));

  if (process.env.NODE_ENV === 'development') {
    app.use(cors());
  }

  app.use('/api', createRouter());
  app.use('/auth', createAuthRouter());

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
