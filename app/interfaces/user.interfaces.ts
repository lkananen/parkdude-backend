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
