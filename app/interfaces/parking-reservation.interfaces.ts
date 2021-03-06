import {BasicParkingSpotData} from './parking-spot.interfaces';
import {UserData} from './user.interfaces';

export interface GetReservationsCalendarResponse {
  calendar: CalendarEntry[];
  ownedSpots: BasicParkingSpotData[];
}

export interface CalendarEntry {
  date: string;
  spacesReservedByUser: BasicParkingSpotData[];
  availableSpaces: number;
}

export interface Calendar {
  dates: {
    [date: string]: CalendarEntry;
  };
  startDate: string;
  endDate: string;
}

// userId is used when admin does modifications. Defaults to current user.
export interface PostReservationsBody {
  dates: string[];
  userId?: string;
  // If not specified, spots can be different for different days, based on availability
  parkingSpotId?: string;
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
  message: string;
}

export interface DeleteReservationsResponse {
  message: string;
}

export interface ReservationResponse {
  date: string;
  parkingSpot: BasicParkingSpotData;
}

export interface FullReservationResponse extends ReservationResponse {
  user: UserData;
}

export interface DeleteReservationsFailureResponse {
  message: string;
  errorDates: string[];
}

export interface ReservationResponse {
  date: string;
  parkingSpot: BasicParkingSpotData;
}

export interface ReleaseResponse {
  date: string;
  parkingSpot: BasicParkingSpotData;
  reservation?: {
    user: UserData;
  };
}

export interface GetReservationsForDateResponse {
  parkingSpots: DayReservationStatus[];
}

export interface DayReservationStatus extends BasicParkingSpotData {
  isReservedByUser: boolean;
}

export interface UserReservationsResponse {
  ownedSpots: BasicParkingSpotData[];
  reservations: ReservationResponse[];
  releases: ReleaseResponse[];
}

export interface ReservationsResponse {
  reservations: ReservationResponse[];
  releases: ReleaseResponse[];
}

export interface ParkingSpotDayStatus {
  ownerId: string | null;
  spotId: string;
  reservationId?: string | null;
  releaseId?: string | null;
  reserverId?: string | null;
  date: string;
}

export interface QueriedParkingSpotDayStatus {
  ownerid: string | null;
  spotid: string;
  reservationid?: string | null;
  releaseid?: string | null;
  reserverid?: string | null;
  spotdate: Date;
}

export interface ReservationRange {
  startDate: string;
  endDate: string;
  spotId: string;
  spotName: string;
}
