import {User, UserRole} from '../entities/user';
import {UserBody} from '../interfaces/user.interfaces';

export async function fetchUsers(): Promise<User[]> {
  return await User.find();
}

export async function getUser({email}: UserBody): Promise <User | undefined> {
  return await User.findOne({email});
}

export async function fetchUser(id: string): Promise<User | undefined> {
  return await User.findOne(id);
}

export async function getOrCreateUser({email, name}: UserBody): Promise<User> {
  let user = await User.findOne({email});
  if (user === undefined) {
    user = await User.create({
      name: name,
      email: email,
      role: email.endsWith('@innogiant.com') ? UserRole.VERIFIED : UserRole.UNVERIFIED
    }).save();
  }
  return user;
}
