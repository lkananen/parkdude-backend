import {Request, Response} from 'express';
import {
  GetReservationsCalendarResponse, PostReservationsBody,
  PostReservationsResponse, GetReservationsForDateResponse, MyReservationsResponse
} from '../interfaces/parking-reservation.interfaces';
import {fetchCalendar, fetchReservations, fetchReleases, reserveSpots} from '../services/parking-reservation.service';
import {User, UserRole} from '../entities/user';
import {BasicParkingSpotData} from '../interfaces/parking-spot.interfaces';
import {validateDateRange, toDateString, isValidDateString} from '../utils/date';
import {BadRequestError, ForbiddenError, ReservationFailedError} from '../utils/errors';
import {fetchUser} from '../services/user.service';

// Some limitation to the size of the requests
const MAX_DATE_RANGE = 500;

export async function getReservationsCalendar(req: Request, res: Response) {
  // Date range is inclusive. Both days are required.
  const {startDate, endDate} = req.query;
  const {parkingSpotId} = req.params;

  validateDateRange(startDate, endDate, MAX_DATE_RANGE);

  const ownedSpots: BasicParkingSpotData[] = (await (req.user as User).ownedParkingSpots)
    .map((spot) => spot.toBasicParkingSpotData());
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
    throw new BadRequestError('startDate is required.');
  }
  validateDateRange(startDate, endDate, MAX_DATE_RANGE);
  const ownedSpots: BasicParkingSpotData[] = (await (req.user as User).ownedParkingSpots)
    .map((spot) => spot.toBasicParkingSpotData());
  const reservations = await fetchReservations(startDate, endDate, req.user as User);
  const releases = await fetchReleases(startDate, endDate, req.user as User);
  const json: MyReservationsResponse = {
    ownedSpots,
    reservations: reservations.map((reservation) => reservation.toReservationResponse()),
    releases: releases.map((release) => release.toReleaseResponse())
  };

  res.status(200).json(json);
}

export async function getReservationsForDate(req: Request, res: Response) {
  const date = req.params.date;
  const json: GetReservationsForDateResponse = {
    parkingSpots: [
      {
        id: '123-id',
        name: '313',
        isReservedByUser: false
      },
      {
        id: '124-id',
        name: '314',
        isReservedByUser: true
      }
    ]
  };
  res.status(200).json(json);
}

export async function postReservations(req: Request, res: Response) {
  const {dates, userId, parkingSpotId}: PostReservationsBody = req.body;
  const user = req.user as User;
  if (userId !== user.id && user.role !== UserRole.ADMIN) {
    throw new ForbiddenError('Permission denied.');
  }

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    throw new BadRequestError('dates is required.');
  }

  if (dates.some((date) => !isValidDateString(date) || date.length !== 10)) {
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
