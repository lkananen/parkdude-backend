import * as slackService from '../services/slack.service';

import {ParkingSpot} from '../entities/parking-spot';
import {closeConnection} from '../test-utils/teardown';
import {User, UserRole} from '../entities/user';
import {DayReservation} from '../entities/day-reservation';
import {DayRelease} from '../entities/day-release';
import {toDateString, formatDate} from '../utils/date';
import {createConnection} from 'typeorm';

describe('Slack service', () => {
  describe('processSlackCommand', () => {
    describe('/parkdude help', () => {
      const helpText = 'Commands:\n' +
                       '`/parkdude help`\n' +
                       '> Gives list of all available commands.\n\n' +
                       '`/parkdude status [date]`\n' +
                       '> Gives list of all available parking spots for a given day. Defaults to current day.' +
                       ' Date can be given in format `dd.mm.yyyy` or `dd.mm`.\n' +
                       '> Example usages:\n' +
                       '> - `/parkdude status`\n' +
                       '> - `/parkdude status 30.11.2019`\n' +
                       '> - `/parkdude status 30.11`\n';

      test('Should return help text', async () => {
        const input = 'help';
        const output = await slackService.processSlackCommand(input);
        expect(output).toEqual({
          'response_type': 'ephemeral',
          'text': helpText
        });
      });

      test('Should return help text when command is empty', async () => {
        const input = '';
        const output = await slackService.processSlackCommand(input);
        expect(output).toEqual({
          'response_type': 'ephemeral',
          'text': helpText
        });
      });
    });
    describe('/parkdude status', () => {
      let parkingSpots: ParkingSpot[];
      let user: User;

      beforeAll(async () => {
        await createConnection();
      });

      beforeEach(async () => {
        parkingSpots = await Promise.all([
          ParkingSpot.create({name: 'test space 0'}).save(),
          ParkingSpot.create({name: 'test space 1'}).save(),
          ParkingSpot.create({name: 'test space 2'}).save()
        ]);
        user = await User.create({
          name: 'Tester 1',
          email: 'tester1@example.com',
          role: UserRole.VERIFIED}
        ).save();
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

      test('Should return all parking spots', async () => {
        const input = 'status';
        const output = await slackService.processSlackCommand(input);
        expect(output).toEqual({
          'response_type': 'in_channel',
          'text': `3 / 3 parking spots are available on ${formatDate(toDateString(new Date()))}:\n` +
                  '• test space 0\n' +
                  '• test space 1\n' +
                  '• test space 2'
        });
      });

      test('Should return all parking spots on specific date', async () => {
        const input = 'status 21.12.2019';
        const output = await slackService.processSlackCommand(input);
        const date = '2019-12-21';
        expect(output).toEqual({
          'response_type': 'in_channel',
          'text': `3 / 3 parking spots are available on ${formatDate(date)}:\n` +
                  '• test space 0\n' +
                  '• test space 1\n' +
                  '• test space 2'
        });
      });

      test('Should return only available parking spots on specific date', async () => {
        await DayReservation.create({
          spot: parkingSpots[1],
          user: user,
          date: '2019-12-21'
        }).save();
        const input = 'status 21.12.2019';
        const output = await slackService.processSlackCommand(input);
        const date = '2019-12-21';
        expect(output).toEqual({
          'response_type': 'in_channel',
          'text': `2 / 3 parking spots are available on ${formatDate(date)}:\n` +
                  '• test space 0\n' +
                  '• test space 2'
        });
      });

      test('Should give error if date is invalid', async () => {
        const input = 'status 12.21.2019';
        const output = await slackService.processSlackCommand(input);
        expect(output).toEqual({
          'response_type': 'ephemeral',
          'text': 'Error: Invalid date.'
        });
      });
    });
  });
});
