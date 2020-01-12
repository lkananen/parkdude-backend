import * as axios from 'axios';
import crypto = require('crypto');
import {ReservationRange, ParkingSpotDayStatus} from '../interfaces/parking-reservation.interfaces';
import {DayReservation} from '../entities/day-reservation';
import {User} from '../entities/user';
import {formatDateRange, isValidDate, toDateString, parseDateInput, formatDate} from '../utils/date';
import {ParkingSpot} from '../entities/parking-spot';
import {fetchParkingSpots, fetchParkingSpotCount} from './parking-spot.service';
import {APIGatewayProxyEvent} from 'aws-lambda';
import {SlackAuthenticationError} from '../utils/errors';
import {DayRelease} from '../entities/day-release';

const MS_IN_DAY = 24*3600*1000;

// This needs to be defined as variable so that mocking works in tests
// https://github.com/facebook/jest/issues/936#issuecomment-545080082
export const sendSlackMessage = async function sendSlackMessage(message: string) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.error('Slack message not sent; webhook not defined.');
    throw new Error('Slack webhook not defined.');
  }
  await axios.default.post(process.env.SLACK_WEBHOOK_URL, {
    'username': 'ParkDude',
    'text': message,
    'icon_emoji': ':parking:'
  })
    .catch((error) => {
      console.error('Slack message failed', 'Message:', message, 'Error:', error);
      throw error;
    });
};

export async function sendReservationSlackNotification(
  reservationsAndDeletedReleases: (DayReservation|DayRelease)[],
  reserver: User
) {
  const reservationRanges = getReservationRanges(reservationsAndDeletedReleases);
  const reservationMessages = reservationRanges.map(getReservationMessage).join('\n');
  const message = `Reservations made by ${reserver.name}:\n${reservationMessages}`;
  await sendSlackMessage(message);
}

export async function sendReleaseSlackNotification(releases: ParkingSpotDayStatus[], spot: ParkingSpot) {
  const releaseRanges = getReleaseRanges(releases, spot);
  const uniqueParkingSpots = new Set(releaseRanges.map((range) => range.spotId)).size;
  const parkingSpotsText = uniqueParkingSpots > 1 ? 'Parking spots' : `Parking spot ${spot.name}`;
  const reservationMessages = releaseRanges.map((range) => getReleaseMessage(range, uniqueParkingSpots > 1)).join('\n');
  const message = `${parkingSpotsText} released for reservation:\n${reservationMessages}`;
  await sendSlackMessage(message);
}

// Note: DayReleases in this case are deleted releases
function getReservationRanges(reservations: (DayReservation|DayRelease)[]) {
  if (reservations.length === 0) {
    return [];
  }
  reservations.sort((a, b) => a.date < b.date || (a.date === b.date && a.id < b.id) ? -1 : 1);
  const ranges = [];
  let currentRange: ReservationRange = {
    startDate: reservations[0].date,
    endDate: reservations[0].date,
    spotName: reservations[0].spot.name,
    spotId: reservations[0].spot.id
  };
  let prevDate = new Date(currentRange.endDate);
  for (const reservation of reservations) {
    const date = new Date(reservation.date);
    if (reservation.spotId === currentRange.spotId && date.getTime() - prevDate.getTime() <= MS_IN_DAY) {
      prevDate = date;
      currentRange.endDate = reservation.date;
    } else {
      ranges.push(currentRange);
      currentRange = {
        startDate: reservation.date,
        endDate: reservation.date,
        spotName: reservation.spot.name,
        spotId: reservation.spot.id
      };
    }
  }
  ranges.push(currentRange);
  return ranges;
}

function getReleaseRanges(releases: ParkingSpotDayStatus[], spot: ParkingSpot) {
  if (releases.length === 0) {
    return [];
  }
  releases.sort((a, b) => a.date < b.date ? -1 : 1);
  const ranges = [];
  let currentRange: ReservationRange = {
    startDate: releases[0].date,
    endDate: releases[0].date,
    spotName: spot.name,
    spotId: spot.id
  };
  let prevDate = new Date(currentRange.endDate);
  for (const release of releases) {
    const date = new Date(release.date);
    if (date.getTime() - prevDate.getTime() <= MS_IN_DAY) {
      prevDate = date;
      currentRange.endDate = release.date;
    } else {
      ranges.push(currentRange);
      currentRange = {
        startDate: release.date,
        endDate: release.date,
        spotName: spot.name,
        spotId: spot.id
      };
    }
  }
  ranges.push(currentRange);
  return ranges;
}

