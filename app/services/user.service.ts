import {User, UserRole} from '../entities/user';
import {UserBody, UserUpdateBody, UserData} from '../interfaces/user.interfaces';
import {Session} from '../entities/session';
import {getConnection} from 'typeorm';

export async function fetchUsers(userRole?: UserRole): Promise<User[]> {
  if (!userRole) {
    return await User.find();
  }
  return await User.find({where: {role: userRole}});
}

export async function getUser({email}: UserBody): Promise <User | undefined> {
  return await User.findOne({email});
}

export async function fetchUser(id: string): Promise<User> {
  return await User.findOneOrFail(id);
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

export async function updateUser(user: User, data: UserUpdateBody): Promise<User> {
  user.email = data.email;
  user.name = data.name;
  user.role = data.role;
  return await user.save();
}

export async function deleteUser(user: User) {
  await user.remove();
}

export async function clearSession(user: User) {
  const sessionRepo = getConnection().getRepository(Session);
  // const sessions = await sessionRepo.find({where: {userId: user.id}});
  const sessions = await sessionRepo.find();
  console.log(sessions);
  // await sessionRepo.remove(sessions);
}
