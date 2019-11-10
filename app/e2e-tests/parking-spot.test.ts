import * as request from 'supertest';
import {ParkingSpot} from '../entities/parking-spot';
import {ParkingSpotData} from '../interfaces/parking-spot.interfaces';
import {closeConnection} from '../test-utils/teardown';
import {createAppWithAdminSession} from '../test-utils/test-login';

describe('Parking spots (e2e)', () => {
  let agent: request.SuperTest<request.Test>;

  beforeEach(async () => {
    agent = await createAppWithAdminSession();
  });

  afterEach(async () => {
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
      const parkingSpot1: ParkingSpotData = (await agent
        .post('/api/parking-spots')
        .send({name: 'Parking spot 1'}))
        .body
        .data;

      const parkingSpot2: ParkingSpotData = (await agent
        .post('/api/parking-spots')
        .send({name: 'Parking spot 2'}))
        .body
        .data;

      await agent
        .get('/api/parking-spots')
        .expect(200, {data: [parkingSpot1, parkingSpot2]});
    });
  });


  describe('POST /api/parking-spots', () => {
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
