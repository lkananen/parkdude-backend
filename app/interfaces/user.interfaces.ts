import {User} from '../entities/user';

export interface UserBody {
  email: string;
  name?: string;
}

export interface UserResponse {
  user: User;
}

