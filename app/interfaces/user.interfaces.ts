import {UserRole} from '../entities/user';

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

export interface GetUsersResponse {
  data: UserData[];
}

export interface GetUserResponse {
  data: UserData;
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
