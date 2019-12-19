/* eslint-disable require-atomic-updates */
import * as request from 'supertest';
import {ParkingSpot} from '../entities/parking-spot';
import {ParkingSpotData} from '../interfaces/parking-spot.interfaces';
import {closeConnection} from '../test-utils/teardown';
import {
  createAppWithNormalSession, TEST_USER_EMAIL, loginWithEmail,
  createAppWithAdminSession
} from '../test-utils/test-login';
import {disableErrorLogs, enableErrorLogs} from '../test-utils/logger';
import {DayReservation} from '../entities/day-reservation';
import {User, UserRole} from '../entities/user';
import {DayRelease} from '../entities/day-release';
import {fetchParkingSpots} from '../services/parking-spot.service';

describe('Parking spots (e2e)', () => {
  let agent: request.SuperTest<request.Test>;
  let user: User;
  let adminUser: User;

  beforeAll(async () => {
    agent = await createAppWithNormalSession();
    user = await User.findOneOrFail({email: TEST_USER_EMAIL});
    adminUser = await User.create({
      name: 'Admin Tester',
      email: 'admin@example.com',
      role: UserRole.ADMIN
    }).save();
    await ParkingSpot.delete({});
  });

  beforeEach(async () => {
    await loginWithEmail(agent, user.email);
  });

  afterEach(async () => {
    await DayReservation.delete({});
    await DayRelease.delete({});
    await ParkingSpot.delete({});
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('GET /api/parking-spots', () => {
    test('Should return no parking spots when there are\'t any', async () => {
      await agent
        .get('/api/parking-spots')
        .expect(200, {data: []});
    });

    test('Should return parking-spots', async () => {
      const parkingSpots = [
        await ParkingSpot.create({name: 'Parking spot 1'}).save(),
        await ParkingSpot.create({name: 'Parking spot 2'}).save(),
      ];

      await agent
        .get('/api/parking-spots')
        .expect(200, {data: parkingSpots.map((spot) => spot.toParkingSpotData())});
    });

    test('Should return specific parking spot', async () => {
      const parkingSpots = [
        await ParkingSpot.create({name: 'Parking spot 1'}).save(),
        await ParkingSpot.create({name: 'Parking spot 2'}).save(),
      ];

      await agent
        .get('/api/parking-spots/' + parkingSpots[0].id)
        .expect(200, {data: parkingSpots[0].toParkingSpotData()});
    });

    describe('Filtering by available on dates', () => {
      let parkingSpots: ParkingSpot[] = [];

      beforeEach(async () => {
        parkingSpots = [
          await ParkingSpot.create({name: 'Parking spot 1'}).save(),
          await ParkingSpot.create({name: 'Parking spot 2'}).save(),
          await ParkingSpot.create({name: 'Parking spot 3'}).save(),
        ];
      });

      test('Should filter when spot has normal reservations', async () => {
        await DayReservation.create({
          spotId: parkingSpots[0].id,
          date: '2019-11-01',
          user
        }).save();
        await DayReservation.create({
          spotId: parkingSpots[1].id,
          date: '2019-11-01',
          user: adminUser
        }).save();

        await agent
          .get('/api/parking-spots?availableOnDates=2019-11-01')
          .expect(200, {data: [parkingSpots[2].toParkingSpotData()]});
      });


      test('Should filter by when spot has normal reservations on some of the days', async () => {
        await DayReservation.create({
          spotId: parkingSpots[0].id,
          date: '2019-11-01',
          user
        }).save();

        await agent
          .get('/api/parking-spots?availableOnDates=2019-11-01,2019-11-02')
          .expect(200, {data: [
            parkingSpots[1].toParkingSpotData(),
            parkingSpots[2].toParkingSpotData()
          ]});
      });

      test('Should not filter when spot has normal reservations on other days', async () => {
        await DayReservation.create({
          spotId: parkingSpots[0].id,
          date: '2019-11-01',
          user
        }).save();

        await agent
          .get('/api/parking-spots?availableOnDates=2019-11-02')
          .expect(200, {data: [
            parkingSpots[0].toParkingSpotData(),
            parkingSpots[1].toParkingSpotData(),
            parkingSpots[2].toParkingSpotData()
          ]});
      });

      test('Should filter when spot has owners', async () => {
        parkingSpots[0].owner = user;
        parkingSpots[1].owner = adminUser;
        parkingSpots[0] = await parkingSpots[0].save();
        parkingSpots[1] = await parkingSpots[1].save();

        await agent
          .get('/api/parking-spots?availableOnDates=2019-11-01')
          .expect(200, {data: [parkingSpots[2].toParkingSpotData()]});
      });

      test('Should not filter when spot has owners, but the spot is released for the day', async () => {
        parkingSpots[0].owner = user;
        parkingSpots[1].owner = adminUser;
        parkingSpots[0] = await parkingSpots[0].save();
        parkingSpots[1] = await parkingSpots[1].save();

        await DayRelease.create({
          spotId: parkingSpots[0].id,
          date: '2019-11-01'
        }).save();
        await DayRelease.create({
          spotId: parkingSpots[1].id,
          date: '2019-11-01'
        }).save();

        await agent
          .get('/api/parking-spots?availableOnDates=2019-11-01')
          .expect(200, {data: [
            parkingSpots[0].toParkingSpotData(),
            parkingSpots[1].toParkingSpotData(),
            parkingSpots[2].toParkingSpotData()
          ]});
      });

      test('Should filter when spot has owners and is released for another day', async () => {
        parkingSpots[0].owner = user;
        parkingSpots[1].owner = adminUser;
        parkingSpots[0] = await parkingSpots[0].save();
        parkingSpots[1] = await parkingSpots[1].save();

        await DayRelease.create({
          spotId: parkingSpots[0].id,
          date: '2019-11-01'
        }).save();
        await DayRelease.create({
          spotId: parkingSpots[1].id,
          date: '2019-11-01'
        }).save();

        await agent
          .get('/api/parking-spots?availableOnDates=2019-11-02')
          .expect(200, {data: [
            parkingSpots[2].toParkingSpotData()
          ]});
      });

      test('Should filter when spot has owners and is released for one of the days, but not all of them', async () => {
        parkingSpots[0].owner = user;
        parkingSpots[1].owner = adminUser;
        parkingSpots[0] = await parkingSpots[0].save();
        parkingSpots[1] = await parkingSpots[1].save();

        await DayRelease.create({
          spotId: parkingSpots[0].id,
          date: '2019-11-01'
        }).save();
        await DayRelease.create({
          spotId: parkingSpots[1].id,
          date: '2019-11-01'
        }).save();

        await agent
          .get('/api/parking-spots?availableOnDates=2019-11-01,2019-11-02')
          .expect(200, {data: [
            parkingSpots[2].toParkingSpotData()
          ]});
      });

      test('Should filter when owned spot is released and then reserved', async () => {
        parkingSpots[0].owner = user;
        parkingSpots[1].owner = adminUser;
        parkingSpots[0] = await parkingSpots[0].save();
        parkingSpots[1] = await parkingSpots[1].save();

        await DayRelease.create({
          spotId: parkingSpots[0].id,
          date: '2019-11-01'
        }).save();
        await DayRelease.create({
          spotId: parkingSpots[1].id,
          date: '2019-11-01'
        }).save();

        await DayReservation.create({
          spotId: parkingSpots[0].id,
          date: '2019-11-01',
          user: adminUser
        }).save();

        await DayReservation.create({
          spotId: parkingSpots[1].id,
          date: '2019-11-01',
          user
        }).save();

        await agent
          .get('/api/parking-spots?availableOnDates=2019-11-01,2019-11-02')
          .expect(200, {data: [parkingSpots[2].toParkingSpotData()]});
      });

      test('Should give 400 if date is invalid', async () => {
        disableErrorLogs();
        await agent.get('/api/parking-spots?availableOnDates=abc,efg')
          .expect(400, {message: 'Dates must be in format YYYY-MM-DD.'});
        enableErrorLogs();
      });
    });
  });


  describe('POST /api/parking-spots', () => {
    beforeEach(async () => {
      await loginWithEmail(agent, adminUser.email);
    });

    test('Should add parking spot', async () => {
      const name = 'Parking spot 1';
      await agent
        .post('/api/parking-spots')
        .send({name})
        .expect(201)
        .expect((res) => {
          const parkingSpot: ParkingSpotData = res.body.data;
          expect(parkingSpot.name).toEqual(name);
          expect(parkingSpot.id).toBeDefined();
          expect(new Date(parkingSpot.created) < new Date());
          expect(new Date(parkingSpot.updated) < new Date());
        });
    });

    describe('Error handling', () => {
      beforeAll(() => {
        disableErrorLogs();
      });

      afterAll(() => {
        enableErrorLogs();
      });

      test('Should fail if name is missing', async () => {
        const expectedError = 'Name is required.';
        await agent
          .post('/api/parking-spots')
          .send({})
          .expect(400, {
            message: `Validation failed:\n${expectedError}`,
            errorMessages: [expectedError]
          });
      });

      test('Should fail if name is empty string', async () => {
        const expectedError = 'Name is required.';
        await agent
          .post('/api/parking-spots')
          .send({name: ''})
          .expect(400, {
            message: `Validation failed:\n${expectedError}`,
            errorMessages: [expectedError]
          });
      });

      test('Should fail if name is too long', async () => {
        const longName = 'T'.repeat(201);
        const expectedError = `Name ${longName} is too long (201 characters). Maximum length is 200.`;
        await agent
          .post('/api/parking-spots')
          .send({name: longName})
          .expect(400, {
            message: `Validation failed:\n${expectedError}`,
            errorMessages: [expectedError]
          });
      });
    });
  });


  describe('PUT /api/parking-spots', () => {
    let parkingSpots: ParkingSpot[];

    beforeEach(async () => {
      agent = await createAppWithAdminSession();
      user = await User.create({
        name: 'Employee #4324',
        email: 'joe@company.com',
        role: UserRole.VERIFIED
      }).save();

      parkingSpots = [
        await ParkingSpot.create({name: 'Normal spot'}).save(),
        await ParkingSpot.create({name: 'Permanent spot', owner: user}).save(),
      ];

      // Refresh users, .reload() will not include the referenced relation.
      user = await User.findOneOrFail({where: {id: user.id}, relations: ['ownedParkingSpots']});
      adminUser = await User.findOneOrFail({where: {email: TEST_USER_EMAIL}, relations: ['ownedParkingSpots']});
    });

    afterEach(async () => {
      User.delete({});
      ParkingSpot.delete({});
    });

    test('Should add owner to parking spot', async () => {
      expect(await user.ownedParkingSpots).toHaveLength(1);

      await agent
        .put('/api/parking-spots/' + parkingSpots[0].id)
        .send({name: 'Normal spot', ownerEmail: user.email})
        .expect(200);

      await parkingSpots[0].reload();
      user = await User.findOneOrFail({where: {id: user.id}, relations: ['ownedParkingSpots']});
      expect(parkingSpots[0].owner!.id).toBe(user.id);
      expect(await user.ownedParkingSpots).toHaveLength(2);
      expect((await user.ownedParkingSpots)[1].id).toBe(parkingSpots[0].id);
    });

    test('Should remove owner from parking spot with missing key', async () => {
      expect(await user.ownedParkingSpots).toHaveLength(1);

      await agent
        .put('/api/parking-spots/' + parkingSpots[1].id)
        .send({name: 'Permanent spot'})
        .expect(200);
      const spot = await ParkingSpot.findOneOrFail({where: {id: parkingSpots[1].id}, relations: ['owner']});
      user = await User.findOneOrFail({where: {id: user.id}, relations: ['ownedParkingSpots']});

      expect(spot).toBe(null);
      expect(await user.ownedParkingSpots).toHaveLength(0);
    });

    test('Should change owner of parking spot', async () => {
      expect(await user.ownedParkingSpots).toHaveLength(1);
      expect(await adminUser.ownedParkingSpots).toHaveLength(0);
      expect(parkingSpots[1].owner!.email).toBe(user.email);

      await agent
        .put('/api/parking-spots/' + parkingSpots[1].id)
        .send({name: 'Permanent spot', ownerEmail: TEST_USER_EMAIL})
        .expect(200);

      await parkingSpots[1].reload();
      user = await User.findOneOrFail({where: {id: user.id}, relations: ['ownedParkingSpots']});
      adminUser = await User.findOneOrFail({where: {email: TEST_USER_EMAIL}, relations: ['ownedParkingSpots']});

      expect(await user.ownedParkingSpots).toHaveLength(0);
      expect(await adminUser.ownedParkingSpots).toHaveLength(1);
      expect(parkingSpots[1].owner!.email).toBe(adminUser.email);
    });

    test('Should update spot name', async () => {
      const newName = 'Updated spot';
      await agent
        .put('/api/parking-spots/' + parkingSpots[0].id)
        .send({name: newName, ownerEmail: user.email})
        .expect(200);
      await parkingSpots[0].reload();
      expect(parkingSpots[0].name).toBe(newName);
    });

    describe('Error handling', () => {
      test('Should 400 with missing name', async () => {
        await agent
          .put('/api/parking-spots/' + parkingSpots[1].id)
          .send({name: ''})
          .expect(400);
      });

      test('Should 404 with nonexistent spot', async () => {
        await agent
          .put('/api/parking-spots/123e4567-e89b-12d3-a456-426655440000')
          .send({name: 'New name'})
          .expect(404);
      });

      test('Should 409 if user is not found', async () => {
        await agent
          .put('/api/parking-spots/' + parkingSpots[1].id)
          .send({name: 'Permanent spot', ownerEmail: 'dev@null'})
          .expect(409);
      });
    });
  });

  describe('DELETE /api/parking-spots', () => {
    let parkingSpots: ParkingSpot[];

    beforeEach(async () => {
      agent = await createAppWithAdminSession();
      adminUser = await User.findOneOrFail({email: TEST_USER_EMAIL});
      user = await User.create({
        name: 'Employee #4324',
        email: 'joe@company.com',
        role: UserRole.VERIFIED
      }).save();

      parkingSpots = [
        await ParkingSpot.create({name: 'Normal spot'}).save(),
        await ParkingSpot.create({name: 'Permanent spot', owner: user}).save(),
      ];

      // Reload user, .reload() will not include the referenced relation.
      user = await User.findOneOrFail({where: {id: user.id}, relations: ['ownedParkingSpots']});
    });

    afterEach(async () => {
      User.delete({});
      ParkingSpot.delete({});
    });

    test('Should delete parking spot', async () => {
      expect(await fetchParkingSpots()).toHaveLength(2);
      await agent
        .delete('/api/parking-spots/' + parkingSpots[0].id)
        .expect(200, {message: 'Parking spot successfully deleted.'});
      expect(await fetchParkingSpots()).toHaveLength(1);
    });

    test('Should remove from user\'s owned spots', async () => {
      expect(await user.ownedParkingSpots).toHaveLength(1);
      expect((await user.ownedParkingSpots)[0].id).toBe(parkingSpots[1].id);

      await agent
        .delete('/api/parking-spots/' + parkingSpots[1].id)
        .expect(200, {message: 'Parking spot successfully deleted.'});
      user = await User.findOneOrFail({where: {id: user.id}, relations: ['ownedParkingSpots']});
      expect(await user.ownedParkingSpots).toHaveLength(0);
    });
  });
});
