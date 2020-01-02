import {User, UserRole} from '../entities/user';
import {UserBody, UserUpdateBody, UserSessions, SessionUser} from '../interfaces/user.interfaces';
import {Session} from '../entities/session';
import {getConnection, createQueryBuilder} from 'typeorm';

export async function fetchUsers(userRole?: UserRole): Promise<User[]> {
  const users = await User.find({
    where: userRole ? {role: userRole} : {},
    relations: ['ownedParkingSpots'],
    order: {email: 'ASC'}
  });
  const requestCounts = await getRequestCounts(users);
  users.forEach((user) => user.requestCount = requestCounts.get(user.id)!!);
  return users;
}

async function getRequestCounts(users: User[]) {
  const userIds = users.map((user) => user.id);
  const requestCountsRaw = (await createQueryBuilder(User, 'user')
    .leftJoin('user.reservations', 'reservation')
    .groupBy('user.id')
    .select('user.id', 'userId')
    .addSelect('COUNT(reservation.id)', 'reservationCount')
    .whereInIds(userIds)
    .getRawMany())
    .map(({userId, reservationCount}) => [userId, +reservationCount] as [string, number]);

  return new Map(requestCountsRaw);
}

export async function getUser({email}: UserBody): Promise <User | undefined> {
  return await User.findOne({email});
}

export async function fetchUser(id: string): Promise<User> {
  const user = await User.findOneOrFail(id, {
    relations: ['ownedParkingSpots']
  });
  const requestCounts = await getRequestCounts([user]);
  user.requestCount = requestCounts.get(user.id)!!;
  return user;
}

export async function getOrCreateUser({email, name}: UserBody): Promise<User> {
  let user = await User.findOne({email});
  if (user === undefined) {
    if (!process.env.COMPANY_EMAIL) {
      throw new Error('Company email has not been defined!');
    }
    user = await User.create({
      name: name,
      email: email,
      role: email.endsWith(process.env.COMPANY_EMAIL) ? UserRole.VERIFIED : UserRole.UNVERIFIED
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

export async function getUsersSessions(users: User[]): Promise<UserSessions[]> {
  const sessionRepo = getConnection().getRepository(Session);
  const sessions = await sessionRepo.find() as SessionUser[];

  sessions.forEach((sess) => sess.userId = JSON.parse(sess.json).passport.user);
  sessions.sort((a, b) => a.userId < b.userId ? -1 : 1);
  users.sort((a, b) => a.id < b.id ? -1 : 1);

  const userSessions = users as UserSessions[];
  userSessions.forEach((user) => user.sessions = []);
  let sessIdx = 0;
  let userIdx = 0;
  while (sessIdx < sessions.length && userIdx < userSessions.length) {
    if (userSessions[userIdx].id === sessions[sessIdx].userId) {
      userSessions[userIdx].sessions.push(sessions[sessIdx].id);
      sessIdx++;
    } else if (userSessions[userIdx].id < sessions[sessIdx].userId) {
      userIdx++;
    } else {
      sessIdx++;
    }
  }
  userSessions.sort((a, b) => a.email < b.email ? -1 : 1);
  return userSessions;
}

export async function getUserSession(user: User): Promise<UserSessions> {
  return (await getUsersSessions(Array(user)))[0];
}

export async function clearSessions(user: UserSessions) {
  const sessionRepo = getConnection().getRepository(Session);
  await sessionRepo.delete(user.sessions);
}
