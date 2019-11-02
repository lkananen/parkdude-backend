import {Request, Response} from 'express';
import {
  GetReservationsCalendarResponse, PostReservationsBody,
  PostReservationsResponse, GetReservationsForDateResponse, MyReservationsResponse
} from '../interfaces/parking-reservation.interfaces';


export async function getReservationsCalendar(req: Request, res: Response) {
  // Date range is inclusive. Both days are required.
  const {startDate, endDate} = req.query;
  // TODO: Implementation
  const json: GetReservationsCalendarResponse = {
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
      },
      {
        date: '2019-11-06',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-07',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-08',
        spacesReservedByUser: [],
        availableSpaces: 7
      },
      {
        date: '2019-11-09',
        spacesReservedByUser: [],
        availableSpaces: 0
      },
      {
        date: '2019-11-10',
        spacesReservedByUser: [],
        availableSpaces: 0
      },
      {
        date: '2019-11-11',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-12',
        spacesReservedByUser: [{
          id: '123-id',
          name: '315'
        }],
        availableSpaces: 6
      },
      {
        date: '2019-11-13',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-14',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-15',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-16',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-17',
        spacesReservedByUser: [{
          id: '123-id',
          name: '313'
        }],
        availableSpaces: 3
      },
      {
        date: '2019-11-18',
        spacesReservedByUser: [{
          id: '123-id',
          name: '314'
        }],
        availableSpaces: 3
      },
      {
        date: '2019-11-19',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-20',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-21',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-22',
        spacesReservedByUser: [{
          id: '123-id',
          name: '313'
        }],
        availableSpaces: 3
      },
      {
        date: '2019-11-23',
        spacesReservedByUser: [{
          id: '123-id',
          name: '313'
        }],
        availableSpaces: 3
      },
      {
        date: '2019-11-24',
        spacesReservedByUser: [{
          id: '123-id',
          name: '313'
        }],
        availableSpaces: 6
      },
      {
        date: '2019-11-25',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-26',
        spacesReservedByUser: [],
        availableSpaces: 5
      },
      {
        date: '2019-11-27',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-28',
        spacesReservedByUser: [],
        availableSpaces: 3
      },
      {
        date: '2019-11-29',
        spacesReservedByUser: [],
        availableSpaces: 5
      },
      {
        date: '2019-11-30',
        spacesReservedByUser: [],
        availableSpaces: 3
      }
    ],
    totalSpaces: 7,
    userOwnsSpace: true
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
