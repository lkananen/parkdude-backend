import * as request from 'supertest';
import {createApp} from '../app';
import {closeConnection} from '../test-utils/teardown';
import {User, UserRole} from '../entities/user';
import {loginWithEmail, createAppWithAdminSession} from '../test-utils/test-login';
import {fetchUsers, getUser, getOrCreateUser} from '../services/user.service';

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
        .post('/api/parking-reservations')
        .expect(401, {'message': 'Verified account required.'});
    });

    test('Should fail to add new parking spots', async () => {
      await agent
        .post('/api/parking-spots')
        .send({name: 'spot1'})
        .expect(401);
    });
  });


  describe('Unverified user', () => {
    const name = 'Tester';
    const email = 'tester@gmail.com';

    beforeEach(async () => {
      agent = request.agent(await createApp());
      await loginWithEmail(agent, email, name);
    });
    test('Should check logged in', async () => {
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: true, userRole: UserRole.UNVERIFIED, name});
    });

    test('Should not be able to reserve spot', async () => {
      await agent
        .post('/api/parking-reservations')
        .expect(403, {message: 'Verified account required.'});
    });

    test('Should fail to add new parking spots', async () => {
      await agent
        .post('/api/parking-spots')
        .send({name: 'spot1'})
        .expect(403);
    });
  });


  describe('Verified user', () => {
    const name = 'Tester';
    const email = 'tester@innogiant.com';

    beforeEach(async () => {
      agent = request.agent(await createApp());
      await loginWithEmail(agent, email, name);
    });

    test('Should check logged in', async () => {
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: true, userRole: UserRole.VERIFIED, name});
    });

    test('Should be able to get parking spots', async () => {
      await agent
        .get('/api/parking-spots')
        .expect(200);
    });

    test('Should fail to add new parking spots', async () => {
      await agent
        .post('/api/parking-spots')
        .send({name: 'spot1'})
        .expect(403);
    });
  });


  describe('Admin user', () => {
    beforeEach(async () => {
      agent = await createAppWithAdminSession();
    });
    afterEach(async () => {
      await User.delete({});
    });

    test('Should be able to get parking spots', async () => {
      await agent
        .get('/api/parking-spots')
        .expect(200);
    });

    test('Should manage to add new parking spots', async () => {
      await agent
        .post('/api/parking-spots')
        .send({name: 'spot1'})
        .expect(201);
    });
  });


  describe('Authentication logic', () => {
    let initialUser: User;

    beforeEach(async () => {
      initialUser = User.create({
        name: 'Test1',
        email: 'test@example.com',
        role: UserRole.VERIFIED
      });
      agent = request.agent(await createApp());
      await initialUser.save();
    });
    afterEach(async () => {
      await User.delete({});
    });

    test('Should be 1 user initially', async () => {
      expect(await fetchUsers()).toHaveLength(1);
    });

    test('Logging in should not add new user', async () => {
      await loginWithEmail(agent, initialUser.email);
      expect(await fetchUsers()).toHaveLength(1);
    });

    test('New email oauth login should add new user', async () => {
      await loginWithEmail(agent, 'new@example.com');
      expect(await fetchUsers()).toHaveLength(2);
    });

    test('Failed login should not add user', async () => {
      await loginWithEmail(agent, 'new@example.com', 'Tester', false);
      expect(await fetchUsers()).toHaveLength(1);
    });

    test('Logout should log out', async () => {
      await loginWithEmail(agent, initialUser.email);
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: true, userRole: UserRole.VERIFIED, name: initialUser.name});
      await agent
        .get('/api/auth/logout')
        .expect({message: 'Successfully logged out'});
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: false});
    });

    test('POST Logout should log out', async () => {
      await loginWithEmail(agent, initialUser.email);
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: true, userRole: UserRole.VERIFIED, name: initialUser.name});
      await agent
        .post('/api/auth/logout')
        .expect({message: 'Successfully logged out'});
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: false});
    });
  });
});
