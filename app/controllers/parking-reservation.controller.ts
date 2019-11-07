import {Request, Response} from 'express';
import {
  GetReservationsCalendarResponse, PostReservationsBody,
  PostReservationsResponse, GetReservationsForDateResponse, MyReservationsResponse
} from '../interfaces/parking-reservation.interfaces';
import {fetchCalendar} from '../services/parking-reservation.service';
import {User} from '../entities/user';
import {BasicParkingSpotData} from '../interfaces/parking-spot.interfaces';
import {validateDateRange} from '../utils/date';

// Some limitation to the size of the requests
const MAX_DATE_RANGE = 500;

export async function getReservationsCalendar(req: Request, res: Response) {
  // Date range is inclusive. Both days are required.
  const {startDate, endDate} = req.query;

  validateDateRange(startDate, endDate, MAX_DATE_RANGE);

  const ownedSpots: BasicParkingSpotData[] = (await (req.user as User).ownedParkingSpots)
    .map((spot) => spot.toBasicParkingSpotData());
  const calendar = await fetchCalendar(startDate, endDate, req.user as User);
  // TODO: Implementation
  const json: GetReservationsCalendarResponse = {
    calendar,
    ownedSpots
  };
  res.status(200).json(json);
}

export async function getMyReservations(req: Request, res: Response) {
  // startDate defaults to current day (inclusive)
  const {startDate, endDate} = req.query;
  // TODO: Implementation
  const json: MyReservationsResponse = {
    ownedSpots: [{
      id: '123-id',
      name: '313'
    }],
    reservations: [{
      date: '2019-11-30',
      parkingSpot: {
        id: '124-id',
        name: '314'
      }
    }],
    releases: [{
      date: '2019-11-30',
      parkingSpot: {
        id: '123-id',
        name: '313'
      }
    }, {
      date: '2019-11-29',
      parkingSpot: {
        id: '123-id',
        name: '313'
      }
    }]
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
  // TODO: Implementation
  const data: PostReservationsBody = req.body;
  const json: PostReservationsResponse = {
    reservations: [
      {
        date: '2019-11-05',
        parkingSpot: {
          id: '123-id',
          name: '313'
        }
      }
    ],
    releases: [
      {
        date: '2019-11-04',
        parkingSpot: {
          id: '123-id',
          name: '313'
        }
      }
    ],
    message: 'Spaces successfully reserved'
  };
  res.status(200).json(json);
}
