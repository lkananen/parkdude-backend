import * as request from 'supertest';
import * as superagent from 'superagent';
// jest.mock('passport');
import {Express} from 'express';
import {createApp} from '../app';
import {closeConnection} from '../test-utils/teardown';
import {User, UserRole} from '../entities/user';
import {loginWithUser} from '../test-utils/test-login';
// import {PassportStatic} from 'passport';


describe('Users (e2e)', () => {
  let agent: request.SuperTest<request.Test>;

  beforeEach(async () => {
    agent = request.agent(await createApp());
  });

  afterEach(async () => {
    await User.clear();
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('GET /api/auth/login-state', () => {
    test('Should check logged out', async () => {
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: false});
    });


    test('Should check logged in', async () => {
      const user = User.create({
        name: 'Tester',
        email: 'tester@example.com',
        role: UserRole.UNVERIFIED
      });
      await user.save();
      await loginWithUser(agent, user);
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: true, userRole: UserRole.UNVERIFIED, name: user.name});
    });
  });
});

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

/*
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
  let agent: request.SuperTest<request.Test>;
  let cookie: any;

  beforeEach(async () => {
    agent = request.agent(await createApp());
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
*/
