import {UserRole, User} from '../entities/user';
import {Session} from '../entities/session';
import {BasicParkingSpotData} from './parking-spot.interfaces';

export interface UserBody {
  email: string;
  name?: string;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface FullUserData extends UserData {
  ownedParkingSpots: BasicParkingSpotData[];
  reservationCount: number;
}

export interface UserSessionData extends FullUserData {
  sessions: string[];
}

export interface GetUsersResponse {
  data: UserSessionData[];
}

export interface GetUserResponse {
  data: UserSessionData;
}

export interface UserUpdateBody {
  email: string;
  name: string;
  role: UserRole;
}

export interface PutUpdatedUserResponse {
  data: UserData;
  message: string;
}

export interface UserSessions extends User {
  sessions: string[];
}

export interface SessionUser extends Session {
  userId: string;
}
