import {User} from '../entities/user';
import {UserBody} from '../interfaces/user.interfaces';

export async function fetchUsers(): Promise<User[]> {
  return await User.find();
}

export async function getUser({email}: UserBody): Promise <User | undefined> {
  return await User.findOne(email);
}

