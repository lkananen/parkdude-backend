import {BasicParkingSpotData} from './parking-spot.interfaces';

export interface GetReservationsCalendarResponse {
  calendar: CalendarEntry[];
  totalSpaces: number;
  userOwnsSpace: boolean;
}

export interface CalendarEntry {
  date: string;
  spacesReservedByUser: BasicParkingSpotData[];
  availableSpaces: number;
}

// userId is used when admin does modifications. Defaults to current user.
export interface PostReservationsBody {
  userId: string | undefined;
  reservations: ReservationBody[];
  releases: ReleaseBody[];
}

export interface ReservationBody {
  parkingSpotId: string | undefined;
  date: string;
}

export interface ReleaseBody {
  parkingSpotId: string;
  date: string;
}

export interface PostReservationsResponse {
  reservations: ReservationResponse[];
  releases: ReleaseResponse[];
  message: string;
}

export interface ReservationResponse {
  date: string;
  parkingSpot: BasicParkingSpotData;
}

export interface ReleaseResponse {
  date: string;
  parkingSpot: BasicParkingSpotData;
}

export interface GetReservationsForDateResponse {
  parkingSpots: DayReservationStatus[];
}

export interface DayReservationStatus extends BasicParkingSpotData {
  isReservedByUser: boolean;
}

export interface MyReservationsResponse {
  ownedSpots: BasicParkingSpotData[];
  reservations: ReservationResponse[];
  releases: ReleaseResponse[];
}
