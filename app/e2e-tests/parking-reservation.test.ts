import * as request from 'supertest';
import {ParkingSpot} from '../entities/parking-spot';
import {closeConnection} from '../test-utils/teardown';
import {createAppWithAdminSession, TEST_USER_EMAIL} from '../test-utils/test-login';
import {User} from '../entities/user';
import {DayReservation} from '../entities/day-reservation';
import {DayRelease} from '../entities/day-release';
import {disableErrorLogs, enableErrorLogs} from '../test-utils/logger';
import {toDateString} from '../utils/date';

describe('Parking reservations (e2e)', () => {
  let agent: request.SuperTest<request.Test>;
  let parkingSpots: ParkingSpot[];
  let user: User;

  beforeEach(async () => {
    agent = await createAppWithAdminSession();
    parkingSpots = await Promise.all([
      ParkingSpot.create({name: 'test space 1'}).save(),
      ParkingSpot.create({name: 'test space 2'}).save(),
      ParkingSpot.create({name: 'test space 3'}).save()
    ]);
    user = await User.findOneOrFail({email: TEST_USER_EMAIL});
  });

  afterEach(async () => {
    await DayReservation.delete({});
    await DayRelease.delete({});
    await ParkingSpot.delete({});
    await User.delete({});
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('GET /api/parking-reservations/calendar', () => {
    test('Should return dates in a small date range', async () => {
      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-11-05')
        .expect(200, {
          calendar: [
            {
              date: '2019-11-01',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2019-11-02',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2019-11-03',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2019-11-04',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2019-11-05',
              spacesReservedByUser: [],
              availableSpaces: 3
            }
          ],
          ownedSpots: []
        });
    });

    test('Should return specific date', async () => {
      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-11-01')
        .expect(200, {
          calendar: [
            {
              date: '2019-11-01',
              spacesReservedByUser: [],
              availableSpaces: 3
            }
          ],
          ownedSpots: []
        });
    });

    test('Should return dates in small date range between months', async () => {
      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-12-30&endDate=2020-01-02')
        .expect(200, {
          calendar: [
            {
              date: '2019-12-30',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2019-12-31',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2020-01-01',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2020-01-02',
              spacesReservedByUser: [],
              availableSpaces: 3
            }
          ],
          ownedSpots: []
        });
    });

    test('Should show permanent spaces reserved by user', async () => {
      parkingSpots[0].owner = user;
      parkingSpots[1].owner = user;
      await parkingSpots[0].save();
      await parkingSpots[1].save();

      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-11-02')
        .expect(200, {
          calendar: [
            {
              date: '2019-11-01',
              spacesReservedByUser: [
                parkingSpots[0].toBasicParkingSpotData(),
                parkingSpots[1].toBasicParkingSpotData()
              ],
              availableSpaces: 1
            },
            {
              date: '2019-11-02',
              spacesReservedByUser: [
                parkingSpots[0].toBasicParkingSpotData(),
                parkingSpots[1].toBasicParkingSpotData()
              ],
              availableSpaces: 1
            }
          ],
          ownedSpots: [
            parkingSpots[0].toBasicParkingSpotData(),
            parkingSpots[1].toBasicParkingSpotData()
          ]
        });
    });

    test('Should show normal reservations', async () => {
      await DayReservation.create({
        user,
        spot: parkingSpots[0],
        date: '2019-11-02'
      }).save();

      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-11-02')
        .expect(200, {
          calendar: [
            {
              date: '2019-11-01',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2019-11-02',
              spacesReservedByUser: [
                parkingSpots[0].toBasicParkingSpotData()
              ],
              availableSpaces: 2
            }
          ],
          ownedSpots: []
        });
    });

    test('Should not show released owned spots as reserved', async () => {
      parkingSpots[0].owner = user;
      await parkingSpots[0].save();

      await DayRelease.create({
        user,
        spot: parkingSpots[0],
        date: '2019-11-02'
      }).save();

      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-11-02')
        .expect(200, {
          calendar: [
            {
              date: '2019-11-01',
              spacesReservedByUser: [parkingSpots[0].toBasicParkingSpotData()],
              availableSpaces: 2
            },
            {
              date: '2019-11-02',
              spacesReservedByUser: [],
              availableSpaces: 3
            }
          ],
          ownedSpots: [
            parkingSpots[0].toBasicParkingSpotData()
          ]
        });
    });

    test('Should show other user\'s released spots as free', async () => {
      const user2 = await User.create({name: 'Tester 2', email: 'tester2@example.com'}).save();
      parkingSpots[0].owner = user2;
      await parkingSpots[0].save();

      await DayRelease.create({
        user: user2,
        spot: parkingSpots[0],
        date: '2019-11-02'
      }).save();

      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-11-02')
        .expect(200, {
          calendar: [
            {
              date: '2019-11-01',
              spacesReservedByUser: [],
              availableSpaces: 2
            },
            {
              date: '2019-11-02',
              spacesReservedByUser: [],
              availableSpaces: 3
            }
          ],
          ownedSpots: []
        });
    });

    test('Should work with owned, reserved and released spaces', async () => {
      parkingSpots[0].owner = user;
      await parkingSpots[0].save();

      await DayRelease.create({
        user,
        spot: parkingSpots[0],
        date: '2019-11-02'
      }).save();

      await DayRelease.create({
        user,
        spot: parkingSpots[0],
        date: '2019-11-03'
      }).save();

      await DayReservation.create({
        user,
        spot: parkingSpots[1],
        date: '2019-11-03'
      }).save();

      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-11-03')
        .expect(200, {
          calendar: [
            {
              date: '2019-11-01',
              spacesReservedByUser: [
                parkingSpots[0].toBasicParkingSpotData()
              ],
              availableSpaces: 2
            },
            {
              date: '2019-11-02',
              spacesReservedByUser: [],
              availableSpaces: 3
            },
            {
              date: '2019-11-03',
              spacesReservedByUser: [
                parkingSpots[1].toBasicParkingSpotData()
              ],
              availableSpaces: 2
            }
          ],
          ownedSpots: [
            parkingSpots[0].toBasicParkingSpotData()
          ]
        });
    });

    test('Should not show other reservations as free', async () => {
      const user2 = await User.create({name: 'Tester 2', email: 'tester2@example.com'}).save();
      parkingSpots[0].owner = user2;
      await parkingSpots[0].save();

      await DayReservation.create({
        user: user2,
        spot: parkingSpots[1],
        date: '2019-11-02'
      }).save();

      await agent
        .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-11-02')
        .expect(200, {
          calendar: [
            {
              date: '2019-11-01',
              spacesReservedByUser: [],
              availableSpaces: 2
            },
            {
              date: '2019-11-02',
              spacesReservedByUser: [],
              availableSpaces: 1
            }
          ],
          ownedSpots: []
        });
    });

    describe('Error handling', () => {
      beforeAll(() => {
        disableErrorLogs();
      });

      afterAll(() => {
        enableErrorLogs();
      });

      test('Should fail with 400 if startDate is missing', async () => {
        await agent
          .get('/api/parking-reservations/calendar?endDate=2019-11-02')
          .expect(400, {message: 'startDate and endDate are required.'});
      });

      test('Should fail with 400 if endDate is missing', async () => {
        await agent
          .get('/api/parking-reservations/calendar?startDate=2019-11-01')
          .expect(400, {message: 'startDate and endDate are required.'});
      });

      test('Should fail with 400 if startDate and endDate are missing', async () => {
        await agent
          .get('/api/parking-reservations/calendar')
          .expect(400, {message: 'startDate and endDate are required.'});
      });


      test('Should fail with 400 if date is invalid', async () => {
        await agent
          .get('/api/parking-reservations/calendar?startDate=2019-13-01&endDate=2019-11-02')
          .expect(400, {message: 'Date must be valid.'});
      });

      test('Should fail with 400 if endDate is before startDate', async () => {
        await agent
          .get('/api/parking-reservations/calendar?startDate=2019-11-01&endDate=2019-10-02')
          .expect(400, {message: 'Start date must be after end date.'});
      });


      test('Should fail with 400 if date range is over 500 days', async () => {
        await agent
          .get('/api/parking-reservations/calendar?startDate=2019-01-01&endDate=2021-01-01')
          .expect(400, {message: 'Date range is too long (over 500 days).'});
      });
    });
  });

  describe('GET /api/parking-reservations/my-reservations', () => {
    test('Should get reservations, releases and parking spots', async () => {
      parkingSpots[0].owner = user;
      parkingSpots[1].owner = user;
      await parkingSpots[0].save();
      await parkingSpots[1].save();

      await DayReservation.create({
        user: user,
        spot: parkingSpots[2],
        date: '2019-11-02'
      }).save();

      console.warn('release',
        await DayRelease.create({
          spot: parkingSpots[1],
          date: '2019-11-03'
        }).save());

      console.warn(await DayRelease.find({relations: ['spot', 'spot.owner']}));

      await agent.get('/api/parking-reservations/my-reservations?startDate=2019-11-02&endDate=2019-11-03')
        .expect(200, {
          reservations: [{
            date: '2019-11-02',
            parkingSpot: parkingSpots[2].toBasicParkingSpotData()
          }],
          releases: [{
            date: '2019-11-03',
            parkingSpot: parkingSpots[1].toBasicParkingSpotData()
          }],
          ownedSpots: [
            parkingSpots[0].toBasicParkingSpotData(),
            parkingSpots[1].toBasicParkingSpotData()
          ]
        });
    });

    test('Should not show past reservations', async () => {
      parkingSpots[0].owner = user;
      parkingSpots[1].owner = user;
      await Promise.all([parkingSpots[0].save(), parkingSpots[1].save()]);

      await DayReservation.create({
        user: user,
        spot: parkingSpots[2],
        date: '2019-10-02'
      }).save();

      await DayRelease.create({
        spot: parkingSpots[1],
        date: '2019-10-03'
      }).save();

      await agent.get('/api/parking-reservations/my-reservations?startDate=2019-11-02&endDate=2019-11-03')
        .expect(200, {
          reservations: [],
          releases: [],
          ownedSpots: [
            parkingSpots[0].toBasicParkingSpotData(),
            parkingSpots[1].toBasicParkingSpotData()
          ]
        });
    });

    test('Should not show another user\'s reservations or spots', async () => {
      const user2 = await User.create({name: 'Tester 2', email: 'tester2@example.com'}).save();
      parkingSpots[0].owner = user2;
      parkingSpots[1].owner = user2;
      await Promise.all([parkingSpots[0].save(), parkingSpots[1].save()]);

      await DayReservation.create({
        user: user2,
        spot: parkingSpots[2],
        date: '2019-11-02'
      }).save();

      await DayRelease.create({
        spot: parkingSpots[1],
        date: '2019-11-03'
      }).save();

      await agent.get('/api/parking-reservations/my-reservations?startDate=2019-11-02&endDate=2019-11-03')
        .expect(200, {
          reservations: [],
          releases: [],
          ownedSpots: []
        });
    });

    test('startDate should default to current day', async () => {
      const currentDate = new Date();
      const previousDate = new Date();
      previousDate.setDate(previousDate.getDate() - 1);

      // Should not be in results
      await DayReservation.create({
        user: user,
        spot: parkingSpots[0],
        date: toDateString(previousDate)
      }).save();

      // Should be in results
      await DayReservation.create({
        user: user,
        spot: parkingSpots[1],
        date: toDateString(currentDate)
      }).save();

      await agent.get(`/api/parking-reservations/my-reservations?endDate=${toDateString(currentDate)}`)
        .expect(200, {
          reservations: [{
            date: toDateString(currentDate),
            parkingSpot: parkingSpots[1].toBasicParkingSpotData()
          }],
          releases: [],
          ownedSpots: []
        });
    });

    test('Reservations should be ordered by date', async () => {
      await DayReservation.create({
        user: user,
        spot: parkingSpots[0],
        date: '2019-11-02'
      }).save();

      await DayReservation.create({
        user: user,
        spot: parkingSpots[1],
        date: '2019-11-01'
      }).save();

      await agent.get('/api/parking-reservations/my-reservations?startDate=2019-11-01&endDate=2019-11-03')
        .expect(200, {
          reservations: [{
            date: '2019-11-01',
            parkingSpot: parkingSpots[1].toBasicParkingSpotData()
          }, {
            date: '2019-11-02',
            parkingSpot: parkingSpots[0].toBasicParkingSpotData()
          }],
          releases: [],
          ownedSpots: []
        });
    });
  });
});
