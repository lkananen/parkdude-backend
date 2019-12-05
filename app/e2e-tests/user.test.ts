import * as request from 'supertest';
import {createApp} from '../app';
import {closeConnection} from '../test-utils/teardown';
import {User, UserRole} from '../entities/user';
import {loginWithEmail, createAppWithAdminSession, TEST_USER_EMAIL} from '../test-utils/test-login';
import {fetchUsers, getUser} from '../services/user.service';
import {ParkingSpot} from '../entities/parking-spot';
import {fetchParkingSpots} from '../services/parking-spot.service';

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

  describe('User API logic', () => {
    let verifiedUser: User;
    let unverifiedUser: User;
    let ownedSpot: ParkingSpot;

    beforeEach(async () => {
      agent = await createAppWithAdminSession();

      verifiedUser = await User.create({
        name: 'VerifiedTester',
        email: 'test@example.com',
        role: UserRole.VERIFIED
      }).save();
      unverifiedUser = await User.create({
        name: 'UnVerifiedTester',
        email: 'test@unverified.com',
        role: UserRole.UNVERIFIED
      }).save();
      ownedSpot = await ParkingSpot.create({
        name: 'test spot 1',
        owner: verifiedUser
      }).save();
    });

    afterEach(async () => {
      await User.delete({});
      await ParkingSpot.delete({});
    });

    test('getUsers should return all users without filter', async () => {
      const res = await agent
        .get('/api/users')
        .expect(200);
      expect(res.body.data).toHaveLength(3);
    });

    test('getUsers should be filterable by role', async () => {
      const res = await agent
        .get('/api/users?role=unverified')
        .expect(200);
      expect(res.body.data).toHaveLength(1);
    });

    test('updateUser may be used to verify unverified user', async () => {
      expect(unverifiedUser.role).toBe(UserRole.UNVERIFIED);
      await agent
        .put('/api/users/' + unverifiedUser.id)
        .send({
          email: unverifiedUser.email,
          name: unverifiedUser.name,
          role: UserRole.VERIFIED
        })
        .expect(200);
      await unverifiedUser.reload();
      expect(unverifiedUser.role).toBe(UserRole.VERIFIED);
    });

    test('deleteUser should delete user', async () => {
      expect(await fetchUsers()).toHaveLength(3);
      await agent
        .delete('/api/users/' + verifiedUser.id)
        .expect(200, {message: 'User successfully deleted'});
      expect(await fetchUsers()).toHaveLength(2);
    });

    test('deleteUser should deown owned parking spot', async () => {
      expect(ownedSpot.owner!.id).toBe(verifiedUser.id);
      await agent
        .delete('/api/users/' + verifiedUser.id);
      expect(await fetchParkingSpots()).toHaveLength(1);
      await ownedSpot.reload();
      expect(ownedSpot.owner).toBe(null);
    });

    test('postClearSession should remove user\'s session', async () => {
      const user = await getUser({email: TEST_USER_EMAIL}) as User;
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: true, userRole: UserRole.ADMIN, name: user.name});
      await agent
        .post('/api/users/' + user.id + '/clearSession');
      await agent
        .get('/api/auth/login-state')
        .expect({isAuthenticated: false});
    });
  });
});
