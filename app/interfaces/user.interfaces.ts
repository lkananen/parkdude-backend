import {User} from '../entities/user';

export interface UserBody {
  email: string;
}

export interface UserResponse {
  user: User;
}