function getReservationMessage({startDate, endDate, spotName}: ReservationRange) {
  return `- Parking spot ${spotName}: ${formatDateRange(startDate, endDate)}`;
}

function getReleaseMessage(range: ReservationRange, includeParkingSpot: boolean) {
  if (!includeParkingSpot) {
    return '- ' + formatDateRange(range.startDate, range.endDate);
  }
  return getReservationMessage(range);
}

/**
 * Verifies that signature in request matches secret
 */
export function validateSlackAuth(event: APIGatewayProxyEvent) {
  const slackSignature = event.headers['X-Slack-Signature'] as string;
  const rawBody = event.body!!;
  const timestamp = +event.headers['X-Slack-Request-Timestamp']!!;
  // Slack timestamps are in seconds
  const time = Math.floor(new Date().getTime()/1000);
  if (Math.abs(time - timestamp) > 300) {
    // It has been over 5 minutes since sending the message
    // This should not happen in normal circumstances
    throw new SlackAuthenticationError('Request has timed out.');
  }

  if (!process.env.SLACK_SIGNING_SECRET) {
    throw new SlackAuthenticationError('Slack signing secret has not been defined. Contact application administrator.');
  }

  if (!isValidSlackSignature(slackSignature, timestamp, rawBody)) {
    throw new SlackAuthenticationError(
      'Slack signature did not match secret in configuration. Contact application administrator.'
    );
  }
}

/**
 * Checks that signature received from request matches the body
 * that is hashed with the same secret
 */
function isValidSlackSignature(signature: string, timestamp: number, rawBody: string) {
  const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET!!);
  const [version, hash] = signature.split('=');
  hmac.update(`${version}:${timestamp}:${rawBody}`);
  const generatedHash = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(generatedHash, 'utf8'));
}

export enum SlackCommand {
  HELP = 'help',
  STATUS = 'status'
}

/**
 * Identifies Slack command and returns response for it as JSON object that
 * can be sent to Slack API.
 */
export async function processSlackCommand(inputText: string) {
  // Input text is in format "command param1 param2 param3..."
  const [command, ...params] = inputText.split(' ');
  if (!command) {
    return createHelpTextResponse();
  }
  switch (command) {
  case SlackCommand.HELP: return createHelpTextResponse();
  case SlackCommand.STATUS: return await createStatusCommandResponse(...params);
  }
  return {
    'response_type': 'ephemeral',
    'text': 'Unknown command. Use `/parkdude help` to see available commands.'
  };
}

function createHelpTextResponse() {
  return {
    'response_type': 'ephemeral',
    'text': 'Commands:\n' +
            '`/parkdude help`\n' +
            '> Gives list of all available commands.\n\n' +
            '`/parkdude status [date]`\n' +
            '> Gives list of all available parking spots for a given day. Defaults to current day.' +
            ' Date can be given in format `dd.mm.yyyy` or `dd.mm`.\n' +
            '> Example usages:\n' +
            '> - `/parkdude status`\n' +
            '> - `/parkdude status 30.11.2019`\n' +
            '> - `/parkdude status 30.11`\n'
  };
}

/**
 * Returns response showing all available parking spaces for given date (defaults to current date)
 */
async function createStatusCommandResponse(dateInput?: string) {
  const date = parseDateInput(dateInput);
  if (!isValidDate(date)) {
    return {
      'response_type': 'ephemeral',
      'text': 'Error: Invalid date.'
    };
  }
  const dateString = toDateString(date);
  const totalParkingSpots = await fetchParkingSpotCount();
  const parkingSpots = await fetchParkingSpots([dateString]);
  const parkingSpotList = parkingSpots.map((spot) => '• ' + spot.name).join('\n');
  return {
    'response_type': 'in_channel',
    'text': `${parkingSpots.length} / ${totalParkingSpots} parking spots are available ` +
            `on ${formatDate(dateString)}:\n` +
            parkingSpotList
  };
}
