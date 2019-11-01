import * as request from 'supertest';
import * as superagent from 'superagent';
// jest.mock('passport');
import {Express} from 'express';
import {createApp} from '../app';
import {closeConnection} from '../test-utils/teardown';
import {User, UserRole} from '../entities/user';
// import {PassportStatic} from 'passport';

// Replace the passport setup we have by the mock setup
const passportMock = require('./mocks/passport-mock');
const StrategyMock = require('./mocks/strategy-mock');

/*
describe('Users (e2e)', () => {
  let app: Express;
  let passport: PassportStatic;
  // const agent = superagent.agent();

  beforeEach(async () => {
    app = await createApp();
    passport = passportMock;
  });

  afterEach(async () => {
    await User.clear();
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('GET /api/test', () => {
    test('Should check logged out', async () => {
      await request(app)
        .get('/api/auth/login-state')
        .expect({isAuthenticated: false});
    });
  });
});*/

// Auxiliary function.
/*
function createLoginCookie(done) {
  request(app)
      .get('/api/auth/google/web');
      .end(function(error, response) {
      if (error) {
        throw error;
      }
      const loginCookie = response.headers['set-cookie'];
      done(loginCookie);
    });
}*/


function createSession(agent: any) {
  return agent
    .get('/api/auth/login-state')
    .expect(200)
    .then((res: any) => {
      const cookie = res
        .headers['set-cookie'][0]
        .split(',')
        .map((item: any) => item.split(';')[0]);

      agent.jar.setCookies(cookie);
    });
}

describe('Users logged in (e2e)', () => {
  let app: Express;
  let cookie: any;

  beforeEach(async () => {
    app = await createApp();
    const res: any = await request(app)
      .get('/api/auth/google/web');

    if (res.headers['set-cookie'] !== undefined) {
      cookie = res.headers['set-cookie'][0].split(',').map((item: any) => item.split(';')[0]);
      // await agent.jar.setCookies(cookie);
    }
  });

  afterEach(async () => {
    await User.clear();
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('GET /api/test', () => {
    test('Should check logged in', async () => {
      if (cookie !== undefined) {
        await request(app)
          .get('/api/auth/login-state')
          .set('Cookie', cookie)
          .expect({
            isAuthenticated: true,
            userRole: UserRole.VERIFIED,
            name: 'Tester'
          });
      } else {
        throw new Error('No cookie');
      }
    });
  });
});
