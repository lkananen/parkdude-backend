import * as request from 'supertest';
import * as superagent from 'superagent';
// jest.mock('passport');
import {Express} from 'express';
import {createApp} from '../app';
import {closeConnection} from '../test-utils/teardown';
import {User, UserRole} from '../entities/user';
import {loginWithUser, createAppWithAdminSession} from '../test-utils/test-login';
import {adminRoleRequired} from '../middlewares/auth.middleware';
// import {PassportStatic} from 'passport';


describe('Users/authentication (e2e)', () => {
  let agent: request.SuperTest<request.Test>;

  afterAll(async () => {
    await closeConnection();
  });


  describe('No user', () => {
    beforeAll(async () => {
      agent = request.agent(await createApp());
    });

    test('Should check logged out', async () => {
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: false});
    });

    test('Should not be able to reserve spot', async () => {
      await agent
        .get('/api/reserve-test')
        .expect(403);
    });
  });


  describe('Unactivated user', () => {
    let user: User;

    beforeEach(async () => {
      agent = request.agent(await createApp());
      user = User.create({
        name: 'Tester',
        email: 'tester@example.com',
        role: UserRole.UNVERIFIED
      });
      await user.save();
      await loginWithUser(agent, user);
    });
    test('Should check logged in', async () => {
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: true, userRole: UserRole.UNVERIFIED, name: user.name});
    });

    test('Should not be able to reserve spot', async () => {
      await agent
        .get('/api/reserve-test')
        .expect(401, {message: 'Verified account required.'});
    });
  });


  // describe('Activated user')
  // describe('Admin user')

  describe('GET /api/auth/login-state', () => {
    beforeEach(async () => {
      agent = request.agent(await createApp());
    });

    afterEach(async () => {
      await User.clear();
    });
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

    test('Should fail to add new parking spots', async () => {
      await agent
        .post('/api/parking-spots')
        .send({name: 'spot1'})
        .expect(403);
    });
  });


  describe('Admin user tests', () => {
    beforeEach(async () => {
      agent = await createAppWithAdminSession();
    });
    afterEach(async () => {
      await User.clear();
    });

    test('Should manage to add new parking spots', async () => {
      await agent
        .post('/api/parking-spots')
        .send({name: 'spot1'})
        .expect(201);
    });
  });
});
