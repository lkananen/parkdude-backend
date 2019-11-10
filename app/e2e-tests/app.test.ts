/* eslint-disable require-atomic-updates */
import * as request from 'supertest';
import {Express, Router} from 'express';

jest.mock('../router');
import * as routes from '../router';
const {createRouter } = jest.requireActual('../router');

import {BadRequestError} from '../utils/errors';
import {asyncWrapper} from '../middlewares/async-wrapper.middleware';
import {closeConnection} from '../test-utils/teardown';
import {createAppWithAdminSession} from '../test-utils/test-login';

const createRouterMock = routes.createRouter as jest.Mock<typeof createRouter>;

describe('App (e2e)', () => {
  let agent: request.SuperTest<request.Test>;
  let router: Router;

  beforeEach(async () => {
    // createRouter "mocked" to return specific instance of the router so that
    // it can be referenced in tests
    router = createRouter();
    createRouterMock.mockReturnValue(router);
    agent = await createAppWithAdminSession();
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('Error handling', () => {
    describe('404', () => {
      test('Should return 404 for non-existent path', async () => {
        await agent
          .get('/api/non-existing-path')
          .expect(404)
          .expect({message: 'Content not found'});
      });

      test('Should return 404 for existing path which does not support method', async () => {
        await agent
          .patch('/api/parking-spots')
          .expect(404)
          .expect({message: 'Content not found'});
      });
    });

    describe('Thrown errors', () => {
      test('Should handle BadRequestExceptions with 400', async () => {
        // Add a path that throws an exception
        const message = 'Invalid input (test error)';
        router.get(
          '/test-path',
          asyncWrapper(async (req, res) => {
            throw new BadRequestError(message);
          })
        );
        // Temporarily disable logger to make test output more readable
        const errorLogger = console.error;
        console.error = () => {};
        await agent
          .get('/api/test-path')
          .expect(400, {message});
        console.error = errorLogger;
      });

      test('Should handle Errors with 500 and unspecific message to prevent information leaks', async () => {
        const message = 'Test error message that should not be shown to user';
        router.get(
          '/test-path',
          asyncWrapper(async (req, res) => {
            throw new Error(message);
          })
        );
        // Temporarily disable logger to make test output more readable
        const errorLogger = console.error;
        console.error = () => {};
        await agent
          .get('/api/test-path')
          .expect(500, {message: 'Internal server error'});
        console.error = errorLogger;
      });
    });
  });
});
