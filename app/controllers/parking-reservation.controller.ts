import {Request, Response} from 'express';
import {
  GetReservationsCalendarResponse, PostReservationsBody,
  PostReservationsResponse, UserReservationsResponse,
  DeleteReservationsResponse,
  ReservationsResponse
} from '../interfaces/parking-reservation.interfaces';
import {
  fetchCalendar, fetchReservations, fetchReleases, reserveSpots, releaseSpots
} from '../services/parking-reservation.service';
import {User, UserRole} from '../entities/user';
import {BasicParkingSpotData} from '../interfaces/parking-spot.interfaces';
import {validateDateRange, toDateString, isValidDateString} from '../utils/date';
import {BadRequestError, ForbiddenError, ReservationFailedError, ReleaseFailedError} from '../utils/errors';
import {fetchUser} from '../services/user.service';
import {DeleteReservationsFailureResponse} from '../interfaces/parking-reservation.interfaces';

// Some limitation to the size of the requests
const MAX_DATE_RANGE = 500;

export async function getReservationsCalendar(req: Request, res: Response) {
  // Date range is inclusive. Both days are required.
  const {startDate, endDate} = req.query;
  const {parkingSpotId} = req.params;

  validateDateRange(startDate, endDate, MAX_DATE_RANGE);

  const ownedSpots: BasicParkingSpotData[] = (await (req.user as User).ownedParkingSpots)
    .map((spot) => spot.toBasicParkingSpotData());
  ownedSpots.sort((a, b) => a.name < b.name ? -1 : 1);
  const calendar = await fetchCalendar(startDate, endDate, req.user as User, parkingSpotId);
  const json: GetReservationsCalendarResponse = {
    calendar,
    ownedSpots
  };
  res.status(200).json(json);
}

export async function getMyReservations(req: Request, res: Response) {
  // startDate defaults to current day (inclusive)
  const {startDate = toDateString(new Date()), endDate} = req.query;
  if (!endDate) {
    throw new BadRequestError('endDate is required.');
  }
  validateDateRange(startDate, endDate, MAX_DATE_RANGE);
  req.params.userId = (req.user as User).id;
  await getUserReservations(req, res);
}

export async function getUserReservations(req: Request, res: Response) {
  const user = await fetchUser(req.params.userId);
  // Default: get "all" future reservations
  const {startDate = toDateString(new Date()), endDate = toDateString(new Date(9999, 12))} = req.query;
  const ownedSpots: BasicParkingSpotData[] = (await user.ownedParkingSpots)
    .map((spot) => spot.toBasicParkingSpotData());
  const reservations = await fetchReservations(startDate, endDate, user);
  const releases = await fetchReleases(startDate, endDate, user);
  const json: UserReservationsResponse = {
    ownedSpots,
    reservations: reservations.map((reservation) => reservation.toReservationResponse()),
    releases: releases.map((release) => release.toReleaseResponse())
  };

  res.status(200).json(json);
}

export async function getReservations(req: Request, res: Response) {
  // Default: get "all" future reservations
  const {startDate = toDateString(new Date()), endDate = toDateString(new Date(9999, 12))} = req.query;
  const reservations = await fetchReservations(startDate, endDate);
  const releases = await fetchReleases(startDate, endDate);
  const json: ReservationsResponse = {
    reservations: reservations.map((reservation) => reservation.toFullReservationResponse()),
    releases: releases.map((release) => release.toReleaseResponse())
  };

  res.status(200).json(json);
}

export async function postReservations(req: Request, res: Response) {
  const {dates, userId, parkingSpotId}: PostReservationsBody = req.body;
  const user = req.user as User;
  if (userId && userId !== user.id && user.role !== UserRole.ADMIN) {
    throw new ForbiddenError('Permission denied.');
  }

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    throw new BadRequestError('dates is required.');
  }

  if (dates.some((date) => !isValidDateString(date))) {
    throw new BadRequestError('Dates must be in format YYYY-MM-DD.');
  }

  const reservingUser = userId ? await fetchUser(userId) : user;
  if (!reservingUser) {
    throw new BadRequestError('User with given id does not exist.');
  }

  try {
    const reservations = await reserveSpots(dates, reservingUser, parkingSpotId);
    const json: PostReservationsResponse = {
      reservations: reservations.map((reservation) => reservation.toReservationResponse()),
      message: 'Spots successfully reserved'
    };
    res.status(200).json(json);
  } catch (err) {
    if (err instanceof ReservationFailedError) {
      res.status(400).json({
        message: 'Reservation failed. There weren\'t available spots for some of the days.',
        errorDates: err.dates
      });
    } else {
      throw err;
    }
  }
}

export async function deleteReservations(req: Request, res: Response) {
  if (!req.query.dates) {
    throw new BadRequestError('dates is required.');
  }

  const {parkingSpotId} = req.params;
  const dates: string[] = req.query.dates.split(',');

  if (dates.some((date) => !isValidDateString(date))) {
    throw new BadRequestError('Dates must be in format YYYY-MM-DD.');
  }

  try {
    await releaseSpots(dates, req.user as User, parkingSpotId);
    const json: DeleteReservationsResponse = {
      message: 'Parking reservations successfully released.'
    };
    res.status(200).json(json);
  } catch (error) {
    if (error instanceof ReleaseFailedError) {
      const json: DeleteReservationsFailureResponse = {
        message: error.message,
        errorDates: error.dates
      };
      res.status(400).json(json);
    } else {
      throw error;
    }
  }
}
