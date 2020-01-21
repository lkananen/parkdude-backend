import {User, UserRole} from '../entities/user';
import {UserBody, UserUpdateBody, UserSessions, SessionUser, CreateUserBody} from '../interfaces/user.interfaces';
import {Session} from '../entities/session';
import {getConnection, createQueryBuilder} from 'typeorm';
import bcrypt from 'bcryptjs';
import {BadRequestError, ForbiddenError} from '../utils/errors';

export async function fetchUsers(userRole?: UserRole): Promise<User[]> {
  const users = await User.find({
    where: userRole ? {role: userRole} : {},
    relations: ['ownedParkingSpots'],
    order: {email: 'ASC'}
  });
  const reservationCounts = await getreservationCounts(users);
  users.forEach((user) => user.reservationCount = reservationCounts.get(user.id)!!);
  return users;
}

async function getreservationCounts(users: User[]) {
  const userIds = users.map((user) => user.id);
  const reservationCountsRaw = (await createQueryBuilder(User, 'user')
    .leftJoin('user.reservations', 'reservation')
    .groupBy('user.id')
    .select('user.id', 'userId')
    .addSelect('COUNT(reservation.id)', 'reservationCount')
    .whereInIds(userIds)
    .getRawMany())
    .map(({userId, reservationCount}) => [userId, +reservationCount] as [string, number]);

  return new Map(reservationCountsRaw);
}

export async function getUser({email}: UserBody): Promise <User | undefined> {
  return await User.findOne({email});
}

export async function fetchUser(id: string): Promise<User> {
  const user = await User.findOneOrFail(id, {
    relations: ['ownedParkingSpots']
  });
  const reservationCounts = await getreservationCounts([user]);
  user.reservationCount = reservationCounts.get(user.id)!!;
  return user;
}

/**
 * Used for Google login, in which email is always verified.
 * If user has not logged in before, a new user is created.
 */
export async function getOrCreateUser({email, name}: UserBody): Promise<User> {
  let user = await User.findOne({email});
  if (user && user.hasPassword) {
    throw new ForbiddenError('User has a password. Google login is disabled.');
  }
  if (user === undefined) {
    user = await User.create({
      name: name,
      email: email,
      role: isCompanyEmail(email) ? UserRole.VERIFIED : UserRole.UNVERIFIED,
      hasPassword: false
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

export async function changePassword(user: User, password: string) {
  if (!user.hasPassword) {
    throw new ForbiddenError('Account created with Google login. Passwords are disabled.');
  }
  const hashedPassword = await hashPassword(password);
  // eslint-disable-next-line require-atomic-updates
  user.password = hashedPassword;
  await user.save();
}

export async function deleteUser(user: User) {
  await user.remove();
}

export async function getUsersSessions(users: User[]): Promise<UserSessions[]> {
  const sessionRepo = getConnection().getRepository(Session);
  let sessions = await sessionRepo.find() as SessionUser[];

  sessions.forEach((sess) => sess.userId = JSON.parse(sess.json).passport?.user);
  sessions = sessions.filter((sess) => sess.userId !== undefined);
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

export async function createPasswordVerifiedUser({name, email, password}: CreateUserBody) {
  if (isCompanyEmail(email)) {
    throw new ForbiddenError('Use of company email addresses is restricted to Google login only.');
  }
  const existingUser = await User.findOne({email});
  if (existingUser) {
    throw new BadRequestError('User of given email already exists.');
  }
  const hashedPassword = await hashPassword(password);
  return await User.create({
    role: UserRole.UNVERIFIED,
    name,
    email,
    password: hashedPassword,
    hasPassword: true
  }).save();
}

export async function getPassword(user: User) {
  const {password} = await User.findOneOrFail(user.id, {select: ['password']});
  return password;
}

export async function passwordsMatch(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword);
}

async function hashPassword(password: string) {
  validatePassword(password);
  const salt = await bcrypt.genSalt();
  return await bcrypt.hash(password, salt);
}

function validatePassword(password: string) {
  if (!password) {
    throw new BadRequestError('Password is required');
  }
  if (password.length < 8) {
    throw new BadRequestError('Password must be 8 characters or longer.');
  }
}

function isCompanyEmail(email: string) {
  return email.endsWith(process.env.COMPANY_EMAIL!);
}
