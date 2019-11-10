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
        .get('/api/reserve-test')
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
        .get('/api/reserve-test')
        .expect(403, {message: 'Verified account required.'});
    });

    test('Should fail to add new parking spots', async () => {
      await agent
        .post('/api/parking-spots')
        .send({name: 'spot1'})
        .expect(402);
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

    test('Should be able to reserve spot', async () => {
      await agent
        .get('/api/reserve-test')
        .expect(201);
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

    test('Should be able to reserve spot', async () => {
      await agent
        .get('/api/reserve-test')
        .expect(201);
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

  describe('Service tests', () => {
    let user1: User;
    let user2: User;

    beforeAll(async () => {
      user1 = await User.create({
        name: 'user1',
        email: 'test@example.com',
        role: UserRole.UNVERIFIED
      }).save();

      user2 = await User.create({
        name: 'user2',
        email: 'test2@example.com',
        role: UserRole.UNVERIFIED
      }).save();

      agent = request.agent(await createApp());
    });

    afterAll(async () => {
      await User.delete({});
    });

    test('getUser should get user by email', async () => {
      expect(await getUser({email: user1.email})).toEqual(user1);
    });
    test('fetchUsers should get all users', async () => {
      expect(await fetchUsers()).toEqual([user1, user2]);
    });
    test('getOrCreateUser creates a new user if no match', async () => {
      const name = 'newuser';
      const email = 'new@gmail.com';
      const newuser = await getOrCreateUser({email, name});
      expect(newuser).toHaveProperty('name', name);
      expect(newuser).toHaveProperty('email', email);
      expect(newuser).toHaveProperty('id');
      expect(await fetchUsers()).toHaveLength(3);
    });
  });
});
