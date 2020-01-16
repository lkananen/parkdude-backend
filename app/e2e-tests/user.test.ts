import * as request from 'supertest';
import {createApp} from '../app';
import {closeConnection} from '../test-utils/teardown';
import {User, UserRole} from '../entities/user';
import {loginWithEmail, createAppWithAdminSession, TEST_USER_EMAIL} from '../test-utils/test-login';
import {fetchUsers, getUser, createPasswordVerifiedUser} from '../services/user.service';
import {ParkingSpot} from '../entities/parking-spot';
import {fetchParkingSpots} from '../services/parking-spot.service';
import {UserSessionData} from '../interfaces/user.interfaces';
import {DayReservation} from '../entities/day-reservation';
import {disableErrorLogs, enableErrorLogs} from '../test-utils/logger';

describe('Users (e2e)', () => {
  let agent: request.SuperTest<request.Test>;

  afterAll(async () => {
    await closeConnection();
  });

  describe('Authentication', () => {
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
      const email = 'tester@unverified.com';

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
      const email = 'tester' + process.env.COMPANY_EMAIL;

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
      let oAuthUser: User;
      let passwordUser: User;
      const password = 'verystrongpassword1';

      beforeEach(async () => {
        oAuthUser = User.create({
          name: 'Test1',
          email: 'test@example.com',
          role: UserRole.VERIFIED
        });
        agent = request.agent(await createApp());
        await oAuthUser.save();
        passwordUser = await createPasswordVerifiedUser({name: 'Password user',
          email: 'password@user.com',
          password
        });
        passwordUser.role = UserRole.VERIFIED;
        await passwordUser.save();
      });
      afterEach(async () => {
        await User.delete({});
      });

      beforeAll(() => {
        disableErrorLogs();
      });

      afterAll(() => {
        enableErrorLogs();
      });

      test('Should be 2 users initially', async () => {
        expect(await fetchUsers()).toHaveLength(2);
      });

      test('Logging in should not add new user', async () => {
        await loginWithEmail(agent, oAuthUser.email);
        expect(await fetchUsers()).toHaveLength(2);
      });

      test('New email oauth login should add new user', async () => {
        await loginWithEmail(agent, 'new@example.com');
        expect(await fetchUsers()).toHaveLength(3);
      });

      test('Failed login should not add user', async () => {
        await loginWithEmail(agent, 'new@example.com', 'Tester', false);
        expect(await fetchUsers()).toHaveLength(2);
      });

      test('Login should succeed for password user', async () => {
        await agent
          .post('/api/auth/login')
          .send({email: passwordUser.email,
            password})
          .expect(200);
        await agent
          .get('/api/auth/login-state')
          .expect({isAuthenticated: true, userRole: UserRole.VERIFIED, name: passwordUser.name});
      });


      test('Login should fail with wrong password ', async () => {
        await agent
          .post('/api/auth/login')
          .send({email: passwordUser.email,
            password: 'wrongPassword'})
          .expect(401);
        await agent
          .get('/api/auth/login-state')
          .expect({isAuthenticated: false});
      });

      test('Password login should fail for oauth user', async () => {
        await agent
          .post('/api/auth/login')
          .send({email: oAuthUser.email,
            password: ''})
          .expect(400);
        await agent
          .post('/api/auth/login')
          .send({email: oAuthUser.email,
            password: null})
          .expect(400);
        await agent
          .post('/api/auth/login')
          .send({email: oAuthUser.email,
          })
          .expect(400);
        await agent
          .post('/api/auth/login')
          .send({email: oAuthUser.email,
            password: passwordUser.password})
          .expect(401);
        await agent
          .get('/api/auth/login-state')
          .expect({isAuthenticated: false});
      });

      test('POST Logout should log out', async () => {
        await loginWithEmail(agent, oAuthUser.email);
        await agent
          .get('/api/auth/login-state')
          .expect({isAuthenticated: true, userRole: UserRole.VERIFIED, name: oAuthUser.name});
        await agent
          .post('/api/auth/logout')
          .expect({message: 'Successfully logged out'});
        await agent
          .get('/api/auth/login-state')
          .expect({isAuthenticated: false});
      });
    });
  });

  describe('User API', () => {
    let verifiedUser: User;
    let unverifiedUser: User;
    let adminUser: User;
    let ownedSpot: ParkingSpot;

    beforeEach(async () => {
      agent = await createAppWithAdminSession();

      adminUser = (await getUser({email: TEST_USER_EMAIL}))!!;

      verifiedUser = await User.create({
        name: 'VerifiedTester',
        email: 'tester2@example.com',
        role: UserRole.VERIFIED
      }).save();
      unverifiedUser = await User.create({
        name: 'UnVerifiedTester',
        email: 'tester3@unverified.com',
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
      await DayReservation.delete({});
    });

    describe('GET /api/users', () => {
      test('Should return all users without filter', async () => {
        const res = await agent
          .get('/api/users')
          .expect(200);
        expect(res.body.data).toHaveLength(3);
      });

      test('Should be filterable by role', async () => {
        const res = await agent
          .get('/api/users?role=unverified')
          .expect(200);
        expect(res.body.data).toHaveLength(1);
      });

      test('Should list the sessions for all users', async () => {
        const res = await agent
          .get('/api/users')
          .expect(200);
        expect(res.body.data).toEqual(expect.arrayContaining([expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          name: expect.any(String),
          role: expect.any(String),
          sessions: expect.any(Array)
        })]));
      });

      test('Should include parking spots and reservation counts', async () => {
        const spot = await ParkingSpot.create({
          name: 'Test spot'
        }).save();
        await DayReservation.create({
          user: verifiedUser,
          spot,
          date: '2019-11-01'
        }).save();
        await DayReservation.create({
          user: verifiedUser,
          spot,
          date: '2019-11-02'
        }).save();
        await DayReservation.create({
          user: adminUser,
          spot,
          date: '2019-11-03'
        }).save();
        const res = await agent.get('/api/users').expect(200);
        expect(res.body.data).toEqual([
          {
            email: 'tester2@example.com',
            id: verifiedUser.id,
            name: 'VerifiedTester',
            ownedParkingSpots: [
              {
                id: ownedSpot.id,
                name: 'test spot 1'
              }
            ],
            reservationCount: 2,
            role: 'verified',
            isEmailValidated: true,
            sessions: []
          },
          {
            email: 'tester3@unverified.com',
            id: unverifiedUser.id,
            name: 'UnVerifiedTester',
            ownedParkingSpots: [],
            reservationCount: 0,
            role: 'unverified',
            isEmailValidated: true,
            sessions: []
          },
          {
            email: 'tester@example.com',
            id: adminUser.id,
            name: 'Tester',
            ownedParkingSpots: [],
            reservationCount: 1,
            role: 'admin',
            isEmailValidated: true,
            sessions: expect.any(Array)
          },
        ]);
      });

      test('Admin should have a session, others should not', async () => {
        const res = await agent
          .get('/api/users')
          .expect(200);
        res.body.data.forEach((user: UserSessionData) => {
          expect(user.sessions.length).toBe(user.role === UserRole.ADMIN ? 1 : 0);
        });
      });
    });

    describe('PUT /api/users', () => {
      test('May be used to verify unverified user', async () => {
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
    });

    describe('DELETE /api/users', () => {
      test('Should delete user', async () => {
        expect(await fetchUsers()).toHaveLength(3);
        await agent
          .delete('/api/users/' + verifiedUser.id)
          .expect(200, {message: 'User successfully deleted'});
        expect(await fetchUsers()).toHaveLength(2);
      });

      test('Should deown owned parking spot', async () => {
        expect(ownedSpot.owner!.id).toBe(verifiedUser.id);
        await agent
          .delete('/api/users/' + verifiedUser.id);
        expect(await fetchParkingSpots()).toHaveLength(1);
        await ownedSpot.reload();
        expect(ownedSpot.owner).toBe(null);
      });
    });

    describe('POST /api/users/<userId>/clearSessions', () => {
      test('Should remove user\'s session', async () => {
        const user = await getUser({email: TEST_USER_EMAIL}) as User;
        await agent
          .get('/api/auth/login-state')
          .expect({isAuthenticated: true, userRole: UserRole.ADMIN, name: user.name});
        await agent
          .post('/api/users/' + user.id + '/clearSessions');
        await agent
          .get('/api/auth/login-state')
          .expect({isAuthenticated: false});
      });

      test('User should get two sessions and both will be cleared', async () => {
        const app = await createApp();
        const admin = await User.create({
          name: 'Admin',
          email: 'Admin@admin.com',
          role: UserRole.ADMIN
        }).save();
        const regularUser = await User.create({
          name: 'Regular',
          email: 'regular@user.com',
          role: UserRole.VERIFIED
        }).save();

        const adminAgent = request.agent(app);
        await loginWithEmail(adminAgent, admin.email);

        const regularAgent1 = request.agent(app);
        await loginWithEmail(regularAgent1, regularUser.email);
        const regularAgent2 = request.agent(app);
        await loginWithEmail(regularAgent2, regularUser.email);

        // Has 2 sessions because of 2 agents
        let res = await adminAgent
          .get('/api/users/' + regularUser.id)
          .expect(200);
        expect(res.body.data.sessions).toHaveLength(2);

        await adminAgent
          .post('/api/users/' + regularUser.id + '/clearSessions')
          .expect(200);

        res = await adminAgent
          .get('/api/users/' + regularUser.id)
          .expect(200);
        expect(res.body.data.sessions).toHaveLength(0);
      });
    });

    describe('PUT /users/<userId>/password', () => {
      const validPassword = 'longEnough';
      const invalidPassword = 'short';
      let passwordUser: User;

      beforeEach(async () => {
        passwordUser = await createPasswordVerifiedUser({name: 'Password user',
          email: 'password@user.com',
          password: 'verystrongpassword1'
        });
      });

      beforeAll(() => {
        disableErrorLogs();
      });

      afterAll(() => {
        enableErrorLogs();
      });

      test('Should fail for oauth user', async () => {
        await agent
          .put('/api/users/' + verifiedUser.id + '/password')
          .send({password: validPassword})
          .expect(403);
      });

      test('Should succeed for password user', async () => {
        const originalHashedPassword = passwordUser.password;
        await agent
          .put('/api/users/' + passwordUser.id + '/password')
          .send({password: validPassword})
          .expect(200);
        // eslint-disable-next-line require-atomic-updates
        passwordUser = await User.findOneOrFail({where: {id: passwordUser.id}, select: ['password']});
        expect(passwordUser.password).not.toBe(originalHashedPassword);
        // "Verify" that it's not saved as plaintext
        expect(passwordUser.password).not.toBe(validPassword);
      });

      test('Should fail with bad password', async () => {
        const originalHashedPassword = passwordUser.password;
        await agent
          .put('/api/users/' + passwordUser.id + '/password')
          .send({password: invalidPassword})
          .expect(400);
        await passwordUser.reload();
        expect(passwordUser.password).toEqual(originalHashedPassword);
      });
    });

    describe('PUT /users/my-user/password', () => {
      let app: any;
      let passwordUser: User;
      let oAuthUser: User;
      const password = 'verystrongpassword1';
      const newPass = 'strongEnough';
      beforeEach(async () => {
        app = await createApp();
        passwordUser = await createPasswordVerifiedUser({
          name: 'Password user',
          email: 'password@user.com',
          password
        });
        passwordUser.role = UserRole.VERIFIED;
        await passwordUser.save();
        oAuthUser = await User.create({
          name: 'Regular',
          email: 'oauth@user.com',
          role: UserRole.VERIFIED
        }).save();
      });

      test('Should succeed for self if password user', async () => {
        const agent = request.agent(app);
        await agent
          .post('/api/auth/login')
          .send({
            email: passwordUser.email,
            password: password
          })
          .expect(200);
        await agent
          .put('/api/users/my-user/password')
          .send({password: newPass, oldPassword: password})
          .expect(200);
      });

      describe('Error handling', () => {
        beforeAll(() => {
          disableErrorLogs();
        });

        afterAll(() => {
          enableErrorLogs();
        });

        test('Should fail for self if oauth user', async () => {
          const agent = request.agent(app);
          await loginWithEmail(agent, oAuthUser.email);
          await agent
            .put('/api/users/my-user/password')
            .send({password: newPass, oldPassword: password})
            .expect(403);
          await oAuthUser.reload();
          expect(oAuthUser.password).toBeNull();
        });

        test('Should fail if oldPassword is missing', async () => {
          const agent = request.agent(app);
          await agent
            .post('/api/auth/login')
            .send({
              email: passwordUser.email,
              password: password
            })
            .expect(200);
          await agent
            .put('/api/users/my-user/password')
            .send({password: newPass})
            .expect(400, {message: 'Old password is required.'});
        });

        test('Should fail if oldPassword is wrong', async () => {
          const agent = request.agent(app);
          await agent
            .post('/api/auth/login')
            .send({
              email: passwordUser.email,
              password: password
            })
            .expect(200);
          await agent
            .put('/api/users/my-user/password')
            .send({password: newPass, oldPassword: 'wrong-password'})
            .expect(400, {message: 'Old password is wrong. Try again.'});
        });
      });
    });

    describe('POST /users', () => {
      test('Should fail if user exists', async () => {
        disableErrorLogs();
        await agent
          .post('/api/users')
          .send({email: verifiedUser.email,
            name: 'existing user',
            password: 'strongEnough'})
          .expect(400, {message: 'User of given email already exists.'});
        enableErrorLogs();
      });

      test('Should not be allowed to password register with company email', async () => {
        const fakeEmail = 'faker' + process.env.COMPANY_EMAIL;
        disableErrorLogs();
        await agent
          .post('/api/users')
          .send({email: fakeEmail,
            name: 'Fake employee',
            password: 'strongEnough'})
          .expect(403, {'message': 'Use of company email addresses is restricted to OAuth login only.'});
        enableErrorLogs();
        const newUser = await User.findOne({where: {email: fakeEmail}});
        expect(newUser).toBe(undefined);
      });
    });
  });
});
