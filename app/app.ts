import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import {passport} from './middlewares/passport';
import {createRouter} from './router';
import {StatusError} from './utils/errors';
import {Request, Response, NextFunction, Express} from 'express';
import {createConnection, getConnectionManager, getConnection} from 'typeorm';
import {EntityNotFoundError} from 'typeorm/error/EntityNotFoundError';
import {ValidationError} from 'class-validator';
import {TypeormStore} from 'connect-typeorm';
import {Session} from './entities/session';
import {entities} from './entities';
import {migrations} from './migrations/index';

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
      entities,
      migrations
    });
  }

  const app = express();

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  const repository = getConnection().getRepository(Session);

  app.use(express.json());
  app.use(cookieParser());

  validateEnvironmentVariables();

  const isLocalhost = process.env.HOST?.startsWith('http://localhost');

  app.use(session({
    secret: process.env.SESSION_SECRET!!,
    name: 'sessionId',
    resave: false,
    rolling: true, // refresh cookie and store ttl on use
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60,
      // Api gateway and frontend are on different domains
      // Can likely be changed to true if they are moved behind same domain
      // Set to none to prevent things from breaking in future
      // (https://www.chromium.org/updates/same-site)
      sameSite: isLocalhost ? false : 'none',
      secure: isLocalhost ? false : true
    },
    store: new TypeormStore({
      cleanupLimit: 2,
      limitSubquery: true,
      ttl: (store, sess, sessionID) => sess.cookie.originalMaxAge / 1000 // default 1 hour in seconds
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
  } else {
    // Production configuration
    app.use(cors({
      origin: process.env.FRONTEND_HOST,
      credentials: true,
      optionsSuccessStatus: 200
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

function validateEnvironmentVariables() {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret === 'CHANGE_THIS') {
    throw new Error('Failed to read SESSION_SECRET environment variable. Make sure it is set and changed.');
  }
  if (!process.env.COMPANY_EMAIL) {
    throw new Error('Failed to read COMPANY_EMAIL environment variable. Make sure it is set.');
  }
  if (!process.env.FRONTEND_HOST) {
    throw new Error('Failed to read FRONTEND_HOST environment variable. Make sure it is set.');
  }
  if (!process.env.HOST) {
    throw new Error('Failed to read HOST environment variable. Make sure it is set.');
  }
}

function flatten<T>(arrays: T[][]): T[] {
  return ([] as T[]).concat(...arrays);
}
