import * as express from 'express';
import {createRouter} from './router';
import {StatusError} from './utils/errors';
import {Request, Response, NextFunction, Express} from 'express';
import {ValidationError} from 'class-validator';

export async function createApp(): Promise<Express> {
  await createConnection();

  const app = express();
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
