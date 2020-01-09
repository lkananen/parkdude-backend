import * as axios from 'axios';
import {ReservationRange, ParkingSpotDayStatus} from '../interfaces/parking-reservation.interfaces';
import {DayReservation} from '../entities/day-reservation';
import {User} from '../entities/user';
import {formatDateRange} from '../utils/date';
import {ParkingSpot} from '../entities/parking-spot';
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
